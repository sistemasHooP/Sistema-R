// =============================================================================
// APP.JS - CORE DO SISTEMA RPPS
// Versão: 1.0.0 - Migração GitHub
// =============================================================================

// =============================================================================
// 1. CONFIGURAÇÃO DA API
// =============================================================================

const API_CONFIG = {
    BASE_URL: 'https://script.google.com/macros/s/AKfycbxZhr3pttwQWWSPjHVxOIyNR_l78dgllG27cbxMb2NurIowDPBzGRsdu9TOGsPADWYZ/exec',
    TIMEOUT: 30000, // 30 segundos
    RETRY_ATTEMPTS: 2
};

// =============================================================================
// 2. FUNÇÕES DE COMUNICAÇÃO COM A API
// =============================================================================

/**
 * Função principal para chamadas à API
 * @param {string} action - Nome da ação/endpoint
 * @param {object} params - Parâmetros adicionais
 * @param {string} method - GET ou POST (padrão: POST)
 * @returns {Promise<object>} Resposta da API
 */
async function apiCall(action, params = {}, method = 'POST') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
        let url = API_CONFIG.BASE_URL;
        let options = {
            method: method,
            signal: controller.signal
        };

        if (method === 'GET') {
            // Para GET, adiciona parâmetros na URL
            const queryParams = new URLSearchParams({ action, ...params });
            url = `${url}?${queryParams.toString()}`;
        } else {
            // Para POST, envia no body
            options.headers = {
                'Content-Type': 'text/plain;charset=utf-8'
            };
            options.body = JSON.stringify({ action, ...params });
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.error('Timeout na requisição:', action);
            throw new Error('A requisição demorou muito. Tente novamente.');
        }
        
        console.error('Erro na API:', error);
        throw error;
    }
}

/**
 * Wrapper para chamadas GET
 */
async function apiGet(action, params = {}) {
    return apiCall(action, params, 'GET');
}

/**
 * Wrapper para chamadas POST
 */
async function apiPost(action, params = {}) {
    return apiCall(action, params, 'POST');
}

/**
 * Função legada para compatibilidade com código existente
 * Simula o comportamento do google.script.run
 */
const api = {
    run: function(action, params = {}) {
        return {
            withSuccessHandler: function(successCallback) {
                return {
                    withFailureHandler: function(failureCallback) {
                        apiPost(action, params)
                            .then(result => {
                                if (result.success === false && result.error) {
                                    if (failureCallback) failureCallback(result.error);
                                } else if (result.data !== undefined) {
                                    successCallback(result.data);
                                } else {
                                    successCallback(result);
                                }
                            })
                            .catch(error => {
                                if (failureCallback) failureCallback(error.message);
                                else console.error('Erro não tratado:', error);
                            });
                        return this;
                    },
                    // Caso não tenha failureHandler
                    then: function(callback) {
                        apiPost(action, params)
                            .then(result => {
                                if (result.data !== undefined) {
                                    callback(result.data);
                                } else {
                                    callback(result);
                                }
                            })
                            .catch(error => console.error('Erro:', error));
                    }
                };
            }
        };
    }
};

// Objeto global para simular google.script.run (compatibilidade)
const google = {
    script: {
        run: new Proxy({}, {
            get: function(target, functionName) {
                return {
                    withSuccessHandler: function(successCallback) {
                        const handler = {
                            failureCallback: null,
                            withFailureHandler: function(failCallback) {
                                this.failureCallback = failCallback;
                                return this;
                            }
                        };
                        
                        // Retorna uma função que será chamada com os argumentos
                        return new Proxy(handler, {
                            get: function(handlerTarget, prop) {
                                if (prop === 'withFailureHandler') {
                                    return handlerTarget.withFailureHandler.bind(handlerTarget);
                                }
                                // Qualquer outra propriedade é tratada como chamada de função
                                return function(...args) {
                                    // Converte argumentos para params
                                    let params = {};
                                    if (args.length === 1 && typeof args[0] === 'object') {
                                        params = { dados: args[0] };
                                    } else if (args.length === 1) {
                                        params = { valor: args[0] };
                                    } else if (args.length === 2) {
                                        params = { tipo: args[0], dados: args[1] };
                                    } else if (args.length > 0) {
                                        params = { args: args };
                                    }

                                    apiPost(functionName, params)
                                        .then(result => {
                                            if (result.data !== undefined) {
                                                successCallback(result.data);
                                            } else {
                                                successCallback(result);
                                            }
                                        })
                                        .catch(error => {
                                            if (handlerTarget.failureCallback) {
                                                handlerTarget.failureCallback(error.message);
                                            } else {
                                                console.error('Erro não tratado:', error);
                                            }
                                        });
                                };
                            }
                        });
                    }
                };
            }
        })
    }
};

// =============================================================================
// 3. SISTEMA DE NAVEGAÇÃO (SPA)
// =============================================================================

let paginaAtual = 'page-guia-rapido';
let paginasCarregadas = {};

/**
 * Exibe uma página específica
 * @param {string} pageId - ID da página (sem #)
 */
function showPage(pageId) {
    // Oculta todas as páginas
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // Remove classe active de todos os itens do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Exibe a página solicitada
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        paginaAtual = pageId;

        // Ativa item do menu correspondente
        const menuId = 'menu-' + pageId.replace('page-', '');
        const menuItem = document.getElementById(menuId);
        if (menuItem) {
            menuItem.classList.add('active');
        }

        // Callback de inicialização da página
        inicializarPagina(pageId);

        // Scroll para o topo
        window.scrollTo(0, 0);
        
        // Fecha sidebar no mobile
        if (window.innerWidth < 1024) {
            closeSidebar();
        }
    } else {
        // Se a página não existe no DOM, tenta carregar
        carregarPagina(pageId);
    }
}

/**
 * Carrega o HTML de uma página dinamicamente
 */
async function carregarPagina(pageId) {
    const container = document.getElementById('page-container');
    
    // Mostra loading
    toggleLoading(true);
    
    try {
        // Mapeia o ID da página para o arquivo
        const fileName = pageId.replace('page-', 'Page_')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('') + '.html';
        
        const response = await fetch(`pages/${fileName}`);
        
        if (!response.ok) {
            throw new Error('Página não encontrada');
        }
        
        const html = await response.text();
        
        // Cria container da página se não existir
        let pageElement = document.getElementById(pageId);
        if (!pageElement) {
            pageElement = document.createElement('div');
            pageElement.id = pageId;
            pageElement.className = 'page-content';
            container.appendChild(pageElement);
        }
        
        pageElement.innerHTML = html;
        paginasCarregadas[pageId] = true;
        
        // Exibe a página
        showPage(pageId);
        
    } catch (error) {
        console.error('Erro ao carregar página:', error);
        sysAlert('Erro', 'Não foi possível carregar a página.', 'erro');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Inicializa callbacks específicos de cada página
 */
function inicializarPagina(pageId) {
    switch (pageId) {
        case 'page-guia-rapido':
            // Página inicial - sem ação específica
            break;
            
        case 'page-dashboard':
            if (typeof carregarDashboard === 'function') carregarDashboard();
            break;
            
        case 'page-recolhimento':
            if (typeof switchRecView === 'function') switchRecView('operacional');
            if (typeof carregarRecursos === 'function') carregarRecursos();
            break;
            
        case 'page-folha':
            if (typeof switchFolhaView === 'function') switchFolhaView('operacional');
            if (typeof carregarNomesFolha === 'function') carregarNomesFolha();
            break;
            
        case 'page-imposto-renda':
            if (typeof switchIRView === 'function') switchIRView('operacional');
            if (typeof carregarOrigensIR === 'function') carregarOrigensIR();
            break;
            
        case 'page-prev-municipal':
            if (typeof switchPrevView === 'function') switchPrevView('operacional');
            break;
            
        case 'page-consignados':
            if (typeof switchConsigView === 'function') switchConsigView('operacional');
            break;
            
        case 'page-margem':
            if (typeof switchMargemView === 'function') switchMargemView('calculadora');
            break;
            
        case 'page-despesas':
            if (typeof switchDespesasView === 'function') switchDespesasView('operacional');
            break;
            
        case 'page-pagamentos':
            if (typeof switchPagamentosView === 'function') switchPagamentosView('pendentes');
            break;
            
        case 'page-relatorios':
            if (typeof carregarCabecalhoRelatorio === 'function') carregarCabecalhoRelatorio();
            break;
            
        case 'page-arquivos':
            if (typeof switchArquivosView === 'function') switchArquivosView('upload');
            break;
            
        case 'page-importacao':
            if (typeof atualizarGuiaImportacao === 'function') atualizarGuiaImportacao();
            break;
            
        case 'page-config':
            if (typeof carregarConfiguracoes === 'function') carregarConfiguracoes();
            break;
    }
}

// =============================================================================
// 4. CONTROLE DO SIDEBAR
// =============================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
}

// =============================================================================
// 5. SISTEMA DE LOADING
// =============================================================================

function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }
}

// =============================================================================
// 6. SISTEMA DE ALERTAS E CONFIRMAÇÕES
// =============================================================================

let confirmCallback = null;

/**
 * Exibe um alerta do sistema
 * @param {string} titulo - Título do alerta
 * @param {string} mensagem - Mensagem do alerta
 * @param {string} tipo - Tipo: 'sucesso', 'erro', 'info', 'aviso'
 */
function sysAlert(titulo, mensagem, tipo = 'info') {
    const modal = document.getElementById('modalAlerta');
    const icone = document.getElementById('alertaIcone');
    const tituloEl = document.getElementById('alertaTitulo');
    const mensagemEl = document.getElementById('alertaMensagem');
    const botoesEl = document.getElementById('alertaBotoes');

    // Define ícone e cor baseado no tipo
    let iconClass = 'fa-circle-info';
    let bgClass = 'bg-blue-100 text-blue-600';
    
    switch (tipo) {
        case 'sucesso':
            iconClass = 'fa-circle-check';
            bgClass = 'bg-emerald-100 text-emerald-600';
            break;
        case 'erro':
            iconClass = 'fa-circle-xmark';
            bgClass = 'bg-red-100 text-red-600';
            break;
        case 'aviso':
            iconClass = 'fa-triangle-exclamation';
            bgClass = 'bg-amber-100 text-amber-600';
            break;
    }

    icone.className = `h-16 w-16 rounded-full flex items-center justify-center text-3xl ${bgClass}`;
    icone.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    
    tituloEl.textContent = titulo;
    mensagemEl.textContent = mensagem;
    
    // Botão OK
    botoesEl.innerHTML = `
        <button onclick="fecharAlerta()" class="btn-primary px-8">
            OK
        </button>
    `;

    modal.classList.remove('hidden');
}

/**
 * Exibe uma confirmação do sistema
 * @param {string} titulo - Título
 * @param {string} mensagem - Mensagem
 * @param {function} callback - Função executada ao confirmar
 */
function sysConfirm(titulo, mensagem, callback) {
    const modal = document.getElementById('modalAlerta');
    const icone = document.getElementById('alertaIcone');
    const tituloEl = document.getElementById('alertaTitulo');
    const mensagemEl = document.getElementById('alertaMensagem');
    const botoesEl = document.getElementById('alertaBotoes');

    icone.className = 'h-16 w-16 rounded-full flex items-center justify-center text-3xl bg-amber-100 text-amber-600';
    icone.innerHTML = '<i class="fa-solid fa-question"></i>';
    
    tituloEl.textContent = titulo;
    mensagemEl.textContent = mensagem;
    
    confirmCallback = callback;
    
    botoesEl.innerHTML = `
        <button onclick="fecharAlerta()" class="btn-secondary px-6">
            Cancelar
        </button>
        <button onclick="executarConfirm()" class="btn-primary px-6">
            Confirmar
        </button>
    `;

    modal.classList.remove('hidden');
}

function fecharAlerta() {
    document.getElementById('modalAlerta').classList.add('hidden');
    confirmCallback = null;
}

function executarConfirm() {
    fecharAlerta();
    if (confirmCallback && typeof confirmCallback === 'function') {
        confirmCallback();
    }
}

// =============================================================================
// 7. UTILITÁRIOS - FORMATAÇÃO DE MOEDA
// =============================================================================

/**
 * Converte string monetária BR para número
 * Ex: "R$ 1.234,56" -> 1234.56
 */
function parseMoney(valor) {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    
    let str = String(valor)
        .replace('R$', '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

/**
 * Formata número para moeda BR
 * Ex: 1234.56 -> "R$ 1.234,56"
 */
function formatMoney(valor) {
    if (typeof valor !== 'number') valor = parseFloat(valor) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Arredonda valor monetário para 2 casas decimais
 */
function roundMoney(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}

// =============================================================================
// 8. UTILITÁRIOS - FORMATAÇÃO DE DATA
// =============================================================================

/**
 * Formata data para exibição BR (DD/MM/AAAA)
 */
function formatarDataBR(data) {
    if (!data) return '-';
    
    let d;
    if (data instanceof Date) {
        d = data;
    } else if (typeof data === 'string') {
        // Tenta parsear diferentes formatos
        if (data.includes('/')) {
            // Já está no formato BR
            return data;
        }
        d = new Date(data);
    } else {
        d = new Date(data);
    }
    
    if (isNaN(d.getTime())) return '-';
    
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
}

/**
 * Formata competência para exibição (YYYY-MM -> MM/YYYY)
 */
function formatarCompetencia(comp) {
    if (!comp) return '-';
    
    let str = String(comp).replace(/'/g, '').trim();
    
    // Se já está no formato MM/YYYY
    if (str.match(/^\d{2}\/\d{4}$/)) return str;
    
    // Se está no formato YYYY-MM
    if (str.match(/^\d{4}-\d{2}/)) {
        const partes = str.split('-');
        return `${partes[1]}/${partes[0]}`;
    }
    
    // Se é Date object
    if (comp instanceof Date) {
        const mes = String(comp.getMonth() + 1).padStart(2, '0');
        const ano = comp.getFullYear();
        return `${mes}/${ano}`;
    }
    
    return str;
}

// =============================================================================
// 9. UTILITÁRIOS - MÁSCARAS DE INPUT
// =============================================================================

/**
 * Aplica máscara de moeda em tempo real
 */
function aplicarMascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor === '') {
        input.value = '';
        return;
    }
    
    valor = (parseInt(valor) / 100).toFixed(2);
    valor = valor.replace('.', ',');
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    input.value = 'R$ ' + valor;
}

/**
 * Aplica máscara de CPF
 */
function aplicarMascaraCPF(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 11) valor = valor.substring(0, 11);
    
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    
    input.value = valor;
}

/**
 * Aplica máscara de CNPJ
 */
function aplicarMascaraCNPJ(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 14) valor = valor.substring(0, 14);
    
    valor = valor.replace(/(\d{2})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
    valor = valor.replace(/(\d{3})(\d)/, '$1/$2');
    valor = valor.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    
    input.value = valor;
}

/**
 * Aplica máscara de telefone
 */
function aplicarMascaraTelefone(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 11) valor = valor.substring(0, 11);
    
    if (valor.length <= 10) {
        valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
        valor = valor.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        valor = valor.replace(/(\d{2})(\d)/, '($1) $2');
        valor = valor.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    input.value = valor;
}

// Listener global para máscaras
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('mask-money')) {
        aplicarMascaraMoeda(e.target);
    }
    if (e.target.classList.contains('mask-cpf')) {
        aplicarMascaraCPF(e.target);
    }
    if (e.target.classList.contains('mask-cnpj')) {
        aplicarMascaraCNPJ(e.target);
    }
    if (e.target.classList.contains('mask-telefone')) {
        aplicarMascaraTelefone(e.target);
    }
});

// =============================================================================
// 10. UTILITÁRIOS GERAIS
// =============================================================================

/**
 * Debounce para otimizar chamadas frequentes
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Copia texto para área de transferência
 */
async function copiarParaClipboard(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        sysAlert('Copiado!', 'Texto copiado para a área de transferência.', 'sucesso');
    } catch (err) {
        console.error('Erro ao copiar:', err);
        sysAlert('Erro', 'Não foi possível copiar o texto.', 'erro');
    }
}

/**
 * Gera ID único simples
 */
function gerarIdLocal() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// =============================================================================
// 11. INICIALIZAÇÃO DO SISTEMA
// =============================================================================

async function initSistema() {
    console.log('🚀 Iniciando Sistema RPPS...');
    
    try {
        // Atualiza data no header
        const dataHeader = document.getElementById('dataAtualHeader');
        if (dataHeader) {
            dataHeader.textContent = new Date().toLocaleDateString('pt-BR');
        }
        
        // Atualiza saudação
        const saudacao = document.getElementById('saudacaoHeader');
        if (saudacao) {
            const hora = new Date().getHours();
            let texto = 'Bom dia';
            if (hora >= 12 && hora < 18) texto = 'Boa tarde';
            else if (hora >= 18) texto = 'Boa noite';
            saudacao.textContent = `${texto}! Bem-vindo ao sistema.`;
        }
        
        // Carrega configurações do instituto
        await carregarConfigSidebar();
        
        // Remove loading inicial
        const pageLoading = document.getElementById('page-loading');
        if (pageLoading) {
            pageLoading.remove();
        }
        
        // Exibe página inicial
        showPage('page-guia-rapido');
        
        console.log('✅ Sistema iniciado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        sysAlert('Erro', 'Ocorreu um erro ao iniciar o sistema. Recarregue a página.', 'erro');
    }
}

/**
 * Carrega configurações do instituto para o sidebar
 */
async function carregarConfigSidebar() {
    try {
        const result = await apiPost('buscarConfiguracoes');
        
        if (result && result.success !== false) {
            const config = result.data || result;
            
            // Atualiza nome no sidebar
            const nomeEl = document.getElementById('sidebarNome');
            if (nomeEl && config.nome) {
                nomeEl.textContent = config.nome;
            }
            
            // Atualiza CNPJ
            const cnpjEl = document.getElementById('sidebarCNPJ');
            if (cnpjEl && config.cnpj) {
                cnpjEl.textContent = config.cnpj;
            }
            
            // Atualiza logo
            if (config.urlLogo && config.urlLogo.trim() !== '') {
                const logoImg = document.getElementById('sidebarLogo');
                const logoIcon = document.getElementById('sidebarLogoIcon');
                
                if (logoImg && logoIcon) {
                    logoImg.src = config.urlLogo;
                    logoImg.classList.remove('hidden');
                    logoIcon.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.warn('Não foi possível carregar configurações do sidebar:', error);
    }
}

// =============================================================================
// 12. EVENT LISTENERS GLOBAIS
// =============================================================================

// Fecha modal ao pressionar ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Fecha alertas
        const modalAlerta = document.getElementById('modalAlerta');
        if (modalAlerta && !modalAlerta.classList.contains('hidden')) {
            fecharAlerta();
        }
        
        // Fecha modal de pagamento
        const modalPagamento = document.getElementById('modalPagamento');
        if (modalPagamento && !modalPagamento.classList.contains('hidden')) {
            closeModal();
        }
    }
});

// Fecha sidebar ao redimensionar para desktop
window.addEventListener('resize', function() {
    if (window.innerWidth >= 1024) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    }
});

// Handler para erros não capturados
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise não tratada:', event.reason);
});

// =============================================================================
// 13. FUNÇÕES AUXILIARES PARA MODAL DE PAGAMENTO
// =============================================================================

function closeModal() {
    const modal = document.getElementById('modalPagamento');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// =============================================================================
// 14. EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

// Garante que as funções estejam disponíveis globalmente
window.showPage = showPage;
window.toggleSidebar = toggleSidebar;
window.toggleLoading = toggleLoading;
window.sysAlert = sysAlert;
window.sysConfirm = sysConfirm;
window.fecharAlerta = fecharAlerta;
window.executarConfirm = executarConfirm;
window.closeModal = closeModal;
window.parseMoney = parseMoney;
window.formatMoney = formatMoney;
window.roundMoney = roundMoney;
window.formatarDataBR = formatarDataBR;
window.formatarCompetencia = formatarCompetencia;
window.apiCall = apiCall;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.initSistema = initSistema;
```

---

