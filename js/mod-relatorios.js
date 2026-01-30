// =============================================================================
// MOD-RELATORIOS.JS - MÓDULO DE RELATÓRIOS E BI
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Relatorios.html original
// =============================================================================

// --- Cache de Dados ---
let cacheRelatorioAtual = null;

// =============================================================================
// CARREGAMENTO INICIAL DO CABEÇALHO
// =============================================================================

function carregarCabecalhoRelatorio() {
    google.script.run.withSuccessHandler(function(config) {
        if (config) {
            const nomeEl = document.getElementById('relNomeInstituto');
            const cnpjEl = document.getElementById('relCnpjInstituto');
            
            if (nomeEl) nomeEl.innerText = config.nome || 'Instituto de Previdência';
            if (cnpjEl) cnpjEl.innerText = config.cnpj ? 'CNPJ: ' + config.cnpj : '';
        }
    }).buscarConfiguracoes();
    
    // Define competência padrão (mês atual)
    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    
    const inputCompDe = document.getElementById('relCompetenciaDe');
    const inputCompAte = document.getElementById('relCompetenciaAte');
    
    if (inputCompDe) inputCompDe.value = mesAtualFmt;
    if (inputCompAte) inputCompAte.value = mesAtualFmt;
}

// =============================================================================
// GERAÇÃO DE RELATÓRIOS
// =============================================================================

function gerarRelatorio() {
    const tipoRelatorio = document.getElementById('selectTipoRelatorio').value;
    const compDe = document.getElementById('relCompetenciaDe').value;
    const compAte = document.getElementById('relCompetenciaAte').value;
    
    if (!tipoRelatorio) {
        sysAlert('Atenção', 'Selecione o tipo de relatório.', 'aviso');
        return;
    }
    
    if (!compDe || !compAte) {
        sysAlert('Atenção', 'Informe o período de competência.', 'aviso');
        return;
    }
    
    toggleLoading(true);
    
    const params = {
        tipo: tipoRelatorio,
        competenciaDe: compDe,
        competenciaAte: compAte
    };
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success) {
            cacheRelatorioAtual = res;
            renderizarRelatorio(res);
        } else {
            sysAlert('Erro', res.message || 'Erro ao gerar relatório.', 'erro');
        }
    }).gerarRelatorioBI(params);
}

function renderizarRelatorio(dados) {
    const container = document.getElementById('containerRelatorio');
    const btnExportar = document.getElementById('btnExportarRelatorio');
    const btnImprimir = document.getElementById('btnImprimirRelatorio');
    
    if (!container) return;
    
    // Mostra botões de ação
    if (btnExportar) btnExportar.classList.remove('hidden');
    if (btnImprimir) btnImprimir.classList.remove('hidden');
    
    // Limpa container
    container.innerHTML = '';
    
    // Título do relatório
    const titulo = document.createElement('div');
    titulo.className = 'mb-6 pb-4 border-b border-slate-200';
    titulo.innerHTML = 
        '<h2 class="text-xl font-black text-slate-800">' + dados.titulo + '</h2>' +
        '<p class="text-sm text-slate-500">Período: ' + formatarCompetencia(dados.competenciaDe) + ' a ' + formatarCompetencia(dados.competenciaAte) + '</p>' +
        '<p class="text-xs text-slate-400">Gerado em: ' + new Date().toLocaleString('pt-BR') + '</p>';
    container.appendChild(titulo);
    
    // Renderiza conforme o tipo
    switch (dados.tipo) {
        case 'RESUMO_FINANCEIRO':
            renderizarResumoFinanceiro(container, dados);
            break;
        case 'FLUXO_CAIXA':
            renderizarFluxoCaixa(container, dados);
            break;
        case 'DEMONSTRATIVO_RECEITAS':
            renderizarDemonstrativoReceitas(container, dados);
            break;
        case 'DEMONSTRATIVO_DESPESAS':
            renderizarDemonstrativoDespesas(container, dados);
            break;
        case 'BALANCETE':
            renderizarBalancete(container, dados);
            break;
        default:
            renderizarTabelaGenerica(container, dados);
    }
}

// =============================================================================
// RENDERIZADORES ESPECÍFICOS
// =============================================================================

function renderizarResumoFinanceiro(container, dados) {
    // KPIs
    const kpisDiv = document.createElement('div');
    kpisDiv.className = 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6';
    
    const kpis = dados.kpis || [];
    kpis.forEach(function(kpi) {
        let corClasse = 'text-slate-700';
        if (kpi.cor === 'verde') corClasse = 'text-emerald-600';
        else if (kpi.cor === 'vermelho') corClasse = 'text-red-600';
        else if (kpi.cor === 'azul') corClasse = 'text-blue-600';
        
        const card = document.createElement('div');
        card.className = 'bg-white border border-slate-200 rounded-xl p-4 text-center';
        card.innerHTML = 
            '<p class="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">' + kpi.titulo + '</p>' +
            '<p class="text-2xl font-black ' + corClasse + ' font-mono">' + kpi.valor + '</p>';
        kpisDiv.appendChild(card);
    });
    container.appendChild(kpisDiv);
    
    // Tabela resumo
    if (dados.tabela && dados.tabela.length > 0) {
        renderizarTabelaGenerica(container, dados);
    }
}

function renderizarFluxoCaixa(container, dados) {
    // Entradas
    if (dados.entradas && dados.entradas.length > 0) {
        const secEntradas = document.createElement('div');
        secEntradas.className = 'mb-6';
        secEntradas.innerHTML = '<h3 class="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-arrow-down"></i> Entradas</h3>';
        
        const tblEntradas = criarTabelaFluxo(dados.entradas, 'emerald');
        secEntradas.appendChild(tblEntradas);
        container.appendChild(secEntradas);
    }
    
    // Saídas
    if (dados.saidas && dados.saidas.length > 0) {
        const secSaidas = document.createElement('div');
        secSaidas.className = 'mb-6';
        secSaidas.innerHTML = '<h3 class="text-lg font-bold text-red-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-arrow-up"></i> Saídas</h3>';
        
        const tblSaidas = criarTabelaFluxo(dados.saidas, 'red');
        secSaidas.appendChild(tblSaidas);
        container.appendChild(secSaidas);
    }
    
    // Saldo
    if (dados.saldo !== undefined) {
        const saldoDiv = document.createElement('div');
        const corSaldo = dados.saldo >= 0 ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-red-100 border-red-300 text-red-800';
        saldoDiv.className = 'p-4 rounded-xl border-2 ' + corSaldo + ' text-center';
        saldoDiv.innerHTML = 
            '<p class="text-sm font-bold uppercase tracking-wide mb-1">Saldo do Período</p>' +
            '<p class="text-3xl font-black font-mono">' + formatMoney(dados.saldo) + '</p>';
        container.appendChild(saldoDiv);
    }
}

function criarTabelaFluxo(linhas, cor) {
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-x-auto rounded-lg border border-slate-200';
    
    let html = '<table class="w-full text-sm">';
    html += '<thead class="bg-slate-100"><tr>';
    html += '<th class="px-4 py-3 text-left font-bold text-slate-600">Descrição</th>';
    html += '<th class="px-4 py-3 text-right font-bold text-slate-600">Valor</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    let total = 0;
    linhas.forEach(function(linha) {
        const valor = parseMoney(linha.valor);
        total += valor;
        html += '<tr class="border-t border-slate-100 hover:bg-slate-50">';
        html += '<td class="px-4 py-3 text-slate-700">' + linha.descricao + '</td>';
        html += '<td class="px-4 py-3 text-right font-mono font-bold text-' + cor + '-600">' + formatMoney(valor) + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody>';
    html += '<tfoot class="bg-slate-800 text-white">';
    html += '<tr><td class="px-4 py-3 font-bold">TOTAL</td>';
    html += '<td class="px-4 py-3 text-right font-mono font-black text-lg">' + formatMoney(total) + '</td></tr>';
    html += '</tfoot></table>';
    
    wrapper.innerHTML = html;
    return wrapper;
}

function renderizarDemonstrativoReceitas(container, dados) {
    const cores = {
        'RECOLHIMENTO': 'blue',
        'IRRF': 'pink',
        'PREVIDENCIA': 'purple',
        'CONSIGNADO': 'teal'
    };
    
    if (dados.grupos) {
        Object.keys(dados.grupos).forEach(function(grupo) {
            const itens = dados.grupos[grupo];
            const cor = cores[grupo] || 'slate';
            
            const secao = document.createElement('div');
            secao.className = 'mb-6';
            secao.innerHTML = '<h3 class="text-lg font-bold text-' + cor + '-700 mb-3">' + grupo + '</h3>';
            
            const tbl = criarTabelaFluxo(itens, cor);
            secao.appendChild(tbl);
            container.appendChild(secao);
        });
    }
    
    // Total geral
    if (dados.totalGeral !== undefined) {
        const totalDiv = document.createElement('div');
        totalDiv.className = 'p-4 rounded-xl bg-blue-600 text-white text-center mt-4';
        totalDiv.innerHTML = 
            '<p class="text-sm font-bold uppercase tracking-wide mb-1">Total Geral de Receitas</p>' +
            '<p class="text-3xl font-black font-mono">' + formatMoney(dados.totalGeral) + '</p>';
        container.appendChild(totalDiv);
    }
}

function renderizarDemonstrativoDespesas(container, dados) {
    if (dados.grupos) {
        Object.keys(dados.grupos).forEach(function(grupo) {
            const itens = dados.grupos[grupo];
            
            const secao = document.createElement('div');
            secao.className = 'mb-6';
            secao.innerHTML = '<h3 class="text-lg font-bold text-orange-700 mb-3">' + grupo + '</h3>';
            
            const tbl = criarTabelaFluxo(itens, 'orange');
            secao.appendChild(tbl);
            container.appendChild(secao);
        });
    }
    
    // Total geral
    if (dados.totalGeral !== undefined) {
        const totalDiv = document.createElement('div');
        totalDiv.className = 'p-4 rounded-xl bg-orange-600 text-white text-center mt-4';
        totalDiv.innerHTML = 
            '<p class="text-sm font-bold uppercase tracking-wide mb-1">Total Geral de Despesas</p>' +
            '<p class="text-3xl font-black font-mono">' + formatMoney(dados.totalGeral) + '</p>';
        container.appendChild(totalDiv);
    }
}

function renderizarBalancete(container, dados) {
    // Ativo (Receitas)
    const ativoDiv = document.createElement('div');
    ativoDiv.className = 'mb-6';
    ativoDiv.innerHTML = 
        '<div class="bg-emerald-600 text-white px-4 py-2 rounded-t-lg font-bold">RECEITAS (Entradas)</div>';
    
    if (dados.receitas && dados.receitas.length > 0) {
        const tblReceitas = criarTabelaBalancete(dados.receitas, 'emerald');
        ativoDiv.appendChild(tblReceitas);
    }
    container.appendChild(ativoDiv);
    
    // Passivo (Despesas)
    const passivoDiv = document.createElement('div');
    passivoDiv.className = 'mb-6';
    passivoDiv.innerHTML = 
        '<div class="bg-red-600 text-white px-4 py-2 rounded-t-lg font-bold">DESPESAS (Saídas)</div>';
    
    if (dados.despesas && dados.despesas.length > 0) {
        const tblDespesas = criarTabelaBalancete(dados.despesas, 'red');
        passivoDiv.appendChild(tblDespesas);
    }
    container.appendChild(passivoDiv);
    
    // Resultado
    if (dados.resultado !== undefined) {
        const corResultado = dados.resultado >= 0 ? 'emerald' : 'red';
        const textoResultado = dados.resultado >= 0 ? 'SUPERÁVIT' : 'DÉFICIT';
        
        const resultadoDiv = document.createElement('div');
        resultadoDiv.className = 'p-6 rounded-xl bg-slate-800 text-white text-center';
        resultadoDiv.innerHTML = 
            '<p class="text-sm font-bold uppercase tracking-wide mb-2 text-slate-400">Resultado do Período</p>' +
            '<p class="text-xs text-' + corResultado + '-400 font-bold mb-1">' + textoResultado + '</p>' +
            '<p class="text-4xl font-black font-mono text-' + corResultado + '-400">' + formatMoney(Math.abs(dados.resultado)) + '</p>';
        container.appendChild(resultadoDiv);
    }
}

function criarTabelaBalancete(linhas, cor) {
    const wrapper = document.createElement('div');
    wrapper.className = 'border border-t-0 border-slate-200 rounded-b-lg overflow-hidden';
    
    let html = '<table class="w-full text-sm">';
    html += '<tbody>';
    
    let total = 0;
    linhas.forEach(function(linha, index) {
        const valor = parseMoney(linha.valor);
        total += valor;
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
        html += '<tr class="' + bgClass + ' border-b border-slate-100">';
        html += '<td class="px-4 py-3 text-slate-700">' + linha.descricao + '</td>';
        html += '<td class="px-4 py-3 text-right font-mono font-bold text-' + cor + '-600 w-40">' + formatMoney(valor) + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody>';
    html += '<tfoot class="bg-' + cor + '-100">';
    html += '<tr><td class="px-4 py-3 font-bold text-' + cor + '-800">SUBTOTAL</td>';
    html += '<td class="px-4 py-3 text-right font-mono font-black text-' + cor + '-800">' + formatMoney(total) + '</td></tr>';
    html += '</tfoot></table>';
    
    wrapper.innerHTML = html;
    return wrapper;
}

function renderizarTabelaGenerica(container, dados) {
    if (!dados.tabela || dados.tabela.length === 0) {
        container.innerHTML += '<p class="text-center text-slate-400 p-8">Nenhum dado encontrado para o período.</p>';
        return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-x-auto rounded-lg border border-slate-200';
    
    let html = '<table class="w-full text-sm">';
    
    // Header
    if (dados.colunas && dados.colunas.length > 0) {
        html += '<thead class="bg-slate-800 text-white"><tr>';
        dados.colunas.forEach(function(col) {
            const align = col.tipo === 'valor' ? 'text-right' : 'text-left';
            html += '<th class="px-4 py-3 font-bold ' + align + '">' + col.titulo + '</th>';
        });
        html += '</tr></thead>';
    }
    
    // Body
    html += '<tbody>';
    dados.tabela.forEach(function(linha, index) {
        const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
        html += '<tr class="' + bgClass + ' border-b border-slate-100 hover:bg-blue-50">';
        
        if (dados.colunas) {
            dados.colunas.forEach(function(col) {
                const valor = linha[col.campo];
                const align = col.tipo === 'valor' ? 'text-right font-mono' : 'text-left';
                const formatted = col.tipo === 'valor' ? formatMoney(parseMoney(valor)) : valor;
                html += '<td class="px-4 py-3 ' + align + '">' + formatted + '</td>';
            });
        }
        
        html += '</tr>';
    });
    html += '</tbody>';
    
    // Footer com totais
    if (dados.totais) {
        html += '<tfoot class="bg-slate-100 font-bold"><tr>';
        dados.colunas.forEach(function(col) {
            const valor = dados.totais[col.campo];
            const align = col.tipo === 'valor' ? 'text-right font-mono' : 'text-left';
            const formatted = col.tipo === 'valor' && valor !== undefined ? formatMoney(parseMoney(valor)) : (valor || '');
            html += '<td class="px-4 py-3 ' + align + '">' + formatted + '</td>';
        });
        html += '</tr></tfoot>';
    }
    
    html += '</table>';
    wrapper.innerHTML = html;
    container.appendChild(wrapper);
}

// =============================================================================
// EXPORTAÇÃO E IMPRESSÃO
// =============================================================================

function exportarRelatorio() {
    if (!cacheRelatorioAtual) {
        sysAlert('Atenção', 'Gere um relatório primeiro.', 'aviso');
        return;
    }
    
    toggleLoading(true);
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success && res.url) {
            window.open(res.url, '_blank');
        } else {
            sysAlert('Erro', res.message || 'Erro ao exportar.', 'erro');
        }
    }).exportarRelatorioParaPlanilha(cacheRelatorioAtual);
}

function imprimirRelatorio() {
    const container = document.getElementById('containerRelatorio');
    if (!container || container.innerHTML.trim() === '') {
        sysAlert('Atenção', 'Gere um relatório primeiro.', 'aviso');
        return;
    }
    
    // Abre janela de impressão
    const printWindow = window.open('', '_blank');
    
    const html = '<!DOCTYPE html>' +
        '<html><head>' +
        '<title>Relatório - Impressão</title>' +
        '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">' +
        '<style>' +
        'body { padding: 20px; font-family: Arial, sans-serif; }' +
        '@media print { body { padding: 0; } }' +
        '</style>' +
        '</head><body>' +
        '<div class="max-w-4xl mx-auto">' +
        container.innerHTML +
        '</div>' +
        '<script>setTimeout(function(){ window.print(); }, 500);</script>' +
        '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.carregarCabecalhoRelatorio = carregarCabecalhoRelatorio;
window.gerarRelatorio = gerarRelatorio;
window.renderizarRelatorio = renderizarRelatorio;
window.exportarRelatorio = exportarRelatorio;
window.imprimirRelatorio = imprimirRelatorio;