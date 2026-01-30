// =============================================================================
// MOD-DASHBOARD.JS - MÓDULO DE DASHBOARD E BI
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Dashboard.html original
// =============================================================================

// --- Instâncias de Gráficos ---
let chartReceitas = null;
let chartDespesas = null;
let chartFluxo = null;
let chartComparativo = null;

// =============================================================================
// CARREGAMENTO PRINCIPAL DO DASHBOARD
// =============================================================================

function carregarDashboard() {
    const anoSelecionado = document.getElementById('filtroDashboardAno') 
        ? document.getElementById('filtroDashboardAno').value 
        : new Date().getFullYear().toString();
    
    // Mostra loading nos cards
    mostrarLoadingKPIs();
    
    // Carrega dados do backend
    google.script.run.withSuccessHandler(function(dados) {
        if (dados && dados.success) {
            renderizarKPIs(dados.kpis);
            renderizarGraficos(dados);
            renderizarTabelaResumo(dados.resumoMensal);
            renderizarAlertas(dados.alertas);
        } else {
            sysAlert('Erro', 'Não foi possível carregar o dashboard.', 'erro');
        }
    }).carregarDadosDashboard(anoSelecionado);
}

function mostrarLoadingKPIs() {
    const kpiIds = ['kpiReceitaTotal', 'kpiDespesaTotal', 'kpiSaldo', 'kpiPendentes'];
    
    kpiIds.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-slate-400"></i>';
        }
    });
}

// =============================================================================
// RENDERIZAÇÃO DOS KPIs
// =============================================================================

function renderizarKPIs(kpis) {
    if (!kpis) return;
    
    // Receita Total
    const elReceita = document.getElementById('kpiReceitaTotal');
    if (elReceita) {
        elReceita.innerText = formatMoney(kpis.receitaTotal || 0);
    }
    
    // Despesa Total
    const elDespesa = document.getElementById('kpiDespesaTotal');
    if (elDespesa) {
        elDespesa.innerText = formatMoney(kpis.despesaTotal || 0);
    }
    
    // Saldo
    const elSaldo = document.getElementById('kpiSaldo');
    if (elSaldo) {
        const saldo = (kpis.receitaTotal || 0) - (kpis.despesaTotal || 0);
        elSaldo.innerText = formatMoney(saldo);
        
        // Cor do saldo
        if (saldo >= 0) {
            elSaldo.classList.remove('text-red-600');
            elSaldo.classList.add('text-emerald-600');
        } else {
            elSaldo.classList.remove('text-emerald-600');
            elSaldo.classList.add('text-red-600');
        }
    }
    
    // Pendentes
    const elPendentes = document.getElementById('kpiPendentes');
    if (elPendentes) {
        elPendentes.innerText = formatMoney(kpis.totalPendente || 0);
    }
    
    // KPIs secundários (se existirem)
    if (kpis.qtdGuias !== undefined) {
        const elQtdGuias = document.getElementById('kpiQtdGuias');
        if (elQtdGuias) elQtdGuias.innerText = kpis.qtdGuias;
    }
    
    if (kpis.qtdFolhas !== undefined) {
        const elQtdFolhas = document.getElementById('kpiQtdFolhas');
        if (elQtdFolhas) elQtdFolhas.innerText = kpis.qtdFolhas;
    }
    
    if (kpis.qtdDespesas !== undefined) {
        const elQtdDespesas = document.getElementById('kpiQtdDespesas');
        if (elQtdDespesas) elQtdDespesas.innerText = kpis.qtdDespesas;
    }
    
    // Variação percentual (se disponível)
    if (kpis.variacaoReceita !== undefined) {
        const elVar = document.getElementById('kpiVariacaoReceita');
        if (elVar) {
            const variacao = kpis.variacaoReceita;
            const sinal = variacao >= 0 ? '+' : '';
            const cor = variacao >= 0 ? 'text-emerald-500' : 'text-red-500';
            const icone = variacao >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            elVar.innerHTML = '<i class="fa-solid ' + icone + ' ' + cor + ' mr-1"></i><span class="' + cor + '">' + sinal + variacao.toFixed(1) + '%</span>';
        }
    }
}

// =============================================================================
// RENDERIZAÇÃO DOS GRÁFICOS
// =============================================================================

function renderizarGraficos(dados) {
    renderizarGraficoReceitas(dados.receitasMensais);
    renderizarGraficoDespesas(dados.despesasMensais);
    renderizarGraficoFluxo(dados.fluxoMensal);
    renderizarGraficoComparativo(dados.comparativoAnual);
}

function renderizarGraficoReceitas(dadosMensais) {
    const ctx = document.getElementById('chartReceitas');
    if (!ctx) return;
    
    // Destroy gráfico anterior se existir
    if (chartReceitas) {
        chartReceitas.destroy();
    }
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const valores = dadosMensais || Array(12).fill(0);
    
    chartReceitas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Receitas',
                data: valores,
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoDespesas(dadosMensais) {
    const ctx = document.getElementById('chartDespesas');
    if (!ctx) return;
    
    if (chartDespesas) {
        chartDespesas.destroy();
    }
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const valores = dadosMensais || Array(12).fill(0);
    
    chartDespesas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Despesas',
                data: valores,
                backgroundColor: 'rgba(249, 115, 22, 0.7)',
                borderColor: 'rgba(249, 115, 22, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoFluxo(dadosMensais) {
    const ctx = document.getElementById('chartFluxo');
    if (!ctx) return;
    
    if (chartFluxo) {
        chartFluxo.destroy();
    }
    
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const receitas = dadosMensais ? dadosMensais.receitas : Array(12).fill(0);
    const despesas = dadosMensais ? dadosMensais.despesas : Array(12).fill(0);
    const saldos = dadosMensais ? dadosMensais.saldos : Array(12).fill(0);
    
    chartFluxo = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitas,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Despesas',
                    data: despesas,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Saldo',
                    data: saldos,
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    tension: 0.3,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function renderizarGraficoComparativo(dadosAnuais) {
    const ctx = document.getElementById('chartComparativo');
    if (!ctx) return;
    
    if (chartComparativo) {
        chartComparativo.destroy();
    }
    
    if (!dadosAnuais || dadosAnuais.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-center text-slate-400 p-8">Sem dados comparativos disponíveis.</p>';
        return;
    }
    
    const anos = dadosAnuais.map(function(d) { return d.ano; });
    const receitas = dadosAnuais.map(function(d) { return d.receita; });
    const despesas = dadosAnuais.map(function(d) { return d.despesa; });
    
    chartComparativo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: anos,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitas,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Despesas',
                    data: despesas,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatMoney(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                        }
                    }
                }
            }
        }
    });
}

// =============================================================================
// TABELA RESUMO MENSAL
// =============================================================================

function renderizarTabelaResumo(resumoMensal) {
    const tbody = document.getElementById('tabelaResumoMensal');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!resumoMensal || resumoMensal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-400">Sem dados para exibir.</td></tr>';
        return;
    }
    
    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    resumoMensal.forEach(function(mes, index) {
        const receita = parseMoney(mes.receita);
        const despesa = parseMoney(mes.despesa);
        const saldo = receita - despesa;
        
        totalReceitas += receita;
        totalDespesas += despesa;
        
        const saldoClass = saldo >= 0 ? 'text-emerald-600' : 'text-red-600';
        const mesNome = mesesNomes[index] || 'Mês ' + (index + 1);
        
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-100 hover:bg-slate-50 transition';
        tr.innerHTML = 
            '<td class="px-4 py-3 font-medium text-slate-700">' + mesNome + '</td>' +
            '<td class="px-4 py-3 text-right font-mono text-emerald-600">' + formatMoney(receita) + '</td>' +
            '<td class="px-4 py-3 text-right font-mono text-orange-600">' + formatMoney(despesa) + '</td>' +
            '<td class="px-4 py-3 text-right font-mono font-bold ' + saldoClass + '">' + formatMoney(saldo) + '</td>';
        tbody.appendChild(tr);
    });
    
    // Linha de totais
    const saldoTotal = totalReceitas - totalDespesas;
    const saldoTotalClass = saldoTotal >= 0 ? 'text-emerald-600' : 'text-red-600';
    
    const trTotal = document.createElement('tr');
    trTotal.className = 'bg-slate-800 text-white font-bold';
    trTotal.innerHTML = 
        '<td class="px-4 py-3">TOTAL ANUAL</td>' +
        '<td class="px-4 py-3 text-right font-mono">' + formatMoney(totalReceitas) + '</td>' +
        '<td class="px-4 py-3 text-right font-mono">' + formatMoney(totalDespesas) + '</td>' +
        '<td class="px-4 py-3 text-right font-mono ' + saldoTotalClass + '">' + formatMoney(saldoTotal) + '</td>';
    tbody.appendChild(trTotal);
}

// =============================================================================
// ALERTAS E NOTIFICAÇÕES
// =============================================================================

function renderizarAlertas(alertas) {
    const container = document.getElementById('containerAlertas');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!alertas || alertas.length === 0) {
        container.innerHTML = 
            '<div class="text-center p-6 text-slate-400">' +
                '<i class="fa-solid fa-check-circle text-3xl text-emerald-400 mb-2"></i>' +
                '<p>Nenhum alerta no momento!</p>' +
            '</div>';
        return;
    }
    
    alertas.forEach(function(alerta) {
        let corFundo = 'bg-amber-50 border-amber-200';
        let corTexto = 'text-amber-800';
        let corIcone = 'text-amber-500';
        let icone = 'fa-triangle-exclamation';
        
        if (alerta.tipo === 'erro' || alerta.tipo === 'critico') {
            corFundo = 'bg-red-50 border-red-200';
            corTexto = 'text-red-800';
            corIcone = 'text-red-500';
            icone = 'fa-circle-exclamation';
        } else if (alerta.tipo === 'info') {
            corFundo = 'bg-blue-50 border-blue-200';
            corTexto = 'text-blue-800';
            corIcone = 'text-blue-500';
            icone = 'fa-circle-info';
        } else if (alerta.tipo === 'sucesso') {
            corFundo = 'bg-emerald-50 border-emerald-200';
            corTexto = 'text-emerald-800';
            corIcone = 'text-emerald-500';
            icone = 'fa-circle-check';
        }
        
        const div = document.createElement('div');
        div.className = 'flex items-start gap-3 p-3 rounded-lg border ' + corFundo + ' ' + corTexto;
        div.innerHTML = 
            '<i class="fa-solid ' + icone + ' ' + corIcone + ' mt-0.5"></i>' +
            '<div class="flex-1">' +
                '<p class="font-bold text-sm">' + alerta.titulo + '</p>' +
                '<p class="text-xs opacity-80">' + alerta.mensagem + '</p>' +
            '</div>';
        container.appendChild(div);
    });
}

// =============================================================================
// FILTROS E ATUALIZAÇÃO
// =============================================================================

function popularFiltroAnosDashboard() {
    const select = document.getElementById('filtroDashboardAno');
    if (!select) return;
    
    const anoAtual = new Date().getFullYear();
    select.innerHTML = '';
    
    for (let i = anoAtual; i >= anoAtual - 5; i--) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        select.appendChild(opt);
    }
    
    select.value = anoAtual;
}

function atualizarDashboard() {
    carregarDashboard();
}

// =============================================================================
// EXPORTAÇÃO DO DASHBOARD
// =============================================================================

function exportarDashboard() {
    const ano = document.getElementById('filtroDashboardAno') 
        ? document.getElementById('filtroDashboardAno').value 
        : new Date().getFullYear().toString();
    
    toggleLoading(true);
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success && res.url) {
            window.open(res.url, '_blank');
        } else {
            sysAlert('Erro', res.message || 'Erro ao exportar dashboard.', 'erro');
        }
    }).exportarDashboardParaPlanilha(ano);
}

function imprimirDashboard() {
    window.print();
}

// =============================================================================
// WIDGETS AUXILIARES
// =============================================================================

function carregarWidgetUltimasTransacoes() {
    const container = document.getElementById('widgetUltimasTransacoes');
    if (!container) return;
    
    google.script.run.withSuccessHandler(function(transacoes) {
        container.innerHTML = '';
        
        if (!transacoes || transacoes.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 text-sm p-4">Nenhuma transação recente.</p>';
            return;
        }
        
        transacoes.slice(0, 5).forEach(function(t) {
            const isReceita = t.tipo === 'RECEITA';
            const corValor = isReceita ? 'text-emerald-600' : 'text-red-600';
            const icone = isReceita ? 'fa-arrow-down' : 'fa-arrow-up';
            const corIcone = isReceita ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600';
            
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition';
            div.innerHTML = 
                '<div class="h-8 w-8 rounded-full ' + corIcone + ' flex items-center justify-center">' +
                    '<i class="fa-solid ' + icone + ' text-xs"></i>' +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<p class="font-medium text-slate-700 text-sm truncate">' + t.descricao + '</p>' +
                    '<p class="text-xs text-slate-400">' + t.data + '</p>' +
                '</div>' +
                '<div class="font-mono font-bold text-sm ' + corValor + '">' +
                    (isReceita ? '+' : '-') + formatMoney(Math.abs(t.valor)) +
                '</div>';
            container.appendChild(div);
        });
    }).buscarUltimasTransacoes();
}

function carregarWidgetProximosVencimentos() {
    const container = document.getElementById('widgetProximosVencimentos');
    if (!container) return;
    
    google.script.run.withSuccessHandler(function(vencimentos) {
        container.innerHTML = '';
        
        if (!vencimentos || vencimentos.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 text-sm p-4">Nenhum vencimento próximo.</p>';
            return;
        }
        
        vencimentos.slice(0, 5).forEach(function(v) {
            const diasRestantes = v.diasRestantes || 0;
            let corDias = 'text-slate-500';
            if (diasRestantes <= 3) corDias = 'text-red-600 font-bold';
            else if (diasRestantes <= 7) corDias = 'text-amber-600';
            
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition';
            div.innerHTML = 
                '<div class="flex-1 min-w-0">' +
                    '<p class="font-medium text-slate-700 text-sm truncate">' + v.descricao + '</p>' +
                    '<p class="text-xs text-slate-400">Vence: ' + v.dataVencimento + '</p>' +
                '</div>' +
                '<div class="text-right">' +
                    '<p class="font-mono font-bold text-sm text-orange-600">' + formatMoney(v.valor) + '</p>' +
                    '<p class="text-xs ' + corDias + '">' + diasRestantes + ' dia(s)</p>' +
                '</div>';
            container.appendChild(div);
        });
    }).buscarProximosVencimentos();
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.carregarDashboard = carregarDashboard;
window.renderizarKPIs = renderizarKPIs;
window.renderizarGraficos = renderizarGraficos;
window.renderizarTabelaResumo = renderizarTabelaResumo;
window.renderizarAlertas = renderizarAlertas;
window.popularFiltroAnosDashboard = popularFiltroAnosDashboard;
window.atualizarDashboard = atualizarDashboard;
window.exportarDashboard = exportarDashboard;
window.imprimirDashboard = imprimirDashboard;
window.carregarWidgetUltimasTransacoes = carregarWidgetUltimasTransacoes;
window.carregarWidgetProximosVencimentos = carregarWidgetProximosVencimentos;