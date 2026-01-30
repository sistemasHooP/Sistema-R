// =============================================================================
// APP.JS - CORE DO SISTEMA RPPS
// Versão: 1.0.0 - Migração GitHub
// =============================================================================

// --- Configuração da API ---
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbxZhr3pttwQWWSPjHVxOIyNR_l78dgllG27cbxMb2NurIowDPBzGRsdu9TOGsPADWYZ/exec';

// --- Cache Global ---
let configCache = null;
let paginaAtual = 'page-dashboard';

// =============================================================================
// INICIALIZAÇÃO DO SISTEMA
// =============================================================================

function initSistema() {
    console.log('🚀 Inicializando Sistema RPPS...');
    
    // Define data atual no header
    atualizarDataHeader();
    
    // Carrega configurações iniciais
    carregarConfiguracoes();
    
    // Carrega página inicial (Dashboard)
    carregarPagina('page-dashboard');
    
    // Configura máscaras de input
    configurarMascaras();
    
    // Inicializa competência atual nos inputs
    inicializarCompetencias();
    
    console.log('✅ Sistema inicializado com sucesso!');
}

function atualizarDataHeader() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataFormatada = now.toLocaleDateString('pt-BR', options);
    
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        headerDate.innerText = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    }
    
    const hora = now.getHours();
    let saudacao = 'Bom dia';
    if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';
    else if (hora >= 18) saudacao = 'Boa noite';
    
    const headerGreeting = document.getElementById('headerGreeting');
    if (headerGreeting) {
        headerGreeting.innerText = saudacao + '!';
    }
}

function inicializarCompetencias() {
    const dataAtual = new Date();
    const mesAtualFmt = dataAtual.getFullYear() + '-' + String(dataAtual.getMonth() + 1).padStart(2, '0');
    
    // Lista de IDs de inputs de competência
    const inputsCompetencia = [
        'inputCompetenciaRec',
        'inputCompetenciaIR',
        'inputCompetenciaPrev',
        'inputCompetenciaConsig',
        'inputCompetenciaFolha',
        'inputCompetenciaDespesa',
        'inputCompetenciaOutroBanco',
        'inputCompetenciaMargem',
        'filtroCompetenciaOutrosBancos'
    ];
    
    inputsCompetencia.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.value = mesAtualFmt;
    });
}

// =============================================================================
// CARREGAMENTO DE CONFIGURAÇÕES
// =============================================================================

function carregarConfiguracoes() {
    apiGet('getConfiguracoes', function(config) {
        if (config) {
            configCache = config;
            
            // Atualiza sidebar
            const sidebarNome = document.getElementById('sidebarNome');
            const sidebarCnpj = document.getElementById('sidebarCnpj');
            
            if (sidebarNome) sidebarNome.innerText = config.nome || 'Instituto de Previdência';
            if (sidebarCnpj) sidebarCnpj.innerText = config.cnpj ? 'CNPJ: ' + config.cnpj : '';
            
            // Se tiver logo, atualiza
            if (config.logoUrl) {
                const sidebarLogo = document.getElementById('sidebarLogo');
                if (sidebarLogo) {
                    sidebarLogo.innerHTML = '<img src="' + config.logoUrl + '" alt="Logo" class="h-full w-full object-contain">';
                }
            }
        }
    });
}

function buscarConfiguracoes(callback) {
    if (configCache) {
        callback(configCache);
    } else {
        apiGet('getConfiguracoes', function(config) {
            configCache = config;
            callback(config);
        });
    }
}

// =============================================================================
// NAVEGAÇÃO E CARREGAMENTO DE PÁGINAS
// =============================================================================

function carregarPagina(pagina) {
    console.log('📄 Carregando página:', pagina);
    
    paginaAtual = pagina;
    
    // Atualiza menu ativo
    atualizarMenuAtivo(pagina);
    
    // Fecha sidebar mobile
    closeSidebar();
    
    // Carrega conteúdo da página
    const container = document.getElementById('pageContainer');
    if (!container) return;
    
    // Loading
    container.innerHTML = '<div class="flex items-center justify-center h-64"><div class="text-center"><i class="fa-solid fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i><p class="text-slate-500">Carregando...</p></div></div>';
    
    // Mapeia página para arquivo
    const arquivo = 'pages/' + pagina + '.html';
    
    // Carrega via fetch
    fetch(arquivo)
        .then(function(response) {
            if (!response.ok) throw new Error('Página não encontrada');
            return response.text();
        })
        .then(function(html) {
            container.innerHTML = html;
            
            // Executa inicialização específica da página
            inicializarPagina(pagina);
        })
        .catch(function(error) {
            console.error('Erro ao carregar página:', error);
            container.innerHTML = '<div class="text-center p-12"><i class="fa-solid fa-triangle-exclamation text-5xl text-amber-500 mb-4"></i><h2 class="text-xl font-bold text-slate-700 mb-2">Página não encontrada</h2><p class="text-slate-500">A página solicitada não existe ou não pôde ser carregada.</p><button onclick="carregarPagina(\'page-dashboard\')" class="mt-4 btn-primary">Voltar ao Dashboard</button></div>';
        });
}

function inicializarPagina(pagina) {
    console.log('⚙️ Inicializando:', pagina);
    
    // Reinicializa competências
    inicializarCompetencias();
    
    // Inicialização específica por página
    switch (pagina) {
        case 'page-dashboard':
            if (typeof popularFiltroAnosDashboard === 'function') popularFiltroAnosDashboard();
            if (typeof carregarDashboard === 'function') carregarDashboard();
            break;
            
        case 'page-recolhimento':
            if (typeof carregarRecursos === 'function') carregarRecursos();
            if (typeof carregarHistoricoGuias === 'function') carregarHistoricoGuias();
            break;
            
        case 'page-imposto-renda':
            if (typeof carregarOrigensIR === 'function') carregarOrigensIR();
            if (typeof carregarHistoricoIR === 'function') carregarHistoricoIR();
            break;
            
        case 'page-prev-municipal':
            if (typeof carregarOrigensPrev === 'function') carregarOrigensPrev();
            if (typeof carregarHistoricoPrev === 'function') carregarHistoricoPrev();
            break;
            
        case 'page-consignados':
            if (typeof carregarBancosConsig === 'function') carregarBancosConsig();
            if (typeof carregarHistoricoConsig === 'function') carregarHistoricoConsig();
            break;
            
        case 'page-folha':
            if (typeof carregarNomesFolha === 'function') carregarNomesFolha();
            if (typeof carregarHistoricoFolha === 'function') carregarHistoricoFolha();
            break;
            
        case 'page-despesas':
            if (typeof carregarFornecedoresSelect === 'function') carregarFornecedoresSelect();
            if (typeof carregarHistoricoDespesas === 'function') carregarHistoricoDespesas();
            break;
            
        case 'page-pagamentos':
            if (typeof popularFiltroAnosPendentes === 'function') popularFiltroAnosPendentes();
            if (typeof popularFiltroAnosHistorico === 'function') popularFiltroAnosHistorico();
            if (typeof carregarPagamentosPendentes === 'function') carregarPagamentosPendentes();
            break;
            
        case 'page-margem':
            if (typeof carregarServidoresAutocompleteCalc === 'function') carregarServidoresAutocompleteCalc();
            if (typeof carregarHistoricoMargem === 'function') carregarHistoricoMargem();
            break;
            
        case 'page-arquivos':
            if (typeof carregarTiposArquivo === 'function') carregarTiposArquivo('selectTipoArquivo');
            if (typeof popularFiltroAnosArquivos === 'function') popularFiltroAnosArquivos();
            break;
            
        case 'page-relatorios':
            if (typeof carregarCabecalhoRelatorio === 'function') carregarCabecalhoRelatorio();
            break;
            
        case 'page-importacao':
            if (typeof atualizarGuiaImportacao === 'function') atualizarGuiaImportacao();
            break;
            
        case 'page-config':
            carregarDadosConfig();
            break;
    }
    
    // Reconfigura máscaras após carregar página
    setTimeout(configurarMascaras, 100);
}

function atualizarMenuAtivo(pagina) {
    // Remove classe ativa de todos os itens
    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.classList.remove('menu-item-active');
    });
    
    // Adiciona classe ativa ao item atual
    const menuItem = document.querySelector('.menu-item[data-page="' + pagina + '"]');
    if (menuItem) {
        menuItem.classList.add('menu-item-active');
    }
}

// =============================================================================
// SIDEBAR MOBILE
// =============================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth < 1024) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

function toggleLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        }
    }
}

// =============================================================================
// SISTEMA DE ALERTAS
// =============================================================================

function sysAlert(titulo, mensagem, tipo) {
    const modal = document.getElementById('modalAlerta');
    const header = document.getElementById('alertaHeader');
    const iconContainer = document.getElementById('alertaIconContainer');
    const icon = document.getElementById('alertaIcon');
    const tituloEl = document.getElementById('alertaTitulo');
    const mensagemEl = document.getElementById('alertaMensagem');
    const botoesEl = document.getElementById('alertaBotoes');
    
    // Define cores e ícones por tipo
    let headerClass = 'bg-blue-50';
    let iconBgClass = 'bg-blue-100';
    let iconClass = 'fa-circle-info text-blue-600';
    
    if (tipo === 'sucesso') {
        headerClass = 'bg-emerald-50';
        iconBgClass = 'bg-emerald-100';
        iconClass = 'fa-circle-check text-emerald-600';
    } else if (tipo === 'erro') {
        headerClass = 'bg-red-50';
        iconBgClass = 'bg-red-100';
        iconClass = 'fa-circle-xmark text-red-600';
    } else if (tipo === 'aviso') {
        headerClass = 'bg-amber-50';
        iconBgClass = 'bg-amber-100';
        iconClass = 'fa-triangle-exclamation text-amber-600';
    }
    
    // Aplica estilos
    header.className = 'px-6 py-4 flex items-center gap-3 ' + headerClass;
    iconContainer.className = 'h-10 w-10 rounded-full flex items-center justify-center ' + iconBgClass;
    icon.className = 'fa-solid ' + iconClass + ' text-xl';
    
    // Define conteúdo
    tituloEl.innerText = titulo;
    mensagemEl.innerText = mensagem;
    
    // Botão padrão
    botoesEl.innerHTML = '<button onclick="fecharAlerta()" class="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-2.5 px-4 rounded-xl font-bold transition">OK</button>';
    
    // Mostra modal
    modal.classList.remove('hidden');
}

function sysConfirm(titulo, mensagem, onConfirm) {
    const modal = document.getElementById('modalAlerta');
    const header = document.getElementById('alertaHeader');
    const iconContainer = document.getElementById('alertaIconContainer');
    const icon = document.getElementById('alertaIcon');
    const tituloEl = document.getElementById('alertaTitulo');
    const mensagemEl = document.getElementById('alertaMensagem');
    const botoesEl = document.getElementById('alertaBotoes');
    
    // Estilo de confirmação
    header.className = 'px-6 py-4 flex items-center gap-3 bg-blue-50';
    iconContainer.className = 'h-10 w-10 rounded-full flex items-center justify-center bg-blue-100';
    icon.className = 'fa-solid fa-circle-question text-blue-600 text-xl';
    
    // Define conteúdo
    tituloEl.innerText = titulo;
    mensagemEl.innerText = mensagem;
    
    // Botões de confirmação
    botoesEl.innerHTML = 
        '<button onclick="fecharAlerta()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2.5 px-4 rounded-xl font-bold transition">Cancelar</button>' +
        '<button id="btnConfirmAction" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold transition">Confirmar</button>';
    
    // Evento de confirmação
    document.getElementById('btnConfirmAction').onclick = function() {
        fecharAlerta();
        if (typeof onConfirm === 'function') onConfirm();
    };
    
    // Mostra modal
    modal.classList.remove('hidden');
}

function fecharAlerta() {
    const modal = document.getElementById('modalAlerta');
    if (modal) modal.classList.add('hidden');
}

function fecharModalDinamico(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// =============================================================================
// API - COMUNICAÇÃO COM BACKEND
// =============================================================================

function apiGet(action, callback, params) {
    let url = API_BASE_URL + '?action=' + action;
    
    if (params) {
        Object.keys(params).forEach(function(key) {
            url += '&' + key + '=' + encodeURIComponent(params[key]);
        });
    }
    
    fetch(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (typeof callback === 'function') callback(data);
        })
        .catch(function(error) {
            console.error('Erro na API (GET):', error);
            if (typeof callback === 'function') callback(null);
        });
}

function apiPost(action, dados, callback) {
    const url = API_BASE_URL;
    
    const payload = {
        action: action,
        dados: dados
    };
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            if (typeof callback === 'function') callback(data);
        })
        .catch(function(error) {
            console.error('Erro na API (POST):', error);
            if (typeof callback === 'function') callback({ success: false, message: 'Erro de conexão' });
        });
}

// =============================================================================
// COMPATIBILIDADE COM google.script.run
// =============================================================================

const google = {
    script: {
        run: {
            withSuccessHandler: function(callback) {
                return {
                    withFailureHandler: function(errorCallback) {
                        return criarProxyAPI(callback, errorCallback);
                    },
                    // Métodos diretos (sem withFailureHandler)
                    ...criarProxyAPI(callback, function(err) { console.error(err); })
                };
            }
        }
    }
};

function criarProxyAPI(successCallback, errorCallback) {
    const handler = {};
    
    // Lista de todas as funções do backend
    const funcoes = [
        // Configurações
        'getConfiguracoes', 'buscarConfiguracoes', 'salvarConfiguracoes',
        // Recursos
        'getRecursos', 'addRecurso', 'removeRecurso',
        // Recolhimento
        'buscarGuias', 'salvarGuia', 'excluirGuia',
        // IRRF
        'getOrigensIR', 'addOrigemIR', 'removeOrigemIR',
        'buscarIRRF', 'salvarIRRF', 'excluirIRRF',
        // Previdência
        'getOrigensPrev', 'addOrigemPrev', 'removeOrigemPrev',
        'buscarPrevMunicipal', 'salvarPrevMunicipal', 'excluirPrevMunicipal',
        // Consignados
        'getBancosConsig', 'addBancoConsig', 'removeBancoConsig',
        'buscarConsignados', 'salvarConsignado', 'excluirConsignado',
        // Folha
        'getNomesFolha', 'addNomeFolha', 'removeNomeFolha',
        'buscarFolhas', 'salvarFolha', 'excluirFolha',
        'buscarTodosServidores', 'buscarRemessasOutrosBancos', 
        'salvarRemessaOutroBanco', 'excluirRemessaOutroBanco', 'importarRemessasAnteriores',
        // Despesas
        'buscarFornecedores', 'salvarFornecedor', 'excluirFornecedor',
        'buscarHistoricoDespesas', 'salvarDespesa', 'editarDespesa', 'excluirDespesa',
        // Pagamentos
        'buscarPagamentos', 'processarPagamento', 'processarPagamentoEmLote',
        'buscarHistoricoPagamentos', 'buscarTodosPagamentosRealizados', 
        'excluirPagamentoRealizado', 'buscarDetalhesPagamento',
        // Margem
        'salvarServidor', 'buscarHistoricoMargem', 'gerarCartaMargem', 'regerarPDFMargem',
        // Arquivos
        'getTiposArquivo', 'addTipoArquivo', 'removeTipoArquivo',
        'buscarArquivosDigitais', 'uploadArquivoDigital', 'excluirArquivoDigital',
        // Relatórios
        'gerarRelatorioBI', 'exportarRelatorioParaPlanilha',
        // Dashboard
        'carregarDadosDashboard', 'exportarDashboardParaPlanilha',
        'buscarUltimasTransacoes', 'buscarProximosVencimentos',
        // Importação
        'importarDadosEmLote'
    ];
    
    funcoes.forEach(function(funcao) {
        handler[funcao] = function() {
            const args = Array.prototype.slice.call(arguments);
            
            // Determina se é GET ou POST baseado no nome da função
            const isPost = funcao.startsWith('salvar') || 
                          funcao.startsWith('excluir') || 
                          funcao.startsWith('processar') ||
                          funcao.startsWith('importar') ||
                          funcao.startsWith('add') ||
                          funcao.startsWith('remove') ||
                          funcao.startsWith('editar') ||
                          funcao.startsWith('upload') ||
                          funcao.startsWith('gerar') ||
                          funcao.startsWith('regerar') ||
                          funcao.startsWith('exportar');
            
            if (isPost) {
                apiPost(funcao, args[0], function(response) {
                    if (response && response.success !== undefined) {
                        successCallback(response);
                    } else if (response && response.error) {
                        errorCallback(response.error);
                    } else {
                        successCallback(response);
                    }
                });
            } else {
                const params = {};
                if (args.length > 0) params.param1 = args[0];
                if (args.length > 1) params.param2 = args[1];
                
                apiGet(funcao, function(response) {
                    if (response !== null) {
                        successCallback(response);
                    } else {
                        errorCallback('Erro ao buscar dados');
                    }
                }, params);
            }
        };
    });
    
    return handler;
}

// =============================================================================
// UTILITÁRIOS DE FORMATAÇÃO
// =============================================================================

function formatMoney(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) valor = 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseMoney(valor) {
    if (!valor) return 0;
    if (typeof valor === 'number') return valor;
    
    // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
    let limpo = String(valor)
        .replace(/R\$\s?/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
}

function roundMoney(valor) {
    return Math.round(valor * 100) / 100;
}

function formatarCompetencia(comp) {
    if (!comp) return '-';
    
    // Se for Date
    if (comp instanceof Date) {
        const m = comp.getMonth() + 1;
        const y = comp.getFullYear();
        return String(m).padStart(2, '0') + '/' + y;
    }
    
    // Se for string YYYY-MM ou YYYY-MM-DD
    const str = String(comp).replace(/'/g, '').trim();
    
    if (str.match(/^\d{4}-\d{2}/)) {
        const partes = str.split('-');
        return partes[1] + '/' + partes[0];
    }
    
    return str;
}

function formatarDataBR(data) {
    if (!data) return '-';
    
    // Se for Date
    if (data instanceof Date) {
        const d = String(data.getDate()).padStart(2, '0');
        const m = String(data.getMonth() + 1).padStart(2, '0');
        const y = data.getFullYear();
        return d + '/' + m + '/' + y;
    }
    
    // Se for string ISO
    const str = String(data).trim();
    
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
        const partes = str.substring(0, 10).split('-');
        return partes[2] + '/' + partes[1] + '/' + partes[0];
    }
    
    return str;
}

// =============================================================================
// MÁSCARAS DE INPUT
// =============================================================================

function configurarMascaras() {
    // Máscara de dinheiro
    document.querySelectorAll('.mask-money').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            valor = (parseInt(valor) / 100).toFixed(2);
            if (isNaN(valor) || valor === 'NaN') valor = '0.00';
            e.target.value = formatMoney(parseFloat(valor));
        });
        
        input.addEventListener('focus', function(e) {
            if (e.target.value === 'R$ 0,00') e.target.value = '';
        });
        
        input.addEventListener('blur', function(e) {
            if (e.target.value === '') e.target.value = 'R$ 0,00';
        });
    });
    
    // Máscara de CPF
    document.querySelectorAll('.mask-cpf').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.substring(0, 11);
            
            if (valor.length > 9) {
                valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            } else if (valor.length > 6) {
                valor = valor.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (valor.length > 3) {
                valor = valor.replace(/(\d{3})(\d{1,3})/, '$1.$2');
            }
            
            e.target.value = valor;
        });
    });
    
    // Máscara de CNPJ
    document.querySelectorAll('.mask-cnpj').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 14) valor = valor.substring(0, 14);
            
            if (valor.length > 12) {
                valor = valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
            } else if (valor.length > 8) {
                valor = valor.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
            } else if (valor.length > 5) {
                valor = valor.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
            } else if (valor.length > 2) {
                valor = valor.replace(/(\d{2})(\d{1,3})/, '$1.$2');
            }
            
            e.target.value = valor;
        });
    });
    
    // Máscara de telefone
    document.querySelectorAll('.mask-telefone').forEach(function(input) {
        input.addEventListener('input', function(e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.substring(0, 11);
            
            if (valor.length > 10) {
                valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            } else if (valor.length > 6) {
                valor = valor.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
            } else if (valor.length > 2) {
                valor = valor.replace(/(\d{2})(\d{1,5})/, '($1) $2');
            }
            
            e.target.value = valor;
        });
    });
}

// =============================================================================
// CONFIGURAÇÕES - PÁGINA CONFIG
// =============================================================================

function carregarDadosConfig() {
    // Carrega configurações do instituto
    buscarConfiguracoes(function(config) {
        if (config) {
            document.getElementById('configNomeInstituto').value = config.nome || '';
            document.getElementById('configCnpjInstituto').value = config.cnpj || '';
            document.getElementById('configEnderecoInstituto').value = config.endereco || '';
            document.getElementById('configCidadeInstituto').value = config.cidade || '';
            document.getElementById('configUfInstituto').value = config.uf || '';
            document.getElementById('configTelefoneInstituto').value = config.telefone || '';
            document.getElementById('configEmailInstituto').value = config.email || '';
        }
    });
    
    // Carrega listas de cadastros auxiliares
    if (typeof carregarListaRecursos === 'function') carregarListaRecursos();
    if (typeof carregarListaOrigensIR === 'function') carregarListaOrigensIR();
    if (typeof carregarListaNomesFolha === 'function') carregarListaNomesFolha();
    if (typeof carregarListaBancosConsig === 'function') carregarListaBancosConsig();
    if (typeof carregarListaOrigensPrev === 'function') carregarListaOrigensPrev();
}

function salvarConfiguracoes(e) {
    e.preventDefault();
    
    const dados = {
        nome: document.getElementById('configNomeInstituto').value,
        cnpj: document.getElementById('configCnpjInstituto').value,
        endereco: document.getElementById('configEnderecoInstituto').value,
        cidade: document.getElementById('configCidadeInstituto').value,
        uf: document.getElementById('configUfInstituto').value,
        telefone: document.getElementById('configTelefoneInstituto').value,
        email: document.getElementById('configEmailInstituto').value
    };
    
    toggleLoading(true);
    
    apiPost('salvarConfiguracoes', dados, function(res) {
        toggleLoading(false);
        
        if (res && res.success) {
            sysAlert('Sucesso', 'Configurações salvas com sucesso!', 'sucesso');
            configCache = null; // Limpa cache para recarregar
            carregarConfiguracoes();
        } else {
            sysAlert('Erro', res ? res.message : 'Erro ao salvar configurações.', 'erro');
        }
    });
}

// =============================================================================
// EXPORTAÇÃO GLOBAL
// =============================================================================

window.initSistema = initSistema;
window.carregarPagina = carregarPagina;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleLoading = toggleLoading;
window.sysAlert = sysAlert;
window.sysConfirm = sysConfirm;
window.fecharAlerta = fecharAlerta;
window.fecharModalDinamico = fecharModalDinamico;
window.formatMoney = formatMoney;
window.parseMoney = parseMoney;
window.roundMoney = roundMoney;
window.formatarCompetencia = formatarCompetencia;
window.formatarDataBR = formatarDataBR;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.buscarConfiguracoes = buscarConfiguracoes;
window.carregarDadosConfig = carregarDadosConfig;
window.salvarConfiguracoes = salvarConfiguracoes;
window.google = google;
