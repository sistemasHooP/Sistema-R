// =============================================================================
// MOD-FOLHA.JS - MÓDULO DE FOLHA DE PAGAMENTO
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Folha.html original
// =============================================================================

// --- Cache de Dados ---
let listaHistoricoFolhaCache = [];
let cacheDadosFolhaRelatorio = [];
let cacheNomesFolhaRelatorio = [];
let listaServidoresCache = [];
let listaRemessasOutrosBancosCache = [];

// =============================================================================
// NAVEGAÇÃO INTERNA (3 VIEWS)
// =============================================================================

function switchFolhaView(view) {
    document.getElementById('view-folha-operacional').classList.add('hidden');
    document.getElementById('view-folha-outros').classList.add('hidden');
    document.getElementById('view-folha-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-folha-operacional');
    const btnOutros = document.getElementById('tab-folha-outros');
    const btnGer = document.getElementById('tab-folha-gerencial');

    const styleInactive = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-4 py-2 rounded-lg text-sm font-bold transition bg-yellow-50 text-yellow-700 shadow-sm border border-yellow-100";

    btnOp.className = styleInactive;
    btnOutros.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-folha-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarNomesFolha();
        carregarHistoricoFolha();
    } else if (view === 'outros') {
        document.getElementById('view-folha-outros').classList.remove('hidden');
        btnOutros.className = styleActive;
        carregarServidoresAutocomplete();
        carregarRemessasOutrosBancos();
    } else {
        document.getElementById('view-folha-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioFolha();
    }
}

// =============================================================================
// CADASTROS AUXILIARES (NOMES/TIPOS DE FOLHA)
// =============================================================================

function carregarNomesFolha() {
    google.script.run.withSuccessHandler(function(list) {
        const sel = document.getElementById('selectTipoFolha');
        if (sel) {
            const valorAtual = sel.value;
            sel.innerHTML = '<option value="">Selecione...</option>';
            if (list && list.length > 0) {
                list.forEach(function(item) {
                    const opt = document.createElement('option');
                    opt.value = item;
                    opt.innerText = item;
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }
    }).getNomesFolha();
}

function carregarListaNomesFolha() {
    google.script.run.withSuccessHandler(function(list) {
        const ul = document.getElementById('listaNomesFolha');
        if (ul) {
            ul.innerHTML = '';
            if (list && list.length > 0) {
                list.forEach(function(item) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-yellow-50 border-b border-yellow-100 last:border-0";
                    li.innerHTML = '<span class="text-sm font-medium text-yellow-800">' + item + '</span>' +
                        '<button onclick="removerNomeFolha(\'' + item + '\')" class="text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>';
                    ul.appendChild(li);
                });
            } else {
                ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhum tipo de folha cadastrado.</li>';
            }
        }
    }).getNomesFolha();
}

function addNomeFolha() {
    const i = document.getElementById('novoNomeFolha');
    if (!i.value) return;

    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarListaNomesFolha();
        carregarNomesFolha();
    }).addNomeFolha(i.value);
}

function removerNomeFolha(n) {
    sysConfirm('Excluir Tipo', 'Deseja excluir este tipo de folha?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarListaNomesFolha();
            carregarNomesFolha();
        }).removeNomeFolha(n);
    });
}

// =============================================================================
// CÁLCULO AUTOMÁTICO DO LÍQUIDO
// =============================================================================

function calcularLiquidoFolha() {
    const bruto = parseMoney(document.getElementById('valorBrutoFolha').value);
    const descontos = parseMoney(document.getElementById('valorDescontosFolha').value);
    const liquido = roundMoney(bruto - descontos);
    document.getElementById('displayLiquidoFolha').innerText = formatMoney(liquido);
}

// =============================================================================
// CRUD OPERACIONAL FOLHA
// =============================================================================

function handleSaveFolha(e) {
    e.preventDefault();
    const f = document.getElementById('formFolha');
    const idEdicao = document.getElementById('idFolhaEdicao').value;

    const comp = formatarCompetencia(f.competencia.value);
    const liquido = document.getElementById('displayLiquidoFolha').innerText;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const acaoMsg = idEdicao ? 'atualizar esta folha?' : 'lançar esta nova folha de pagamento?';
    const msg = 'Tipo: ' + f.tipoFolha.value + '\nCompetência: ' + comp + '\nValor Líquido: ' + liquido + '\n\nDeseja realmente ' + acaoMsg;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            tipoFolha: f.tipoFolha.value,
            valorBruto: f.valorBruto.value,
            valorDescontos: f.valorDescontos.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoFolha();
                carregarHistoricoFolha();
            }
        }).salvarFolha(dados);
    });
}

function prepararEdicaoFolha(id, comp, tipo, bruto, descontos, obs) {
    document.getElementById('idFolhaEdicao').value = id;
    document.getElementById('inputCompetenciaFolha').value = comp;
    document.getElementById('selectTipoFolha').value = tipo;

    document.getElementById('valorBrutoFolha').value = formatMoney(parseFloat(bruto));
    document.getElementById('valorDescontosFolha').value = formatMoney(parseFloat(descontos));
    document.getElementById('inputObsFolha').value = obs === 'undefined' ? '' : obs;

    calcularLiquidoFolha();

    document.getElementById('btnSalvarFolha').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar Folha';
    document.getElementById('btnCancelFolha').classList.remove('hidden');

    document.getElementById('page-folha').scrollTop = 0;
}

function cancelarEdicaoFolha() {
    const f = document.getElementById('formFolha');
    f.reset();
    document.getElementById('idFolhaEdicao').value = "";
    document.getElementById('displayLiquidoFolha').innerText = 'R$ 0,00';

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaFolha').value = mesAtualFmt;

    document.getElementById('btnSalvarFolha').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Salvar Folha';
    document.getElementById('btnCancelFolha').classList.add('hidden');
}

function excluirFolha(id) {
    sysConfirm('Excluir Folha', 'Deseja eliminar permanentemente este registro de folha?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoFolha();
        }).excluirFolha(id);
    });
}

// =============================================================================
// FILTRO E LISTAGEM FOLHA
// =============================================================================

function limparFiltroHistoricoFolha() {
    const filtro = document.getElementById('filtroHistoricoFolha');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoFolha();
    }
}

function carregarHistoricoFolha() {
    const tbody = document.getElementById('listaHistoricoFolha');
    const tfootTotal = document.getElementById('totalCompFolha');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';
    }

    const filtroCompetencia = document.getElementById('filtroHistoricoFolha') ? document.getElementById('filtroHistoricoFolha').value : '';

    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoFolhaCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhuma folha lançada até o momento.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                const compRegistro = String(row[1]).replace(/'/g, "");

                if (filtroCompetencia && compRegistro !== filtroCompetencia) return;

                contador++;
                const valorLiquido = parseMoney(row[6]);
                totalAcumulado += valorLiquido;

                const compFmt = formatarCompetencia(row[1]);
                const obsSafe = String(row[7] || '').replace(/'/g, "\\'").replace(/\n/g, " ");

                const idSafe = row[0];
                const compRaw = compRegistro;
                const tipoSafe = String(row[3]).replace(/'/g, "\\'");

                const tr = document.createElement('tr');
                tr.className = "hover:bg-yellow-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4"><span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">' + row[3] + '</span></td>' +
                    '<td class="px-4 py-4 text-right font-mono text-slate-600">' + formatMoney(parseMoney(row[4])) + '</td>' +
                    '<td class="px-4 py-4 text-right font-mono text-red-500">' + formatMoney(parseMoney(row[5])) + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-yellow-700 font-mono">' + formatMoney(valorLiquido) + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="prepararEdicaoFolha(\'' + idSafe + '\', \'' + compRaw + '\', \'' + tipoSafe + '\', \'' + parseMoney(row[4]) + '\', \'' + parseMoney(row[5]) + '\', \'' + obsSafe + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                            '<button onclick="excluirFolha(\'' + idSafe + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarFolhas();
}

// =============================================================================
// OUTROS BANCOS - AUTOCOMPLETE SERVIDORES
// =============================================================================

function carregarServidoresAutocomplete() {
    google.script.run.withSuccessHandler(function(lista) {
        listaServidoresCache = lista || [];
    }).buscarTodosServidores();
}

function filtrarServidoresOutrosBancos() {
    const input = document.getElementById('inputServidorOutroBanco');
    const container = document.getElementById('autocompleteServidorContainer');
    const termo = input.value.toLowerCase().trim();

    if (termo.length < 2) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    const resultados = listaServidoresCache.filter(function(s) {
        const nome = String(s[1] || '').toLowerCase();
        const cpf = String(s[2] || '').replace(/\D/g, '');
        return nome.includes(termo) || cpf.includes(termo.replace(/\D/g, ''));
    }).slice(0, 5);

    if (resultados.length === 0) {
        container.innerHTML = '<div class="p-3 text-sm text-slate-400 italic">Nenhum servidor encontrado.</div>';
        container.classList.remove('hidden');
        return;
    }

    container.innerHTML = '';
    resultados.forEach(function(s) {
        const div = document.createElement('div');
        div.className = "p-3 hover:bg-yellow-50 cursor-pointer border-b border-slate-100 last:border-0";
        div.innerHTML = '<div class="font-bold text-slate-700">' + s[1] + '</div>' +
            '<div class="text-xs text-slate-400">CPF: ' + s[2] + ' | Mat: ' + s[3] + '</div>';
        div.onclick = function() {
            selecionarServidorOutroBanco(s[0], s[1], s[2]);
        };
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}

function selecionarServidorOutroBanco(id, nome, cpf) {
    document.getElementById('inputServidorOutroBanco').value = nome;
    document.getElementById('hiddenIdServidor').value = id;
    document.getElementById('hiddenCpfServidor').value = cpf;
    document.getElementById('autocompleteServidorContainer').classList.add('hidden');
}

// Fecha autocomplete ao clicar fora
document.addEventListener('click', function(e) {
    const container = document.getElementById('autocompleteServidorContainer');
    const input = document.getElementById('inputServidorOutroBanco');
    if (container && input && !container.contains(e.target) && e.target !== input) {
        container.classList.add('hidden');
    }
});

// =============================================================================
// CRUD OUTROS BANCOS
// =============================================================================

function handleSaveOutroBanco(e) {
    e.preventDefault();
    const f = document.getElementById('formOutroBanco');
    const idEdicao = document.getElementById('idOutroBancoEdicao').value;

    const idServidor = document.getElementById('hiddenIdServidor').value;
    const nomeServidor = document.getElementById('inputServidorOutroBanco').value;
    const cpf = document.getElementById('hiddenCpfServidor').value;

    if (!idServidor && !nomeServidor) {
        sysAlert('Atenção', 'Selecione ou digite o nome do servidor.', 'aviso');
        return;
    }

    const comp = formatarCompetencia(f.competencia.value);
    const valor = f.valor.value;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const msg = 'Servidor: ' + nomeServidor + '\nBanco: ' + f.banco.value + '\nCompetência: ' + comp + '\nValor: ' + valor;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            idServidor: idServidor,
            nomeServidor: nomeServidor,
            cpf: cpf,
            banco: f.banco.value,
            valor: f.valor.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoOutroBanco();
                carregarRemessasOutrosBancos();
            }
        }).salvarRemessaOutroBanco(dados);
    });
}

function cancelarEdicaoOutroBanco() {
    const f = document.getElementById('formOutroBanco');
    f.reset();
    document.getElementById('idOutroBancoEdicao').value = "";
    document.getElementById('hiddenIdServidor').value = "";
    document.getElementById('hiddenCpfServidor').value = "";

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaOutroBanco').value = mesAtualFmt;

    document.getElementById('btnSalvarOutroBanco').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Salvar Remessa';
    document.getElementById('btnCancelOutroBanco').classList.add('hidden');
}

function prepararEdicaoOutroBanco(id, comp, idServ, nome, cpf, banco, valor, obs) {
    document.getElementById('idOutroBancoEdicao').value = id;
    document.getElementById('inputCompetenciaOutroBanco').value = comp;
    document.getElementById('hiddenIdServidor').value = idServ;
    document.getElementById('inputServidorOutroBanco').value = nome;
    document.getElementById('hiddenCpfServidor').value = cpf;
    document.getElementById('selectBancoOutro').value = banco;
    document.getElementById('valorOutroBanco').value = formatMoney(parseFloat(valor));
    document.getElementById('inputObsOutroBanco').value = obs === 'undefined' ? '' : obs;

    document.getElementById('btnSalvarOutroBanco').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar';
    document.getElementById('btnCancelOutroBanco').classList.remove('hidden');
}

function excluirRemessaOutroBanco(id) {
    sysConfirm('Excluir Remessa', 'Deseja eliminar esta remessa de outro banco?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarRemessasOutrosBancos();
        }).excluirRemessaOutroBanco(id);
    });
}

// =============================================================================
// LISTAGEM OUTROS BANCOS
// =============================================================================

function carregarRemessasOutrosBancos() {
    const tbody = document.getElementById('listaRemessasOutrosBancos');
    const tfootTotal = document.getElementById('totalOutrosBancos');
    const competencia = document.getElementById('filtroCompetenciaOutrosBancos') ? document.getElementById('filtroCompetenciaOutrosBancos').value : '';

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">A carregar...</td></tr>';
    }

    google.script.run.withSuccessHandler(function(lista) {
        listaRemessasOutrosBancosCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let total = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhuma remessa encontrada.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                const valor = parseMoney(row[7]);
                total += valor;

                const idSafe = row[0];
                const compRaw = String(row[1]).replace(/'/g, "");
                const idServ = row[3] || '';
                const nome = String(row[4] || '').replace(/'/g, "\\'");
                const cpf = row[5] || '';
                const banco = String(row[6] || '').replace(/'/g, "\\'");
                const obsSafe = String(row[8] || '').replace(/'/g, "\\'").replace(/\n/g, " ");

                const tr = document.createElement('tr');
                tr.className = "hover:bg-yellow-50/30 border-b border-slate-100 transition";
                tr.innerHTML = 
                    '<td class="pl-6 py-3 font-medium text-slate-700">' + row[4] + '</td>' +
                    '<td class="px-4 py-3 text-xs text-slate-500 font-mono">' + row[5] + '</td>' +
                    '<td class="px-4 py-3 text-slate-600">' + row[6] + '</td>' +
                    '<td class="px-4 py-3 text-right font-bold text-yellow-700 font-mono">' + formatMoney(valor) + '</td>' +
                    '<td class="px-4 py-3 text-xs text-slate-400 truncate max-w-[150px]" title="' + row[8] + '">' + (row[8] || '-') + '</td>' +
                    '<td class="pr-6 py-3 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="prepararEdicaoOutroBanco(\'' + idSafe + '\', \'' + compRaw + '\', \'' + idServ + '\', \'' + nome + '\', \'' + cpf + '\', \'' + banco + '\', \'' + valor + '\', \'' + obsSafe + '\')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition" title="Editar"><i class="fa-solid fa-pencil text-xs"></i></button>' +
                            '<button onclick="excluirRemessaOutroBanco(\'' + idSafe + '\')" class="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Excluir"><i class="fa-solid fa-trash text-xs"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (tfootTotal) tfootTotal.innerText = formatMoney(total);
        }
    }).buscarRemessasOutrosBancos(competencia);
}

function importarRemessasMesAnterior() {
    const competenciaAtual = document.getElementById('filtroCompetenciaOutrosBancos').value;
    if (!competenciaAtual) {
        sysAlert('Atenção', 'Selecione a competência de destino primeiro.', 'aviso');
        return;
    }

    sysConfirm('Importar Remessas', 'Deseja importar todas as remessas do mês anterior para ' + formatarCompetencia(competenciaAtual) + '?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarRemessasOutrosBancos();
        }).importarRemessasAnteriores(competenciaAtual);
    });
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL FOLHA
// =============================================================================

function renderizarRelatorioFolha() {
    const tbody = document.getElementById('tabelaRelatorioFolha');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

    google.script.run.withSuccessHandler(function(nomes) {
        cacheNomesFolhaRelatorio = nomes || [];

        google.script.run.withSuccessHandler(function(dados) {
            cacheDadosFolhaRelatorio = dados || [];
            popularFiltroAnosFolha(cacheDadosFolhaRelatorio);
            construirMatrizAnualFolha();
        }).buscarFolhas();

    }).getNomesFolha();
}

function popularFiltroAnosFolha(lista) {
    const selectAno = document.getElementById('filtroAnoFolha');
    if (!selectAno) return;

    const anoSelecionadoAntes = selectAno.value;
    const anosSet = new Set();
    anosSet.add(new Date().getFullYear());

    lista.forEach(function(row) {
        if (row[1]) {
            const comp = String(row[1]).replace(/'/g, "");
            const partes = comp.split('-');
            if (partes.length >= 1) anosSet.add(parseInt(partes[0]));
        }
    });

    const anosOrdenados = Array.from(anosSet).sort(function(a, b) { return b - a; });
    selectAno.innerHTML = '';
    anosOrdenados.forEach(function(ano) {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.innerText = ano;
        selectAno.appendChild(opt);
    });

    if (anosSet.has(parseInt(anoSelecionadoAntes))) {
        selectAno.value = anoSelecionadoAntes;
    } else {
        selectAno.value = anosOrdenados[0];
    }
}

function construirMatrizAnualFolha() {
    const anoFiltro = document.getElementById('filtroAnoFolha').value;
    const tbody = document.getElementById('tabelaRelatorioFolha');
    const table = tbody ? tbody.parentElement : null;
    const thead = table ? table.querySelector('thead') : null;
    const tfoot = table ? table.querySelector('tfoot') : null;

    if (!thead || !tbody || !tfoot) return;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[200px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Tipo de Folha</th>';
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[100px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[120px]">Total Anual</th></tr>';
    thead.innerHTML = headerHTML;

    const matriz = {};
    cacheNomesFolhaRelatorio.forEach(function(tipo) {
        matriz[tipo] = Array(12).fill(0);
    });

    cacheDadosFolhaRelatorio.forEach(function(row) {
        if (!row[1]) return;
        const comp = String(row[1]).replace(/'/g, "");
        const partes = comp.split('-');
        const ano = partes[0];
        const mes = partes[1];

        if (ano === anoFiltro) {
            const tipo = row[3];
            const valor = parseMoney(row[6]); // Valor líquido
            const mesIndex = parseInt(mes) - 1;

            if (mesIndex >= 0 && mesIndex <= 11) {
                if (!matriz[tipo]) matriz[tipo] = Array(12).fill(0);
                matriz[tipo][mesIndex] = roundMoney(matriz[tipo][mesIndex] + valor);
            }
        }
    });

    tbody.innerHTML = '';
    const totaisMes = Array(12).fill(0);
    let totalGeralAno = 0;

    const chaves = Object.keys(matriz).sort();

    if (chaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-8 text-center text-slate-400">Sem dados para este ano.</td></tr>';
    }

    chaves.forEach(function(tipo) {
        let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[200px] sticky left-0 bg-white z-10 shadow-sm" title="' + tipo + '">' + tipo + '</td>';
        let totalLinha = 0;

        for (let i = 0; i < 12; i++) {
            const val = matriz[tipo][i];
            totaisMes[i] = roundMoney(totaisMes[i] + val);
            totalLinha = roundMoney(totalLinha + val);

            const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
            linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
        }

        totalGeralAno = roundMoney(totalGeralAno + totalLinha);
        linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-yellow-700 bg-yellow-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-yellow-50/20 transition";
        tr.innerHTML = linhaHTML;
        tbody.appendChild(tr);
    });

    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-yellow-600 bg-yellow-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchFolhaView = switchFolhaView;
window.carregarNomesFolha = carregarNomesFolha;
window.carregarListaNomesFolha = carregarListaNomesFolha;
window.addNomeFolha = addNomeFolha;
window.removerNomeFolha = removerNomeFolha;
window.calcularLiquidoFolha = calcularLiquidoFolha;
window.handleSaveFolha = handleSaveFolha;
window.prepararEdicaoFolha = prepararEdicaoFolha;
window.cancelarEdicaoFolha = cancelarEdicaoFolha;
window.excluirFolha = excluirFolha;
window.limparFiltroHistoricoFolha = limparFiltroHistoricoFolha;
window.carregarHistoricoFolha = carregarHistoricoFolha;
window.carregarServidoresAutocomplete = carregarServidoresAutocomplete;
window.filtrarServidoresOutrosBancos = filtrarServidoresOutrosBancos;
window.selecionarServidorOutroBanco = selecionarServidorOutroBanco;
window.handleSaveOutroBanco = handleSaveOutroBanco;
window.cancelarEdicaoOutroBanco = cancelarEdicaoOutroBanco;
window.prepararEdicaoOutroBanco = prepararEdicaoOutroBanco;
window.excluirRemessaOutroBanco = excluirRemessaOutroBanco;
window.carregarRemessasOutrosBancos = carregarRemessasOutrosBancos;
window.importarRemessasMesAnterior = importarRemessasMesAnterior;
window.renderizarRelatorioFolha = renderizarRelatorioFolha;
window.popularFiltroAnosFolha = popularFiltroAnosFolha;
window.construirMatrizAnualFolha = construirMatrizAnualFolha;