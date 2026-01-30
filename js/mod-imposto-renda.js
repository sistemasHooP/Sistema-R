// =============================================================================
// MOD-IMPOSTO-RENDA.JS - MÓDULO DE IRRF
// Versão: 1.0.0 - Migração GitHub
// =============================================================================

// --- Cache de Dados ---
let listaHistoricoIRCache = [];
let cacheDadosIRRelatorio = [];
let cacheOrigensRelatorio = [];

// =============================================================================
// NAVEGAÇÃO INTERNA
// =============================================================================

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
        carregarOrigensIR();
        carregarHistoricoIR();
    } else {
        document.getElementById('view-ir-gerencial').classList.remove('hidden');
        btnGer.className = styleActive;
        renderizarRelatorioIR();
    }
}

// =============================================================================
// CADASTROS AUXILIARES (ORIGENS IR)
// =============================================================================

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

// =============================================================================
// CRUD OPERACIONAL IR
// =============================================================================

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

// =============================================================================
// VISUALIZAÇÃO DE DETALHES IR (MODAL)
// =============================================================================

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

    const modalHTML = 
        '<div class="fixed inset-0 z-[100] overflow-y-auto" id="' + modalId + '">' +
          '<div class="fixed inset-0 bg-slate-900/75 transition-opacity backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>' +
          '<div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">' +
            '<div class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">' +
                '<div class="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">' +
                  '<div class="flex items-center gap-4">' +
                    '<div class="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shadow-sm">' +
                       '<i class="fa-solid fa-scale-balanced text-lg"></i>' +
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
                     '<p class="text-[10px] text-slate-400 font-medium">Ref: ' + tipo + '</p>' +
                  '</div>' +
                '</div>' +
                '<div class="px-8 py-6 space-y-6">' +
                   '<div class="text-center">' +
                      '<span class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fonte Retentora</span>' +
                      '<div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">' +
                         '<span class="font-bold text-slate-700 text-sm flex items-center justify-center gap-2">' +
                             '<i class="fa-solid fa-building-user text-slate-400 text-xs"></i>' +
                             origem +
                         '</span>' +
                      '</div>' +
                   '</div>' +
                   '<div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">' +
                      '<table class="w-full text-sm">' +
                         '<thead class="bg-slate-100 text-slate-500 font-bold uppercase text-[10px]">' +
                            '<tr>' +
                               '<th class="px-5 py-2 text-left">Descrição</th>' +
                               '<th class="px-5 py-2 text-right bg-slate-50/50">Valor</th>' +
                            '</tr>' +
                         '</thead>' +
                         '<tbody class="divide-y divide-slate-100">' +
                            '<tr>' +
                               '<td class="px-5 py-3 font-bold text-slate-700 bg-slate-50/30">Imposto Retido (IRRF)</td>' +
                               '<td class="px-5 py-3 text-right font-mono font-bold text-pink-700 bg-pink-50/10 text-lg">' + formatMoney(valor) + '</td>' +
                            '</tr>' +
                         '</tbody>' +
                         '<tfoot class="bg-slate-800 text-white border-t border-slate-800">' +
                            '<tr>' +
                               '<td class="px-5 py-3 text-right text-xs uppercase tracking-wide font-bold text-slate-400">Total a Repassar</td>' +
                               '<td class="px-5 py-3 text-right font-black text-xl tracking-tight bg-slate-900/50">' + formatMoney(valor) + '</td>' +
                            '</tr>' +
                         '</tfoot>' +
                      '</table>' +
                   '</div>' +
                   '<div class="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">' +
                       '<span class="text-xs font-bold text-slate-500 uppercase">Data do Repasse</span>' +
                       '<span class="font-mono font-bold text-slate-700">' + repasse + '</span>' +
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

// =============================================================================
// FILTRO E LISTAGEM IR
// =============================================================================

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

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">A consultar base de dados...</td></tr>';
    }

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
                tr.innerHTML = 
                    '<td class="pl-8 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>' +
                    '<td class="px-4 py-4 text-[10px] uppercase font-bold text-slate-400">' + row[4] + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-pink-700 font-mono">' + formatMoney(valorRow) + '</td>' +
                    '<td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>' +
                    '<td class="pr-8 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-1">' +
                            '<button onclick="visualizarDetalhesIR(\'' + idSafe + '\')" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>' +
                            '<button onclick="prepararEdicaoIR(\'' + idSafe + '\', \'' + compRaw + '\', \'' + origemSafe + '\', \'' + tipoSafe + '\', \'' + valorRow + '\', \'' + dataRepasse + '\', \'' + obsSafe + '\')" class="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                            '<button onclick="excluirIR(\'' + idSafe + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarImpostoRenda();
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL IR
// =============================================================================

function renderizarRelatorioIR() {
    const tbody = document.getElementById('tabelaRelatorioIR');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

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

    // Cabeçalho
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[220px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Origem / Fonte Retentora</th>';
    meses.forEach(function(m) {
        headerHTML += '<th class="p-4 text-center text-xs uppercase font-bold text-slate-400 bg-slate-900 border border-slate-700 min-w-[110px]">' + m + '</th>';
    });
    headerHTML += '<th class="p-4 text-right font-bold text-white bg-slate-800 border border-slate-700 min-w-[130px]">Total Acumulado</th></tr>';
    thead.innerHTML = headerHTML;

    // Matriz de dados
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

    // Corpo da tabela
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

    // Rodapé
    let footHTML = '<tr><td class="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-widest sticky left-0 bg-slate-100 z-10 border border-slate-300">Total Mensal IRRF</td>';
    totaisMes.forEach(function(val) {
        const displayVal = val > 0 ? formatMoney(val) : '-';
        footHTML += '<td class="p-4 text-right font-bold text-xs font-mono text-pink-600 bg-pink-50/50 border border-slate-300">' + displayVal + '</td>';
    });
    footHTML += '<td class="p-4 text-right font-black text-sm font-mono text-white bg-slate-900 border border-slate-900">' + formatMoney(totalGeralAno) + '</td></tr>';

    tfoot.innerHTML = footHTML;
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

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
window.popularFiltroAnosIR = popularFiltroAnosIR;
window.construirMatrizAnualIR = construirMatrizAnualIR;
