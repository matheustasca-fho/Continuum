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
(function () {
  'use strict';

  var script = document.currentScript;
  var host = document.getElementById('appHeader');
  if (!host || !script) return;

  var ROOT = new URL('../../', script.src); // raiz do frontend-final/
  var SESSION_KEY = 'continuum_sessao';

  var ICONS = {
    pattern: '<path d="M4 4h12c2.2 0 4 1.8 4 4v12H4V4Z"/><path d="M4 12h16M12 4v16" stroke-dasharray="3 2"/>',
    spool: '<rect x="5" y="3" width="14" height="3" rx="1"/><rect x="5" y="18" width="14" height="3" rx="1"/><path d="M7 6v12M17 6v12M7 9h10M7 12h10M7 15h10"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.5 7.5 11.5 11.5M8.5 16.5 20 5"/>',
    needle: '<path d="M20 4 11 13"/><ellipse cx="20.5" cy="3.5" rx="1.5" ry="1.5" transform="rotate(-45 20.5 3.5)"/><path d="M11 13c-3 3-5 0-7 3s1 5 4 3"/>',
    mannequin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M9 22H15"/><path d="M8 4C8 3 9.5 2 12 2C14.5 2 16 3 16 4C16 7 18 9 17 12C16 14.5 14 17 12 17C10 17 8 14.5 7 12C6 9 8 7 8 4Z"/>'
  };

  var ROLES = {
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

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
  }

  var session = readSession();
  var role = host.dataset.role || (session && session.perfil) || 'designer';
  var config = ROLES[role] || ROLES.designer;
  var active = host.dataset.active || '';

  function buildNav(nav) {
    config.links.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'sidebar__link';
      a.href = new URL(item.href, ROOT).href;
      if (item.key === active) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<svg class="sidebar__icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[item.icon] + '</svg>' +
        '<span>' + item.label + '</span>' +
        (item.badgeId ? '<span class="sidebar__badge" id="' + item.badgeId + '" style="display:none">0</span>' : '');
      nav.appendChild(a);
    });
  }

  function mount(html) {
    host.innerHTML = html;

    var logo = host.querySelector('[data-header-logo]');
    if (logo) logo.src = new URL('assets/images/logo-circular.png', ROOT).href;

    var sub = host.querySelector('[data-header-sublogo]');
    if (sub) sub.textContent = config.sublogo;

    var user = host.querySelector('[data-header-user]');
    if (user && session && session.nome) user.textContent = session.nome;

    var nav = host.querySelector('[data-header-nav]');
    if (nav) buildNav(nav);

    var logout = host.querySelector('[data-header-logout]');
    if (logout) {
      logout.href = new URL('pages/auth/login/index.html', ROOT).href;
      logout.addEventListener('click', function () {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
      });
    }

    var layout = document.querySelector('.app-layout');
    var toggle = host.querySelector('#sidebarToggle');
    var restore = host.querySelector('#sidebarRestore');
    if (layout && toggle && restore) {
      toggle.addEventListener('click', function () { layout.classList.add('sidebar-collapsed'); });
      restore.addEventListener('click', function () { layout.classList.remove('sidebar-collapsed'); });
    }

    document.dispatchEvent(new CustomEvent('header:ready'));
  }

  fetch(new URL('header.html', script.src))
    .then(function (res) { return res.text(); })
    .then(mount)
    .catch(function () { mount('<p>Navegação indisponível.</p>'); });
})();
