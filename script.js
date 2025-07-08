// =================================================================
// ATENÇÃO: CONFIGURAÇÃO DE SEGURANÇA
// A senha abaixo fica visível para qualquer pessoa que acessar o site.
// Este sistema é ideal para uso pessoal/local. NÃO use em um ambiente público e compartilhado sem entender os riscos.
const ADMIN_PASSWORD = "joao99"; // <-- MUDE SUA SENHA AQUI!

document.addEventListener('DOMContentLoaded', () => {
    // Verifica qual página está sendo carregada para executar o código correto
    if (document.querySelector('.admin-panel')) {
        initAdminPage();
    } else {
        initPublicPage();
    }
});

// =================================================================
// PÁGINA PÚBLICA (index.html)
// =================================================================
function initPublicPage() {
    loadTheme();
    renderPublicLinks();
    renderSocialLinks(); // Renderiza os ícones sociais no rodapé

    const adminTrigger = document.getElementById('admin-trigger');
    if (adminTrigger) {
        adminTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            const password = prompt("Digite a senha de administrador:");
            if (password === ADMIN_PASSWORD) {
                // Senha correta, redireciona para a página de admin
                window.location.href = 'admin.html';
            } else if (password) {
                // Senha digitada, mas incorreta
                alert("Senha incorreta!");
            }
        });
    }

    // Adiciona um listener de eventos na área principal para capturar cliques nos links
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
        mainContainer.addEventListener('click', (e) => {
            const linkButton = e.target.closest('.link-button');
            if (linkButton && linkButton.dataset.index) {
                // --- INÍCIO DA LÓGICA DA ANIMAÇÃO DE CLIQUE (RIPPLE) ---
                const rect = linkButton.getBoundingClientRect();
                const ripple = document.createElement('span');
                const diameter = Math.max(linkButton.clientWidth, linkButton.clientHeight);
                const radius = diameter / 2;

                ripple.style.width = ripple.style.height = `${diameter}px`;
                ripple.style.left = `${e.clientX - rect.left - radius}px`;
                ripple.style.top = `${e.clientY - rect.top - radius}px`;
                ripple.classList.add('ripple');
                
                linkButton.appendChild(ripple);

                // Remove o elemento da ondulação após a animação terminar
                setTimeout(() => {
                    ripple.remove();
                }, 600); // Duração da animação em CSS (0.6s)
                // --- FIM DA LÓGICA DA ANIMAÇÃO ---

                const index = parseInt(linkButton.dataset.index, 10);
                const links = getFromStorage('links', []);
                // Incrementa o contador de cliques para o link específico
                links[index].clicks = (links[index].clicks || 0) + 1;
                saveToStorage('links', links);
            }
        });
    }
}

function renderPublicLinks() {
    let links = getFromStorage('links', []); // Usar 'let' para permitir a filtragem

    // --- FILTRAGEM DE LINKS ---
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para o início do dia para comparações
    const todayStr = today.toISOString().split('T')[0]; // Formato 'YYYY-MM-DD' para comparação segura
    const currentDay = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.

    links = links.filter(link => {
        // 1. Verifica a data de validade (se houver)
        const isDateValid = !link.expiration || link.expiration >= todayStr;
        if (!isDateValid) return false;

        // 2. Verifica o agendamento por dia da semana (se houver)
        // Se não há dias agendados, o link aparece todos os dias.
        if (!link.scheduledDays || link.scheduledDays.length === 0) {
            return true;
        }
        // Se há dias agendados, verifica se o dia atual está na lista.
        return link.scheduledDays.includes(currentDay);
    });

    const sectionDetails = getFromStorage('section_details', {}); // Pega as descrições salvas
    let sectionOrder = getFromStorage('section_order', []); // Pega a ordem salva
    const mainContainer = document.querySelector('main');
    mainContainer.innerHTML = ''; // Limpa o conteúdo atual

    if (links.length === 0) {
        mainContainer.innerHTML = '<p>Nenhum link cadastrado ainda. Acesse o painel de admin para começar!</p>';
        return;
    }

    // 1. Agrupa os links por seção
    const sections = links.reduce((acc, link, index) => {
        const sectionName = link.section || 'Categorias'; // Usa 'Categorias' como padrão
        if (!acc[sectionName]) {
            acc[sectionName] = [];
        }
        // Adiciona o índice original para a contagem de cliques
        acc[sectionName].push({ ...link, originalIndex: index });
        return acc;
    }, {});

    // 2. Sincroniza a ordem das seções e garante que novas seções apareçam
    const allCurrentSections = Object.keys(sections);
    // Remove da ordem as seções que não existem mais
    sectionOrder = sectionOrder.filter(name => allCurrentSections.includes(name));
    // Adiciona novas seções que não estão na ordem ao final
    allCurrentSections.forEach(name => {
        if (!sectionOrder.includes(name)) {
            sectionOrder.push(name);
        }
    });
    saveToStorage('section_order', sectionOrder); // Salva a ordem sincronizada

    // 3. Renderiza cada seção na ordem correta
    sectionOrder.forEach(sectionName => {
        const sectionLinks = sections[sectionName];
        const details = sectionDetails[sectionName] || {}; // Pega os detalhes (descrição e cor)
        const description = details.description || ''; // Pega a descrição para a seção atual
        const descriptionHtml = description ? `<p class="section-description">${description}</p>` : ''; // Cria o HTML da descrição, se existir

        let sectionHtml = `<section class="link-section"><h2>${sectionName}</h2>${descriptionHtml}`;
        
        sectionLinks.forEach((link, animationIndex) => {
            const animationDelay = animationIndex * 0.1;
            let buttonStyle = `animation-delay: ${animationDelay}s;`;
            // Se a seção tiver uma cor customizada, aplica como uma variável CSS inline.
            // Isso garante que os efeitos de hover (bolhas) também usem a nova cor.
            if (details.color) {
                buttonStyle += ` --button-bg-color: ${details.color};`;
            }
            // Prioriza o ícone manual, senão tenta detectar um ícone automático pela URL
            const finalIconClass = link.icon || getIconForUrl(link.url);
            const iconHtml = finalIconClass ? `<i class="${finalIconClass}"></i>` : '';

            // O data-index agora aponta para o índice original no array de links
            sectionHtml += `<a href="${link.url}" data-index="${link.originalIndex}" target="_blank" class="link-button" style="${buttonStyle}">${iconHtml} ${link.text}</a>`;
        });

        sectionHtml += '</section>';
        mainContainer.innerHTML += sectionHtml;
    });
}

/**
 * Retorna uma classe de ícone Font Awesome com base na URL do link.
 * @param {string} url - A URL a ser verificada.
 * @returns {string|null} A classe do ícone ou null se nenhum for encontrado.
 */
function getIconForUrl(url) {
    if (!url) return null;
    if (url.includes('shopee.com')) return 'fa-solid fa-bag-shopping'; // Ícone genérico para Shopee
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'fab fa-youtube';
    if (url.includes('wa.me') || url.includes('whatsapp.com')) return 'fab fa-whatsapp';
    if (url.includes('instagram.com')) return 'fab fa-instagram';
    if (url.includes('tiktok.com')) return 'fab fa-tiktok';
    if (url.includes('facebook.com')) return 'fab fa-facebook';
    if (url.includes('t.me') || url.includes('telegram.org')) return 'fab fa-telegram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'fab fa-twitter';
    return null; // Retorna nulo se nenhum domínio correspondente for encontrado
}

/**
 * Renderiza os links das redes sociais no rodapé da página pública.
 */
function renderSocialLinks() {
    const socialLinks = getFromStorage('social_links', {});
    const container = document.getElementById('social-links-footer');
    if (!container) return;

    let html = '';

    if (socialLinks.instagram) {
        html += `<a href="https://instagram.com/${socialLinks.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>`;
    }
    if (socialLinks.tiktok) {
        // Garante que o @ está no link, mas não duplica se o usuário já digitou
        const tiktokUser = socialLinks.tiktok.startsWith('@') ? socialLinks.tiktok : `@${socialLinks.tiktok}`;
        html += `<a href="https://tiktok.com/${tiktokUser}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
    }
    if (socialLinks.facebook) {
        html += `<a href="${socialLinks.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
    }
    if (socialLinks.whatsapp) {
        // Remove caracteres não numéricos para criar o link do WhatsApp
        const whatsappNumber = socialLinks.whatsapp.replace(/\D/g, '');
        if (whatsappNumber) {
            html += `<a href="https://wa.me/55${whatsappNumber}" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`;
        }
    }

    container.innerHTML = html;
}

// =================================================================
// PÁGINA DE ADMIN (admin.html)
// =================================================================
function initAdminPage() {
    // Constante para o limite de tamanho da imagem em Megabytes
    const MAX_IMAGE_SIZE_MB = 2;

    // **MIGRAÇÃO AUTOMÁTICA**: Converte links antigos para o novo sistema de seções
    migrateOldLinks();

    loadTheme();
    renderAdminLinkList();
    renderSectionEditor();

    // --- Lógica de Compartilhamento ---
    setupSharing();

    // Formulário de adicionar link
    const addLinkForm = document.getElementById('add-link-form');
    addLinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editIndex = document.getElementById('edit-link-index').value;
        const text = document.getElementById('link-text').value;
        const url = document.getElementById('link-url').value;
        const icon = document.getElementById('link-icon').value;
        const section = document.getElementById('link-section').value.trim();
        const expiration = document.getElementById('link-expiration').value;
        const scheduledDays = [];
        document.querySelectorAll('.day-options input[type="checkbox"]:checked').forEach(checkbox => {
            scheduledDays.push(parseInt(checkbox.value, 10));
        });

        const links = getFromStorage('links', []);
        const newLinkData = { text, url, section: section || 'Categorias', icon, expiration: expiration || null, scheduledDays: scheduledDays.length > 0 ? scheduledDays : null };

        if (editIndex !== '') {
            // Modo de Edição: atualiza o link existente
            const originalClicks = links[editIndex].clicks || 0;
            links[editIndex] = { ...newLinkData, clicks: originalClicks }; // Mantém a contagem de cliques
        } else {
            // Modo de Adição: adiciona um novo link
            links.push({ ...newLinkData, clicks: 0 });
        }

        saveToStorage('links', links);

        resetFormState(); // Reseta o formulário e o estado de edição
        renderAdminLinkList(); // Atualiza a lista de links
        renderSectionEditor(); // Atualiza o editor de seções
    });

    // Formulário de tema
    const themeForm = document.getElementById('theme-form');

    // Carregar valores salvos nos inputs do formulário
    const currentTheme = getFromStorage('theme', {});
    document.getElementById('store-name').value = currentTheme.storeName || 'Achadinhos da [Seu Nome]';
    document.getElementById('store-subtitle').value = currentTheme.storeSubtitle || 'As melhores ofertas da Shopee selecionadas para você!';
    // As fotos são carregadas pela função loadTheme()
    document.getElementById('bg-image').value = currentTheme.bgImage || '';
    document.getElementById('bg-color1').value = currentTheme.bgColor1 || '#f5f7fa';
    document.getElementById('bg-color2').value = currentTheme.bgColor2 || '#c3cfe2';
    document.getElementById('button-color').value = currentTheme.buttonColor || '#ff6600';
    document.getElementById('font-family').value = currentTheme.fontFamily || "'Poppins', sans-serif";
    document.getElementById('card-opacity').value = currentTheme.cardOpacity || '0.95';
    document.getElementById('backdrop-blur').value = currentTheme.backdropBlur || '5';

    themeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Pega o tema existente do armazenamento para não sobrescrever as imagens
        const theme = getFromStorage('theme', {});

        // Atualiza apenas as propriedades controladas por este formulário
        theme.storeName = document.getElementById('store-name').value;
        theme.storeSubtitle = document.getElementById('store-subtitle').value;
        theme.bgImage = document.getElementById('bg-image').value; // Salva a URL, se houver
        theme.bgColor1 = document.getElementById('bg-color1').value;
        theme.bgColor2 = document.getElementById('bg-color2').value;
        theme.buttonColor = document.getElementById('button-color').value;
        theme.fontFamily = document.getElementById('font-family').value;
        theme.cardOpacity = document.getElementById('card-opacity').value;
        theme.backdropBlur = document.getElementById('backdrop-blur').value;

        saveToStorage('theme', theme);
        loadTheme(); // Aplica o tema imediatamente
        alert('Aparência salva com sucesso!');
    });

    // Evento para salvar descrições das seções
    document.getElementById('save-sections-btn').addEventListener('click', () => {
        const sectionDetails = {};
        // Pega a cor padrão do tema para não salvá-la desnecessariamente
        const defaultButtonColor = getFromStorage('theme', {}).buttonColor || '#ff6600';

        document.querySelectorAll('.section-editor-item').forEach(item => {
            const sectionName = item.dataset.sectionName;
            const descriptionInput = item.querySelector('input[type="text"]');
            const colorInput = item.querySelector('input[type="color"]');

            const description = descriptionInput.value.trim();
            const color = colorInput.value;

            // Só salva a cor se for diferente da padrão do tema, para manter o JSON limpo
            const finalColor = (color !== defaultButtonColor) ? color : null;

            // Cria um registro para a seção apenas se houver uma descrição ou cor personalizada
            if (description || finalColor) {
                sectionDetails[sectionName] = { description: description || null, color: finalColor };
            }
        });
        saveToStorage('section_details', sectionDetails);
        alert('Configurações das seções salvas com sucesso!');
    });

    // --- Lógica do Formulário de Redes Sociais ---
    const socialLinksForm = document.getElementById('social-links-form');
    if (socialLinksForm) {
        // Carregar dados salvos
        const savedSocialLinks = getFromStorage('social_links', {});
        document.getElementById('social-instagram').value = savedSocialLinks.instagram || '';
        document.getElementById('social-tiktok').value = savedSocialLinks.tiktok || '';
        document.getElementById('social-facebook').value = savedSocialLinks.facebook || '';
        document.getElementById('social-whatsapp').value = savedSocialLinks.whatsapp || '';

        socialLinksForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const socialLinks = {
                instagram: document.getElementById('social-instagram').value.trim(),
                tiktok: document.getElementById('social-tiktok').value.trim(),
                facebook: document.getElementById('social-facebook').value.trim(),
                whatsapp: document.getElementById('social-whatsapp').value.trim(),
            };
            saveToStorage('social_links', socialLinks);
            alert('Links das redes sociais salvos com sucesso!');
        });
    }

    // --- Lógica de Upload de Imagens ---

    // Função auxiliar para lidar com upload de arquivos
    function handleImageUpload(file, themeKey) {
        if (!file) return;

        // VERIFICAÇÃO DE TAMANHO DA IMAGEM
        const fileSizeInMB = file.size / 1024 / 1024;
        if (fileSizeInMB > MAX_IMAGE_SIZE_MB) {
            alert(`Erro: A imagem é muito grande (${fileSizeInMB.toFixed(2)}MB). O limite é de ${MAX_IMAGE_SIZE_MB}MB.`);
            
            // Limpa o input para que o usuário possa tentar novamente com outro arquivo
            if (themeKey === 'profilePic') {
                document.getElementById('profile-pic-input').value = '';
            } else if (themeKey === 'bgImageDataUrl') {
                document.getElementById('bg-image-input').value = '';
            }
            return; // Interrompe a função
        }

        // Continua com o processamento se o tamanho for válido
        const reader = new FileReader();
        reader.onload = () => {
            const theme = getFromStorage('theme', {});
            theme[themeKey] = reader.result; // Salva a imagem como Data URL

            // Se for a imagem de fundo, limpa a URL para não haver conflito
            if (themeKey === 'bgImageDataUrl') {
                theme.bgImage = '';
                document.getElementById('bg-image').value = ''; // Limpa o campo da URL
            }

            saveToStorage('theme', theme);
            loadTheme(); // Recarrega o tema para mostrar a nova imagem
        };
        reader.readAsDataURL(file);
    }

    // Evento para upload da FOTO DE PERFIL
    const profilePicInput = document.getElementById('profile-pic-input');
    profilePicInput.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], 'profilePic');
    });

    // Evento para upload da IMAGEM DE FUNDO
    const bgImageInput = document.getElementById('bg-image-input');
    bgImageInput.addEventListener('change', (e) => {
        handleImageUpload(e.target.files[0], 'bgImageDataUrl');
    });

    // Evento para REMOVER a imagem de fundo
    const removeBgBtn = document.getElementById('remove-bg-image-btn');
    removeBgBtn.addEventListener('click', () => {
        if (!confirm('Tem certeza que deseja remover a imagem de fundo?')) {
            return;
        }
        const theme = getFromStorage('theme', {});
        theme.bgImage = ''; // Limpa a URL
        theme.bgImageDataUrl = ''; // Limpa a imagem do dispositivo
        saveToStorage('theme', theme);
        loadTheme(); // Recarrega o tema para mostrar o gradiente
        
        // Limpa os campos de input
        document.getElementById('bg-image').value = '';
        document.getElementById('bg-image-input').value = '';
        
        alert('Imagem de fundo removida.');
    });

    // --- Lógica de 'Arrastar e Soltar' ---

    // Evento de clique para remover links (usando delegação de eventos para mais eficiência)
    const linksListContainer = document.getElementById('current-links-list');
    linksListContainer.addEventListener('click', (e) => {
        if (e.target.matches('.delete-btn')) {
            const indexToRemove = parseInt(e.target.dataset.index, 10);
            if (confirm('Tem certeza que deseja remover este link?')) {
                let currentLinks = getFromStorage('links', []);
                currentLinks.splice(indexToRemove, 1);
                saveToStorage('links', currentLinks);
                renderAdminLinkList();
                renderSectionEditor();
            }
        } else if (e.target.matches('.edit-btn')) {
            const indexToEdit = parseInt(e.target.dataset.index, 10);
            const currentLinks = getFromStorage('links', []);
            const linkData = currentLinks[indexToEdit];

            // Preenche o formulário com os dados do link
            document.getElementById('edit-link-index').value = indexToEdit;
            document.getElementById('link-text').value = linkData.text;
            document.getElementById('link-url').value = linkData.url;
            document.getElementById('link-icon').value = linkData.icon || '';
            document.getElementById('link-section').value = linkData.section || '';
            document.getElementById('link-expiration').value = linkData.expiration || '';

            // Limpa e preenche os checkboxes de dias da semana
            document.querySelectorAll('.day-options input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            if (linkData.scheduledDays) {
                linkData.scheduledDays.forEach(dayIndex => {
                    const checkbox = document.getElementById(`day-${dayIndex}`);
                    if (checkbox) checkbox.checked = true;
                });
            }

            // Altera a interface para o modo de edição
            document.getElementById('submit-link-btn').textContent = 'Salvar Alterações';
            document.getElementById('cancel-edit-btn').style.display = 'block';

            // Rola a página para o topo para que o usuário veja o formulário preenchido
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Botão para cancelar a edição
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    cancelEditBtn.addEventListener('click', resetFormState);

    // Função para resetar o formulário e o estado de edição
    function resetFormState() {
        document.getElementById('add-link-form').reset();
        document.getElementById('edit-link-index').value = '';
        document.getElementById('submit-link-btn').textContent = 'Adicionar Link';
        cancelEditBtn.style.display = 'none';
    }

    // Garante que o botão de cancelar esteja escondido no carregamento inicial
    resetFormState();

    // Inicializa a funcionalidade de 'arrastar e soltar' na lista de links
    new Sortable(linksListContainer, {
        animation: 150, // Animação suave ao reordenar
        handle: '.drag-handle', // Define o elemento que pode ser usado para arrastar
        ghostClass: 'sortable-ghost', // Classe CSS para o item "fantasma"
        onEnd: (evt) => {
            // Esta função é chamada quando o usuário solta o item
            const { oldIndex, newIndex } = evt;
            
            // Pega a lista de links do armazenamento
            const links = getFromStorage('links', []);

            // Remove o item da sua posição antiga e o insere na nova
            const [movedItem] = links.splice(oldIndex, 1);
            links.splice(newIndex, 0, movedItem);

            saveToStorage('links', links); // Salva a nova ordem no localStorage
            renderAdminLinkList(); // Re-renderiza a lista para atualizar os índices dos botões de deletar
        }
    });

    // Inicializa a funcionalidade de 'arrastar e soltar' para as SEÇÕES
    const sectionEditorContainer = document.getElementById('section-editor-list');
    new Sortable(sectionEditorContainer, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: () => {
            // Salva a nova ordem das seções
            const newOrder = Array.from(sectionEditorContainer.children)
                                 .map(item => item.dataset.sectionName);
            saveToStorage('section_order', newOrder);
        }
    });

    // --- Lógica da Zona de Perigo ---
    const resetBtn = document.getElementById('reset-all-data-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const confirmation = prompt('Esta ação apagará TUDO (links, seções, aparência). Para confirmar, digite "redefinir":');
            if (confirmation && confirmation.toLowerCase() === 'redefinir') {
                localStorage.clear();
                alert('Todos os dados foram apagados. A página será recarregada.');
                window.location.reload();
            } else {
                alert('Ação cancelada.');
            }
        });
    }
}

function renderAdminLinkList() {
    const links = getFromStorage('links', []);
    const listContainer = document.getElementById('current-links-list');
    listContainer.innerHTML = '';

    if (links.length === 0) {
        listContainer.innerHTML = '<p>Nenhum link adicionado.</p>';
        return;
    }

    links.forEach((link, index) => {
        const linkEl = document.createElement('div');
        linkEl.className = 'admin-link-item';
        // Mostra o ícone na lista de admin para fácil identificação
        const iconPreview = link.icon ? `<i class="${link.icon}"></i>` : '';
        const clickCount = link.clicks || 0;
        const sectionName = link.section || 'Categorias';
        
        let expirationHtml = '';
        if (link.expiration) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Compara com o início do dia de hoje
            const todayStr = today.toISOString().split('T')[0];
            const isExpired = link.expiration < todayStr;

            // Para exibição, cria a data no fuso horário local para evitar erros de um dia
            const [year, month, day] = link.expiration.split('-').map(Number);
            const displayDate = new Date(year, month - 1, day);
            expirationHtml = `<span class="expiration-date ${isExpired ? 'expired' : ''}" title="Expira em ${displayDate.toLocaleDateString('pt-BR')}"><i class="fas fa-calendar-times"></i> ${displayDate.toLocaleDateString('pt-BR')}</span>`;
        }

        let scheduleHtml = '';
        if (link.scheduledDays && link.scheduledDays.length > 0) {
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            // Ordena os dias para uma exibição consistente (Dom, Seg, Ter...)
            const sortedDays = [...link.scheduledDays].sort((a, b) => a - b);
            const scheduledDayNames = sortedDays.map(dayIndex => dayNames[dayIndex]).join(', ');
            scheduleHtml = `<span class="day-schedule-tag" title="Aparece em: ${scheduledDayNames}"><i class="fas fa-clock"></i> ${scheduledDayNames}</span>`;
        }

        linkEl.innerHTML = `
            <span>
                <i class="fas fa-grip-vertical drag-handle" title="Arraste para reordenar"></i> 
                ${iconPreview} ${link.text} 
                <span class="admin-section-tag">${sectionName}</span> 
                ${expirationHtml} ${scheduleHtml}
                <span class="click-counter" title="Total de cliques"><i class="fas fa-mouse-pointer"></i> ${clickCount}</span>
            </span>
            <div class="admin-link-actions">
                <button class="edit-btn" data-index="${index}">Editar</button>
                <button class="delete-btn" data-index="${index}">Remover</button>
            </div>
        `;
        listContainer.appendChild(linkEl);
    });
}

function renderSectionEditor() {
    const links = getFromStorage('links', []);
    const sectionDetails = getFromStorage('section_details', {});
    let sectionOrder = getFromStorage('section_order', []);
    const editorContainer = document.getElementById('section-editor-list');
    const saveBtn = document.getElementById('save-sections-btn');
    editorContainer.innerHTML = '';

    // Pega a cor padrão do tema para usar como fallback no seletor de cores
    const theme = getFromStorage('theme', {});
    const defaultButtonColor = theme.buttonColor || '#ff6600';

    // Pega nomes de seção únicos a partir dos links
    const sectionNames = [...new Set(links.map(link => link.section || 'Categorias'))];

    if (sectionNames.length === 0) {
        editorContainer.innerHTML = '<p>Nenhuma seção encontrada. Adicione links para criar seções.</p>';
        saveBtn.style.display = 'none'; // Esconde o botão se não houver seções
        return;
    }

    // Sincroniza a ordem
    sectionOrder = sectionOrder.filter(name => sectionNames.includes(name));
    sectionNames.forEach(name => {
        if (!sectionOrder.includes(name)) {
            sectionOrder.push(name);
        }
    });

    saveBtn.style.display = 'block'; // Mostra o botão se houver seções
    sectionOrder.forEach(name => {
        const details = sectionDetails[name] || {};
        const description = details.description || '';
        // Usa a cor salva para a seção, ou a cor padrão do tema se não houver cor salva
        const color = details.color || defaultButtonColor;

        const editorItem = document.createElement('div');
        editorItem.className = 'section-editor-item';
        editorItem.dataset.sectionName = name;
        const safeId = name.replace(/[^a-zA-Z0-9]/g, ''); // Cria um ID seguro para o input
        editorItem.innerHTML = `
            <i class="fas fa-grip-vertical drag-handle" title="Arraste para reordenar"></i>
            <div class="section-editor-content">
                <label for="desc-${safeId}">${name}</label>
                <div class="section-editor-inputs">
                    <input type="text" id="desc-${safeId}" value="${description}" placeholder="Descrição (opcional)">
                    <input type="color" id="color-${safeId}" value="${color}" title="Cor dos botões para a seção '${name}'">
                </div>
            </div>
        `;
        editorContainer.appendChild(editorItem);
    });
}

function setupSharing() {
    const shareInput = document.getElementById('share-link-input');
    const copyBtn = document.getElementById('copy-link-btn');
    const shareWhatsapp = document.getElementById('share-whatsapp');
    const shareTelegram = document.getElementById('share-telegram');

    // Constrói a URL compartilhável de forma segura
    const siteUrl = window.location.href.replace('admin.html', 'index.html');
    
    if (shareInput) {
        shareInput.value = siteUrl;
    }

    // Lógica para copiar o link
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            shareInput.select(); // Seleciona o texto para feedback visual
            navigator.clipboard.writeText(siteUrl).then(() => {
                // Feedback temporário no botão
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.style.backgroundColor = 'var(--admin-success-color)';
                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                    copyBtn.style.backgroundColor = ''; // Volta à cor original
                }, 2000);
            }).catch(err => {
                console.error('Falha ao copiar o link: ', err);
                alert('Não foi possível copiar o link. Tente manualmente.');
            });
        });
    }

    // Configura os links de compartilhamento social
    const shareText = encodeURIComponent("Confira meus achadinhos! ✨");
    const encodedUrl = encodeURIComponent(siteUrl);

    if (shareWhatsapp) shareWhatsapp.href = `https://api.whatsapp.com/send?text=${shareText}%20${encodedUrl}`;
    if (shareTelegram) shareTelegram.href = `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`;
}

// =================================================================
// FUNÇÕES GLOBAIS (Tema e Armazenamento)
// =================================================================

function migrateOldLinks() {
    let links = getFromStorage('links', []);
    let needsUpdate = false;
    links.forEach(link => {
        // Se o link tem a propriedade 'isSpecial' mas não tem 'section'
        if (link.isSpecial !== undefined && link.section === undefined) {
            link.section = link.isSpecial ? '🔥 Ofertas do Dia' : 'Categorias Principais';
            delete link.isSpecial; // Remove a propriedade antiga
            needsUpdate = true;
        }
    });
    if (needsUpdate) {
        saveToStorage('links', links);
    }
}

function loadTheme() {
    const theme = getFromStorage('theme', {
        storeName: 'Achadinhos da [Seu Nome]',
        storeSubtitle: 'As melhores ofertas da Shopee selecionadas para você!',
        profilePic: 'sua-foto.jpg', // Caminho da imagem padrão
        bgImage: '',
        bgImageDataUrl: '', // Para imagem de fundo do dispositivo
        bgColor1: '#f5f7fa',
        bgColor2: '#c3cfe2',
        buttonColor: '#ff6600',
        fontFamily: "'Poppins', sans-serif",
        cardOpacity: '0.95', // Valor padrão para opacidade
        backdropBlur: '5'    // Valor padrão para o blur em pixels
    });

    const root = document.documentElement;

    // Aplica o nome da loja
    const storeNameDisplay = document.getElementById('store-name-display');
    if (storeNameDisplay) {
        storeNameDisplay.textContent = theme.storeName;
        document.title = theme.storeName; // Atualiza o título da aba
    }

    // Aplica o subtítulo da loja
    const storeSubtitleDisplay = document.getElementById('store-subtitle-display');
    if (storeSubtitleDisplay) {
        storeSubtitleDisplay.textContent = theme.storeSubtitle;
    }

    // Aplica a foto de perfil
    const profilePicImg = document.getElementById('profile-pic-img');
    if (profilePicImg) {
        profilePicImg.src = theme.profilePic;
    }
    const adminPreview = document.getElementById('profile-pic-preview');
    if (adminPreview) {
        adminPreview.src = theme.profilePic;
    }

    // Aplica o fundo: prioriza imagem do dispositivo, depois URL, depois gradiente
    const bgImagePreview = document.getElementById('bg-image-preview');
    const removeBgBtn = document.getElementById('remove-bg-image-btn');

    if (theme.bgImageDataUrl) {
        root.style.setProperty('--bg-image', `url('${theme.bgImageDataUrl}')`);
        root.style.setProperty('--bg-gradient', 'none');
        if (bgImagePreview && removeBgBtn) {
            bgImagePreview.src = theme.bgImageDataUrl;
            bgImagePreview.style.display = 'block';
            removeBgBtn.style.display = 'block';
        }
    } else if (theme.bgImage) {
        root.style.setProperty('--bg-image', `url('${theme.bgImage}')`);
        root.style.setProperty('--bg-gradient', 'none');
        if (bgImagePreview && removeBgBtn) {
            bgImagePreview.style.display = 'none';
            removeBgBtn.style.display = 'none';
        }
    } else {
        root.style.setProperty('--bg-image', 'none');
        root.style.setProperty('--bg-gradient', `linear-gradient(135deg, ${theme.bgColor1}, ${theme.bgColor2})`);
        if (bgImagePreview && removeBgBtn) {
            bgImagePreview.style.display = 'none';
            removeBgBtn.style.display = 'none';
        }
    }
    
    root.style.setProperty('--button-bg-color', theme.buttonColor);
    root.style.setProperty('--font-family', theme.fontFamily);
    // A cor da borda da foto de perfil pode ser a mesma do botão para manter a consistência
    root.style.setProperty('--profile-border-color', theme.buttonColor);

    // Aplica os novos controles de opacidade e nitidez
    root.style.setProperty('--card-opacity', theme.cardOpacity || '0.95');
    root.style.setProperty('--backdrop-blur', `${theme.backdropBlur || 5}px`);
}

function getFromStorage(key, defaultValue) {
    const storedValue = localStorage.getItem(key);
    // Verifica se o valor existe e não é a string "undefined"
    if (storedValue && storedValue !== 'undefined') {
        try {
            // Tenta converter o texto salvo de volta para um objeto
            return JSON.parse(storedValue);
        } catch (e) {
            console.error(`Erro ao ler dados do localStorage para a chave "${key}". Removendo item corrompido.`, e);
            // Se a leitura falhar, o dado está corrompido. Removemos e usamos o padrão.
            localStorage.removeItem(key);
            return defaultValue;
        }
    }
    return defaultValue;
}

function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}