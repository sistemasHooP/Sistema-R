// =============================================================================
// MOD-PREVIDENCIA.JS - MÓDULO DE PREVIDÊNCIA MUNICIPAL
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_PrevMunicipal.html original
// =============================================================================

// --- Cache de Dados ---
let listaHistoricoPrevCache = [];
let cacheDadosPrevRelatorio = [];
let cacheOrigensPrevRelatorio = [];

// =============================================================================
// NAVEGAÇÃO INTERNA
// =============================================================================

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

// =============================================================================
// CADASTROS AUXILIARES (ORIGENS PREV)
// =============================================================================

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

// =============================================================================
// CRUD OPERACIONAL PREV
// =============================================================================

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

// =============================================================================
// FILTRO E LISTAGEM PREV
// =============================================================================

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

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';
    }

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
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-purple-700 font-mono">' + formatMoney(valorRow) + '</td>' +
                    '<td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-2">' +
                            '<button onclick="prepararEdicaoPrev(\'' + idSafe + '\', \'' + compRaw + '\', \'' + origemSafe + '\', \'' + valorRow + '\', \'' + repasseSafe + '\', \'' + obsSafe + '\')" class="text-amber-600 hover:text-amber-800 transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                            '<button onclick="excluirPrev(\'' + idSafe + '\')" class="text-red-500 hover:text-red-700 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro selecionado.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarPrevidencia();
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL PREV
// =============================================================================

function renderizarRelatorioPrev() {
    const tbody = document.getElementById('tabelaRelatorioPrev');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

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

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[220px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Origem da Receita</th>';
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
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

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
window.popularFiltroAnosPrev = popularFiltroAnosPrev;
window.construirMatrizAnualPrev = construirMatrizAnualPrev;