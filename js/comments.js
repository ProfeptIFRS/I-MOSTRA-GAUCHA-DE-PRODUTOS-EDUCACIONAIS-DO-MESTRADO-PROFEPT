/**
 * MOSTRA GAÚCHA DE PRODUTOS EDUCACIONAIS DO MESTRADO PROFEPT
 * Cliente de Comentários integrado ao Servidor Próprio (server.py)
 */

(function () {
  'use strict';

  const commentCounts = {}; // { [workId]: count }
  let activeWorkId = null;
  let pollInterval = null;
  let currentOnUpdate = null;

  function getApiBaseUrl() {
    return (window.COMMENTS_API_URL || 'http://localhost:5000').replace(/\/$/, '');
  }

  // Gera iniciais para avatar
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Cor de avatar
  function getAvatarColor(name) {
    if (!name) return '#6366f1';
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#06b6d4', '#0284c7', '#f59e0b'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  // Formatação de data em pt-BR
  function formatDate(isoString) {
    if (!isoString) return 'Recentemente';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recentemente';

    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Atualiza os selos nos cartões do mural
  function updateCardCommentBadges() {
    document.querySelectorAll('[data-comment-badge]').forEach(el => {
      const workId = parseInt(el.dataset.commentBadge, 10);
      const count = commentCounts[workId] || 0;
      el.textContent = count > 0 ? `${count}` : '0';
      el.closest('.btn-card-comments')?.classList.toggle('has-comments', count > 0);
    });
  }

  // Sincroniza todos os contadores do servidor
  async function syncAllCounts() {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/comments`, {
        headers: { 'bypass-tunnel-reminder': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.counts) {
          Object.assign(commentCounts, data.counts);
          updateCardCommentBadges();
        }
      }
    } catch (e) {
      // Servidor offline ou desconectado
    }
  }

  // Busca os comentários de um trabalho específico
  async function fetchWorkComments(workId, onUpdate) {
    if (!workId) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/comments?workId=${workId}`, {
        headers: { 'bypass-tunnel-reminder': 'true' }
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          commentCounts[workId] = list.length;
          updateCardCommentBadges();
          if (onUpdate) onUpdate(list);
        }
      }
    } catch (err) {
      console.warn('Servidor de comentários não respondeu:', err.message);
    }
  }

  // Escuta comentários de um trabalho (com auto-atualização a cada 3 segundos)
  function listenToWorkComments(workId, onUpdate) {
    activeWorkId = workId;
    currentOnUpdate = onUpdate;

    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }

    if (!workId) return;

    // Busca imediata
    fetchWorkComments(workId, onUpdate);

    // Auto-polling enquanto o modal estiver aberto
    pollInterval = setInterval(() => {
      if (activeWorkId === workId && currentOnUpdate) {
        fetchWorkComments(workId, currentOnUpdate);
      }
    }, 3000);
  }

  // Envia novo comentário ao servidor
  async function submitComment(workId, name, affiliation, text) {
    const cleanName = (name || '').trim();
    const cleanAffiliation = (affiliation || '').trim();
    const cleanText = (text || '').trim();

    if (!cleanName) throw new Error('Por favor, informe seu nome.');
    if (!cleanText) throw new Error('Por favor, digite sua mensagem.');
    if (cleanText.length > 600) throw new Error('O comentário deve ter no máximo 600 caracteres.');

    const payload = {
      workId: parseInt(workId, 10),
      name: cleanName,
      affiliation: cleanAffiliation,
      text: cleanText
    };

    let res;
    try {
      res = await fetch(`${getApiBaseUrl()}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      throw new Error(`Não foi possível conectar ao servidor de comentários (${getApiBaseUrl()}). Verifique se o server.py está rodando.`);
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao salvar comentário no servidor.');
    }

    const data = await res.json();
    
    // Atualiza imediatamente a lista
    if (activeWorkId === parseInt(workId, 10) && currentOnUpdate) {
      await fetchWorkComments(workId, currentOnUpdate);
    }
    syncAllCounts();

    return data.comment;
  }

  function getCountForWork(workId) {
    return commentCounts[workId] || 0;
  }

  // Inicialização
  function init() {
    syncAllCounts();
    // Atualiza contagens gerais a cada 10 segundos
    setInterval(syncAllCounts, 10000);
  }

  window.CommentSystem = {
    init,
    getInitials,
    getAvatarColor,
    formatDate,
    getCountForWork,
    listenToWorkComments,
    submitComment,
    updateCardCommentBadges
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
