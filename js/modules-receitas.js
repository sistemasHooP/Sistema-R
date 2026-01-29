// =============================================================================
// MODULES-RECEITAS.JS - MÓDULOS DE RECEITAS DO SISTEMA RPPS
// Versão: 1.0.0 - Migração GitHub
// Contém: Recolhimento, Imposto de Renda, Previdência Municipal, Consignados
// =============================================================================

// =============================================================================
// MÓDULO 1: RECOLHIMENTO (GUIAS)
// =============================================================================

// --- Cache de Dados ---
let dadosGuiasCache = [];

// --- Navegação Interna ---
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

// --- Cadastros Auxiliares (Recursos) ---
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

// --- Cálculo Automático do Total ---
function calcularTotalGuia() {
    const patronal = parseMoney(document.getElementById('valorPatronal').value);
    const segurado = parseMoney(document.getElementById('valorSegurado').value);
    const total = roundMoney(patronal + segurado);
    document.getElementById('displayTotalGuia').innerText = formatMoney(total);
}

// --- CRUD Operacional ---
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

// --- Visualização de Detalhes (Modal) ---
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

    const modalHTML = '\
        <div class="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true" id="' + modalId + '">\
          <div class="fixed inset-0 bg-slate-900/75 transition-opacity backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>\
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">\
            <div class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">\
                <div class="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">\
                  <div class="flex items-center gap-4">\
                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">\
                       <i class="fa-solid fa-file-invoice-dollar text-lg"></i>\
                    </div>\
                    <div class="text-left">\
                       <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Competência</p>\
                       <h2 class="text-2xl font-black text-slate-800 leading-none">' + comp + '</h2>\
                    </div>\
                  </div>\
                  <div class="text-right">\
                     <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ' + statusColor + ' mb-1">\
                        <div class="w-1.5 h-1.5 rounded-full ' + dotColor + ' animate-pulse"></div>\
                        ' + status + '\
                     </span>\
                     <p class="text-[10px] text-slate-400 font-medium">Ref: ' + tipoGuia + '</p>\
                  </div>\
                </div>\
                <div class="px-8 py-6 space-y-6">\
                   <div class="text-center">\
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recurso / Fundo</span>\
                      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">\
                         <span class="font-bold text-blue-800 text-sm flex items-center justify-center gap-2">\
                             <i class="fa-solid fa-landmark text-blue-400 text-xs"></i>\
                             ' + recurso + '\
                         </span>\
                      </div>\
                   </div>\
                   <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">\
                      <table class="w-full text-sm">\
                         <thead class="bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">\
                            <tr>\
                               <th class="px-5 py-2 text-left">Descrição</th>\
                               <th class="px-5 py-2 text-right">Base Cálculo</th>\
                               <th class="px-5 py-2 text-right bg-slate-50/50">Valor</th>\
                            </tr>\
                         </thead>\
                         <tbody class="divide-y divide-slate-100">\
                            <tr>\
                               <td class="px-5 py-3 font-medium text-slate-600">Contribuição Patronal</td>\
                               <td class="px-5 py-3 text-right font-mono text-xs text-slate-500">' + formatMoney(basePat) + '</td>\
                               <td class="px-5 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">' + formatMoney(valPat) + '</td>\
                            </tr>\
                            <tr>\
                               <td class="px-5 py-3 font-medium text-slate-600">Contribuição do Segurado</td>\
                               <td class="px-5 py-3 text-right font-mono text-xs text-slate-500">' + formatMoney(baseSeg) + '</td>\
                               <td class="px-5 py-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">' + formatMoney(valSeg) + '</td>\
                            </tr>\
                         </tbody>\
                         <tfoot class="bg-slate-800 text-white border-t border-slate-800">\
                            <tr>\
                               <td colspan="2" class="px-5 py-3 text-right text-xs uppercase tracking-wide font-bold text-slate-400">Total da Guia</td>\
                               <td class="px-5 py-3 text-right font-black text-xl tracking-tight bg-slate-900/50">' + formatMoney(valTotal) + '</td>\
                            </tr>\
                         </tfoot>\
                      </table>\
                   </div>\
                   ' + (obs !== '-' ? '\
                   <div class="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">\
                      <span class="font-bold block mb-0.5 text-amber-700 uppercase text-[10px]">Observações:</span>\
                      ' + obs + '\
                   </div>' : '') + '\
                   <div class="text-[9px] text-center text-slate-300 font-mono pt-2 border-t border-slate-50">\
                      ID REGISTRO: ' + idReg + ' • LANÇAMENTO: ' + dataLanc + '\
                   </div>\
                </div>\
                <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">\
                    <button onclick="fecharModalDinamico(\'' + modalId + '\')" class="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition">\
                       Fechar Detalhes\
                    </button>\
                </div>\
            </div>\
          </div>\
        </div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Helper para fechar modal dinâmico ---
window.fecharModalDinamico = function(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
};

// --- Filtro e Listagem ---
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

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">A carregar registos...</td></tr>';

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
                tr.innerHTML = '\
                    <td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>\
                    <td class="px-4 py-4"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">' + row[4] + '</span></td>\
                    <td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>\
                    <td class="px-4 py-4 text-right font-black text-blue-700 font-mono">' + formatMoney(valorRow) + '</td>\
                    <td class="px-4 py-4 text-center"><span class="status-badge ' + badgeClass + '">' + status + '</span></td>\
                    <td class="pr-6 py-4 text-center">\
                        <div class="flex items-center justify-center gap-1">\
                            <button onclick="visualizarDetalhesGuia(\'' + idSafe + '\')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>\
                            ' + btnEdit + '\
                            ' + btnDel + '\
                        </div>\
                    </td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarGuiasRecolhimento();
}

// --- Gerencial: Matriz Anual ---
let cacheRecursosRelatorio = [];
let cacheDadosRelatorioRec = [];

function renderizarRelatorioGuias() {
    const tbody = document.getElementById('tabelaRelatorioGuias');
    if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';

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

    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[200px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Recurso / Fundo</th>';
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[100px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[120px]">Total Anual</th></tr>';
    thead.innerHTML = headerHTML;

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

    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-blue-600 bg-blue-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// MÓDULO 2: IMPOSTO DE RENDA (IRRF)
// =============================================================================

let listaHistoricoIRCache = [];

// --- Navegação Interna ---
function switchIRView(view) {
    document.getElementById('view-ir-operacional').classList.add('hidden');
    document.getElementById('view-ir-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-ir-operacional');
    const btnGer = document.getElementById('tab-ir-gerencial');

    const styleInactive = "px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-6 py-2 rounded-lg text-sm font-bold transition bg-pink-50 text-pink-700 shadow-sm border border-pink-100";

    btnOp.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-ir-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarHistoricoIR();
    } else {
        document.getElementById('view-ir-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioIR();
    }
}

// --- Cadastros Auxiliares (Origens IR) ---
function carregarOrigensIR() {
    google.script.run.withSuccessHandler(function(list) {
        const sel = document.getElementById('selectOrigemIR');
        const ul = document.getElementById('listaOrigensIR');

        if (sel) {
            const valorAtual = sel.value;
            sel.innerHTML = '<option value="">Selecione...</option>';
            if (list) {
                list.forEach(function(r) {
                    const opt = document.createElement('option');
                    opt.value = r;
                    opt.innerText = r;
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }

        if (ul) {
            ul.innerHTML = '';
            if (list && list.length > 0) {
                list.forEach(function(r) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-slate-50 border-b border-slate-100 last:border-0";
                    li.innerHTML = '<span class="text-sm font-medium text-slate-700">' + r + '</span>' +
                        '<button onclick="removerOrigemIR(\'' + r + '\')" class="text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>';
                    ul.appendChild(li);
                });
            } else {
                ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhuma origem cadastrada.</li>';
            }
        }
    }).getOrigensIR();
}

function addOrigemIR() {
    const i = document.getElementById('novaOrigemIR');
    if (!i.value) return;

    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarOrigensIR();
    }).addOrigemIR(i.value);
}

function removerOrigemIR(n) {
    sysConfirm('Excluir Origem', 'Deseja excluir esta origem de IR?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarOrigensIR();
        }).removeOrigemIR(n);
    });
}

// --- CRUD Operacional IR ---
function handleSaveIR(e) {
    e.preventDefault();
    const f = document.getElementById('formIR');
    const idEdicao = document.getElementById('idIRRFEdicao').value;

    const comp = formatarCompetencia(f.competencia.value);
    const valor = f.valorRetido.value;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const acaoMsg = idEdicao ? 'atualizar este lançamento de IRRF?' : 'lançar este novo imposto de renda?';
    const msg = 'Fonte: ' + f.origem.value + '\nCompetência: ' + comp + '\nValor Retido: ' + valor + '\n\nDeseja realmente ' + acaoMsg;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            tipoIR: f.tipoIR.value,
            origem: f.origem.value,
            valorRetido: f.valorRetido.value,
            dataRepasse: f.dataRepasse.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoIR();
                carregarHistoricoIR();
            }
        }).salvarImpostoRenda(dados);
    });
}

function prepararEdicaoIR(id, comp, origem, tipo, valor, repasse, obs) {
    document.getElementById('idIRRFEdicao').value = id;
    document.getElementById('inputCompetenciaIR').value = comp;
    document.getElementById('selectOrigemIR').value = origem;
    document.getElementById('selectTipoIR').value = tipo;

    document.getElementById('valorRetido').value = formatMoney(parseFloat(valor));

    if (repasse && repasse !== 'undefined' && repasse !== '-') {
        const partes = repasse.split('/');
        if (partes.length === 3) {
            document.getElementById('inputDataRepasse').value = partes[2] + '-' + partes[1] + '-' + partes[0];
        } else {
            document.getElementById('inputDataRepasse').value = repasse;
        }
    } else {
        document.getElementById('inputDataRepasse').value = "";
    }

    document.getElementById('inputObsIR').value = obs === 'undefined' ? '' : obs;

    document.getElementById('btnSalvarIR').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar IRRF';
    document.getElementById('btnCancelIR').classList.remove('hidden');

    document.getElementById('page-imposto-renda').scrollTop = 0;
}

function cancelarEdicaoIR() {
    const f = document.getElementById('formIR');
    f.reset();
    document.getElementById('idIRRFEdicao').value = "";

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaIR').value = mesAtualFmt;

    document.getElementById('btnSalvarIR').innerHTML = '<i class="fa-solid fa-check-to-slot mr-2"></i> Lançar IRRF';
    document.getElementById('btnCancelIR').classList.add('hidden');
}

function excluirIR(id) {
    sysConfirm('Excluir IRRF', 'Deseja eliminar permanentemente este registo de retenção?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoIR();
        }).excluirImpostoRenda(id);
    });
}

// --- Visualização de Detalhes IR ---
function visualizarDetalhesIR(id) {
    const ir = listaHistoricoIRCache.find(function(item) { return item[0] === id; });
    if (!ir) return;

    const comp = formatarCompetencia(ir[1]);
    const dataLanc = formatarDataBR(ir[2]);
    const origem = ir[3];
    const tipo = ir[4];
    const valor = parseMoney(ir[5]);
    const repasse = ir[6] ? formatarDataBR(ir[6]) : '-';
    const obs = ir[7] || 'Sem observações.';
    const idReg = ir[0];

    let status = (repasse !== '-' && repasse) ? 'REPASSADO' : 'RETIDO/PENDENTE';
    let statusColor = status === 'REPASSADO' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-pink-100 text-pink-700 border-pink-200';
    let dotColor = status === 'REPASSADO' ? 'bg-emerald-500' : 'bg-pink-500';

    const modalId = 'modal-ir-' + Date.now();

    const modalHTML = '\
        <div class="fixed inset-0 z-[100] overflow-y-auto" id="' + modalId + '">\
          <div class="fixed inset-0 bg-slate-900/75 transition-opacity backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>\
          <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">\
            <div class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">\
                <div class="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">\
                  <div class="flex items-center gap-4">\
                    <div class="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shadow-sm">\
                       <i class="fa-solid fa-scale-balanced text-lg"></i>\
                    </div>\
                    <div class="text-left">\
                       <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Competência</p>\
                       <h2 class="text-2xl font-black text-slate-800 leading-none">' + comp + '</h2>\
                    </div>\
                  </div>\
                  <div class="text-right">\
                     <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ' + statusColor + ' mb-1">\
                        <div class="w-1.5 h-1.5 rounded-full ' + dotColor + ' animate-pulse"></div>\
                        ' + status + '\
                     </span>\
                     <p class="text-[10px] text-slate-400 font-medium">Ref: ' + tipo + '</p>\
                  </div>\
                </div>\
                <div class="px-8 py-6 space-y-6">\
                   <div class="text-center">\
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fonte Retentora</span>\
                      <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">\
                         <span class="font-bold text-slate-700 text-sm flex items-center justify-center gap-2">\
                             <i class="fa-solid fa-building-user text-slate-400 text-xs"></i>\
                             ' + origem + '\
                         </span>\
                      </div>\
                   </div>\
                   <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">\
                      <table class="w-full text-sm">\
                         <thead class="bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">\
                            <tr>\
                               <th class="px-5 py-2 text-left">Descrição</th>\
                               <th class="px-5 py-2 text-right bg-slate-50/50">Valor</th>\
                            </tr>\
                         </thead>\
                         <tbody class="divide-y divide-slate-100">\
                            <tr>\
                               <td class="px-5 py-3 font-bold text-slate-700 bg-slate-50/30">Imposto Retido (IRRF)</td>\
                               <td class="px-5 py-3 text-right font-mono font-bold text-pink-700 bg-pink-50/10 text-lg">' + formatMoney(valor) + '</td>\
                            </tr>\
                         </tbody>\
                         <tfoot class="bg-slate-800 text-white border-t border-slate-800">\
                            <tr>\
                               <td class="px-5 py-3 text-right text-xs uppercase tracking-wide font-bold text-slate-400">Total a Repassar</td>\
                               <td class="px-5 py-3 text-right font-black text-xl tracking-tight bg-slate-900/50">' + formatMoney(valor) + '</td>\
                            </tr>\
                         </tfoot>\
                      </table>\
                   </div>\
                   <div class="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">\
                       <span class="text-xs font-bold text-slate-500 uppercase">Data do Repasse</span>\
                       <span class="font-mono font-bold text-slate-700">' + repasse + '</span>\
                   </div>\
                   ' + (obs !== '-' ? '\
                   <div class="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-900">\
                      <span class="font-bold block mb-0.5 text-amber-700 uppercase text-[10px]">Observações:</span>\
                      ' + obs + '\
                   </div>' : '') + '\
                   <div class="text-[9px] text-center text-slate-300 font-mono pt-2 border-t border-slate-50">\
                      ID REGISTRO: ' + idReg + ' • LANÇAMENTO: ' + dataLanc + '\
                   </div>\
                </div>\
                <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">\
                    <button onclick="fecharModalDinamico(\'' + modalId + '\')" class="bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition">\
                       Fechar Detalhes\
                    </button>\
                </div>\
            </div>\
          </div>\
        </div>';

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- Filtro e Listagem IR ---
function limparFiltroHistoricoIR() {
    const filtro = document.getElementById('filtroHistoricoIR');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoIR();
    }
}

function carregarHistoricoIR() {
    const tbody = document.getElementById('listaHistoricoIR');
    const tfootTotal = document.getElementById('totalCompIRRF');

    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">A consultar base de dados...</td></tr>';

    const filtroCompetencia = document.getElementById('filtroHistoricoIR') ? document.getElementById('filtroHistoricoIR').value : '';

    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoIRCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhum lançamento encontrado.</td></tr>';
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
                const dataRepasse = row[6] ? formatarDataBR(row[6]) : '-';
                const obsSafe = String(row[7] || '').replace(/'/g, "\\'").replace(/\n/g, " ");

                const idSafe = row[0];
                const compRaw = compRegistro;
                const origemSafe = String(row[3]).replace(/'/g, "\\'");
                const tipoSafe = String(row[4]).replace(/'/g, "\\'");

                const tr = document.createElement('tr');
                tr.className = "hover:bg-pink-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = '\
                    <td class="pl-8 py-4 font-bold text-slate-700">' + compFmt + '</td>\
                    <td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>\
                    <td class="px-4 py-4 text-[10px] uppercase font-bold text-slate-400">' + row[4] + '</td>\
                    <td class="px-4 py-4 text-right font-black text-pink-700 font-mono">' + formatMoney(valorRow) + '</td>\
                    <td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>\
                    <td class="pr-8 py-4 text-center">\
                        <div class="flex items-center justify-center gap-1">\
                            <button onclick="visualizarDetalhesIR(\'' + idSafe + '\')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>\
                            <button onclick="prepararEdicaoIR(\'' + idSafe + '\', \'' + compRaw + '\', \'' + origemSafe + '\', \'' + tipoSafe + '\', \'' + valorRow + '\', \'' + dataRepasse + '\', \'' + obsSafe + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>\
                            <button onclick="excluirIR(\'' + idSafe + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>\
                        </div>\
                    </td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarImpostoRenda();
}

// --- Gerencial: Matriz IR ---
let cacheDadosIRRelatorio = [];
let cacheOrigensRelatorio = [];

function renderizarRelatorioIR() {
    const tbody = document.getElementById('tabelaRelatorioIR');
    if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';

    google.script.run.withSuccessHandler(function(origens) {
        cacheOrigensRelatorio = origens || [];
        google.script.run.withSuccessHandler(function(dados) {
            cacheDadosIRRelatorio = dados || [];
            popularFiltroAnosIR(cacheDadosIRRelatorio);
            construirMatrizAnualIR();
        }).buscarImpostoRenda();
    }).getOrigensIR();
}

function popularFiltroAnosIR(lista) {
    const selectAno = document.getElementById('filtroAnoIR');
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

function construirMatrizAnualIR() {
    const anoFiltro = document.getElementById('filtroAnoIR').value;
    const tbody = document.getElementById('tabelaRelatorioIR');
    const table = tbody ? tbody.parentElement : null;
    const thead = table ? table.querySelector('thead') : null;
    const tfoot = table ? table.querySelector('tfoot') : null;

    if (!thead || !tbody || !tfoot) return;

    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[220px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Origem / Fonte Retentora</th>';
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[110px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[130px]">Total Acumulado</th></tr>';
    thead.innerHTML = headerHTML;

    const matriz = {};
    cacheOrigensRelatorio.forEach(function(origem) {
        matriz[origem] = Array(12).fill(0);
    });

    cacheDadosIRRelatorio.forEach(function(row) {
        if (!row[1]) return;
        const comp = String(row[1]).replace(/'/g, "");
        const partes = comp.split('-');
        const ano = partes[0];
        const mes = partes[1];

        if (ano === anoFiltro) {
            const origem = row[3];
            const valor = parseMoney(row[5]);
            const mesIndex = parseInt(mes) - 1;

            if (mesIndex >= 0 && mesIndex <= 11) {
                if (!matriz[origem]) matriz[origem] = Array(12).fill(0);
                matriz[origem][mesIndex] = roundMoney(matriz[origem][mesIndex] + valor);
            }
        }
    });

    tbody.innerHTML = '';
    const totaisMes = Array(12).fill(0);
    let totalGeralAno = 0;

    const chaves = Object.keys(matriz).sort();
    chaves.forEach(function(origem) {
        let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[220px] sticky left-0 bg-white z-10 shadow-sm" title="' + origem + '">' + origem + '</td>';
        let totalLinha = 0;

        for (let i = 0; i < 12; i++) {
            const val = matriz[origem][i];
            totaisMes[i] = roundMoney(totaisMes[i] + val);
            totalLinha = roundMoney(totalLinha + val);

            const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
            linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
        }

        totalGeralAno = roundMoney(totalGeralAno + totalLinha);
        linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-pink-700 bg-pink-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-pink-50/20 transition";
        tr.innerHTML = linhaHTML;
        tbody.appendChild(tr);
    });

    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal IRRF</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-pink-600 bg-pink-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// MÓDULO 3: PREVIDÊNCIA MUNICIPAL
// =============================================================================

let listaHistoricoPrevCache = [];

// --- Navegação Interna ---
function switchPrevView(view) {
    document.getElementById('view-prev-operacional').classList.add('hidden');
    document.getElementById('view-prev-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-prev-operacional');
    const btnGer = document.getElementById('tab-prev-gerencial');

    const styleInactive = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-4 py-2 rounded-lg text-sm font-bold transition bg-purple-50 text-purple-700 shadow-sm border border-purple-100";

    btnOp.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-prev-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarOrigensPrev();
        carregarHistoricoPrev();
    } else {
        document.getElementById('view-prev-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioPrev();
    }
}

// --- Cadastros Auxiliares (Origens Prev) ---
function carregarOrigensPrev() {
    google.script.run.withSuccessHandler(function(list) {
        const sel = document.getElementById('selectOrigemPrev');
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
            } else {
                ['Aposentados', 'Pensionistas', 'Decisão Judicial'].forEach(function(t) {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.innerText = t;
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }

        if (document.getElementById('listaOrigensPrev')) {
            carregarListaOrigensPrev();
        }
    }).getOrigensPrev();
}

function carregarListaOrigensPrev() {
    google.script.run.withSuccessHandler(function(list) {
        const ul = document.getElementById('listaOrigensPrev');
        if (ul) {
            ul.innerHTML = '';
            if (list && list.length > 0) {
                list.forEach(function(item) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-purple-50 border-b border-purple-100 last:border-0";
                    li.innerHTML = '<span class="text-sm font-medium text-purple-800">' + item + '</span>' +
                        '<button onclick="removerOrigemPrev(\'' + item + '\')" class="text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>';
                    ul.appendChild(li);
                });
            } else {
                ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhuma origem cadastrada.</li>';
            }
        }
    }).getOrigensPrev();
}

function addOrigemPrev() {
    const i = document.getElementById('novaOrigemPrev');
    if (!i.value) return;

    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarListaOrigensPrev();
        carregarOrigensPrev();
    }).addOrigemPrev(i.value);
}

function removerOrigemPrev(n) {
    sysConfirm('Excluir Origem', 'Deseja excluir esta origem de previdência?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarListaOrigensPrev();
            carregarOrigensPrev();
        }).removeOrigemPrev(n);
    });
}

// --- CRUD Operacional Prev ---
function handleSavePrev(e) {
    e.preventDefault();
    const f = document.getElementById('formPrev');
    const idEdicao = document.getElementById('idPrevEdicao').value;

    const comp = formatarCompetencia(f.competencia.value);
    const valor = f.valor.value;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const acaoMsg = idEdicao ? 'atualizar este registo?' : 'lançar esta receita previdenciária?';
    const msg = 'Origem: ' + f.origem.value + '\nCompetência: ' + comp + '\nValor: ' + valor + '\n\nDeseja realmente ' + acaoMsg;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            origem: f.origem.value,
            valor: f.valor.value,
            dataRepasse: f.dataRepasse.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoPrev();
                carregarHistoricoPrev();
            }
        }).salvarPrevidencia(dados);
    });
}

function prepararEdicaoPrev(id, comp, origem, valor, repasse, obs) {
    document.getElementById('idPrevEdicao').value = id;
    document.getElementById('inputCompetenciaPrev').value = comp;
    document.getElementById('selectOrigemPrev').value = origem;

    document.getElementById('valorPrev').value = formatMoney(parseFloat(valor));

    if (repasse && repasse !== 'undefined' && repasse !== '-') {
        if (repasse.includes('/')) {
            const partes = repasse.split('/');
            if (partes.length === 3) {
                document.getElementById('inputDataRepassePrev').value = partes[2] + '-' + partes[1] + '-' + partes[0];
            }
        } else if (repasse instanceof Date) {
            document.getElementById('inputDataRepassePrev').valueAsDate = repasse;
        } else {
            document.getElementById('inputDataRepassePrev').value = String(repasse).substring(0, 10);
        }
    } else {
        document.getElementById('inputDataRepassePrev').value = "";
    }

    document.getElementById('inputObsPrev').value = obs === 'undefined' ? '' : obs;

    document.getElementById('btnSalvarPrev').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar Registo';
    document.getElementById('btnCancelPrev').classList.remove('hidden');

    document.getElementById('page-prev-municipal').scrollTop = 0;
}

function cancelarEdicaoPrev() {
    const f = document.getElementById('formPrev');
    f.reset();
    document.getElementById('idPrevEdicao').value = "";

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaPrev').value = mesAtualFmt;

    document.getElementById('btnSalvarPrev').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Registrar Receita';
    document.getElementById('btnCancelPrev').classList.add('hidden');
}

function excluirPrev(id) {
    sysConfirm('Excluir Registo', 'Deseja eliminar permanentemente este registo de previdência?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoPrev();
        }).excluirPrevidencia(id);
    });
}

// --- Filtro e Listagem Prev ---
function limparFiltroHistoricoPrev() {
    const filtro = document.getElementById('filtroHistoricoPrev');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoPrev();
    }
}

function carregarHistoricoPrev() {
    const tbody = document.getElementById('listaHistoricoPrev');
    const tfootTotal = document.getElementById('totalCompPrev');

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';

    let filtroCompetencia = "";
    const elFiltro = document.getElementById('filtroHistoricoPrev');
    if (elFiltro && elFiltro.value) {
        filtroCompetencia = elFiltro.value;
    }

    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoPrevCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400">Nenhum lançamento encontrado.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                let compRegistro = String(row[1]).replace(/'/g, "").trim();
                if (compRegistro.match(/^\d{4}-\d{2}-\d{2}/)) {
                    compRegistro = compRegistro.substring(0, 7);
                } else if (row[1] instanceof Date) {
                    const y = row[1].getFullYear();
                    const m = String(row[1].getMonth() + 1).padStart(2, '0');
                    compRegistro = y + '-' + m;
                }

                if (filtroCompetencia && compRegistro !== filtroCompetencia) return;

                contador++;
                const valorRow = parseMoney(row[4]);
                totalAcumulado += valorRow;

                const compFmt = formatarCompetencia(row[1]);
                const dataRepasse = row[5] ? formatarDataBR(row[5]) : '-';

                const idSafe = row[0];
                const compRaw = compRegistro;
                const origemSafe = String(row[3]).replace(/'/g, "\\'");
                const obsSafe = String(row[6] || '').replace(/'/g, "\\'").replace(/\n/g, " ");
                const repasseSafe = row[5] ? String(row[5]) : '';

                const tr = document.createElement('tr');
                tr.className = "hover:bg-purple-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = '\
                    <td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>\
                    <td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>\
                    <td class="px-4 py-4 text-right font-black text-purple-700 font-mono">' + formatMoney(valorRow) + '</td>\
                    <td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>\
                    <td class="pr-6 py-4 text-center">\
                        <div class="flex items-center justify-center gap-2">\
                            <button onclick="prepararEdicaoPrev(\'' + idSafe + '\', \'' + compRaw + '\', \'' + origemSafe + '\', \'' + valorRow + '\', \'' + repasseSafe + '\', \'' + obsSafe + '\')" class="text-amber-600 hover:text-amber-800 transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>\
                            <button onclick="excluirPrev(\'' + idSafe + '\')" class="text-red-500 hover:text-red-700 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>\
                        </div>\
                    </td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro selecionado.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarPrevidencia();
}

// --- Gerencial: Matriz Prev ---
let cacheDadosPrevRelatorio = [];
let cacheOrigensPrevRelatorio = [];

function renderizarRelatorioPrev() {
    const tbody = document.getElementById('tabelaRelatorioPrev');
    if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';

    google.script.run.withSuccessHandler(function(origens) {
        cacheOrigensPrevRelatorio = origens || [];

        google.script.run.withSuccessHandler(function(dados) {
            cacheDadosPrevRelatorio = dados || [];
            popularFiltroAnosPrev(cacheDadosPrevRelatorio);
            construirMatrizAnualPrev();
        }).buscarPrevidencia();

    }).getOrigensPrev();
}

function popularFiltroAnosPrev(lista) {
    const selectAno = document.getElementById('filtroAnoPrev');
    if (!selectAno) return;

    const anoSelecionadoAntes = selectAno.value;
    const anosSet = new Set();
    anosSet.add(new Date().getFullYear());

    lista.forEach(function(row) {
        let s = String(row[1]).replace(/'/g, "").trim();
        if (row[1] instanceof Date) s = row[1].getFullYear().toString();

        const ano = s.substring(0, 4);
        if (!isNaN(ano) && ano.length === 4) anosSet.add(parseInt(ano));
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

function construirMatrizAnualPrev() {
    const anoFiltro = document.getElementById('filtroAnoPrev').value;
    const tbody = document.getElementById('tabelaRelatorioPrev');
    const table = tbody ? tbody.parentElement : null;
    const thead = table ? table.querySelector('thead') : null;
    const tfoot = table ? table.querySelector('tfoot') : null;

    if (!thead || !tbody || !tfoot) return;

    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[220px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Origem da Receita</th>';
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[110px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[130px]">Total Anual</th></tr>';
    thead.innerHTML = headerHTML;

    const matriz = {};

    cacheOrigensPrevRelatorio.forEach(function(origem) {
        matriz[origem] = Array(12).fill(0);
    });

    cacheDadosPrevRelatorio.forEach(function(row) {
        let comp = String(row[1]).replace(/'/g, "").trim();
        if (row[1] instanceof Date) {
            const y = row[1].getFullYear();
            const m = String(row[1].getMonth() + 1).padStart(2, '0');
            comp = y + '-' + m;
        }

        const partes = comp.split('-');
        const ano = partes[0];
        const mes = partes[1];

        if (ano === anoFiltro) {
            const origem = row[3];
            const valor = parseMoney(row[4]);
            const mesIndex = parseInt(mes) - 1;

            if (mesIndex >= 0 && mesIndex <= 11) {
                if (!matriz[origem]) matriz[origem] = Array(12).fill(0);
                matriz[origem][mesIndex] = roundMoney(matriz[origem][mesIndex] + valor);
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

    chaves.forEach(function(origem) {
        let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[220px] sticky left-0 bg-white z-10 shadow-sm" title="' + origem + '">' + origem + '</td>';
        let totalLinha = 0;

        for (let i = 0; i < 12; i++) {
            const val = matriz[origem][i];
            totaisMes[i] = roundMoney(totaisMes[i] + val);
            totalLinha = roundMoney(totalLinha + val);

            const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
            linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
        }

        totalGeralAno = roundMoney(totalGeralAno + totalLinha);
        linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-purple-700 bg-purple-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-purple-50/20 transition";
        tr.innerHTML = linhaHTML;
        tbody.appendChild(tr);
    });

    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Arrecadado</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-purple-600 bg-purple-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// MÓDULO 4: CONSIGNADOS
// =============================================================================

let listaHistoricoConsigCache = [];

// --- Navegação Interna ---
function switchConsigView(view) {
    document.getElementById('view-consig-operacional').classList.add('hidden');
    document.getElementById('view-consig-gerencial').classList.add('hidden');

    const btnOp = document.getElementById('tab-consig-operacional');
    const btnGer = document.getElementById('tab-consig-gerencial');

    const styleInactive = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-4 py-2 rounded-lg text-sm font-bold transition bg-teal-50 text-teal-700 shadow-sm border border-teal-100";

    btnOp.className = styleInactive;
    btnGer.className = styleInactive;

    if (view === 'operacional') {
        document.getElementById('view-consig-operacional').classList.remove('hidden');
        btnOp.className = styleActive;
        carregarBancosConsig();
        carregarHistoricoConsig();
    } else {
        document.getElementById('view-consig-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioConsig();
    }
}

// --- Cadastros Auxiliares (Bancos) ---
function carregarBancosConsig() {
    google.script.run.withSuccessHandler(function(list) {
        const sel = document.getElementById('selectBancoConsig');
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
            } else {
                ['Caixa Econômica', 'Banco do Brasil', 'Bradesco'].forEach(function(t) {
                    const opt = document.createElement('option');
                    opt.value = t;
                    opt.innerText = t;
                    sel.appendChild(opt);
                });
            }
            if (valorAtual) sel.value = valorAtual;
        }
    }).getBancosConsig();
}

function carregarListaBancosConsig() {
    google.script.run.withSuccessHandler(function(list) {
        const ul = document.getElementById('listaBancosConsig');
        if (ul) {
            ul.innerHTML = '';
            if (list && list.length > 0) {
                list.forEach(function(item) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-teal-50 border-b border-teal-100 last:border-0";
                    li.innerHTML = '<span class="text-sm font-medium text-teal-800">' + item + '</span>' +
                        '<button onclick="removerBancoConsig(\'' + item + '\')" class="text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>';
                    ul.appendChild(li);
                });
            } else {
                ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhum banco cadastrado.</li>';
            }
        }
    }).getBancosConsig();
}

function addBancoConsig() {
    const i = document.getElementById('novoBancoConsig');
    if (!i.value) return;

    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarListaBancosConsig();
        carregarBancosConsig();
    }).addBancoConsig(i.value);
}

function removerBancoConsig(n) {
    sysConfirm('Excluir Banco', 'Deseja excluir este banco da lista?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarListaBancosConsig();
            carregarBancosConsig();
        }).removeBancoConsig(n);
    });
}

// --- CRUD Operacional Consig ---
function handleSaveConsig(e) {
    e.preventDefault();
    const f = document.getElementById('formConsig');
    const idEdicao = document.getElementById('idConsigEdicao').value;

    const comp = formatarCompetencia(f.competencia.value);
    const valor = f.valor.value;

    const tituloMsg = idEdicao ? 'Confirmar Alteração' : 'Confirmar Lançamento';
    const acaoMsg = idEdicao ? 'atualizar este repasse?' : 'lançar este repasse de consignado?';
    const msg = 'Banco: ' + f.banco.value + '\nCompetência: ' + comp + '\nValor: ' + valor + '\n\nDeseja realmente ' + acaoMsg;

    sysConfirm(tituloMsg, msg, function() {
        toggleLoading(true);

        const dados = {
            id: idEdicao,
            competencia: f.competencia.value,
            banco: f.banco.value,
            valor: f.valor.value,
            dataRepasse: f.dataRepasse.value,
            observacoes: f.observacoes.value
        };

        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

            if (res.success) {
                cancelarEdicaoConsig();
                carregarHistoricoConsig();
            }
        }).salvarConsignado(dados);
    });
}

function prepararEdicaoConsig(id, comp, banco, valor, repasse, obs) {
    document.getElementById('idConsigEdicao').value = id;
    document.getElementById('inputCompetenciaConsig').value = comp;
    document.getElementById('selectBancoConsig').value = banco;

    document.getElementById('valorConsig').value = formatMoney(parseFloat(valor));

    if (repasse && repasse !== 'undefined' && repasse !== '-') {
        if (repasse.includes('/')) {
            const partes = repasse.split('/');
            if (partes.length === 3) {
                document.getElementById('inputDataRepasseConsig').value = partes[2] + '-' + partes[1] + '-' + partes[0];
            }
        } else if (repasse instanceof Date) {
            document.getElementById('inputDataRepasseConsig').valueAsDate = repasse;
        } else {
            document.getElementById('inputDataRepasseConsig').value = String(repasse).substring(0, 10);
        }
    } else {
        document.getElementById('inputDataRepasseConsig').value = "";
    }

    document.getElementById('inputObsConsig').value = obs === 'undefined' ? '' : obs;

    document.getElementById('btnSalvarConsig').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Atualizar Repasse';
    document.getElementById('btnCancelConsig').classList.remove('hidden');

    document.getElementById('page-consignados').scrollTop = 0;
}

function cancelarEdicaoConsig() {
    const f = document.getElementById('formConsig');
    f.reset();
    document.getElementById('idConsigEdicao').value = "";

    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    document.getElementById('inputCompetenciaConsig').value = mesAtualFmt;

    document.getElementById('btnSalvarConsig').innerHTML = '<i class="fa-solid fa-check mr-2"></i> Lançar Repasse';
    document.getElementById('btnCancelConsig').classList.add('hidden');
}

function excluirConsig(id) {
    sysConfirm('Excluir Repasse', 'Deseja eliminar permanentemente este registro?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) carregarHistoricoConsig();
        }).excluirConsignado(id);
    });
}

// --- Filtro e Listagem Consig ---
function limparFiltroHistoricoConsig() {
    const filtro = document.getElementById('filtroHistoricoConsig');
    if (filtro) {
        filtro.value = '';
        carregarHistoricoConsig();
    }
}

function carregarHistoricoConsig() {
    const tbody = document.getElementById('listaHistoricoConsig');
    const tfootTotal = document.getElementById('totalCompConsig');

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';

    let filtroCompetencia = "";
    const elFiltro = document.getElementById('filtroHistoricoConsig');
    if (elFiltro && elFiltro.value) {
        filtroCompetencia = elFiltro.value;
    }

    google.script.run.withSuccessHandler(function(lista) {
        listaHistoricoConsigCache = lista || [];

        if (tbody) {
            tbody.innerHTML = '';
            let totalAcumulado = 0;
            let contador = 0;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400">Nenhum lançamento encontrado.</td></tr>';
                if (tfootTotal) tfootTotal.innerText = 'R$ 0,00';
                return;
            }

            lista.forEach(function(row) {
                let compRegistro = String(row[1]).replace(/'/g, "").trim();
                if (compRegistro.match(/^\d{4}-\d{2}-\d{2}/)) {
                    compRegistro = compRegistro.substring(0, 7);
                } else if (row[1] instanceof Date) {
                    const y = row[1].getFullYear();
                    const m = String(row[1].getMonth() + 1).padStart(2, '0');
                    compRegistro = y + '-' + m;
                }

                if (filtroCompetencia && compRegistro !== filtroCompetencia) return;

                contador++;
                const valorRow = parseMoney(row[4]);
                totalAcumulado += valorRow;

                const compFmt = formatarCompetencia(row[1]);
                const dataRepasse = row[5] ? formatarDataBR(row[5]) : '-';

                const idSafe = row[0];
                const compRaw = compRegistro;
                const bancoSafe = String(row[3]).replace(/'/g, "\\'");
                const obsSafe = String(row[6] || '').replace(/'/g, "\\'").replace(/\n/g, " ");
                const repasseSafe = row[5] ? String(row[5]) : '';

                const tr = document.createElement('tr');
                tr.className = "hover:bg-teal-50/30 border-b border-slate
-100 transition group";
tr.innerHTML = '
<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>
<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>
<td class="px-4 py-4 text-right font-black text-teal-700 font-mono">' + formatMoney(valorRow) + '</td>
<td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>
<td class="pr-6 py-4 text-center">
<div class="flex items-center justify-center gap-2">
<button onclick="prepararEdicaoConsig(\'' + idSafe + '\', \'' + compRaw + '\', \'' + bancoSafe + '\', \'' + valorRow + '\', \'' + repasseSafe + '\', \'' + obsSafe + '\')" class="text-blue-600 hover:text-blue-800 transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>
<button onclick="excluirConsig(\'' + idSafe + '\')" class="text-red-500 hover:text-red-700 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
</div>
</td>';
tbody.appendChild(tr);
});
        if (contador === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro selecionado.</td></tr>';
        }

        if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
    }
}).buscarConsignados();
}
// --- Gerencial: Matriz Consig ---
let cacheDadosConsigRelatorio = [];
let cacheBancosRelatorio = [];
function renderizarRelatorioConsig() {
const tbody = document.getElementById('tabelaRelatorioConsig');
if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
google.script.run.withSuccessHandler(function(bancos) {
    cacheBancosRelatorio = bancos || [];

    google.script.run.withSuccessHandler(function(dados) {
        cacheDadosConsigRelatorio = dados || [];
        popularFiltroAnosConsig(cacheDadosConsigRelatorio);
        construirMatrizAnualConsig();
    }).buscarConsignados();

}).getBancosConsig();
}
function popularFiltroAnosConsig(lista) {
const selectAno = document.getElementById('filtroAnoConsig');
if (!selectAno) return;
const anoSelecionadoAntes = selectAno.value;
const anosSet = new Set();
anosSet.add(new Date().getFullYear());

lista.forEach(function(row) {
    let s = String(row[1]).replace(/'/g, "").trim();
    if (row[1] instanceof Date) s = row[1].getFullYear().toString();

    const ano = s.substring(0, 4);
    if (!isNaN(ano) && ano.length === 4) anosSet.add(parseInt(ano));
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
function construirMatrizAnualConsig() {
const anoFiltro = document.getElementById('filtroAnoConsig').value;
const tbody = document.getElementById('tabelaRelatorioConsig');
const table = tbody ? tbody.parentElement : null;
const thead = table ? table.querySelector('thead') : null;
const tfoot = table ? table.querySelector('tfoot') : null;
if (!thead || !tbody || !tfoot) return;

let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[200px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Banco / Instituição</th>';
const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
meses.forEach(function(m) {
    headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[110px]">' + m + '</th>';
});
headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[130px]">Total Anual</th></tr>';
thead.innerHTML = headerHTML;

const matriz = {};

cacheBancosRelatorio.forEach(function(banco) {
    matriz[banco] = Array(12).fill(0);
});

cacheDadosConsigRelatorio.forEach(function(row) {
    let comp = String(row[1]).replace(/'/g, "").trim();
    if (row[1] instanceof Date) {
        const y = row[1].getFullYear();
        const m = String(row[1].getMonth() + 1).padStart(2, '0');
        comp = y + '-' + m;
    }

    const partes = comp.split('-');
    const ano = partes[0];
    const mes = partes[1];

    if (ano === anoFiltro) {
        const banco = row[3];
        const valor = parseMoney(row[4]);
        const mesIndex = parseInt(mes) - 1;

        if (mesIndex >= 0 && mesIndex <= 11) {
            if (!matriz[banco]) matriz[banco] = Array(12).fill(0);
            matriz[banco][mesIndex] = roundMoney(matriz[banco][mesIndex] + valor);
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

chaves.forEach(function(banco) {
    let linhaHTML = '<td class="p-4 font-bold text-slate-700 border border-slate-200 truncate min-w-[200px] sticky left-0 bg-white z-10 shadow-sm" title="' + banco + '">' + banco + '</td>';
    let totalLinha = 0;

    for (let i = 0; i < 12; i++) {
        const val = matriz[banco][i];
        totaisMes[i] = roundMoney(totaisMes[i] + val);
        totalLinha = roundMoney(totalLinha + val);

        const displayVal = val > 0 ? formatMoney(val) : '<span class="text-slate-300">-</span>';
        linhaHTML += '<td class="p-4 text-right text-xs font-mono text-slate-600 border border-slate-200">' + displayVal + '</td>';
    }

    totalGeralAno = roundMoney(totalGeralAno + totalLinha);
    linhaHTML += '<td class="p-4 text-right font-black text-sm font-mono text-teal-700 bg-teal-50 border border-slate-200">' + formatMoney(totalLinha) + '</td>';

    const tr = document.createElement('tr');
    tr.className = "hover:bg-teal-50/20 transition";
    tr.innerHTML = linhaHTML;
    tbody.appendChild(tr);
});

let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Repassado</td>';
totaisMes.forEach(function(val) {
    const displayVal = val > 0 ? formatMoney(val) : '-';
    footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-teal-600 bg-teal-50/50 border border-slate-300">' + displayVal + '</td>';
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
window.construirMatrizAnualRec = construirMatrizAnualRec;
window.switchIRView = switchIRView;
window.carregarOrigensIR = carregarOrigensIR;
window.addOrigemIR = addOrigemIR;
window.removerOrigemIR = removerOrigemIR;
window.handleSaveIR = handleSaveIR;
window.prepararEdicaoIR = prepararEdicaoIR;
window.cancelarEdicaoIR = cancelarEdicaoIR;
window.excluirIR = excluirIR;
window.visualizarDetalhesIR = visualizarDetalhesIR;
window.limparFiltroHistoricoIR = limparFiltroHistoricoIR;
window.carregarHistoricoIR = carregarHistoricoIR;
window.renderizarRelatorioIR = renderizarRelatorioIR;
window.construirMatrizAnualIR = construirMatrizAnualIR;
window.switchPrevView = switchPrevView;
window.carregarOrigensPrev = carregarOrigensPrev;
window.carregarListaOrigensPrev = carregarListaOrigensPrev;
window.addOrigemPrev = addOrigemPrev;
window.removerOrigemPrev = removerOrigemPrev;
window.handleSavePrev = handleSavePrev;
window.prepararEdicaoPrev = prepararEdicaoPrev;
window.cancelarEdicaoPrev = cancelarEdicaoPrev;
window.excluirPrev = excluirPrev;
window.limparFiltroHistoricoPrev = limparFiltroHistoricoPrev;
window.carregarHistoricoPrev = carregarHistoricoPrev;
window.renderizarRelatorioPrev = renderizarRelatorioPrev;
window.construirMatrizAnualPrev = construirMatrizAnualPrev;
window.switchConsigView = switchConsigView;
window.carregarBancosConsig = carregarBancosConsig;
window.carregarListaBancosConsig = carregarListaBancosConsig;
window.addBancoConsig = addBancoConsig;
window.removerBancoConsig = removerBancoConsig;
window.handleSaveConsig = handleSaveConsig;
window.prepararEdicaoConsig = prepararEdicaoConsig;
window.cancelarEdicaoConsig = cancelarEdicaoConsig;
window.excluirConsig = excluirConsig;
window.limparFiltroHistoricoConsig = limparFiltroHistoricoConsig;
window.carregarHistoricoConsig = carregarHistoricoConsig;
window.renderizarRelatorioConsig = renderizarRelatorioConsig;
window.construirMatrizAnualConsig = construirMatrizAnualConsig;