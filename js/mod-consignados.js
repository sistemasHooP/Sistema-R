// =============================================================================
// MOD-CONSIGNADOS.JS - MÓDULO DE CONSIGNADOS (REPASSES BANCÁRIOS)
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Consignados.html original
// =============================================================================

// --- Cache de Dados ---
let listaHistoricoConsigCache = [];
let cacheDadosConsigRelatorio = [];
let cacheBancosRelatorio = [];

// =============================================================================
// NAVEGAÇÃO INTERNA
// =============================================================================

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

// =============================================================================
// CADASTROS AUXILIARES (BANCOS)
// =============================================================================

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

// =============================================================================
// CRUD OPERACIONAL CONSIG
// =============================================================================

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

// =============================================================================
// FILTRO E LISTAGEM CONSIG
// =============================================================================

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

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">A carregar dados...</td></tr>';
    }

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
                tr.className = "hover:bg-teal-50/30 border-b border-slate-100 transition group";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 font-bold text-slate-700">' + compFmt + '</td>' +
                    '<td class="px-4 py-4 text-slate-600 font-medium">' + row[3] + '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-teal-700 font-mono">' + formatMoney(valorRow) + '</td>' +
                    '<td class="px-4 py-4 text-center text-xs text-slate-500">' + dataRepasse + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<div class="flex items-center justify-center gap-2">' +
                            '<button onclick="prepararEdicaoConsig(\'' + idSafe + '\', \'' + compRaw + '\', \'' + bancoSafe + '\', \'' + valorRow + '\', \'' + repasseSafe + '\', \'' + obsSafe + '\')" class="text-amber-600 hover:text-amber-800 transition" title="Editar"><i class="fa-solid fa-pencil"></i></button>' +
                            '<button onclick="excluirConsig(\'' + idSafe + '\')" class="text-red-500 hover:text-red-700 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });

            if (contador === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400 italic">Nenhum registo encontrado para o filtro selecionado.</td></tr>';
            }

            if (tfootTotal) tfootTotal.innerText = formatMoney(totalAcumulado);
        }
    }).buscarConsignados();
}

// =============================================================================
// GERENCIAL: MATRIZ ANUAL CONSIG
// =============================================================================

function renderizarRelatorioConsig() {
    const tbody = document.getElementById('tabelaRelatorioConsig');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14" class="p-12 text-center text-slate-400"><i class="fa-solid fa-sync fa-spin mr-2"></i> A processar dados anuais...</td></tr>';
    }

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

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    let headerHTML = '<tr><th class="p-4 text-left font-bold min-w-[200px] text-slate-300 bg-slate-900 border border-slate-700 sticky left-0 z-30 shadow-md">Banco / Instituição</th>';
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
window.popularFiltroAnosConsig = popularFiltroAnosConsig;
window.construirMatrizAnualConsig = construirMatrizAnualConsig;