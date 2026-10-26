/**
 * CONTINUUM - componente Header (navbar lateral).
 *
 * Uso na página:
 *   <div id="appHeader" data-role="designer" data-active="painel"></div>
 *   <script src="../../../components/header/header.js"></script>
 *
 * data-role   : designer | doador | empresa (se omitido, usa o perfil da sessão)
 * data-active : chave do item ativo (ver ROLES abaixo)
 *
 * Dispara o evento "header:ready" no document quando a navbar é montada.
 */
(() => {
  'use strict';

  const script = document.currentScript;
  const host = document.getElementById('appHeader');
  if (!host || !script) return;

  const ROOT = new URL('../../', script.src); // raiz do frontend-final/
  const SESSION_KEY = 'continuum_sessao';
  const DEFAULT_ROLE = 'designer';

  const ICONS = {
    pattern: '<path d="M4 4h12c2.2 0 4 1.8 4 4v12H4V4Z"/><path d="M4 12h16M12 4v16" stroke-dasharray="3 2"/>',
    spool: '<rect x="5" y="3" width="14" height="3" rx="1"/><rect x="5" y="18" width="14" height="3" rx="1"/><path d="M7 6v12M17 6v12M7 9h10M7 12h10M7 15h10"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.5 7.5 11.5 11.5M8.5 16.5 20 5"/>',
    needle: '<path d="M20 4 11 13"/><ellipse cx="20.5" cy="3.5" rx="1.5" ry="1.5" transform="rotate(-45 20.5 3.5)"/><path d="M11 13c-3 3-5 0-7 3s1 5 4 3"/>',
    mannequin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M9 22H15"/><path d="M8 4C8 3 9.5 2 12 2C14.5 2 16 3 16 4C16 7 18 9 17 12C16 14.5 14 17 12 17C10 17 8 14.5 7 12C6 9 8 7 8 4Z"/>'
  };

  const ROLES = {
    designer: {
      sublogo: 'Designer / Confeccionista',
      links: [
        { key: 'painel', label: 'Painel', icon: 'pattern', href: 'pages/designer/painel/index.html' },
        { key: 'lotes-disponiveis', label: 'Lotes disponíveis', icon: 'spool', href: 'pages/designer/lotes-disponiveis/index.html' },
        { key: 'meus-lotes', label: 'Meus lotes', icon: 'scissors', href: 'pages/designer/meus-lotes/index.html', badgeId: 'navBadge' },
        { key: 'meus-projetos', label: 'Meus projetos', icon: 'needle', href: 'pages/designer/meus-projetos/index.html' },
        { key: 'perfil', label: 'Meu perfil', icon: 'mannequin', href: 'pages/designer/perfil/index.html' }
      ]
    },
    doador: {
      sublogo: 'Doador(a)',
      links: [
        { key: 'painel', label: 'Painel', icon: 'pattern', href: 'pages/doador/painel/index.html' },
        { key: 'perfil', label: 'Meu perfil', icon: 'mannequin', href: 'pages/doador/perfil/index.html' }
      ]
    },
    empresa: {
      sublogo: 'Corporativo',
      links: [
        { key: 'painel', label: 'Painel', icon: 'pattern', href: 'pages/empresa/painel/index.html' },
        { key: 'lotes', label: 'Lotes', icon: 'spool', href: 'pages/empresa/lotes/index.html' },
        { key: 'projetos', label: 'Projetos', icon: 'needle', href: 'pages/empresa/projetos/index.html' },
        { key: 'perfil', label: 'Perfil da empresa', icon: 'mannequin', href: 'pages/empresa/perfil/index.html' }
      ]
    }
  };

  const readSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch (error) {
      return null;
    }
  };

  const session = readSession();
  const role = host.dataset.role || session?.perfil || DEFAULT_ROLE;
  const config = ROLES[role] || ROLES[DEFAULT_ROLE];
  const active = host.dataset.active || '';

  const createNavLink = (item) => {
    const link = document.createElement('a');
    link.className = 'sidebar__link';
    link.href = new URL(item.href, ROOT).href;
    if (item.key === active) link.setAttribute('aria-current', 'page');

    const badge = item.badgeId
      ? `<span class="sidebar__badge" id="${item.badgeId}" style="display:none">0</span>`
      : '';
    link.innerHTML =
      `<svg class="sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[item.icon]}</svg>` +
      `<span>${item.label}</span>${badge}`;
    return link;
  };

  const buildNav = (nav) => {
    config.links.forEach((item) => nav.appendChild(createNavLink(item)));
  };

  const setupLogo = () => {
    const logo = host.querySelector('[data-header-logo]');
    if (!logo) return;

    if (role === 'empresa') {
      logo.style.display = 'none';
      return;
    }
    logo.src = new URL('assets/images/logo-circular.png', ROOT).href;
    logo.style.display = '';
  };

  const setupLogout = () => {
    const logout = host.querySelector('[data-header-logout]');
    if (!logout) return;

    logout.href = new URL('pages/auth/login/index.html', ROOT).href;
    logout.addEventListener('click', () => {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch (error) { /* ignore */ }
    });
  };

  const setupSidebarToggle = () => {
    const layout = document.querySelector('.app-layout');
    const toggle = host.querySelector('#sidebarToggle');
    const restore = host.querySelector('#sidebarRestore');
    if (!layout || !toggle || !restore) return;

    toggle.addEventListener('click', () => layout.classList.add('sidebar-collapsed'));
    restore.addEventListener('click', () => layout.classList.remove('sidebar-collapsed'));
  };

  const mount = (html) => {
    host.innerHTML = html;

    setupLogo();

    const sublogo = host.querySelector('[data-header-sublogo]');
    if (sublogo) sublogo.textContent = config.sublogo;

    const user = host.querySelector('[data-header-user]');
    if (user && session?.nome) user.textContent = session.nome;

    const nav = host.querySelector('[data-header-nav]');
    if (nav) buildNav(nav);

    setupLogout();
    setupSidebarToggle();

    document.dispatchEvent(new CustomEvent('header:ready'));
  };

  fetch(new URL('header.html', script.src))
    .then((res) => res.text())
    .then(mount)
    .catch(() => mount('<p>Navegação indisponível.</p>'));
})();
