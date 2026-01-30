// =============================================================================
// MOD-RECOLHIMENTO.JS - MÓDULO DE GUIAS DE RECOLHIMENTO
// Versão: 1.0.0 - Migração GitHub
// =============================================================================

// --- Cache de Dados ---
let dadosGuiasCache = [];
let cacheRecursosRelatorio = [];
let cacheDadosRelatorioRec = [];

// =============================================================================
// NAVEGAÇÃO INTERNA
// =============================================================================

function switchRecView(view) {
    document.getElementById('view-rec-operacional').classList.add('hidden');
    document.getElementById('view-rec-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-rec-operacional');
    const btnGer = document.getElementById('tab-rec-gerencial');

    const styleInactive = "px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-6 py-2 rounded-lg text-sm font-bold transition bg-blue-50 text-blue-700 shadow-sm border border-blue-100";

    btnOp.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-rec-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarRecursos();
        carregarHistoricoGuias();
    } else {
        document.getElementById('view-rec-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioGuias();
    }
}

// =============================================================================
// CADASTROS AUXILIARES (RECURSOS)
// =============================================================================

function carregarRecursos() {
    google.script.run.withSuccessHandler(function(list) {
        const sel = document.getElementById('selectRecurso');
        if (sel) {
            const valorAtual = sel.value;
            sel.innerHTML = '<option value="">Selecione...</option>';
            if (list && list.length > 0) {
                list.forEach(function(r) {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.innerText = r;
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }
    }).getRecursos();
}

function carregarListaRecursos() {
    google.script.run.withSuccessHandler(function(list) {
        const ul = document.getElementById('listaRecursos');
        if (ul) {
            ul.innerHTML = '';
            if (list && list.length > 0) {
                list.forEach(function(r) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-blue-50 border-b border-blue-100 last:border-0";
                    li.innerHTML = '<span class="text-sm font-medium text-blue-800">' + r + '</span>' +
                        '<button onclick="removerRecurso(\'' + r + '\')" class="text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>';
                    ul.appendChild(li);
                });
            } else {
                ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhum recurso cadastrado.</li>';
            }
        }
    }).getRecursos();
}

function addRecurso() {
    const i = document.getElementById('novoRecurso');
    if (!i.value) return;
    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarListaRecursos();
        carregarRecursos();
    }).addRecurso(i.value);
}

function removerRecurso(n) {
    sysConfirm('Excluir Recurso', 'Deseja excluir este recurso?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarListaRecursos();
            carregarRecursos();
        }).removeRecurso(n);
    });
}

// =============================================================================
// CÁLCULO AUTOMÁTICO DO TOTAL
// =============================================================================

function calcularTotalGuia() {
    const patronal = parseMoney(document.getElementById('valorPatronal').value);
    const segurado = parseMoney(document.getElementById('valorSegurado').value);
    const total = roundMoney(patronal + segurado);
    document.getElementById('displayTotalGuia').innerText = formatMoney(total);
}

// =============================================================================
// CRUD OPERACIONAL
// =============================================================================

function handleSaveRecolhimento(e) {
    e.preventDefault();
    const f = document.getElementById('formRecolhimento');
    const idEdicao = document.getElementById('idGuiaEdicao').value;

    const comp = formatarCompetencia(f.competencia.value);
    const total = document.getElementById('displayTotalGuia').innerText;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const acaoMsg = idEdicao ? 'atualizar esta guia?' : 'lançar esta nova guia?';
    const msg = 'Recurso: ' + f.recurso.value + '\nCompetência: ' + comp + '\nValor Total: ' + total + '\n\nDeseja realmente ' + acaoMsg;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            tipoGuia: f.tipoGuia.value,
            recurso: f.recurso.value,
            basePatronal: f.basePatronal.value,
            baseSegurado: f.baseSegurado.value,
            valorPatronal: f.valorPatronal.value,
            valorSegurado: f.valorSegurado.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoGuia();
                carregarHistoricoGuias();
            }
        }).salvarRecolhimento(dados);
    });
}

function prepararEdicaoGuia(id, comp, tipo, recurso, basePat, baseSeg, valPat, valSeg, obs) {
    document.getElementById('idGuiaEdicao').value = id;
    document.getElementById('inputCompetenciaRec').value = comp;
    document.getElementById('selectTipoGuia').value = tipo;
    document.getElementById('selectRecurso').value = recurso;

    document.getElementById('basePatronal').value = formatMoney(parseFloat(basePat));
    document.getElementById('baseSegurado').value = formatMoney(parseFloat(baseSeg));
    document.getElementById('valorPatronal').value = formatMoney(parseFloat(valPat));
    document.getElementById('valorSegurado').value = formatMoney(parseFloat(valSeg));
    document.getElementById('inputObsRec').value = obs === 'undefined' ? '' : obs;

    calcularTotalGuia();

    document.getElementById('btnSalvarRec').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar Guia';
    document.getElementById('btnCancelRec').classList.remove('hidden');
    document.getElementById('page-recolhimento').scrollTop = 0;
}

function cancelarEdicaoGuia() {
    const f = document.getElementById('formRecolhimento');
    f.reset();
    document.getElementById('idGuiaEdicao').value = "";
    document.getElementById('displayTotalGuia').innerText = 'R$ 0,00';

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaRec').value = mesAtualFmt;

    document.getElementById('btnSalvarRec').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Salvar Guia';
    document.getElementById('btnCancelRec').classList.add('hidden');
}

function excluirGuia(id) {
    sysConfirm('Excluir Guia', 'Deseja eliminar permanentemente esta guia de recolhimento?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoGuias();
        }).excluirRecolhimento(id);
    });
}

// =============================================================================
// VISUALIZAÇÃO DE DETALHES (MODAL)
// =============================================================================

function visualizarDetalhesGuia(id) {
    const guia = dadosGuiasCache.find(function(item) { return item[0] === id; });
    if (!guia) return;

    const comp = formatarCompetencia(guia[1]);
    const dataLanc = formatarDataBR(guia[2]);
    const recurso = guia[3];
    const tipoGuia = guia[4];
    const basePat = parseMoney(guia[5]);
    const baseSeg = parseMoney(guia[6]);
    const valPat = parseMoney(guia[7]);
    const valSeg = parseMoney(guia[8]);
    const valTotal = parseMoney(guia[9]);
    const status = guia[10] || 'PENDENTE';
    const obs = guia[13] || 'Sem observações.';
    const idReg = guia[0];

    let statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
    let dotColor = 'bg-amber-500';
    if (status === 'PAGO') {
        statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        dotColor = 'bg-emerald-500';
    } else if (status === 'PARCIAL') {
        statusColor = 'bg-blue-100 text-blue-700 border-blue-200';
        dotColor = 'bg-blue-500';
    }

    const modalId = 'modal-guia-' + Date.now();

    const modalHTML = 
        '<div class="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" id="' + modalId + '">' +
          '<div class="fixed inset-0 bg-slate-900/75 transition-opacity backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>' +
          '<div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">' +
            '<div class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">' +
                '<div class="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">' +
                  '<div class="flex items-center gap-4">' +
                    '<div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">' +
                       '<i class="fa-solid fa-file-invoice-dollar text-lg"></i>' +
                    '</div>' +
                    '<div class="text-left">' +
                       '<p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Competência</p>' +
                       '<h2 class="text-2xl font-black text-slate-800 leading-none">' + comp + '</h2>' +
                    '</div>' +
                  '</div>' +
                  '<div class="text-right">' +
                     '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ' + statusColor + ' mb-1">' +
                        '<div class="w-1.5 h-1.5 rounded-full ' + dotColor + ' animate-pulse"></div>' +
                        status +
                     '</span>' +
                     '<p class="text-[10px] text-slate-400 font-medium">Ref: ' + tipoGuia + '</p>' +
                  '</div>' +
                '</div>' +
                '<div class="px-8 py-6 space-y-6">' +
                   '<div class="text-center">' +
                      '<span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recurso / Fundo</span>' +
                      '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">' +
                         '<span class="font-bold text-blue-800 text-sm flex items-center justify-center gap-2">' +
                             '<i class="fa-solid fa-landmark text-blue-400 text-xs"></i>' +
                             recurso +
                         '</span>' +
                      '</div>' +
                   '</div>' +
                   '<div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">' +
                      '<table class="w-full text-sm">' +
                         '<thead class="bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">' +
                            '<tr>' +
                               '<th class="px-5 py-2 text-left">Descrição</th>' +
                               '<th class="px-5 py-2 text-right">Base Cálculo</th>' +
                               '<th class="px-5 py-2 text-right bg-slate-50/50">Valor</th>' +
                            '</tr>' +
                         '</thead>' +
                         '<tbody class="divide-y divide-slate-100">' +
                            '<tr>' +
                               '<td class="px-5 py-3 font-medium text-slate-600">Contribuição Patronal</td>' +
                               '<td class="px-5 py-3 text-right font-mono text-xs text-slate-500">' + formatMoney(basePat) + '</td>' +
                               '<td class="px-5 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">' + formatMoney(valPat) + '</td>' +
                            '</tr>' +
                            '<tr>' +
                               '<td class="px-5 py-3 font-medium text-slate-600">Contribuição do Segurado</td>' +
                               '<td class="px-5 py-3 text-right font-mono text-xs text-slate-500">' + formatMoney(baseSeg) + '</td>' +
                               '<td class="px-5 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">' + formatMoney(valSeg) + '</td>' +
                            '</tr>' +
                         '</tbody>' +
                         '<tfoot class="bg-slate-800 text-white border-t border-slate-800">' +
                            '<tr>' +
                               '<td colspan="2" class="px-5 py-3 text-right text-xs uppercase tracking-wide font-bold text-slate-400">Total da Guia</td>' +
                               '<td class="px-5 py-3 text-right font-black text-xl tracking-tight bg-slate-900/50">' + formatMoney(valTotal) + '</td>' +
                            '</tr>' +
                         '</tfoot>' +
                      '</table>' +
                   '</div>' +
                   (obs !== 'Sem observações.' && obs !== '-' ? 
                   '<div class="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">' +
                      '<span class="font-bold block mb-0.5 text-amber-700 uppercase text-[10px]">Observações:</span>' +
                      obs +
                   '</div>' : '') +
                   '<div class="text-[9px] text-center text-slate-300 font-mono pt-2 border-t border-slate-50">' +
                      'ID REGISTRO: ' + idReg + ' • LANÇAMENTO: ' + dataLanc +
                   '</div>' +
                '</div>' +
                '<div class="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">' +
                    '<button onclick="fecharModalDinamico(\'' + modalId + '\')" class="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition">' +
                       'Fechar Detalhes' +
                    '</button>' +
                '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Helper para fechar modal dinâmico ---
window.fecharModalDinamico = function(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
};

// =============================================================================
// FILTRO E LISTAGEM
// =============================================================================

function limparFiltroHistoricoRec() {
    const filtro = document.getElementById('filtroHistoricoRec');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoGuias();
    }
}

function carregarHistoricoGuias() {
    const tbody = document.getElementById('listaHistoricoGuias');
    const tfootTotal = document.getElementById('totalCompetenciaGuias');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">A carregar registos...</td></tr>';
    }

    const filtroCompetencia = document.getElementById('filtroHistoricoRec') ? document.getElementById('filtroHistoricoRec').value : '';

    google.script.run.withSuccessHandler(function(lista) {
        dadosGuiasCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400">Nenhuma guia lançada até o momento.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                const compRegistro = String(row[1]).replace(/'/g, "");

                if (filtroCompetencia && compRegistro !== filtroCompetencia) return;

                contador++;
                const valorRow = parseMoney(row[9]);
                totalAcumulado += valorRow;

                const compFmt = formatarCompetencia(row[1]);
                const status = row[10] || 'PENDENTE';
                const obsSafe = String(row[13] || '').replace(/'/g, "\\'").replace(/\n/g, " ");

                let badgeClass = 'status-pendente';
                if (status === 'PAGO') badgeClass = 'status-pago';
                else if (status === 'PARCIAL') badgeClass = 'status-parcial';

                const isPago = (status === 'PAGO' || status === 'PARCIAL');

                const idSafe = row[0];
                const compRaw = compRegistro;
                const recursoSafe = String(row[3]).replace(/'/g, "\\'");
                const tipoSafe = String(row[4]).replace(/'/g, "\\'");

                const btnEdit = isPago
                    ? '<button class="p-2 text-gray-300 cursor-not-allowed" title="Pago - Não editável"><i class="fa-solid fa-pencil"></i></button>'
                    : '<button onclick="prepararEdicaoGuia(\'' + idSafe + '\', \'' + compRaw + '\', \'' + tipoSafe + '\', \'' + recursoSafe + '\', \'' + parseMoney(row[5]) + '\', \'' + parseMoney(row[6]) + '\', \'' + parseMoney(row[7]) + '\', \'' + parseMoney(row[8]) + '\', \'' + obsSafe + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>';

                const btnDel = isPago
                    ? '<button class="p-2 text-gray-300 cursor-not-allowed" title="Pago - Não excluível"><i class="fa-solid fa-trash"></i></button>'
                    : '<button onclick="excluirGuia(\'' + idSafe + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>';

                const tr = document.createElement('tr');
                tr.className = "hover:bg-blue-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">' + row[4] + '</span></td>' +
                    '<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-blue-700 font-mono">' + formatMoney(valorRow) + '</td>' +
                    '<td class="px-4 py-4 text-center"><span class="status-badge ' + badgeClass + '">' + status + '</span></td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="visualizarDetalhesGuia(\'' + idSafe + '\')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>' +
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
    }).buscarGuiasRecolhimento();
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL
// =============================================================================

function renderizarRelatorioGuias() {
    const tbody = document.getElementById('tabelaRelatorioGuias');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

    google.script.run.withSuccessHandler(function(recursos) {
        cacheRecursosRelatorio = recursos || [];
        google.script.run.withSuccessHandler(function(dados) {
            cacheDadosRelatorioRec = dados || [];
            popularFiltroAnosRec(cacheDadosRelatorioRec);
            construirMatrizAnualRec();
        }).buscarGuiasRecolhimento();
    }).getRecursos();
}

function popularFiltroAnosRec(lista) {
    const selectAno = document.getElementById('filtroAnoRec');
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

function construirMatrizAnualRec() {
    const anoFiltro = document.getElementById('filtroAnoRec').value;
    const tbody = document.getElementById('tabelaRelatorioGuias');
    const table = tbody ? tbody.parentElement : null;
    const thead = table ? table.querySelector('thead') : null;
    const tfoot = table ? table.querySelector('tfoot') : null;

    if (!thead || !tbody || !tfoot) return;

    // Cabeçalho
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[200px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Recurso / Fundo</th>';
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[100px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[120px]">Total Anual</th></tr>';
    thead.innerHTML = headerHTML;

    // Matriz de dados
    const matriz = {};
    cacheRecursosRelatorio.forEach(function(recurso) {
        matriz[recurso] = Array(12).fill(0);
    });

    cacheDadosRelatorioRec.forEach(function(row) {
        if (!row[1]) return;
        const comp = String(row[1]).replace(/'/g, "");
        const partes = comp.split('-');
        const ano = partes[0];
        const mes = partes[1];

        if (ano === anoFiltro) {
            const recurso = row[3];
            const valor = parseMoney(row[9]);
            const mesIndex = parseInt(mes) - 1;

            if (mesIndex >= 0 && mesIndex <= 11) {
                if (!matriz[recurso]) matriz[recurso] = Array(12).fill(0);
                matriz[recurso][mesIndex] = roundMoney(matriz[recurso][mesIndex] + valor);
            }
        }
    });

    // Corpo da tabela
    tbody.innerHTML = '';
    const totaisMes = Array(12).fill(0);
    let totalGeralAno = 0;

    const chaves = Object.keys(matriz).sort();
    chaves.forEach(function(recurso) {
        let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[200px] sticky left-0 bg-white z-10 shadow-sm" title="' + recurso + '">' + recurso + '</td>';
        let totalLinha = 0;

        for (let i = 0; i < 12; i++) {
            const val = matriz[recurso][i];
            totaisMes[i] = roundMoney(totaisMes[i] + val);
            totalLinha = roundMoney(totalLinha + val);

            const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
            linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
        }

        totalGeralAno = roundMoney(totalGeralAno + totalLinha);
        linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-blue-700 bg-blue-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-blue-50/20 transition";
        tr.innerHTML = linhaHTML;
        tbody.appendChild(tr);
    });

    // Rodapé
    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-blue-600 bg-blue-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchRecView = switchRecView;
window.carregarRecursos = carregarRecursos;
window.carregarListaRecursos = carregarListaRecursos;
window.addRecurso = addRecurso;
window.removerRecurso = removerRecurso;
window.calcularTotalGuia = calcularTotalGuia;
window.handleSaveRecolhimento = handleSaveRecolhimento;
window.prepararEdicaoGuia = prepararEdicaoGuia;
window.cancelarEdicaoGuia = cancelarEdicaoGuia;
window.excluirGuia = excluirGuia;
window.visualizarDetalhesGuia = visualizarDetalhesGuia;
window.limparFiltroHistoricoRec = limparFiltroHistoricoRec;
window.carregarHistoricoGuias = carregarHistoricoGuias;
window.renderizarRelatorioGuias = renderizarRelatorioGuias;
window.popularFiltroAnosRec = popularFiltroAnosRec;
window.construirMatrizAnualRec = construirMatrizAnualRec;
