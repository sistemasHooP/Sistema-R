// =============================================================================
// MOD-PAGAMENTOS.JS - MÓDULO DE PAGAMENTOS (CONTAS A PAGAR)
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Pagamentos.html original
// =============================================================================

// --- Cache de Dados ---
let listaPagamentosPendentesCache = [];
let listaPagamentosRealizadosCache = [];

// =============================================================================
// NAVEGAÇÃO INTERNA (2 VIEWS)
// =============================================================================

function switchPagamentosView(view) {
    document.getElementById('view-pag-pendentes').classList.add('hidden');
    document.getElementById('view-pag-historico').classList.add('hidden');

    const btnPend = document.getElementById('tab-pag-pendentes');
    const btnHist = document.getElementById('tab-pag-historico');

    const styleInactive = "px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-6 py-2 rounded-lg text-sm font-bold transition bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100";

    btnPend.className = styleInactive;
    btnHist.className = styleInactive;

    if (view === 'pendentes') {
        document.getElementById('view-pag-pendentes').classList.remove('hidden');
        btnPend.className = styleActive;
        carregarPagamentosPendentes();
    } else {
        document.getElementById('view-pag-historico').classList.remove('hidden');
        btnHist.className = styleActive;
        carregarPagamentosRealizados();
    }
}

// =============================================================================
// CARREGAMENTO DE PAGAMENTOS PENDENTES
// =============================================================================

function carregarPagamentosPendentes() {
    const container = document.getElementById('listaPagamentosPendentes');
    const kpiTotal = document.getElementById('kpiTotalPendente');
    const kpiQtd = document.getElementById('kpiQtdPendente');

    if (container) {
        container.innerHTML = '<div class="col-span-full text-center p-12 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><br>Carregando pendências...</div>';
    }

    // Filtros
    const filtroAno = document.getElementById('filtroAnoPendentes') ? document.getElementById('filtroAnoPendentes').value : '';
    const filtroTipo = document.getElementById('filtroTipoPendentes') ? document.getElementById('filtroTipoPendentes').value : '';
    const filtroStatus = document.getElementById('filtroStatusPendentes') ? document.getElementById('filtroStatusPendentes').value : '';

    google.script.run.withSuccessHandler(function(dados) {
        listaPagamentosPendentesCache = dados || [];

        if (container) {
            container.innerHTML = '';
            let totalPendente = 0;
            let qtdPendente = 0;

            if (!dados || dados.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center p-12 text-slate-400"><i class="fa-solid fa-check-circle text-4xl text-emerald-300 mb-3"></i><br>Nenhuma pendência encontrada!</div>';
                if (kpiTotal) kpiTotal.innerText = 'R$ 0,00';
                if (kpiQtd) kpiQtd.innerText = '0';
                atualizarBarraAcoes();
                return;
            }

            // Filtragem local
            let dadosFiltrados = dados;

            if (filtroAno) {
                dadosFiltrados = dadosFiltrados.filter(function(item) {
                    const comp = String(item.competencia || '').replace(/'/g, '');
                    return comp.startsWith(filtroAno);
                });
            }

            if (filtroTipo) {
                dadosFiltrados = dadosFiltrados.filter(function(item) {
                    return item.tipo === filtroTipo;
                });
            }

            if (filtroStatus && filtroStatus !== 'TODOS') {
                dadosFiltrados = dadosFiltrados.filter(function(item) {
                    return item.status === filtroStatus;
                });
            }

            if (dadosFiltrados.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center p-12 text-slate-400">Nenhum item encontrado com os filtros aplicados.</div>';
                if (kpiTotal) kpiTotal.innerText = 'R$ 0,00';
                if (kpiQtd) kpiQtd.innerText = '0';
                atualizarBarraAcoes();
                return;
            }

            dadosFiltrados.forEach(function(item) {
                const saldo = parseMoney(item.saldo);
                totalPendente += saldo;
                qtdPendente++;

                const compFmt = formatarCompetencia(item.competencia);
                const status = item.status || 'PENDENTE';

                let badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
                let iconColor = 'text-amber-500';
                if (status === 'PARCIAL') {
                    badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
                    iconColor = 'text-blue-500';
                }

                let tipoIcon = 'fa-file-invoice-dollar';
                let tipoBg = 'bg-blue-500';
                if (item.tipo === 'FOLHA') {
                    tipoIcon = 'fa-users';
                    tipoBg = 'bg-yellow-500';
                } else if (item.tipo === 'DESPESA') {
                    tipoIcon = 'fa-file-invoice';
                    tipoBg = 'bg-orange-500';
                } else if (item.tipo === 'IRRF') {
                    tipoIcon = 'fa-scale-balanced';
                    tipoBg = 'bg-pink-500';
                } else if (item.tipo === 'CONSIGNADO') {
                    tipoIcon = 'fa-file-contract';
                    tipoBg = 'bg-teal-500';
                } else if (item.tipo === 'PREVIDENCIA') {
                    tipoIcon = 'fa-piggy-bank';
                    tipoBg = 'bg-purple-500';
                }

                const card = document.createElement('div');
                card.className = "bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg hover:border-emerald-200 transition-all duration-300 group";
                card.innerHTML = 
                    '<div class="flex items-start justify-between mb-3">' +
                        '<div class="flex items-center gap-3">' +
                            '<input type="checkbox" class="checkbox-pagamento h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" data-id="' + item.id + '" data-tipo="' + item.tipo + '" data-valor="' + saldo + '" onchange="atualizarBarraAcoes()">' +
                            '<div class="h-10 w-10 rounded-lg ' + tipoBg + ' flex items-center justify-center text-white shadow-sm">' +
                                '<i class="fa-solid ' + tipoIcon + '"></i>' +
                            '</div>' +
                        '</div>' +
                        '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase border ' + badgeColor + '">' +
                            '<i class="fa-solid fa-clock ' + iconColor + '"></i>' +
                            status +
                        '</span>' +
                    '</div>' +
                    '<div class="mb-3">' +
                        '<p class="text-xs text-slate-400 uppercase tracking-wide font-bold">' + item.tipo + '</p>' +
                        '<p class="font-bold text-slate-700 truncate" title="' + item.descricao + '">' + item.descricao + '</p>' +
                        '<p class="text-xs text-slate-500">Competência: ' + compFmt + '</p>' +
                    '</div>' +
                    '<div class="flex items-center justify-between pt-3 border-t border-slate-100">' +
                        '<div>' +
                            '<p class="text-[10px] text-slate-400 uppercase">Saldo a Pagar</p>' +
                            '<p class="text-lg font-black text-emerald-600 font-mono">' + formatMoney(saldo) + '</p>' +
                        '</div>' +
                        '<button onclick="abrirModalPagamento(\'' + item.id + '\', \'' + item.tipo + '\', \'' + item.descricao.replace(/'/g, "\\'") + '\', \'' + compFmt + '\', ' + parseMoney(item.valorTotal) + ', ' + saldo + ')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition shadow-sm">' +
                            '<i class="fa-solid fa-dollar-sign mr-1"></i> Pagar' +
                        '</button>' +
                    '</div>';
                container.appendChild(card);
            });

            if (kpiTotal) kpiTotal.innerText = formatMoney(totalPendente);
            if (kpiQtd) kpiQtd.innerText = qtdPendente.toString();
            atualizarBarraAcoes();
        }
    }).buscarPagamentos();
}

// =============================================================================
// SELEÇÃO EM LOTE
// =============================================================================

function toggleSelectAll() {
    const masterCheckbox = document.getElementById('checkboxMaster');
    const checkboxes = document.querySelectorAll('.checkbox-pagamento');
    
    checkboxes.forEach(function(cb) {
        cb.checked = masterCheckbox.checked;
    });
    
    atualizarBarraAcoes();
}

function atualizarBarraAcoes() {
    const checkboxes = document.querySelectorAll('.checkbox-pagamento:checked');
    const barra = document.getElementById('barraAcoesLote');
    const contador = document.getElementById('contadorSelecionados');
    const totalEl = document.getElementById('totalSelecionados');
    
    if (checkboxes.length > 0) {
        let total = 0;
        checkboxes.forEach(function(cb) {
            total += parseFloat(cb.getAttribute('data-valor') || 0);
        });
        
        if (barra) barra.classList.remove('hidden');
        if (contador) contador.innerText = checkboxes.length;
        if (totalEl) totalEl.innerText = formatMoney(total);
    } else {
        if (barra) barra.classList.add('hidden');
    }
}

function pagarSelecionados() {
    const checkboxes = document.querySelectorAll('.checkbox-pagamento:checked');
    
    if (checkboxes.length === 0) {
        sysAlert('Atenção', 'Selecione pelo menos um item para pagar.', 'aviso');
        return;
    }
    
    const ids = [];
    checkboxes.forEach(function(cb) {
        ids.push({
            id: cb.getAttribute('data-id'),
            tipo: cb.getAttribute('data-tipo')
        });
    });
    
    sysConfirm('Pagamento em Lote', 'Deseja marcar ' + ids.length + ' itens como PAGO (valor total)?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) {
                carregarPagamentosPendentes();
            }
        }).processarPagamentoEmLote(ids);
    });
}

// =============================================================================
// MODAL DE PAGAMENTO
// =============================================================================

function abrirModalPagamento(id, tipo, descricao, competencia, valorTotal, saldo) {
    document.getElementById('modalIdHidden').value = id + '|' + tipo;
    document.getElementById('modalCompetencia').innerText = competencia;
    document.getElementById('modalNomeGuia').innerText = descricao;
    document.getElementById('modalValorTotal').innerText = formatMoney(valorTotal);
    document.getElementById('modalSaldoRestante').innerText = formatMoney(saldo);
    
    // Data padrão = hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('modalData').value = hoje;
    
    // Valor padrão = saldo restante
    document.getElementById('modalValorPago').value = formatMoney(saldo);
    
    // Carrega histórico de pagamentos
    carregarHistoricoPagamentosModal(id);
    
    document.getElementById('modalPagamento').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalPagamento').classList.add('hidden');
}

function carregarHistoricoPagamentosModal(idRef) {
    const tbody = document.getElementById('historicoPagamentosBody');
    tbody.innerHTML = '<tr><td colspan="2" class="p-3 text-center text-slate-400 text-xs">Carregando...</td></tr>';
    
    google.script.run.withSuccessHandler(function(lista) {
        tbody.innerHTML = '';
        
        if (!lista || lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-3 text-center text-slate-400 text-xs">Nenhum pagamento anterior.</td></tr>';
            return;
        }
        
        lista.forEach(function(pag) {
            const tr = document.createElement('tr');
            tr.innerHTML = 
                '<td class="px-3 py-2 text-xs text-slate-500">' + formatarDataBR(pag[2]) + '</td>' +
                '<td class="px-3 py-2 text-xs font-bold text-emerald-600 text-right">' + formatMoney(parseMoney(pag[3])) + '</td>';
            tbody.appendChild(tr);
        });
    }).buscarHistoricoPagamentos(idRef);
}

function confirmarPagamento(e) {
    e.preventDefault();
    
    const idCompleto = document.getElementById('modalIdHidden').value;
    const partes = idCompleto.split('|');
    const id = partes[0];
    const tipo = partes[1];
    
    const data = document.getElementById('modalData').value;
    const valor = document.getElementById('modalValorPago').value;
    
    if (!data || !valor) {
        sysAlert('Atenção', 'Preencha a data e o valor do pagamento.', 'aviso');
        return;
    }
    
    toggleLoading(true);
    
    const dados = {
        id: id,
        tipo: tipo,
        dataPagamento: data,
        valorPago: valor
    };
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success) {
            closeModal();
            sysAlert('Sucesso', res.message, 'sucesso');
            carregarPagamentosPendentes();
        } else {
            sysAlert('Erro', res.message, 'erro');
        }
    }).processarPagamento(dados);
}

// =============================================================================
// HISTÓRICO DE PAGAMENTOS REALIZADOS
// =============================================================================

function carregarPagamentosRealizados() {
    const tbody = document.getElementById('listaPagamentosRealizados');
    const filtroAno = document.getElementById('filtroAnoHistorico') ? document.getElementById('filtroAnoHistorico').value : new Date().getFullYear().toString();
    const inputBusca = document.getElementById('buscaHistoricoPag');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : '';
    
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400 italic">Carregando histórico...</td></tr>';
    }
    
    google.script.run.withSuccessHandler(function(lista) {
        listaPagamentosRealizadosCache = lista || [];
        
        if (tbody) {
            tbody.innerHTML = '';
            
            if (!lista || lista.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhum pagamento realizado neste período.</td></tr>';
                return;
            }
            
            // Filtra por busca
            let dadosFiltrados = lista;
            if (termoBusca) {
                dadosFiltrados = lista.filter(function(row) {
                    const descricao = String(row[5] || '').toLowerCase();
                    const tipo = String(row[1] || '').toLowerCase();
                    return descricao.includes(termoBusca) || tipo.includes(termoBusca);
                });
            }
            
            if (dadosFiltrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-slate-400">Nenhum resultado encontrado.</td></tr>';
                return;
            }
            
            dadosFiltrados.forEach(function(row) {
                // Estrutura: ID_PAG, ID_REF, DATA_PAG, VALOR, USUARIO, OBS/DESC
                const idPag = row[0];
                const dataPag = formatarDataBR(row[2]);
                const valor = parseMoney(row[3]);
                const usuario = row[4] || '-';
                const descricao = row[5] || '-';
                
                let tipoIcon = 'fa-file-invoice-dollar';
                let tipoBg = 'bg-blue-100 text-blue-600';
                
                const tr = document.createElement('tr');
                tr.className = "hover:bg-emerald-50/30 border-b border-slate-100 transition";
                tr.innerHTML = 
                    '<td class="pl-6 py-4 text-slate-500 font-mono text-xs">' + dataPag + '</td>' +
                    '<td class="px-4 py-4">' +
                        '<div class="flex items-center gap-2">' +
                            '<div class="h-8 w-8 rounded-lg ' + tipoBg + ' flex items-center justify-center">' +
                                '<i class="fa-solid ' + tipoIcon + ' text-xs"></i>' +
                            '</div>' +
                            '<span class="font-medium text-slate-700 truncate max-w-[200px]" title="' + descricao + '">' + descricao + '</span>' +
                        '</div>' +
                    '</td>' +
                    '<td class="px-4 py-4 text-right font-black text-emerald-600 font-mono">' + formatMoney(valor) + '</td>' +
                    '<td class="px-4 py-4 text-xs text-slate-400">' + usuario + '</td>' +
                    '<td class="pr-6 py-4 text-center">' +
                        '<button onclick="estornarPagamento(\'' + idPag + '\')" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Estornar">' +
                            '<i class="fa-solid fa-rotate-left"></i>' +
                        '</button>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        }
    }).buscarTodosPagamentosRealizados(filtroAno);
}

function filtrarHistoricoPagamentos() {
    carregarPagamentosRealizados();
}

// =============================================================================
// ESTORNO DE PAGAMENTO
// =============================================================================

function estornarPagamento(idPagamento) {
    sysConfirm('Estornar Pagamento', 'ATENÇÃO: Esta ação irá reverter o pagamento e restaurar o saldo pendente.\n\nDeseja continuar?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) {
                carregarPagamentosRealizados();
            }
        }).excluirPagamentoRealizado(idPagamento);
    });
}

// =============================================================================
// DETALHES DO PAGAMENTO (COMPOSIÇÃO)
// =============================================================================

function abrirDetalhesPagamento(idRef, tipo) {
    toggleLoading(true);
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (!res || !res.success) {
            sysAlert('Erro', 'Não foi possível carregar os detalhes.', 'erro');
            return;
        }
        
        const dados = res.dados;
        const modalId = 'modal-detalhes-' + Date.now();
        
        let conteudoHTML = '';
        
        if (tipo === 'FOLHA' && dados.composicao) {
            // Mostra distribuição por bancos
            conteudoHTML = '<div class="space-y-2">';
            dados.composicao.forEach(function(item) {
                conteudoHTML += 
                    '<div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">' +
                        '<span class="font-medium text-slate-700">' + item.banco + '</span>' +
                        '<span class="font-mono font-bold text-yellow-600">' + formatMoney(item.valor) + '</span>' +
                    '</div>';
            });
            conteudoHTML += '</div>';
        } else if (tipo === 'IRRF' && dados.origens) {
            // Mostra origens
            conteudoHTML = '<div class="space-y-2">';
            dados.origens.forEach(function(item) {
                conteudoHTML += 
                    '<div class="flex justify-between items-center p-3 bg-slate-50 rounded-lg">' +
                        '<span class="font-medium text-slate-700">' + item.origem + '</span>' +
                        '<span class="font-mono font-bold text-pink-600">' + formatMoney(item.valor) + '</span>' +
                    '</div>';
            });
            conteudoHTML += '</div>';
        } else {
            conteudoHTML = '<p class="text-slate-500 text-center p-4">Sem detalhes adicionais disponíveis.</p>';
        }
        
        const modalHTML = 
            '<div class="fixed inset-0 z-[100] overflow-y-auto" id="' + modalId + '">' +
                '<div class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm" onclick="fecharModalDinamico(\'' + modalId + '\')"></div>' +
                '<div class="flex min-h-full items-center justify-center p-4">' +
                    '<div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">' +
                        '<div class="bg-slate-800 px-6 py-4 text-white">' +
                            '<h3 class="font-bold">Composição do Pagamento</h3>' +
                            '<p class="text-xs text-slate-400">' + tipo + '</p>' +
                        '</div>' +
                        '<div class="p-6">' +
                            conteudoHTML +
                        '</div>' +
                        '<div class="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">' +
                            '<button onclick="fecharModalDinamico(\'' + modalId + '\')" class="btn-secondary">Fechar</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    }).buscarDetalhesPagamento(idRef);
}

// =============================================================================
// POPULAR FILTROS DE ANO
// =============================================================================

function popularFiltroAnosPendentes() {
    const select = document.getElementById('filtroAnoPendentes');
    if (!select) return;
    
    const anoAtual = new Date().getFullYear();
    select.innerHTML = '<option value="">Todos</option>';
    
    for (let i = anoAtual; i >= anoAtual - 3; i--) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        select.appendChild(opt);
    }
}

function popularFiltroAnosHistorico() {
    const select = document.getElementById('filtroAnoHistorico');
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

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchPagamentosView = switchPagamentosView;
window.carregarPagamentosPendentes = carregarPagamentosPendentes;
window.toggleSelectAll = toggleSelectAll;
window.atualizarBarraAcoes = atualizarBarraAcoes;
window.pagarSelecionados = pagarSelecionados;
window.abrirModalPagamento = abrirModalPagamento;
window.closeModal = closeModal;
window.carregarHistoricoPagamentosModal = carregarHistoricoPagamentosModal;
window.confirmarPagamento = confirmarPagamento;
window.carregarPagamentosRealizados = carregarPagamentosRealizados;
window.filtrarHistoricoPagamentos = filtrarHistoricoPagamentos;
window.estornarPagamento = estornarPagamento;
window.abrirDetalhesPagamento = abrirDetalhesPagamento;
window.popularFiltroAnosPendentes = popularFiltroAnosPendentes;
window.popularFiltroAnosHistorico = popularFiltroAnosHistorico;