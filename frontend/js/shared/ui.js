/**
 * CONTINUUM — ui.js
 * Gerenciador de componentes de UI: Toasts, Modais, Tabs, Skeletons.
 */

export const ui = {

  /* -----------------------------------------------------------------------
     TOAST
  ----------------------------------------------------------------------- */

  _getOrCreateToastRegion() {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'false');
      document.body.appendChild(region);
    }
    return region;
  },

  /**
   * Exibe um toast flutuante.
   * @param {string} message - Mensagem a exibir
   * @param {'info'|'success'|'error'|'warning'} type
   * @param {Function|null} onUndo - Callback para ação de desfazer
   */
  showToast(message, type = 'info', onUndo = null) {
    const region = this._getOrCreateToastRegion();
    const toast  = document.createElement('div');

    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    toast.innerHTML = `
      <span class="toast__msg">${message}</span>
      ${onUndo ? '<button class="toast__undo">Desfazer</button>' : ''}
      <div class="toast__progress"></div>
    `;

    if (onUndo) {
      toast.querySelector('.toast__undo').addEventListener('click', () => {
        onUndo();
        this._dismissToast(toast);
      });
    }

    region.appendChild(toast);

    const timer = setTimeout(() => this._dismissToast(toast), 5000);
    toast._timer = timer;
  },

  _dismissToast(toast) {
    clearTimeout(toast._timer);
    toast.style.animation = `toast-out var(--dur-base) var(--ease-in-out) both`;
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  },

  /* -----------------------------------------------------------------------
     MODAL (usando <dialog> nativo)
  ----------------------------------------------------------------------- */

  /**
   * Abre um modal pelo ID.
   * @param {string} modalId
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return console.warn(`[ui] Modal #${modalId} não encontrado.`);
    modal.showModal();
    modal.focus();
  },

  /**
   * Fecha um modal pelo ID, respeitando a transição CSS.
   * @param {string} modalId
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.close();
  },

  /* -----------------------------------------------------------------------
     TABS (data-driven)
     Uso: chamar setupTabs(containerEl) uma vez por grupo de abas.
  ----------------------------------------------------------------------- */

  /**
   * Inicializa o comportamento de abas em um container.
   * Espera: [role="tablist"] com [role="tab"][data-panel="..."]
   *   e painéis com [role="tabpanel"][id="..."]
   * @param {HTMLElement} container
   */
  setupTabs(container) {
    const tablist = container.querySelector('[role="tablist"]');
    if (!tablist) return;

    const tabs   = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));

    const activate = (tab) => {
      tabs.forEach(t => {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('tabs__btn--active');
      });
      panels.forEach(p => p.hidden = true);

      tab.setAttribute('aria-selected', 'true');
      tab.classList.add('tabs__btn--active');
      const panelId = tab.getAttribute('aria-controls');
      document.getElementById(panelId).hidden = false;
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => activate(tab));

      // Suporte a teclado (← →)
      tab.addEventListener('keydown', e => {
        const idx = tabs.indexOf(e.currentTarget);
        if (e.key === 'ArrowRight') tabs[(idx + 1) % tabs.length].focus();
        if (e.key === 'ArrowLeft')  tabs[(idx - 1 + tabs.length) % tabs.length].focus();
      });
    });

    // Ativa a primeira aba por padrão
    if (tabs.length > 0) activate(tabs[0]);
  },

  /* -----------------------------------------------------------------------
     SKELETON
  ----------------------------------------------------------------------- */

  /**
   * Substitui o conteúdo de um elemento por placeholders de skeleton.
   * @param {HTMLElement} el
   * @param {number} lines - Número de linhas a mostrar
   */
  showSkeleton(el, lines = 3) {
    el.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<div class="skeleton" style="height:20px;width:${85 - i * 10}%;margin-bottom:10px;border-radius:4px"></div>`
    ).join('');
  },

  /* -----------------------------------------------------------------------
     ESTADO VAZIO
  ----------------------------------------------------------------------- */

  /**
   * Renderiza uma mensagem de estado vazio estilizada.
   * @param {HTMLElement} container
   * @param {string} message
   */
  showEmpty(container, message = 'Nenhum item encontrado.') {
    container.innerHTML = `
      <div style="padding:var(--space-2xl);text-align:center;color:var(--color-muted);">
        <p style="font-size:var(--text-lg);margin-bottom:var(--space-xs);">—</p>
        <p style="font-size:var(--text-sm);">${message}</p>
      </div>
    `;
  }
};
