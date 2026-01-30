// =============================================================================
// MOD-MARGEM.JS - MÓDULO DE MARGEM CONSIGNÁVEL
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Margem.html original
// =============================================================================

// --- Cache de Dados ---
let listaServidoresMargemCache = [];
let listaHistoricoMargemCache = [];

// =============================================================================
// NAVEGAÇÃO INTERNA (2 VIEWS)
// =============================================================================

function switchMargemView(view) {
    document.getElementById('view-margem-calculadora').classList.add('hidden');
    document.getElementById('view-margem-cadastro').classList.add('hidden');

    const btnCalc = document.getElementById('tab-margem-calculadora');
    const btnCad = document.getElementById('tab-margem-cadastro');

    const styleInactive = "px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-6 py-2 rounded-lg text-sm font-bold transition bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100";

    btnCalc.className = styleInactive;
    btnCad.className = styleInactive;

    if (view === 'calculadora') {
        document.getElementById('view-margem-calculadora').classList.remove('hidden');
        btnCalc.className = styleActive;
        carregarServidoresAutocompleteCalc();
        carregarHistoricoMargem();
    } else {
        document.getElementById('view-margem-cadastro').classList.remove('hidden');
        btnCad.className = styleActive;
        carregarListaServidoresCadastro();
    }
}

// =============================================================================
// AUTOCOMPLETE DE SERVIDORES (CALCULADORA)
// =============================================================================

function carregarServidoresAutocompleteCalc() {
    google.script.run.withSuccessHandler(function(lista) {
        listaServidoresMargemCache = lista || [];
    }).buscarTodosServidores();
}

function filtrarServidoresCalc() {
    const input = document.getElementById('inputServidorMargem');
    const container = document.getElementById('autocompleteMargemContainer');
    const termo = input.value.toLowerCase().trim();

    if (termo.length < 2) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    const resultados = listaServidoresMargemCache.filter(function(s) {
        const nome = String(s[1] || '').toLowerCase();
        const cpf = String(s[2] || '').replace(/\D/g, '');
        const matricula = String(s[3] || '').toLowerCase();
        return nome.includes(termo) || cpf.includes(termo.replace(/\D/g, '')) || matricula.includes(termo);
    }).slice(0, 5);

    if (resultados.length === 0) {
        container.innerHTML = '<div class="p-3 text-sm text-slate-400 italic">Nenhum servidor encontrado. <button onclick="abrirCadastroRapido()" class="text-indigo-600 hover:underline">Cadastrar novo?</button></div>';
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = '';
    resultados.forEach(function(s) {
        const div = document.createElement('div');
        div.className = "p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0";
        div.innerHTML = 
            '<div class="font-bold text-slate-700">' + s[1] + '</div>' +
            '<div class="text-xs text-slate-400">CPF: ' + s[2] + ' | Mat: ' + s[3] + '</div>';
        div.onclick = function() {
            selecionarServidorCalc(s[0], s[1], s[2], s[3]);
        };
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}

function selecionarServidorCalc(id, nome, cpf, matricula) {
    document.getElementById('inputServidorMargem').value = nome;
    document.getElementById('hiddenIdServidorMargem').value = id;
    document.getElementById('hiddenCpfMargem').value = cpf;
    document.getElementById('hiddenMatriculaMargem').value = matricula;
    document.getElementById('autocompleteMargemContainer').classList.add('hidden');
    
    // Exibe informações do servidor selecionado
    const infoContainer = document.getElementById('infoServidorSelecionado');
    if (infoContainer) {
        infoContainer.innerHTML = 
            '<div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-2">' +
                '<p class="text-xs text-indigo-600 font-bold uppercase">Servidor Selecionado</p>' +
                '<p class="font-bold text-indigo-800">' + nome + '</p>' +
                '<p class="text-xs text-indigo-500">CPF: ' + cpf + ' | Matrícula: ' + matricula + '</p>' +
            '</div>';
    }
}

// Fecha autocomplete ao clicar fora
document.addEventListener('click', function(e) {
    const container = document.getElementById('autocompleteMargemContainer');
    const input = document.getElementById('inputServidorMargem');
    if (container && input && !container.contains(e.target) && e.target !== input) {
        container.classList.add('hidden');
    }
});

// =============================================================================
// CADASTRO RÁPIDO DE SERVIDOR
// =============================================================================

function abrirCadastroRapido() {
    document.getElementById('autocompleteMargemContainer').classList.add('hidden');
    
    const modalId = 'modal-cadastro-rapido-' + Date.now();
    
    const modalHTML = 
        '<div class="fixed inset-0 z-[100] overflow-y-auto" id="' + modalId + '">' +
            '<div class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>' +
            '<div class="flex min-h-full items-center justify-center p-4">' +
                '<div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">' +
                    '<div class="bg-indigo-600 px-6 py-4 text-white">' +
                        '<h3 class="font-bold text-lg">Cadastro Rápido de Servidor</h3>' +
                        '<p class="text-xs text-indigo-200">Preencha os dados básicos</p>' +
                    '</div>' +
                    '<form onsubmit="salvarCadastroRapido(event, \'' + modalId + '\')" class="p-6 space-y-4">' +
                        '<div>' +
                            '<label class="label-padrao">Nome Completo *</label>' +
                            '<input type="text" id="inputNomeRapido" class="input-padrao" required>' +
                        '</div>' +
                        '<div>' +
                            '<label class="label-padrao">CPF *</label>' +
                            '<input type="text" id="inputCpfRapido" class="input-padrao mask-cpf" required placeholder="000.000.000-00">' +
                        '</div>' +
                        '<div>' +
                            '<label class="label-padrao">Matrícula</label>' +
                            '<input type="text" id="inputMatriculaRapido" class="input-padrao">' +
                        '</div>' +
                        '<div class="flex gap-3 pt-4">' +
                            '<button type="button" onclick="fecharModalDinamico(\'' + modalId + '\')" class="btn-secondary flex-1">Cancelar</button>' +
                            '<button type="submit" class="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">Cadastrar</button>' +
                        '</div>' +
                    '</form>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function salvarCadastroRapido(e, modalId) {
    e.preventDefault();
    
    const nome = document.getElementById('inputNomeRapido').value;
    const cpf = document.getElementById('inputCpfRapido').value;
    const matricula = document.getElementById('inputMatriculaRapido').value;
    
    if (!nome || !cpf) {
        sysAlert('Atenção', 'Nome e CPF são obrigatórios.', 'aviso');
        return;
    }
    
    toggleLoading(true);
    
    const dados = {
        nome: nome,
        cpf: cpf,
        matricula: matricula
    };
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success) {
            fecharModalDinamico(modalId);
            sysAlert('Sucesso', 'Servidor cadastrado com sucesso!', 'sucesso');
            
            // Atualiza cache e seleciona o servidor
            carregarServidoresAutocompleteCalc();
            
            // Preenche os campos com o novo servidor
            document.getElementById('inputServidorMargem').value = nome;
            document.getElementById('hiddenIdServidorMargem').value = res.id || '';
            document.getElementById('hiddenCpfMargem').value = cpf;
            document.getElementById('hiddenMatriculaMargem').value = matricula;
            
            const infoContainer = document.getElementById('infoServidorSelecionado');
            if (infoContainer) {
                infoContainer.innerHTML = 
                    '<div class="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-2">' +
                        '<p class="text-xs text-indigo-600 font-bold uppercase">Servidor Selecionado</p>' +
                        '<p class="font-bold text-indigo-800">' + nome + '</p>' +
                        '<p class="text-xs text-indigo-500">CPF: ' + cpf + ' | Matrícula: ' + matricula + '</p>' +
                    '</div>';
            }
        } else {
            sysAlert('Erro', res.message || 'Erro ao cadastrar servidor.', 'erro');
        }
    }).salvarServidor(dados);
}

// =============================================================================
// CÁLCULO DA MARGEM
// =============================================================================

function calcularMargem() {
    const bruto = parseMoney(document.getElementById('inputRendaBruta').value);
    const descontos = parseMoney(document.getElementById('inputDescontosObrig').value);
    const percentual = parseFloat(document.getElementById('inputPercentualMargem').value) || 35;
    const emprestimos = parseMoney(document.getElementById('inputEmprestimosAtuais').value);
    
    const liquido = roundMoney(bruto - descontos);
    const margemTotal = roundMoney(liquido * (percentual / 100));
    const margemDisponivel = roundMoney(margemTotal - emprestimos);
    
    // Atualiza displays
    document.getElementById('displayLiquidoMargem').innerText = formatMoney(liquido);
    document.getElementById('displayMargemTotal').innerText = formatMoney(margemTotal);
    document.getElementById('displayMargemDisponivel').innerText = formatMoney(margemDisponivel);
    
    // Feedback visual
    const displayDisponivel = document.getElementById('displayMargemDisponivel');
    if (margemDisponivel > 0) {
        displayDisponivel.classList.remove('text-red-600');
        displayDisponivel.classList.add('text-emerald-600');
    } else {
        displayDisponivel.classList.remove('text-emerald-600');
        displayDisponivel.classList.add('text-red-600');
    }
    
    // Mostra container de resultado
    const containerResultado = document.getElementById('containerResultadoMargem');
    if (containerResultado) {
        containerResultado.classList.remove('hidden');
    }
}

function limparCalculoMargem() {
    document.getElementById('formCalculoMargem').reset();
    document.getElementById('inputServidorMargem').value = '';
    document.getElementById('hiddenIdServidorMargem').value = '';
    document.getElementById('hiddenCpfMargem').value = '';
    document.getElementById('hiddenMatriculaMargem').value = '';
    
    document.getElementById('displayLiquidoMargem').innerText = 'R$ 0,00';
    document.getElementById('displayMargemTotal').innerText = 'R$ 0,00';
    document.getElementById('displayMargemDisponivel').innerText = 'R$ 0,00';
    
    const infoContainer = document.getElementById('infoServidorSelecionado');
    if (infoContainer) infoContainer.innerHTML = '';
    
    const containerResultado = document.getElementById('containerResultadoMargem');
    if (containerResultado) containerResultado.classList.add('hidden');
}

// =============================================================================
// SALVAR E GERAR CARTA DE MARGEM
// =============================================================================

function salvarEGerarCarta() {
    const idServidor = document.getElementById('hiddenIdServidorMargem').value;
    const nome = document.getElementById('inputServidorMargem').value;
    const cpf = document.getElementById('hiddenCpfMargem').value;
    const matricula = document.getElementById('hiddenMatriculaMargem').value;
    
    if (!nome || !cpf) {
        sysAlert('Atenção', 'Selecione um servidor antes de gerar a carta.', 'aviso');
        return;
    }
    
    const bruto = parseMoney(document.getElementById('inputRendaBruta').value);
    const descontos = parseMoney(document.getElementById('inputDescontosObrig').value);
    const percentual = parseFloat(document.getElementById('inputPercentualMargem').value) || 35;
    const emprestimos = parseMoney(document.getElementById('inputEmprestimosAtuais').value);
    
    if (bruto === 0) {
        sysAlert('Atenção', 'Informe a renda bruta para gerar a carta.', 'aviso');
        return;
    }
    
    const liquido = roundMoney(bruto - descontos);
    const margemTotal = roundMoney(liquido * (percentual / 100));
    const margemDisponivel = roundMoney(margemTotal - emprestimos);
    
    const competencia = document.getElementById('inputCompetenciaMargem').value;
    
    sysConfirm('Gerar Carta de Margem', 'Deseja salvar o cálculo e gerar a carta em PDF?\n\nServidor: ' + nome + '\nMargem Disponível: ' + formatMoney(margemDisponivel), function() {
        toggleLoading(true);
        
        const dados = {
            idServidor: idServidor,
            nome: nome,
            cpf: cpf,
            matricula: matricula,
            competencia: competencia,
            bruto: bruto,
            descontos: descontos,
            liquido: liquido,
            percentual: percentual,
            margemTotal: margemTotal,
            emprestimos: emprestimos,
            margemDisponivel: margemDisponivel
        };
        
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            
            if (res.success) {
                sysAlert('Sucesso', res.message, 'sucesso');
                
                // Abre o PDF se tiver URL
                if (res.urlPdf) {
                    window.open(res.urlPdf, '_blank');
                }
                
                // Atualiza histórico
                carregarHistoricoMargem();
                
                // Limpa formulário
                limparCalculoMargem();
            } else {
                sysAlert('Erro', res.message || 'Erro ao gerar carta.', 'erro');
            }
        }).gerarCartaMargem(dados);
    });
}

// =============================================================================
// HISTÓRICO DE CÁLCULOS
// =============================================================================

function carregarHistoricoMargem() {
    const tbody = document.getElementById('listaHistoricoMargem');
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">Carregando histórico...</td></tr>';
    }
    
    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoMargemCache = lista || [];
        
        if (tbody) {
            tbody.innerHTML = '';
            
            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhum cálculo realizado.</td></tr>';
                return;
            }
            
            // Mostra os últimos 20
            const dadosExibir = lista.slice(0, 20);
            
            dadosExibir.forEach(function(row) {
                // Estrutura: ID, DATA, COMP, NOME, CPF, MAT, BRUTO, DESC, LIQ, PERC, MARG_TOT, EMP, MARG_DISP
                const id = row[0];
                const data = formatarDataBR(row[1]);
                const comp = formatarCompetencia(row[2]);
                const nome = row[3];
                const margemDisp = parseMoney(row[12]);
                
                const tr = document.createElement('tr');
                tr.className = "hover:bg-indigo-50/30 border-b border-slate-100 transition";
                tr.innerHTML = 
                    '<td class="pl-6 py-3 text-xs text-slate-500 font-mono">' + data + '</td>' +
                    '<td class="px-4 py-3 text-xs text-slate-500">' + comp + '</td>' +
                    '<td class="px-4 py-3 font-medium text-slate-700 truncate max-w-[200px]" title="' + nome + '">' + nome + '</td>' +
                    '<td class="px-4 py-3 text-right font-bold font-mono ' + (margemDisp > 0 ? 'text-emerald-600' : 'text-red-600') + '">' + formatMoney(margemDisp) + '</td>' +
                    '<td class="pr-6 py-3 text-center">' +
                        '<button onclick="reimprimirCarta(\'' + id + '\')" class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Reimprimir PDF">' +
                            '<i class="fa-solid fa-print"></i>' +
                        '</button>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        }
    }).buscarHistoricoMargem();
}

function reimprimirCarta(id) {
    toggleLoading(true);
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success && res.urlPdf) {
            window.open(res.urlPdf, '_blank');
        } else {
            sysAlert('Erro', res.message || 'Erro ao gerar PDF.', 'erro');
        }
    }).regerarPDFMargem(id);
}

// =============================================================================
// CADASTRO DE SERVIDORES (VIEW CADASTRO)
// =============================================================================

function carregarListaServidoresCadastro() {
    const tbody = document.getElementById('listaServidoresCadastro');
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-slate-400 italic">Carregando...</td></tr>';
    }
    
    google.script.run.withSuccessHandler(function(lista) {
        listaServidoresMargemCache = lista || [];
        
        if (tbody) {
            tbody.innerHTML = '';
            
            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-slate-400">Nenhum servidor cadastrado.</td></tr>';
                return;
            }
            
            lista.forEach(function(s) {
                const idSafe = s[0];
                const nomeSafe = String(s[1] || '').replace(/'/g, "\\'");
                const cpf = s[2] || '-';
                const matricula = s[3] || '-';
                
                const tr = document.createElement('tr');
                tr.className = "hover:bg-indigo-50/30 border-b border-slate-100 transition";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + s[1] + '</td>' +
                    '<td class="px-4 py-4 text-slate-500 font-mono text-xs">' + cpf + '</td>' +
                    '<td class="px-4 py-4 text-slate-600">' + matricula + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="prepararEdicaoServidor(\'' + idSafe + '\', \'' + nomeSafe + '\', \'' + cpf + '\', \'' + matricula + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        }
    }).buscarTodosServidores();
}

function handleSaveServidor(e) {
    e.preventDefault();
    const f = document.getElementById('formCadastroServidor');
    const idEdicao = document.getElementById('idServidorEdicao').value;
    
    toggleLoading(true);
    
    const dados = {
        id: idEdicao,
        nome: f.nome.value,
        cpf: f.cpf.value,
        matricula: f.matricula.value
    };
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
        
        if (res.success) {
            cancelarEdicaoServidor();
            carregarListaServidoresCadastro();
            carregarServidoresAutocompleteCalc();
        }
    }).salvarServidor(dados);
}

function prepararEdicaoServidor(id, nome, cpf, matricula) {
    document.getElementById('idServidorEdicao').value = id;
    document.getElementById('inputNomeServidor').value = nome;
    document.getElementById('inputCpfServidor').value = cpf;
    document.getElementById('inputMatriculaServidor').value = matricula;
    
    document.getElementById('btnSalvarServidor').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar';
    document.getElementById('btnCancelServidor').classList.remove('hidden');
    
    document.getElementById('view-margem-cadastro').scrollTop = 0;
}

function cancelarEdicaoServidor() {
    const f = document.getElementById('formCadastroServidor');
    f.reset();
    document.getElementById('idServidorEdicao').value = '';
    
    document.getElementById('btnSalvarServidor').innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Cadastrar';
    document.getElementById('btnCancelServidor').classList.add('hidden');
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchMargemView = switchMargemView;
window.carregarServidoresAutocompleteCalc = carregarServidoresAutocompleteCalc;
window.filtrarServidoresCalc = filtrarServidoresCalc;
window.selecionarServidorCalc = selecionarServidorCalc;
window.abrirCadastroRapido = abrirCadastroRapido;
window.salvarCadastroRapido = salvarCadastroRapido;
window.calcularMargem = calcularMargem;
window.limparCalculoMargem = limparCalculoMargem;
window.salvarEGerarCarta = salvarEGerarCarta;
window.carregarHistoricoMargem = carregarHistoricoMargem;
window.reimprimirCarta = reimprimirCarta;
window.carregarListaServidoresCadastro = carregarListaServidoresCadastro;
window.handleSaveServidor = handleSaveServidor;
window.prepararEdicaoServidor = prepararEdicaoServidor;
window.cancelarEdicaoServidor = cancelarEdicaoServidor;