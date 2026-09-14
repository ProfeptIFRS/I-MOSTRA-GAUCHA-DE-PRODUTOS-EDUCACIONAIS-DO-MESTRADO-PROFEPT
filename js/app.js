/**
 * MOSTRA GAÚCHA DE PRODUTOS EDUCACIONAIS DO MESTRADO PROFEPT
 * Interactive Padlet Application Engine
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const state = {
    data: [...TRABALHOS_DATA],
    searchQuery: '',
    selectedIA: 'ALL',
    selectedLinha: 'ALL',
    selectedMedia: 'ALL',
    currentView: localStorage.getItem('profept_view') || 'columns',
    currentSort: 'id-asc',
    currentTheme: localStorage.getItem('profept_theme') || 'light',
    reactions: JSON.parse(localStorage.getItem('profept_reactions') || '{}'),
    activeModalIndex: null,
    filteredItems: []
  };

  // DOM Elements
  const elements = {
    container: document.getElementById('padletContainer'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    resultsCount: document.getElementById('resultsCount'),
    totalBadge: document.getElementById('totalBadge'),
    l1Badge: document.getElementById('l1Badge'),
    l2Badge: document.getElementById('l2Badge'),
    viewBtns: document.querySelectorAll('.view-btn'),
    filterChips: document.querySelectorAll('.filter-chip'),
    sortSelect: document.getElementById('sortSelect'),
    themeSelect: document.getElementById('themeSelect'),
    modalBackdrop: document.getElementById('detailModal'),
    statsModalBackdrop: document.getElementById('statsModal'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- INITIALIZATION ---
  function init() {
    applyTheme(state.currentTheme);
    setupEventListeners();
    updateBadges();
    render();
  }

  // --- THEME & VIEW HANDLING ---
  function applyTheme(theme) {
    state.currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('profept_theme', theme);
    if (elements.themeSelect) {
      elements.themeSelect.value = theme;
    }
  }

  function setView(view) {
    state.currentView = view;
    localStorage.setItem('profept_view', view);
    elements.viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    render();
  }

  // --- FILTER & SEARCH LOGIC ---
  function getFilteredAndSortedData() {
    const query = state.searchQuery.toLowerCase().trim();

    let items = state.data.filter(item => {
      // IA Filter
      if (state.selectedIA !== 'ALL' && item.ia !== state.selectedIA) {
        return false;
      }

      // Linha Filter
      if (state.selectedLinha !== 'ALL' && item.linha_code !== state.selectedLinha) {
        return false;
      }

      // Media Filter
      if (state.selectedMedia !== 'ALL' && item.media_type !== state.selectedMedia) {
        return false;
      }

      // Search query
      if (query) {
        const titleMatch = item.titulo.toLowerCase().includes(query);
        const authorMatch = item.authors.some(a => a.name.toLowerCase().includes(query));
        const resumoMatch = item.resumo.toLowerCase().includes(query);
        const kwMatch = item.keywords.some(k => k.toLowerCase().includes(query));
        const iaMatch = item.ia.toLowerCase().includes(query);
        const codeMatch = item.code.toLowerCase().includes(query);
        return titleMatch || authorMatch || resumoMatch || kwMatch || iaMatch || codeMatch;
      }

      return true;
    });

    // Sorting
    items.sort((a, b) => {
      if (state.currentSort === 'id-asc') return a.id - b.id;
      if (state.currentSort === 'id-desc') return b.id - a.id;
      if (state.currentSort === 'title-asc') return a.titulo.localeCompare(b.titulo);
      if (state.currentSort === 'ia') return a.ia.localeCompare(b.ia) || a.id - b.id;
      if (state.currentSort === 'likes-desc') {
        const likesA = (state.reactions[a.id]?.likes || 0);
        const likesB = (state.reactions[b.id]?.likes || 0);
        return likesB - likesA || a.id - b.id;
      }
      return 0;
    });

    state.filteredItems = items;
    return items;
  }

  // --- HIGHLIGHT SEARCH QUERY ---
  function highlightText(text, query) {
    if (!query || !text) return escapeHTML(text);
    const escaped = escapeHTML(text);
    const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${q})`, 'gi');
    return escaped.replace(regex, '<mark class="search-match">$1</mark>');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- RENDER CARD COMPONENT ---
  function createCardHTML(item, index) {
    const reactionData = state.reactions[item.id] || { likes: 0, reacted: false };
    const likesCount = reactionData.likes || 0;
    const isReacted = reactionData.reacted;

    const query = state.searchQuery.trim();
    const titleHighlighted = highlightText(item.titulo, query);
    const resumoSnippet = highlightText(item.resumo.slice(0, 220) + (item.resumo.length > 220 ? '...' : ''), query);

    // Media icon & badge
    let mediaIcon = '📄';
    let mediaText = 'Documento';
    if (item.media_type === 'video') {
      mediaIcon = '🎬';
      mediaText = 'Vídeo';
    } else if (item.media_type === 'interactive') {
      mediaIcon = '📖';
      mediaText = 'Interativo';
    } else if (item.media_type === 'drive') {
      mediaIcon = '💾';
      mediaText = 'Google Drive';
    }

    // Authors HTML
    const authorsHTML = item.authors.map(author => `
      <div class="card-author-item">
        <span class="author-icon">👤</span>
        <span class="author-name">${highlightText(author.name, query)}</span>
        <span class="author-role-tag">${author.role}</span>
      </div>
    `).join('');

    // Keywords HTML
    const keywordsHTML = item.keywords.slice(0, 4).map(kw => `
      <button class="keyword-chip" data-keyword="${escapeHTML(kw)}" title="Filtrar por esta palavra-chave">
        #${highlightText(kw, query)}
      </button>
    `).join('');

    // Links HTML
    const linksHTML = item.links.map(link => {
      let icon = '🔗';
      let cls = 'btn-card-link';
      if (link.type === 'youtube') {
        icon = '▶️';
        cls += ' youtube';
      } else if (link.type === 'drive') {
        icon = '📁';
        cls += ' drive';
      } else if (link.type === 'flipbook' || link.type === 'canva') {
        icon = '📖';
        cls += ' flipbook';
      } else if (link.type === 'educapes') {
        icon = '🎓';
        cls += ' educapes';
      }
      return `
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="${cls}" title="${link.label}">
          <span>${icon}</span>
          <span>${link.label}</span>
        </a>
      `;
    }).join('');

    return `
      <article class="padlet-card linha-${item.linha_code.toLowerCase()}" data-id="${item.id}" style="--card-index: ${index};">
        <div class="card-meta-top">
          <div class="card-badges-left">
            <span class="card-id-badge">${item.code}</span>
            <span class="card-ia-badge ${item.ia.toLowerCase()}">${item.ia}</span>
            <span class="card-media-badge">${mediaIcon} ${mediaText}</span>
          </div>
        </div>

        <h3 class="card-title" data-action="open-modal" data-id="${item.id}">
          ${titleHighlighted}
        </h3>

        <div class="card-authors-box">
          ${authorsHTML}
        </div>

        <div class="card-resumo-box">
          <p class="card-resumo" id="resumo-${item.id}">
            ${resumoSnippet}
          </p>
          <button class="btn-toggle-resumo" data-action="open-modal" data-id="${item.id}">
            Ver resumo completo &rarr;
          </button>
        </div>

        <div class="card-keywords-wrap">
          ${keywordsHTML}
          ${item.keywords.length > 4 ? `<span class="keyword-chip" style="opacity: 0.6">+${item.keywords.length - 4}</span>` : ''}
        </div>

        <div class="card-footer">
          <div class="card-links-group">
            ${linksHTML}
          </div>
          <div class="card-reactions-bar">
            <button class="btn-card-reaction ${isReacted ? 'reacted' : ''}" data-action="react" data-id="${item.id}" title="Curtir trabalho">
              <span>❤️</span>
              <span class="reaction-count">${likesCount}</span>
            </button>
            <button class="btn-card-comments ${(window.CommentSystem && window.CommentSystem.getCountForWork(item.id) > 0) ? 'has-comments' : ''}" data-action="open-modal" data-id="${item.id}" title="Ver comentários deste trabalho">
              <span>💬</span>
              <span data-comment-badge="${item.id}">${window.CommentSystem ? window.CommentSystem.getCountForWork(item.id) : 0}</span>
            </button>
            <button class="btn-details-trigger" data-action="open-modal" data-id="${item.id}" title="Ver detalhes completos">
              🔍 Detalhes
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // --- MAIN RENDER FUNCTION ---
  function render() {
    const items = getFilteredAndSortedData();
    elements.resultsCount.textContent = `${items.length} ${items.length === 1 ? 'trabalho' : 'trabalhos'}`;

    if (items.length === 0) {
      elements.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Nenhum trabalho encontrado</h3>
          <p>Tente ajustar sua busca ou limpar os filtros selecionados.</p>
          <button class="btn-header active" id="btnResetFilters">Limpar todos os filtros</button>
        </div>
      `;
      const btnReset = document.getElementById('btnResetFilters');
      if (btnReset) btnReset.addEventListener('click', resetFilters);
      return;
    }

    // View: Columns (Padlet standard grouped by Linha)
    if (state.currentView === 'columns') {
      const l1Items = items.filter(it => it.linha_code === 'L1');
      const l2Items = items.filter(it => it.linha_code === 'L2');

      let colsHTML = '';

      if (l1Items.length > 0) {
        colsHTML += `
          <div class="padlet-column">
            <div class="column-header">
              <div class="column-header-info">
                <span class="column-indicator l1"></span>
                <h2 class="column-title">Linha 1: Práticas Educativas em EPT</h2>
              </div>
              <span class="column-badge">${l1Items.length}</span>
            </div>
            <div class="column-cards-wrapper">
              ${l1Items.map((item, idx) => createCardHTML(item, idx)).join('')}
            </div>
          </div>
        `;
      }

      if (l2Items.length > 0) {
        colsHTML += `
          <div class="padlet-column">
            <div class="column-header">
              <div class="column-header-info">
                <span class="column-indicator l2"></span>
                <h2 class="column-title">Linha 2: Organização e Memórias na EPT</h2>
              </div>
              <span class="column-badge">${l2Items.length}</span>
            </div>
            <div class="column-cards-wrapper">
              ${l2Items.map((item, idx) => createCardHTML(item, idx + 100)).join('')}
            </div>
          </div>
        `;
      }

      elements.container.innerHTML = `<div class="view-columns-layout">${colsHTML}</div>`;
    } 
    // View: Masonry Mural Grid
    else if (state.currentView === 'masonry') {
      elements.container.innerHTML = `
        <div class="view-masonry-layout">
          ${items.map((item, idx) => createCardHTML(item, idx)).join('')}
        </div>
      `;
    }
    // View: Compact Grid
    else if (state.currentView === 'grid') {
      elements.container.innerHTML = `
        <div class="view-grid-layout">
          ${items.map((item, idx) => createCardHTML(item, idx)).join('')}
        </div>
      `;
    }
    // View: List
    else if (state.currentView === 'list') {
      elements.container.innerHTML = `
        <div class="view-list-layout">
          ${items.map((item, idx) => createCardHTML(item, idx)).join('')}
        </div>
      `;
    }
  }

  // --- BADGES UPDATE ---
  function updateBadges() {
    const total = state.data.length;
    const l1Total = state.data.filter(d => d.linha_code === 'L1').length;
    const l2Total = state.data.filter(d => d.linha_code === 'L2').length;

    if (elements.totalBadge) elements.totalBadge.textContent = total;
    if (elements.l1Badge) elements.l1Badge.textContent = l1Total;
    if (elements.l2Badge) elements.l2Badge.textContent = l2Total;
  }

  // --- MODAL DE DETALHES ---
  function openModal(id) {
    const index = state.filteredItems.findIndex(d => d.id === id);
    if (index === -1) return;

    state.activeModalIndex = index;
    const item = state.filteredItems[index];

    const reactionData = state.reactions[item.id] || { likes: 0, reacted: false };

    // YouTube Embed if available
    const ytLink = item.links.find(l => l.type === 'youtube' && l.yt_id);
    let embedHTML = '';
    if (ytLink && ytLink.yt_id) {
      embedHTML = `
        <div class="modal-media-embed">
          <iframe 
            src="https://www.youtube.com/embed/${ytLink.yt_id}?autoplay=0&rel=0" 
            title="${escapeHTML(item.titulo)}" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    // Authors Grid
    const authorsGridHTML = item.authors.map(author => `
      <div class="modal-author-card">
        <span class="modal-author-role">${author.role}</span>
        <span class="modal-author-name">${escapeHTML(author.name)}</span>
      </div>
    `).join('');

    // Keywords Tags
    const keywordsHTML = item.keywords.map(kw => `
      <button class="keyword-chip" data-keyword="${escapeHTML(kw)}">
        #${escapeHTML(kw)}
      </button>
    `).join('');

    // Links Action Buttons
    const linksHTML = item.links.map(link => `
      <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="btn-card-link ${link.type}">
        <span>🔗</span>
        <span>${link.label}</span>
      </a>
    `).join('');

    // ABNT Citation Text
    const primaryAuthor = item.authors[0]?.name || 'AUTOR';
    const authorParts = primaryAuthor.split(' ');
    const lastName = authorParts[authorParts.length - 1].toUpperCase();
    const firstNames = authorParts.slice(0, -1).join(' ');
    const citation = `${lastName}, ${firstNames}. ${item.titulo}. Mostra Gaúcha de Produtos Educacionais do Mestrado ProfEPT, ${item.ia}, 2026. Disponível em: &lt;${item.links[0]?.url || ''}&gt;.`;

    elements.modalBackdrop.innerHTML = `
      <div class="modal-container" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="card-badges-left">
            <span class="card-id-badge">${item.code}</span>
            <span class="card-ia-badge ${item.ia.toLowerCase()}">${item.ia}</span>
            <span class="card-media-badge">${item.linha}</span>
          </div>
          <div class="modal-nav-btns">
            <button class="btn-modal-nav" id="btnModalPrev" ${index === 0 ? 'disabled' : ''} title="Trabalho anterior (Seta esquerda)">← Anterior</button>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${index + 1} de ${state.filteredItems.length}</span>
            <button class="btn-modal-nav" id="btnModalNext" ${index === state.filteredItems.length - 1 ? 'disabled' : ''} title="Próximo trabalho (Seta direita)">Próximo →</button>
            <button class="btn-close-modal" id="btnCloseModal" title="Fechar (Esc)">✕</button>
          </div>
        </div>

        <div class="modal-body">
          ${embedHTML}

          <h2 class="modal-title">${escapeHTML(item.titulo)}</h2>

          <div>
            <div class="modal-section-heading">Autores e Orientadores</div>
            <div class="modal-authors-grid">
              ${authorsGridHTML}
            </div>
          </div>

          <div>
            <div class="modal-section-heading">Resumo do Trabalho & Produto Educacional</div>
            <div class="modal-resumo-text">${escapeHTML(item.resumo)}</div>
          </div>

          <div>
            <div class="modal-section-heading">Palavras-chave</div>
            <div class="card-keywords-wrap">
              ${keywordsHTML}
            </div>
          </div>

          <div>
            <div class="modal-section-heading">Referência / Citação Sugerida</div>
            <div class="modal-citation-box">
              <span class="citation-text" id="citationText">${citation}</span>
              <button class="btn-copy-citation" id="btnCopyCitation">Copiar Citação</button>
            </div>
          </div>

          <!-- SEÇÃO DE COMENTÁRIOS EM TEMPO REAL -->
          <div class="modal-comments-section">
            <div class="comments-header-row">
              <div class="comments-title">
                <span>💬 Comentários & Diálogos</span>
                <span class="comments-count-pill" id="modalCommentsCount">0</span>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Deixe sua dúvida, elogio ou contribuição</span>
            </div>

            <!-- Formulário de Comentário -->
            <form class="comment-form" id="commentForm">
              <div class="comment-form-grid">
                <input type="text" id="commentAuthorName" class="comment-input" placeholder="Seu Nome *" required maxlength="60" autocomplete="name">
                <input type="text" id="commentAuthorAffiliation" class="comment-input" placeholder="Instituição / Vínculo (ex: IFSUL, Professor, Visitante)" maxlength="50">
              </div>
              <textarea id="commentText" class="comment-textarea" placeholder="Escreva seu comentário sobre este produto educacional..." required maxlength="600"></textarea>
              <div class="comment-form-footer">
                <span class="comment-char-counter" id="commentCharCounter">0 / 600</span>
                <button type="submit" class="btn-submit-comment" id="btnSubmitComment">
                  <span>💬</span>
                  <span>Enviar Comentário</span>
                </button>
              </div>
            </form>

            <!-- Lista de Comentários -->
            <div class="comments-list" id="modalCommentsList">
              <div class="comments-empty">Carregando comentários...</div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="card-links-group">
            ${linksHTML}
          </div>
          <div class="card-reactions-bar">
            <button class="btn-card-reaction ${reactionData.reacted ? 'reacted' : ''}" id="modalBtnReact" data-id="${item.id}">
              <span>❤️</span>
              <span>${reactionData.likes} Curtidas</span>
            </button>
            <button class="btn-header" id="modalBtnShare" data-id="${item.id}">
              <span>📤 Compartilhar</span>
            </button>
          </div>
        </div>
      </div>
    `;

    elements.modalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Autofill saved user info
    const savedName = localStorage.getItem('profept_user_name') || '';
    const savedAff = localStorage.getItem('profept_user_affiliation') || '';
    const nameInput = document.getElementById('commentAuthorName');
    const affInput = document.getElementById('commentAuthorAffiliation');
    const textInput = document.getElementById('commentText');
    const charCounter = document.getElementById('commentCharCounter');
    const commentForm = document.getElementById('commentForm');

    if (nameInput && savedName) nameInput.value = savedName;
    if (affInput && savedAff) affInput.value = savedAff;

    if (textInput && charCounter) {
      textInput.addEventListener('input', (e) => {
        charCounter.textContent = `${e.target.value.length} / 600`;
      });
    }

    // Handle Comment Submission
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmitComment');
        if (!btnSubmit) return;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span>⏳ Enviando...</span>';

        try {
          if (window.CommentSystem) {
            await window.CommentSystem.submitComment(
              item.id,
              nameInput.value,
              affInput.value,
              textInput.value
            );

            // Save user identity in localStorage for convenience
            localStorage.setItem('profept_user_name', nameInput.value);
            localStorage.setItem('profept_user_affiliation', affInput.value);

            textInput.value = '';
            charCounter.textContent = '0 / 600';
            showToast('Comentário publicado com sucesso! 💬');
          }
        } catch (err) {
          showToast(err.message || 'Erro ao enviar comentário.');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span>💬</span><span>Enviar Comentário</span>';
        }
      });
    }

    // Connect Real-time Comments Listener
    if (window.CommentSystem) {
      window.CommentSystem.listenToWorkComments(item.id, (commentsList) => {
        const listEl = document.getElementById('modalCommentsList');
        const countPill = document.getElementById('modalCommentsCount');
        if (!listEl) return;

        if (countPill) countPill.textContent = commentsList.length;

        if (commentsList.length === 0) {
          listEl.innerHTML = '<div class="comments-empty">Seja o primeiro a comentar sobre este trabalho! 💬</div>';
          return;
        }

        listEl.innerHTML = commentsList.map(c => {
          const initials = window.CommentSystem.getInitials(c.name);
          const color = window.CommentSystem.getAvatarColor(c.name);
          const dateStr = window.CommentSystem.formatDate(c.createdAt);
          const affBadge = c.affiliation ? `<span class="comment-author-affiliation">${escapeHTML(c.affiliation)}</span>` : '';

          return `
            <div class="comment-item">
              <div class="comment-avatar" style="background-color: ${color};">${escapeHTML(initials)}</div>
              <div class="comment-content">
                <div class="comment-author-row">
                  <span class="comment-author-name">${escapeHTML(c.name)}</span>
                  ${affBadge}
                  <span class="comment-date">${escapeHTML(dateStr)}</span>
                </div>
                <div class="comment-body-text">${escapeHTML(c.text)}</div>
              </div>
            </div>
          `;
        }).join('');
      });
    }

    // Bind modal actions
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnModalPrev').addEventListener('click', () => {
      if (state.activeModalIndex > 0) openModal(state.filteredItems[state.activeModalIndex - 1].id);
    });
    document.getElementById('btnModalNext').addEventListener('click', () => {
      if (state.activeModalIndex < state.filteredItems.length - 1) openModal(state.filteredItems[state.activeModalIndex + 1].id);
    });
    document.getElementById('btnCopyCitation').addEventListener('click', () => {
      const cleanCitation = document.getElementById('citationText').innerText;
      navigator.clipboard.writeText(cleanCitation);
      showToast('Citação copiada para a área de transferência! 📋');
    });
    document.getElementById('modalBtnReact').addEventListener('click', () => {
      handleReaction(item.id);
      openModal(item.id); // Refresh modal view
    });
    document.getElementById('modalBtnShare').addEventListener('click', () => {
      handleShare(item);
    });

    // Tag click in modal
    elements.modalBackdrop.querySelectorAll('.keyword-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = btn.dataset.keyword;
        closeModal();
        setSearch(kw);
      });
    });
  }

  function closeModal() {
    elements.modalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    state.activeModalIndex = null;
    // Clear iframe to stop audio/video playing in background
    setTimeout(() => {
      elements.modalBackdrop.innerHTML = '';
    }, 250);
  }

  // --- STATS MODAL ---
  function openStatsModal() {
    const total = state.data.length;
    const ifsul = state.data.filter(d => d.ia === 'IFSUL').length;
    const ifrs = state.data.filter(d => d.ia === 'IFRS').length;
    const iffar = state.data.filter(d => d.ia === 'IFFAR').length;
    const l1 = state.data.filter(d => d.linha_code === 'L1').length;
    const l2 = state.data.filter(d => d.linha_code === 'L2').length;
    const videos = state.data.filter(d => d.media_type === 'video').length;
    const interactive = state.data.filter(d => d.media_type === 'interactive').length;

    elements.statsModalBackdrop.innerHTML = `
      <div class="modal-container" style="max-width: 650px;" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">📊 Estatísticas da Mostra</h2>
          <button class="btn-close-modal" id="btnCloseStatsModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="stats-grid">
            <div class="stat-metric-card">
              <div class="stat-metric-val">${total}</div>
              <div class="stat-metric-label">Trabalhos Aprovados</div>
            </div>
            <div class="stat-metric-card">
              <div class="stat-metric-val">${l1}</div>
              <div class="stat-metric-label">Linha 1 (Práticas Educativas)</div>
            </div>
            <div class="stat-metric-card">
              <div class="stat-metric-val">${l2}</div>
              <div class="stat-metric-label">Linha 2 (Org. e Memórias)</div>
            </div>
            <div class="stat-metric-card">
              <div class="stat-metric-val">${videos}</div>
              <div class="stat-metric-label">Produtos em Vídeo</div>
            </div>
          </div>

          <div class="modal-section-heading">Distribuição por Instituição Associada</div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                <span>IFSUL</span>
                <strong>${ifsul} trabalhos (${Math.round((ifsul / total) * 100)}%)</strong>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(ifsul / total) * 100}%; background: var(--accent-emerald);"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                <span>IFRS</span>
                <strong>${ifrs} trabalhos (${Math.round((ifrs / total) * 100)}%)</strong>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(ifrs / total) * 100}%; background: var(--ifrs-border);"></div>
              </div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                <span>IFFAR</span>
                <strong>${iffar} trabalhos (${Math.round((iffar / total) * 100)}%)</strong>
              </div>
              <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(iffar / total) * 100}%; background: var(--accent-amber);"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: flex-end;">
          <button class="btn-header active" id="btnCloseStatsModalBtn">Fechar</button>
        </div>
      </div>
    `;

    elements.statsModalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    const closeStats = () => {
      elements.statsModalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    };

    document.getElementById('btnCloseStatsModal').addEventListener('click', closeStats);
    document.getElementById('btnCloseStatsModalBtn').addEventListener('click', closeStats);
  }

  // --- ACTIONS: REACT, SHARE, TOAST ---
  function handleReaction(id) {
    if (!state.reactions[id]) {
      state.reactions[id] = { likes: 0, reacted: false };
    }

    if (state.reactions[id].reacted) {
      state.reactions[id].likes = Math.max(0, state.reactions[id].likes - 1);
      state.reactions[id].reacted = false;
      showToast('Curtida desfeita');
    } else {
      state.reactions[id].likes += 1;
      state.reactions[id].reacted = true;
      showToast('Você curtiu este trabalho! ❤️');
    }

    localStorage.setItem('profept_reactions', JSON.stringify(state.reactions));
    render();
  }

  function handleShare(item) {
    const shareData = {
      title: item.titulo,
      text: `${item.titulo} - ${item.authors[0]?.name}`,
      url: item.links[0]?.url || window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareData.title}\nLink: ${shareData.url}`);
      showToast('Link e título copiados para a área de transferência! 🔗');
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function setSearch(query) {
    state.searchQuery = query;
    elements.searchInput.value = query;
    elements.searchClear.style.display = query ? 'block' : 'none';
    render();
  }

  function resetFilters() {
    state.searchQuery = '';
    state.selectedIA = 'ALL';
    state.selectedLinha = 'ALL';
    state.selectedMedia = 'ALL';
    elements.searchInput.value = '';
    elements.searchClear.style.display = 'none';

    elements.filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === 'ALL');
    });

    render();
    showToast('Filtros restaurados!');
  }

  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      elements.searchClear.style.display = state.searchQuery ? 'block' : 'none';
      render();
    });

    elements.searchClear.addEventListener('click', () => {
      setSearch('');
      elements.searchInput.focus();
    });

    // Keyboard shortcut for search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== elements.searchInput) {
        e.preventDefault();
        elements.searchInput.focus();
      } else if (e.key === 'Escape') {
        if (state.activeModalIndex !== null) {
          closeModal();
        } else if (elements.statsModalBackdrop.classList.contains('open')) {
          elements.statsModalBackdrop.classList.remove('open');
          document.body.style.overflow = '';
        } else if (state.searchQuery) {
          setSearch('');
        }
      } else if (state.activeModalIndex !== null) {
        if (e.key === 'ArrowLeft' && state.activeModalIndex > 0) {
          openModal(state.filteredItems[state.activeModalIndex - 1].id);
        } else if (e.key === 'ArrowRight' && state.activeModalIndex < state.filteredItems.length - 1) {
          openModal(state.filteredItems[state.activeModalIndex + 1].id);
        }
      }
    });

    // View buttons
    elements.viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setView(btn.dataset.view);
      });
    });

    // Filter Chips
    elements.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const ia = chip.dataset.ia;
        const linha = chip.dataset.linha;
        const media = chip.dataset.media;
        const fav = chip.dataset.fav;

        if (ia) {
          state.selectedIA = (state.selectedIA === ia) ? 'ALL' : ia;
          elements.filterChips.forEach(c => {
            if (c.dataset.ia) c.classList.toggle('active', c.dataset.ia === state.selectedIA);
          });
        }

        if (linha) {
          state.selectedLinha = (state.selectedLinha === linha) ? 'ALL' : linha;
          elements.filterChips.forEach(c => {
            if (c.dataset.linha) c.classList.toggle('active', c.dataset.linha === state.selectedLinha);
          });
        }

        if (media) {
          state.selectedMedia = (state.selectedMedia === media) ? 'ALL' : media;
          elements.filterChips.forEach(c => {
            if (c.dataset.media) c.classList.toggle('active', c.dataset.media === state.selectedMedia);
          });
        }

        render();
      });
    });

    // Sort select
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.currentSort = e.target.value;
        render();
      });
    }

    // Theme selector
    if (elements.themeSelect) {
      elements.themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
      });
    }

    // Stats modal button
    const btnStats = document.getElementById('btnOpenStats');
    if (btnStats) {
      btnStats.addEventListener('click', openStatsModal);
    }

    // Reset filters button
    const btnResetAll = document.getElementById('btnResetAllFilters');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', resetFilters);
    }

    // Delegate clicks inside padlet container
    elements.container.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-keyword]');
      if (!target) return;

      if (target.dataset.keyword) {
        setSearch(target.dataset.keyword);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const action = target.dataset.action;
      const id = parseInt(target.dataset.id, 10);

      if (action === 'open-modal') {
        openModal(id);
      } else if (action === 'react') {
        handleReaction(id);
      }
    });

    // Close modals by clicking on backdrop
    elements.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.modalBackdrop) closeModal();
    });
    elements.statsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.statsModalBackdrop) {
        elements.statsModalBackdrop.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
