// =============================================================================
// MOD-IMPORTACAO.JS - MÓDULO DE IMPORTAÇÃO DE DADOS EM LOTE
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Importacao.html original
// =============================================================================

// --- Cache de Dados ---
let dadosImportacaoCache = [];
let errosImportacaoCache = [];

// =============================================================================
// INICIALIZAÇÃO E GUIA
// =============================================================================

function atualizarGuiaImportacao() {
    const selectTipo = document.getElementById('selectTipoImportacao');
    const guiaContainer = document.getElementById('guiaImportacao');
    
    if (!selectTipo || !guiaContainer) return;
    
    const tipo = selectTipo.value;
    
    if (!tipo) {
        guiaContainer.innerHTML = 
            '<div class="text-center p-8 text-slate-400">' +
                '<i class="fa-solid fa-hand-pointer text-4xl mb-3"></i>' +
                '<p>Selecione o tipo de dados para ver as instruções.</p>' +
            '</div>';
        return;
    }
    
    const guias = {
        'SERVIDORES': {
            titulo: 'Importação de Servidores',
            colunas: ['NOME', 'CPF', 'MATRICULA'],
            exemplo: 'João da Silva;123.456.789-00;MAT001\nMaria Santos;987.654.321-00;MAT002',
            dicas: [
                'O CPF pode estar com ou sem formatação',
                'A matrícula é opcional',
                'Nomes duplicados serão ignorados'
            ]
        },
        'FORNECEDORES': {
            titulo: 'Importação de Fornecedores',
            colunas: ['NOME', 'CNPJ', 'TIPO_SERVICO', 'VALOR_PADRAO'],
            exemplo: 'Empresa ABC;12.345.678/0001-90;Consultoria;1500,00\nFornecedor XYZ;98.765.432/0001-10;Material;;',
            dicas: [
                'CNPJ e Tipo de Serviço são opcionais',
                'Valor padrão deve usar vírgula como decimal',
                'Deixe em branco campos não obrigatórios'
            ]
        },
        'RECOLHIMENTOS': {
            titulo: 'Importação de Guias de Recolhimento',
            colunas: ['COMPETENCIA', 'TIPO_GUIA', 'RECURSO', 'BASE_PATRONAL', 'BASE_SEGURADO', 'VALOR_PATRONAL', 'VALOR_SEGURADO', 'OBS'],
            exemplo: '2024-01;GPS;Fundo Previdenciário;50000,00;30000,00;5500,00;3300,00;Ref janeiro',
            dicas: [
                'Competência no formato AAAA-MM',
                'Tipo pode ser: GPS, DARF, Guia Própria',
                'Valores com vírgula como decimal'
            ]
        },
        'FOLHAS': {
            titulo: 'Importação de Folhas de Pagamento',
            colunas: ['COMPETENCIA', 'TIPO_FOLHA', 'VALOR_BRUTO', 'VALOR_DESCONTOS', 'OBS'],
            exemplo: '2024-01;Aposentados;150000,00;15000,00;Folha regular\n2024-01;Pensionistas;80000,00;8000,00;',
            dicas: [
                'Competência no formato AAAA-MM',
                'Tipo de folha deve existir no cadastro',
                'O valor líquido será calculado automaticamente'
            ]
        },
        'DESPESAS': {
            titulo: 'Importação de Despesas',
            colunas: ['COMPETENCIA', 'FORNECEDOR', 'NUM_DOCUMENTO', 'VALOR', 'OBS'],
            exemplo: '2024-01;Empresa ABC;NF-001;1500,00;Consultoria janeiro\n2024-01;Fornecedor XYZ;NF-002;800,00;',
            dicas: [
                'Competência no formato AAAA-MM',
                'Fornecedor deve existir no cadastro ou será criado',
                'Número do documento é opcional'
            ]
        },
        'IRRF': {
            titulo: 'Importação de Imposto de Renda',
            colunas: ['COMPETENCIA', 'TIPO_IR', 'ORIGEM', 'VALOR_RETIDO', 'DATA_REPASSE', 'OBS'],
            exemplo: '2024-01;IRRF Folha;Aposentados;5000,00;15/02/2024;Repasse ref janeiro',
            dicas: [
                'Competência no formato AAAA-MM',
                'Data de repasse no formato DD/MM/AAAA (opcional)',
                'Origem deve existir no cadastro'
            ]
        }
    };
    
    const guia = guias[tipo];
    
    if (!guia) {
        guiaContainer.innerHTML = '<p class="text-red-500">Tipo não reconhecido.</p>';
        return;
    }
    
    let colunasHTML = '<div class="flex flex-wrap gap-2 mb-4">';
    guia.colunas.forEach(function(col, index) {
        colunasHTML += '<span class="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold">' + (index + 1) + '. ' + col + '</span>';
    });
    colunasHTML += '</div>';
    
    let dicasHTML = '<ul class="list-disc list-inside text-sm text-slate-600 space-y-1">';
    guia.dicas.forEach(function(dica) {
        dicasHTML += '<li>' + dica + '</li>';
    });
    dicasHTML += '</ul>';
    
    guiaContainer.innerHTML = 
        '<div class="space-y-4">' +
            '<div>' +
                '<h4 class="font-bold text-slate-800 mb-2">' + guia.titulo + '</h4>' +
                '<p class="text-sm text-slate-600 mb-3">Colunas esperadas (separadas por ponto-e-vírgula):</p>' +
                colunasHTML +
            '</div>' +
            '<div>' +
                '<p class="text-sm font-bold text-slate-700 mb-2">Exemplo de formato:</p>' +
                '<pre class="bg-slate-100 p-3 rounded-lg text-xs font-mono text-slate-700 overflow-x-auto">' + guia.exemplo + '</pre>' +
            '</div>' +
            '<div>' +
                '<p class="text-sm font-bold text-slate-700 mb-2">Dicas importantes:</p>' +
                dicasHTML +
            '</div>' +
        '</div>';
}

// =============================================================================
// PROCESSAMENTO DE ARQUIVO
// =============================================================================

function processarArquivoImportacao(input) {
    const file = input.files[0];
    const feedbackNome = document.getElementById('feedbackNomeArquivo');
    const btnProcessar = document.getElementById('btnProcessarImportacao');
    
    if (!file) {
        if (feedbackNome) feedbackNome.classList.add('hidden');
        if (btnProcessar) btnProcessar.disabled = true;
        return;
    }
    
    // Mostra nome do arquivo
    if (feedbackNome) {
        feedbackNome.innerText = file.name;
        feedbackNome.classList.remove('hidden');
    }
    
    // Habilita botão
    if (btnProcessar) btnProcessar.disabled = false;
}

function iniciarImportacao() {
    const tipo = document.getElementById('selectTipoImportacao').value;
    const fileInput = document.getElementById('inputArquivoImportacao');
    
    if (!tipo) {
        sysAlert('Atenção', 'Selecione o tipo de dados a importar.', 'aviso');
        return;
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        sysAlert('Atenção', 'Selecione um arquivo para importar.', 'aviso');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Valida extensão
    const extensao = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(extensao)) {
        sysAlert('Erro', 'Formato não suportado. Use arquivos .csv ou .txt', 'erro');
        return;
    }
    
    toggleLoading(true);
    
    // Lê o arquivo
    const reader = new FileReader();
    reader.onload = function(e) {
        const conteudo = e.target.result;
        processarConteudoImportacao(tipo, conteudo);
    };
    reader.onerror = function() {
        toggleLoading(false);
        sysAlert('Erro', 'Erro ao ler o arquivo.', 'erro');
    };
    reader.readAsText(file, 'UTF-8');
}

function processarConteudoImportacao(tipo, conteudo) {
    // Parse do conteúdo
    const linhas = conteudo.split(/\r?\n/).filter(function(linha) {
        return linha.trim() !== '';
    });
    
    if (linhas.length === 0) {
        toggleLoading(false);
        sysAlert('Erro', 'O arquivo está vazio.', 'erro');
        return;
    }
    
    // Detecta separador (ponto-e-vírgula ou vírgula)
    const primeiraLinha = linhas[0];
    const separador = primeiraLinha.includes(';') ? ';' : ',';
    
    // Converte para array de arrays
    const dados = linhas.map(function(linha) {
        return linha.split(separador).map(function(campo) {
            return campo.trim();
        });
    });
    
    // Verifica se primeira linha é cabeçalho
    const primeiroItem = dados[0][0].toUpperCase();
    const pareceHeader = ['NOME', 'COMPETENCIA', 'CPF', 'CNPJ', 'TIPO'].some(function(h) {
        return primeiroItem.includes(h);
    });
    
    if (pareceHeader) {
        dados.shift(); // Remove cabeçalho
    }
    
    if (dados.length === 0) {
        toggleLoading(false);
        sysAlert('Erro', 'Nenhum dado válido encontrado no arquivo.', 'erro');
        return;
    }
    
    // Mostra prévia
    dadosImportacaoCache = dados;
    mostrarPreviaImportacao(tipo, dados);
    toggleLoading(false);
}

// =============================================================================
// PRÉVIA DOS DADOS
// =============================================================================

function mostrarPreviaImportacao(tipo, dados) {
    const container = document.getElementById('containerPreviaImportacao');
    const btnConfirmar = document.getElementById('btnConfirmarImportacao');
    const contadorLinhas = document.getElementById('contadorLinhasImportacao');
    
    if (!container) return;
    
    // Mostra container e botão
    container.classList.remove('hidden');
    if (btnConfirmar) btnConfirmar.classList.remove('hidden');
    if (contadorLinhas) contadorLinhas.innerText = dados.length + ' registros encontrados';
    
    // Define colunas baseado no tipo
    const configColunas = {
        'SERVIDORES': ['Nome', 'CPF', 'Matrícula'],
        'FORNECEDORES': ['Nome', 'CNPJ', 'Tipo Serviço', 'Valor Padrão'],
        'RECOLHIMENTOS': ['Competência', 'Tipo', 'Recurso', 'Base Pat.', 'Base Seg.', 'Val. Pat.', 'Val. Seg.', 'Obs'],
        'FOLHAS': ['Competência', 'Tipo', 'Bruto', 'Descontos', 'Obs'],
        'DESPESAS': ['Competência', 'Fornecedor', 'Nº Doc', 'Valor', 'Obs'],
        'IRRF': ['Competência', 'Tipo', 'Origem', 'Valor', 'Dt. Repasse', 'Obs']
    };
    
    const colunas = configColunas[tipo] || ['Col 1', 'Col 2', 'Col 3'];
    
    // Monta tabela
    let html = '<div class="overflow-x-auto max-h-96">';
    html += '<table class="w-full text-xs">';
    html += '<thead class="bg-slate-800 text-white sticky top-0"><tr>';
    html += '<th class="px-2 py-2 text-center w-10">#</th>';
    colunas.forEach(function(col) {
        html += '<th class="px-2 py-2 text-left">' + col + '</th>';
    });
    html += '<th class="px-2 py-2 text-center w-20">Status</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    // Limita a 100 linhas na prévia
    const dadosPrevia = dados.slice(0, 100);
    
    dadosPrevia.forEach(function(linha, index) {
        const validacao = validarLinhaImportacao(tipo, linha);
        const bgClass = validacao.valido ? 'bg-white hover:bg-emerald-50' : 'bg-red-50';
        const statusIcon = validacao.valido 
            ? '<i class="fa-solid fa-check text-emerald-500"></i>' 
            : '<i class="fa-solid fa-xmark text-red-500" title="' + validacao.erro + '"></i>';
        
        html += '<tr class="' + bgClass + ' border-b border-slate-100">';
        html += '<td class="px-2 py-2 text-center text-slate-400 font-mono">' + (index + 1) + '</td>';
        
        for (let i = 0; i < colunas.length; i++) {
            const valor = linha[i] || '';
            html += '<td class="px-2 py-2 text-slate-700 truncate max-w-[150px]" title="' + valor + '">' + valor + '</td>';
        }
        
        html += '<td class="px-2 py-2 text-center">' + statusIcon + '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    if (dados.length > 100) {
        html += '<p class="text-xs text-slate-400 text-center mt-2">Mostrando primeiros 100 de ' + dados.length + ' registros.</p>';
    }
    
    container.innerHTML = html;
    
    // Conta erros
    let totalErros = 0;
    dados.forEach(function(linha) {
        if (!validarLinhaImportacao(tipo, linha).valido) totalErros++;
    });
    
    errosImportacaoCache = totalErros;
    
    if (totalErros > 0) {
        container.innerHTML += 
            '<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">' +
                '<i class="fa-solid fa-triangle-exclamation mr-2"></i>' +
                '<strong>' + totalErros + ' linha(s) com erro</strong> serão ignoradas na importação.' +
            '</div>';
    }
}

function validarLinhaImportacao(tipo, linha) {
    // Validações básicas por tipo
    switch (tipo) {
        case 'SERVIDORES':
            if (!linha[0] || linha[0].length < 3) return { valido: false, erro: 'Nome inválido' };
            if (!linha[1] || linha[1].replace(/\D/g, '').length !== 11) return { valido: false, erro: 'CPF inválido' };
            break;
            
        case 'FORNECEDORES':
            if (!linha[0] || linha[0].length < 3) return { valido: false, erro: 'Nome inválido' };
            break;
            
        case 'RECOLHIMENTOS':
        case 'FOLHAS':
        case 'DESPESAS':
        case 'IRRF':
            if (!linha[0] || !/^\d{4}-\d{2}$/.test(linha[0])) return { valido: false, erro: 'Competência inválida' };
            break;
    }
    
    return { valido: true };
}

// =============================================================================
// CONFIRMAÇÃO E EXECUÇÃO
// =============================================================================

function confirmarImportacao() {
    const tipo = document.getElementById('selectTipoImportacao').value;
    const dados = dadosImportacaoCache;
    
    if (!dados || dados.length === 0) {
        sysAlert('Erro', 'Nenhum dado para importar.', 'erro');
        return;
    }
    
    const totalLinhas = dados.length;
    const linhasValidas = totalLinhas - errosImportacaoCache;
    
    sysConfirm(
        'Confirmar Importação',
        'Serão importados ' + linhasValidas + ' registros de ' + totalLinhas + ' encontrados.\n\n' +
        (errosImportacaoCache > 0 ? errosImportacaoCache + ' linha(s) com erro serão ignoradas.\n\n' : '') +
        'Deseja continuar?',
        function() {
            executarImportacao(tipo, dados);
        }
    );
}

function executarImportacao(tipo, dados) {
    toggleLoading(true);
    
    // Filtra apenas linhas válidas
    const dadosValidos = dados.filter(function(linha) {
        return validarLinhaImportacao(tipo, linha).valido;
    });
    
    google.script.run.withSuccessHandler(function(res) {
        toggleLoading(false);
        
        if (res.success) {
            mostrarResultadoImportacao(res);
        } else {
            sysAlert('Erro', res.message || 'Erro na importação.', 'erro');
        }
    }).withFailureHandler(function(err) {
        toggleLoading(false);
        sysAlert('Erro Crítico', 'Falha na importação: ' + err, 'erro');
    }).importarDadosEmLote(tipo, dadosValidos);
}

// =============================================================================
// RESULTADO DA IMPORTAÇÃO
// =============================================================================

function mostrarResultadoImportacao(resultado) {
    const container = document.getElementById('containerPreviaImportacao');
    const btnConfirmar = document.getElementById('btnConfirmarImportacao');
    
    if (btnConfirmar) btnConfirmar.classList.add('hidden');
    
    let html = 
        '<div class="text-center p-8">' +
            '<div class="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">' +
                '<i class="fa-solid fa-check text-4xl text-emerald-600"></i>' +
            '</div>' +
            '<h3 class="text-xl font-bold text-slate-800 mb-2">Importação Concluída!</h3>' +
            '<div class="grid grid-cols-3 gap-4 max-w-md mx-auto mt-6">' +
                '<div class="bg-blue-50 rounded-lg p-3">' +
                    '<p class="text-2xl font-black text-blue-600">' + resultado.totalProcessados + '</p>' +
                    '<p class="text-xs text-blue-500">Processados</p>' +
                '</div>' +
                '<div class="bg-emerald-50 rounded-lg p-3">' +
                    '<p class="text-2xl font-black text-emerald-600">' + resultado.totalSucesso + '</p>' +
                    '<p class="text-xs text-emerald-500">Importados</p>' +
                '</div>' +
                '<div class="bg-red-50 rounded-lg p-3">' +
                    '<p class="text-2xl font-black text-red-600">' + (resultado.totalErros || 0) + '</p>' +
                    '<p class="text-xs text-red-500">Erros</p>' +
                '</div>' +
            '</div>';
    
    // Lista erros se houver
    if (resultado.erros && resultado.erros.length > 0) {
        html += 
            '<div class="mt-6 text-left max-w-lg mx-auto">' +
                '<p class="text-sm font-bold text-red-700 mb-2">Detalhes dos erros:</p>' +
                '<div class="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">' +
                    '<ul class="text-xs text-red-700 space-y-1">';
        
        resultado.erros.slice(0, 10).forEach(function(erro) {
            html += '<li><strong>Linha ' + erro.linha + ':</strong> ' + erro.mensagem + '</li>';
        });
        
        if (resultado.erros.length > 10) {
            html += '<li class="text-red-500 italic">... e mais ' + (resultado.erros.length - 10) + ' erros.</li>';
        }
        
        html += '</ul></div></div>';
    }
    
    html += 
            '<button onclick="resetarImportacao()" class="mt-6 btn-primary">' +
                '<i class="fa-solid fa-rotate-left mr-2"></i> Nova Importação' +
            '</button>' +
        '</div>';
    
    container.innerHTML = html;
}

// =============================================================================
// RESET DO FORMULÁRIO
// =============================================================================

function resetarImportacao() {
    // Limpa caches
    dadosImportacaoCache = [];
    errosImportacaoCache = 0;
    
    // Reset form
    document.getElementById('selectTipoImportacao').value = '';
    document.getElementById('inputArquivoImportacao').value = '';
    
    // Esconde elementos
    document.getElementById('feedbackNomeArquivo').classList.add('hidden');
    document.getElementById('containerPreviaImportacao').classList.add('hidden');
    document.getElementById('containerPreviaImportacao').innerHTML = '';
    document.getElementById('btnConfirmarImportacao').classList.add('hidden');
    document.getElementById('btnProcessarImportacao').disabled = true;
    
    // Atualiza guia
    atualizarGuiaImportacao();
}

// =============================================================================
// DOWNLOAD DE MODELO
// =============================================================================

function baixarModeloImportacao() {
    const tipo = document.getElementById('selectTipoImportacao').value;
    
    if (!tipo) {
        sysAlert('Atenção', 'Selecione o tipo de dados primeiro.', 'aviso');
        return;
    }
    
    const modelos = {
        'SERVIDORES': 'NOME;CPF;MATRICULA\nJoão da Silva;123.456.789-00;MAT001\nMaria Santos;987.654.321-00;MAT002',
        'FORNECEDORES': 'NOME;CNPJ;TIPO_SERVICO;VALOR_PADRAO\nEmpresa ABC;12.345.678/0001-90;Consultoria;1500,00\nFornecedor XYZ;98.765.432/0001-10;Material;',
        'RECOLHIMENTOS': 'COMPETENCIA;TIPO_GUIA;RECURSO;BASE_PATRONAL;BASE_SEGURADO;VALOR_PATRONAL;VALOR_SEGURADO;OBS\n2024-01;GPS;Fundo Previdenciário;50000,00;30000,00;5500,00;3300,00;Referente janeiro',
        'FOLHAS': 'COMPETENCIA;TIPO_FOLHA;VALOR_BRUTO;VALOR_DESCONTOS;OBS\n2024-01;Aposentados;150000,00;15000,00;Folha regular\n2024-01;Pensionistas;80000,00;8000,00;',
        'DESPESAS': 'COMPETENCIA;FORNECEDOR;NUM_DOCUMENTO;VALOR;OBS\n2024-01;Empresa ABC;NF-001;1500,00;Consultoria janeiro\n2024-01;Fornecedor XYZ;NF-002;800,00;',
        'IRRF': 'COMPETENCIA;TIPO_IR;ORIGEM;VALOR_RETIDO;DATA_REPASSE;OBS\n2024-01;IRRF Folha;Aposentados;5000,00;15/02/2024;Repasse ref janeiro'
    };
    
    const conteudo = modelos[tipo];
    
    if (!conteudo) {
        sysAlert('Erro', 'Modelo não disponível para este tipo.', 'erro');
        return;
    }
    
    // Cria blob e faz download
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_' + tipo.toLowerCase() + '.csv';
    link.click();
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.atualizarGuiaImportacao = atualizarGuiaImportacao;
window.processarArquivoImportacao = processarArquivoImportacao;
window.iniciarImportacao = iniciarImportacao;
window.confirmarImportacao = confirmarImportacao;
window.resetarImportacao = resetarImportacao;
window.baixarModeloImportacao = baixarModeloImportacao;