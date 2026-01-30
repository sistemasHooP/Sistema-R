// =============================================================================
// MOD-DESPESAS.JS - MÓDULO DE DESPESAS ADMINISTRATIVAS
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Despesas.html original
// =============================================================================

// --- Cache de Dados ---
let listaHistoricoDespesasCache = [];
let listaFornecedoresCache = [];
let cacheDadosDespesasRelatorio = [];
let cacheFornecedoresRelatorio = [];

// =============================================================================
// NAVEGAÇÃO INTERNA (3 VIEWS)
// =============================================================================

function switchDespesasView(view) {
    document.getElementById('view-desp-operacional').classList.add('hidden');
    document.getElementById('view-desp-fornecedores').classList.add('hidden');
    document.getElementById('view-desp-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-desp-operacional');
    const btnForn = document.getElementById('tab-desp-fornecedores');
    const btnGer = document.getElementById('tab-desp-gerencial');

    const styleInactive = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-4 py-2 rounded-lg text-sm font-bold transition bg-orange-50 text-orange-700 shadow-sm border border-orange-100";

    btnOp.className = styleInactive;
    btnForn.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-desp-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarFornecedoresSelect();
        carregarHistoricoDespesas();
    } else if (view === 'fornecedores') {
        document.getElementById('view-desp-fornecedores').classList.remove('hidden');
        btnForn.className = styleActive;
        carregarListaFornecedores();
    } else {
        document.getElementById('view-desp-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioDespesas();
    }
}

// =============================================================================
// CADASTRO DE FORNECEDORES
// =============================================================================

function carregarFornecedoresSelect() {
    google.script.run.withSuccessHandler(function(lista) {
        listaFornecedoresCache = lista || [];

        const sel = document.getElementById('selectFornecedor');
        if (sel) {
            const valorAtual = sel.value;
            sel.innerHTML = '<option value="">Selecione...</option>';
            if (lista && lista.length > 0) {
                lista.forEach(function(f) {
                    const opt = document.createElement('option');
                    opt.value = f[1]; // Nome
                    opt.innerText = f[1];
                    opt.setAttribute('data-valor', f[4] || ''); // Valor padrão
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }
    }).buscarFornecedores();
}

function carregarListaFornecedores() {
    const tbody = document.getElementById('listaFornecedores');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">A carregar...</td></tr>';
    }

    google.script.run.withSuccessHandler(function(lista) {
        listaFornecedoresCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400">Nenhum fornecedor cadastrado.</td></tr>';
                return;
            }

            lista.forEach(function(f) {
                const idSafe = f[0];
                const nomeSafe = String(f[1] || '').replace(/'/g, "\\'");
                const cnpj = f[2] || '-';
                const tipoServico = f[3] || '-';
                const valorPadrao = f[4] ? formatMoney(parseMoney(f[4])) : '-';

                const tr = document.createElement('tr');
                tr.className = "hover:bg-orange-50/30 border-b border-slate-100 transition";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + f[1] + '</td>' +
                    '<td class="px-4 py-4 text-slate-500 font-mono text-xs">' + cnpj + '</td>' +
                    '<td class="px-4 py-4 text-slate-600">' + tipoServico + '</td>' +
                    '<td class="px-4 py-4 text-right font-mono text-orange-600">' + valorPadrao + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="prepararEdicaoFornecedor(\'' + idSafe + '\', \'' + nomeSafe + '\', \'' + (f[2] || '') + '\', \'' + (f[3] || '') + '\', \'' + (f[4] || '') + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                            '<button onclick="excluirFornecedor(\'' + idSafe + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir"><i class="fa-solid fa-trash"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        }
    }).buscarFornecedores();
}

function handleSaveFornecedor(e) {
    e.preventDefault();
    const f = document.getElementById('formFornecedor');
    const idEdicao = document.getElementById('idFornecedorEdicao').value;

    toggleLoading(true);

    const dados = {
        id: idEdicao,
        nome: f.nome.value,
        cnpj: f.cnpj.value,
        tipoServico: f.tipoServico.value,
        valorPadrao: f.valorPadrao.value
    };

    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

        if (res.success) {
            cancelarEdicaoFornecedor();
            carregarListaFornecedores();
            carregarFornecedoresSelect();
        }
    }).salvarFornecedor(dados);
}

function prepararEdicaoFornecedor(id, nome, cnpj, tipoServico, valorPadrao) {
    document.getElementById('idFornecedorEdicao').value = id;
    document.getElementById('inputNomeFornecedor').value = nome;
    document.getElementById('inputCnpjFornecedor').value = cnpj;
    document.getElementById('inputTipoServico').value = tipoServico;
    document.getElementById('inputValorPadrao').value = valorPadrao ? formatMoney(parseMoney(valorPadrao)) : '';

    document.getElementById('btnSalvarFornecedor').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar';
    document.getElementById('btnCancelFornecedor').classList.remove('hidden');

    document.getElementById('view-desp-fornecedores').scrollTop = 0;
}

function cancelarEdicaoFornecedor() {
    const f = document.getElementById('formFornecedor');
    f.reset();
    document.getElementById('idFornecedorEdicao').value = "";

    document.getElementById('btnSalvarFornecedor').innerHTML = '<i class="fa-solid fa-plus mr-2"></i> Cadastrar';
    document.getElementById('btnCancelFornecedor').classList.add('hidden');
}

function excluirFornecedor(id) {
    sysConfirm('Excluir Fornecedor', 'Deseja excluir permanentemente este fornecedor?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) {
                carregarListaFornecedores();
                carregarFornecedoresSelect();
            }
        }).excluirFornecedor(id);
    });
}

// =============================================================================
// AUTO-PREENCHIMENTO DO VALOR PADRÃO
// =============================================================================

function autoPreencherValorDespesa() {
    const sel = document.getElementById('selectFornecedor');
    const inputValor = document.getElementById('valorDespesa');

    if (sel && inputValor) {
        const selectedOption = sel.options[sel.selectedIndex];
        const valorPadrao = selectedOption.getAttribute('data-valor');

        if (valorPadrao && valorPadrao !== '') {
            inputValor.value = formatMoney(parseMoney(valorPadrao));
        }
    }
}

// =============================================================================
// TOGGLE FORNECEDOR MANUAL
// =============================================================================

function toggleFornecedorManual() {
    const selectContainer = document.getElementById('containerSelectFornecedor');
    const inputContainer = document.getElementById('containerInputFornecedor');
    const btnToggle = document.getElementById('btnToggleFornecedor');

    if (selectContainer.classList.contains('hidden')) {
        // Mostrar select
        selectContainer.classList.remove('hidden');
        inputContainer.classList.add('hidden');
        btnToggle.innerHTML = '<i class="fa-solid fa-keyboard"></i>';
        btnToggle.title = 'Digitar manualmente';
    } else {
        // Mostrar input manual
        selectContainer.classList.add('hidden');
        inputContainer.classList.remove('hidden');
        btnToggle.innerHTML = '<i class="fa-solid fa-list"></i>';
        btnToggle.title = 'Selecionar da lista';
    }
}

// =============================================================================
// CRUD DESPESAS
// =============================================================================

function handleSaveDespesa(e) {
    e.preventDefault();
    const f = document.getElementById('formDespesa');
    const idEdicao = document.getElementById('idDespesaEdicao').value;

    // Determina o fornecedor (select ou manual)
    let fornecedor = '';
    const selectContainer = document.getElementById('containerSelectFornecedor');
    if (!selectContainer.classList.contains('hidden')) {
        fornecedor = document.getElementById('selectFornecedor').value;
    } else {
        fornecedor = document.getElementById('inputFornecedorManual').value;
    }

    if (!fornecedor) {
        sysAlert('Atenção', 'Selecione ou digite o fornecedor.', 'aviso');
        return;
    }

    const comp = formatarCompetencia(f.competencia.value);
    const valor = f.valor.value;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const msg = 'Fornecedor: ' + fornecedor + '\nCompetência: ' + comp + '\nValor: ' + valor;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            fornecedor: fornecedor,
            numDocumento: f.numDocumento.value,
            valor: f.valor.value,
            observacoes: f.observacoes.value
        };

        const funcao = idEdicao ? 'editarDespesa' : 'salvarDespesa';

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoDespesa();
                carregarHistoricoDespesas();
            }
        })[funcao](dados);
    });
}

function prepararEdicaoDespesa(id, comp, fornecedor, numDoc, valor, obs, status) {
    // Verifica se pode editar
    if (status === 'PAGO' || status === 'PARCIAL') {
        sysAlert('Bloqueado', 'Despesas pagas ou parcialmente pagas não podem ser editadas.', 'aviso');
        return;
    }

    document.getElementById('idDespesaEdicao').value = id;
    document.getElementById('inputCompetenciaDespesa').value = comp;
    document.getElementById('selectFornecedor').value = fornecedor;
    document.getElementById('inputNumDocumento').value = numDoc;
    document.getElementById('valorDespesa').value = formatMoney(parseFloat(valor));
    document.getElementById('inputObsDespesa').value = obs === 'undefined' ? '' : obs;

    // Garante que está no modo select
    document.getElementById('containerSelectFornecedor').classList.remove('hidden');
    document.getElementById('containerInputFornecedor').classList.add('hidden');

    document.getElementById('btnSalvarDespesa').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar';
    document.getElementById('btnCancelDespesa').classList.remove('hidden');

    document.getElementById('page-despesas').scrollTop = 0;
}

function cancelarEdicaoDespesa() {
    const f = document.getElementById('formDespesa');
    f.reset();
    document.getElementById('idDespesaEdicao').value = "";

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaDespesa').value = mesAtualFmt;

    document.getElementById('btnSalvarDespesa').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Lançar Despesa';
    document.getElementById('btnCancelDespesa').classList.add('hidden');

    // Reset para modo select
    document.getElementById('containerSelectFornecedor').classList.remove('hidden');
    document.getElementById('containerInputFornecedor').classList.add('hidden');
}

function excluirDespesa(id, status) {
    // Verifica se pode excluir
    if (status === 'PAGO' || status === 'PARCIAL') {
        sysAlert('Bloqueado', 'Despesas pagas ou parcialmente pagas não podem ser excluídas.', 'aviso');
        return;
    }

    sysConfirm('Excluir Despesa', 'Deseja excluir permanentemente esta despesa?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoDespesas();
        }).excluirDespesa(id);
    });
}

// =============================================================================
// FILTRO E LISTAGEM DESPESAS
// =============================================================================

function limparFiltroHistoricoDespesas() {
    const filtro = document.getElementById('filtroHistoricoDespesas');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoDespesas();
    }
}

function carregarHistoricoDespesas() {
    const tbody = document.getElementById('listaHistoricoDespesas');
    const tfootTotal = document.getElementById('totalCompDespesas');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';
    }

    const filtroCompetencia = document.getElementById('filtroHistoricoDespesas') ? document.getElementById('filtroHistoricoDespesas').value : '';

    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoDespesasCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400">Nenhuma despesa lançada.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                const compRegistro = String(row[1]).replace(/'/g, "");

                if (filtroCompetencia && compRegistro !== filtroCompetencia) return;

                contador++;
                const valorRow = parseMoney(row[5]);
                totalAcumulado += valorRow;

                const compFmt = formatarCompetencia(row[1]);
                const status = row[6] || 'PENDENTE';
                const obsSafe = String(row[9] || '').replace(/'/g, "\\'").replace(/\n/g, " ");

                let badgeClass = 'status-pendente';
                if (status === 'PAGO') badgeClass = 'status-pago';
                else if (status === 'PARCIAL') badgeClass = 'status-parcial';

                const isPago = (status === 'PAGO' || status === 'PARCIAL');

                const idSafe = row[0];
                const compRaw = compRegistro;
                const fornecedorSafe = String(row[3]).replace(/'/g, "\\'");
                const numDoc = row[4] || '';

                const btnEdit = isPago
                    ? '<button class="p-2 text-gray-300 cursor-not-allowed" title="Pago - Não editável"><i class="fa-solid fa-pencil"></i></button>'
                    : '<button onclick="prepararEdicaoDespesa(\'' + idSafe + '\', \'' + compRaw + '\', \'' + fornecedorSafe + '\', \'' + numDoc + '\', \'' + valorRow + '\', \'' + obsSafe + '\', \'' + status + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>';

                const btnDel = isPago
                    ? '<button class="p-2 text-gray-300 cursor-not-allowed" title="Pago - Não excluível"><i class="fa-solid fa-trash"></i></button>'
                    : '<button onclick="excluirDespesa(\'' + idSafe + '\', \'' + status + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir"><i class="fa-solid fa-trash"></i></button>';

                const tr = document.createElement('tr');
                tr.className = "hover:bg-orange-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>' +
                    '<td class="px-4 py-4 text-slate-500 text-xs font-mono">' + (row[4] || '-') + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-orange-700 font-mono">' + formatMoney(valorRow) + '</td>' +
                    '<td class="px-4 py-4 text-center"><span class="status-badge ' + badgeClass + '">' + status + '</span></td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            btnEdit +
                            btnDel +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarHistoricoDespesas();
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL DESPESAS
// =============================================================================

function renderizarRelatorioDespesas() {
    const tbody = document.getElementById('tabelaRelatorioDespesas');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

    google.script.run.withSuccessHandler(function(fornecedores) {
        cacheFornecedoresRelatorio = fornecedores || [];

        google.script.run.withSuccessHandler(function(dados) {
            cacheDadosDespesasRelatorio = dados || [];
            popularFiltroAnosDespesas(cacheDadosDespesasRelatorio);
            construirMatrizAnualDespesas();
        }).buscarHistoricoDespesas();

    }).buscarFornecedores();
}

function popularFiltroAnosDespesas(lista) {
    const selectAno = document.getElementById('filtroAnoDespesas');
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

function construirMatrizAnualDespesas() {
    const anoFiltro = document.getElementById('filtroAnoDespesas').value;
    const tbody = document.getElementById('tabelaRelatorioDespesas');
    const table = tbody ? tbody.parentElement : null;
    const thead = table ? table.querySelector('thead') : null;
    const tfoot = table ? table.querySelector('tfoot') : null;

    if (!thead || !tbody || !tfoot) return;

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[220px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Fornecedor</th>';
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[100px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[120px]">Total Anual</th></tr>';
    thead.innerHTML = headerHTML;

    // Extrai nomes únicos de fornecedores dos dados
    const fornecedoresUnicos = new Set();
    cacheDadosDespesasRelatorio.forEach(function(row) {
        if (row[3]) fornecedoresUnicos.add(row[3]);
    });

    const matriz = {};
    fornecedoresUnicos.forEach(function(fornecedor) {
        matriz[fornecedor] = Array(12).fill(0);
    });

    cacheDadosDespesasRelatorio.forEach(function(row) {
        if (!row[1]) return;
        const comp = String(row[1]).replace(/'/g, "");
        const partes = comp.split('-');
        const ano = partes[0];
        const mes = partes[1];

        if (ano === anoFiltro) {
            const fornecedor = row[3];
            const valor = parseMoney(row[5]);
            const mesIndex = parseInt(mes) - 1;

            if (mesIndex >= 0 && mesIndex <= 11) {
                if (!matriz[fornecedor]) matriz[fornecedor] = Array(12).fill(0);
                matriz[fornecedor][mesIndex] = roundMoney(matriz[fornecedor][mesIndex] + valor);
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

    chaves.forEach(function(fornecedor) {
        let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[220px] sticky left-0 bg-white z-10 shadow-sm" title="' + fornecedor + '">' + fornecedor + '</td>';
        let totalLinha = 0;

        for (let i = 0; i < 12; i++) {
            const val = matriz[fornecedor][i];
            totaisMes[i] = roundMoney(totaisMes[i] + val);
            totalLinha = roundMoney(totalLinha + val);

            const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
            linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
        }

        totalGeralAno = roundMoney(totalGeralAno + totalLinha);
        linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-orange-700 bg-orange-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-orange-50/20 transition";
        tr.innerHTML = linhaHTML;
        tbody.appendChild(tr);
    });

    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-orange-600 bg-orange-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchDespesasView = switchDespesasView;
window.carregarFornecedoresSelect = carregarFornecedoresSelect;
window.carregarListaFornecedores = carregarListaFornecedores;
window.handleSaveFornecedor = handleSaveFornecedor;
window.prepararEdicaoFornecedor = prepararEdicaoFornecedor;
window.cancelarEdicaoFornecedor = cancelarEdicaoFornecedor;
window.excluirFornecedor = excluirFornecedor;
window.autoPreencherValorDespesa = autoPreencherValorDespesa;
window.toggleFornecedorManual = toggleFornecedorManual;
window.handleSaveDespesa = handleSaveDespesa;
window.prepararEdicaoDespesa = prepararEdicaoDespesa;
window.cancelarEdicaoDespesa = cancelarEdicaoDespesa;
window.excluirDespesa = excluirDespesa;
window.limparFiltroHistoricoDespesas = limparFiltroHistoricoDespesas;
window.carregarHistoricoDespesas = carregarHistoricoDespesas;
window.renderizarRelatorioDespesas = renderizarRelatorioDespesas;
window.popularFiltroAnosDespesas = popularFiltroAnosDespesas;
window.construirMatrizAnualDespesas = construirMatrizAnualDespesas;