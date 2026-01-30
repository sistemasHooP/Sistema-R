// =============================================================================
// MOD-ARQUIVOS.JS - MÓDULO DE ARQUIVOS DIGITAIS (GED)
// Versão: 1.0.0 - Migração GitHub
// Corresponde ao: JS_Arquivos.html original
// =============================================================================

// =============================================================================
// NAVEGAÇÃO INTERNA (2 VIEWS)
// =============================================================================

function switchArquivosView(view) {
    document.getElementById('view-arq-upload').classList.add('hidden');
    document.getElementById('view-arq-lista').classList.add('hidden');

    const btnUpload = document.getElementById('tab-arq-upload');
    const btnLista = document.getElementById('tab-arq-lista');

    const styleInactive = "px-6 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-50 transition";
    const styleActive = "px-6 py-2 rounded-lg text-sm font-bold transition bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100";

    btnUpload.className = styleInactive;
    btnLista.className = styleInactive;

    if (view === 'upload') {
        document.getElementById('view-arq-upload').classList.remove('hidden');
        btnUpload.className = styleActive;
        carregarTiposArquivo('selectTipoArquivo');
    } else {
        document.getElementById('view-arq-lista').classList.remove('hidden');
        btnLista.className = styleActive;
        carregarTiposArquivo('filtroArqTipo');
        carregarArquivosDigitais();
    }
}

// =============================================================================
// CADASTROS AUXILIARES (TIPOS DE DOCUMENTO)
// =============================================================================

function carregarTiposArquivo(elementId) {
    // Se o ID for da lista de configuração, chama a função correta
    if (elementId === 'listaTiposArquivo') {
        carregarListaTiposArquivo();
        return;
    }

    const select = document.getElementById(elementId);
    if (!select) return;

    const valorAtual = select.value;
    const isFiltro = elementId === 'filtroArqTipo';

    google.script.run.withSuccessHandler(function(lista) {
        select.innerHTML = isFiltro ? '<option value="">Todos</option>' : '<option value="">Selecione...</option>';

        if (lista && lista.length > 0) {
            lista.forEach(function(tipo) {
                const opt = document.createElement('option');
                opt.value = tipo;
                opt.innerText = tipo;
                select.appendChild(opt);
            });
        }

        if (valorAtual) select.value = valorAtual;

    }).getTiposArquivo();
}

function carregarListaTiposArquivo() {
    const ul = document.getElementById('listaTiposArquivo');
    if (!ul) return;

    ul.innerHTML = '<li class="p-3 text-center text-xs text-slate-400">Carregando...</li>';

    google.script.run.withSuccessHandler(function(list) {
        ul.innerHTML = '';
        if (list && list.length > 0) {
            list.forEach(function(tipo) {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center p-3 bg-cyan-50 border-b border-cyan-100 last:border-0";
                li.innerHTML = 
                    '<span class="text-sm font-medium text-cyan-800">' + tipo + '</span>' +
                    '<button onclick="removerTipoArquivoCfg(\'' + tipo + '\')" class="text-red-500 hover:text-red-700 transition" title="Remover">' +
                        '<i class="fa-solid fa-trash"></i>' +
                    '</button>';
                ul.appendChild(li);
            });
        } else {
            ul.innerHTML = '<li class="text-sm text-gray-400 p-3 text-center">Nenhum tipo cadastrado.</li>';
        }
    }).getTiposArquivo();
}

function addTipoArquivo() {
    const i = document.getElementById('novoTipoArquivo');
    if (!i.value) return;

    toggleLoading(true);
    google.script.run.withSuccessHandler(function() {
        toggleLoading(false);
        i.value = '';
        carregarListaTiposArquivo();
        
        // Atualiza dropdowns se estiverem visíveis
        const selForm = document.getElementById('selectTipoArquivo');
        if (selForm && !selForm.classList.contains('hidden')) {
            carregarTiposArquivo('selectTipoArquivo');
        }
    }).addTipoArquivo(i.value);
}

function removerTipoArquivoCfg(tipo) {
    sysConfirm('Excluir Tipo', 'Deseja excluir este tipo de documento da lista?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function() {
            toggleLoading(false);
            carregarListaTiposArquivo();
        }).removeTipoArquivo(tipo);
    });
}

// =============================================================================
// UPLOAD DE ARQUIVOS
// =============================================================================

function mostrarNomeArquivo(input) {
    const display = document.getElementById('fileNameDisplay');
    const feedback = document.getElementById('fileFeedback');

    if (input.files && input.files[0]) {
        display.innerText = input.files[0].name;
        feedback.classList.remove('hidden');
    } else {
        feedback.classList.add('hidden');
    }
}

function handleUploadArquivo(e) {
    e.preventDefault();
    const form = e.target;
    const fileInput = document.getElementById('fileInput');

    if (!fileInput.files || fileInput.files.length === 0) {
        sysAlert('Atenção', 'Por favor, selecione um arquivo.', 'erro');
        return;
    }

    const file = fileInput.files[0];

    // Limite de segurança (10MB)
    if (file.size > 10 * 1024 * 1024) {
        sysAlert('Erro', 'O arquivo é muito grande (Máx 10MB).', 'erro');
        return;
    }

    sysConfirm('Confirmar Upload', 'Deseja enviar o arquivo "' + file.name + '" para a nuvem?', function() {
        toggleLoading(true);

        // Leitura do arquivo em Base64 para envio ao Apps Script
        const reader = new FileReader();
        reader.onload = function(e) {
            const fileData = e.target.result; // DataURL (base64)

            const dados = {
                tipo: form.tipo.value,
                ano: form.ano.value,
                numero: form.numero.value,
                descricao: form.descricao.value,
                fileName: file.name,
                mimeType: file.type,
                fileData: fileData
            };

            google.script.run.withSuccessHandler(function(res) {
                toggleLoading(false);
                sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');

                if (res.success) {
                    form.reset();
                    document.getElementById('fileFeedback').classList.add('hidden');
                    // Vai para a lista para ver o resultado
                    switchArquivosView('lista');
                }
            }).withFailureHandler(function(err) {
                toggleLoading(false);
                sysAlert('Erro Crítico', 'Erro no upload: ' + err, 'erro');
            }).uploadArquivoDigital(dados);
        };

        reader.readAsDataURL(file);
    });
}

// =============================================================================
// LISTAGEM DE ARQUIVOS
// =============================================================================

function carregarArquivosDigitais() {
    const tbody = document.getElementById('listaArquivosDigitais');
    const filtroTipo = document.getElementById('filtroArqTipo').value;
    const filtroAno = document.getElementById('filtroArqAno').value;
    const contador = document.getElementById('contadorArquivos');

    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><br>Consultando acervo...</td></tr>';

    google.script.run.withSuccessHandler(function(lista) {
        tbody.innerHTML = '';

        if (!lista || lista.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-400 italic">Nenhum documento encontrado.</td></tr>';
            if (contador) contador.innerText = '0 documentos listados';
            return;
        }

        if (contador) contador.innerText = lista.length + ' documentos listados';

        lista.forEach(function(row) {
            // Estrutura vinda do Backend:
            // 0:ID, 1:DATA, 2:TIPO, 3:ANO, 4:NUM, 5:DESC, 6:NOME_ARQ, 7:URL_VIEW, 8:URL_DL, 9:ID_DRIVE

            const dataUpload = formatarDataBR(row[1]);
            const tipo = row[2];
            const numero = row[4] || 'S/N';
            const ano = row[3];
            const detalheTitulo = tipo + ' nº ' + numero + ' / ' + ano;
            const desc = row[5] || 'Sem descrição';
            const nomeArq = row[6];
            const linkView = row[7];
            const linkDownload = row[8];
            const idReg = row[0];
            const idDrive = row[9];

            // Ícone baseado no tipo de arquivo
            let iconClass = 'fa-file text-gray-400';
            if (nomeArq.toLowerCase().endsWith('.pdf')) {
                iconClass = 'fa-file-pdf text-red-500';
            } else if (nomeArq.match(/\.(jpg|jpeg|png)$/i)) {
                iconClass = 'fa-file-image text-purple-500';
            } else if (nomeArq.match(/\.(doc|docx)$/i)) {
                iconClass = 'fa-file-word text-blue-500';
            } else if (nomeArq.match(/\.(xls|xlsx|csv)$/i)) {
                iconClass = 'fa-file-excel text-green-500';
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-cyan-50/30 border-b border-slate-100 transition group arq-row';

            tr.innerHTML = 
                '<td class="pl-6 py-4 text-xs text-slate-500 font-mono">' + dataUpload + '</td>' +
                '<td class="px-4 py-4"><span class="bg-cyan-50 text-cyan-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">' + tipo + '</span></td>' +
                '<td class="px-4 py-4">' +
                    '<div class="font-bold text-slate-700 text-sm search-target">' + detalheTitulo + '</div>' +
                    '<div class="text-xs text-slate-500 mb-1 line-clamp-1 search-target" title="' + desc + '">' + desc + '</div>' +
                    '<div class="text-[10px] text-slate-400 flex items-center gap-1 font-mono bg-slate-50 inline-block px-1 rounded border border-slate-100 search-target">' +
                        '<i class="fa-solid ' + iconClass + '"></i> ' + nomeArq +
                    '</div>' +
                '</td>' +
                '<td class="pr-6 py-4 text-center">' +
                    '<div class="flex items-center justify-center gap-2">' +
                        '<a href="' + linkView + '" target="_blank" class="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:text-blue-600 hover:border-blue-300 transition" title="Visualizar">' +
                            '<i class="fa-solid fa-eye"></i>' +
                        '</a>' +
                        '<a href="' + linkDownload + '" target="_blank" class="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:text-green-600 hover:border-green-300 transition" title="Baixar">' +
                            '<i class="fa-solid fa-download"></i>' +
                        '</a>' +
                        '<button onclick="excluirDocumento(\'' + idReg + '\', \'' + idDrive + '\')" class="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:text-red-600 hover:border-red-300 transition" title="Excluir">' +
                            '<i class="fa-solid fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</td>';
            tbody.appendChild(tr);
        });

        // Se já houver algo digitado na busca, filtra imediatamente
        const termoBusca = document.getElementById('filtroArqBusca').value;
        if (termoBusca) filtrarArquivosLocalmente();

    }).buscarArquivosDigitais(filtroTipo, filtroAno);
}

// =============================================================================
// PESQUISA INTELIGENTE (CLIENT-SIDE)
// =============================================================================

function filtrarArquivosLocalmente() {
    const input = document.getElementById('filtroArqBusca');
    const termo = input.value.toLowerCase().trim();
    const linhas = document.querySelectorAll('#listaArquivosDigitais .arq-row');
    const contadorEl = document.getElementById('contadorArquivos');
    let visiveis = 0;

    linhas.forEach(function(linha) {
        const texto = linha.innerText.toLowerCase();

        if (texto.includes(termo)) {
            linha.classList.remove('hidden');
            visiveis++;
        } else {
            linha.classList.add('hidden');
        }
    });

    if (contadorEl) {
        if (termo.length > 0) {
            contadorEl.innerText = visiveis + ' resultados encontrados para "' + termo + '"';
        } else {
            contadorEl.innerText = visiveis + ' documentos listados';
        }
    }
}

// =============================================================================
// EXCLUSÃO DE DOCUMENTO
// =============================================================================

function excluirDocumento(idReg, idDrive) {
    sysConfirm('Excluir Documento', 'ATENÇÃO: Isso excluirá o registro e enviará o arquivo para a lixeira do Google Drive.\nDeseja continuar?', function() {
        toggleLoading(true);
        google.script.run.withSuccessHandler(function(res) {
            toggleLoading(false);
            sysAlert(res.success ? 'Sucesso' : 'Erro', res.message, res.success ? 'sucesso' : 'erro');
            if (res.success) {
                carregarArquivosDigitais();
            }
        }).excluirArquivoDigital(idReg, idDrive);
    });
}

// =============================================================================
// POPULAR FILTRO DE ANOS
// =============================================================================

function popularFiltroAnosArquivos() {
    const select = document.getElementById('filtroArqAno');
    if (!select) return;

    const anoAtual = new Date().getFullYear();
    select.innerHTML = '<option value="">Todos</option>';

    for (let i = anoAtual; i >= anoAtual - 10; i--) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        select.appendChild(opt);
    }
}

// =============================================================================
// EXPORTAÇÃO PARA ESCOPO GLOBAL
// =============================================================================

window.switchArquivosView = switchArquivosView;
window.carregarTiposArquivo = carregarTiposArquivo;
window.carregarListaTiposArquivo = carregarListaTiposArquivo;
window.addTipoArquivo = addTipoArquivo;
window.removerTipoArquivoCfg = removerTipoArquivoCfg;
window.mostrarNomeArquivo = mostrarNomeArquivo;
window.handleUploadArquivo = handleUploadArquivo;
window.carregarArquivosDigitais = carregarArquivosDigitais;
window.filtrarArquivosLocalmente = filtrarArquivosLocalmente;
window.excluirDocumento = excluirDocumento;
window.popularFiltroAnosArquivos = popularFiltroAnosArquivos;