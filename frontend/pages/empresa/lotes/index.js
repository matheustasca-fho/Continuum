// CONTINUUM - Application Script
(() => {
  'use strict';

  /* ==========================================================
     CONSTANTES
     ========================================================== */
  const ADMIN_PASSWORD = 'AdminEmpresa';
  const MAX_LOTS_PER_BATCH = 100;
  const SCROLL_FLAG_THRESHOLD_PX = 12;
  const SCROLLABLE_TOLERANCE_PX = 8;
  const MENU_CLOSE_DELAY_MS = 180;
  const SEARCH_FOCUS_DELAY_MS = 180;
  const MODAL_EASING = 'cubic-bezier(.22,.75,.25,1)';
  const DEFAULT_STATUS = 'DISPONÍVEL';

  const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Todos os status' },
    { value: 'DISPONÍVEL', label: 'Disponível' },
    { value: 'RESERVADO', label: 'Reservado' },
    { value: 'EM PRODUÇÃO', label: 'Em Produção' },
    { value: 'ENVIADO', label: 'Enviado' },
    { value: 'FINALIZADO', label: 'Finalizado' }
  ];
  const LOT_STATUS_OPTIONS = STATUS_OPTIONS.slice(1);
  const STATUS_ORDER = LOT_STATUS_OPTIONS.map(({ value }) => value);

  const STATUS_ICON_PATHS = {
    ALL: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    'DISPONÍVEL': '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
    RESERVADO: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>',
    'EM PRODUÇÃO': '<path d="M3 21V10l6 5v-5l6 5V8h6v13H3z"/><path d="M18 4h3M7 19h.01M12 19h.01M17 19h.01"/>',
    ENVIADO: '<path d="M3 12h12m-5-5 5 5-5 5"/><path d="M15 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/>',
    FINALIZADO: '<path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-2.64-6.36"/>'
  };

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

  const PEN_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  /* ==========================================================
     ESTADO
     ========================================================== */
  let lotsData = [
    { id: 1, code: 'L00128092026', date: '28/09/2026', desc: 'Descrição detalhada do lote textil recuperado', status: 'DISPONÍVEL', image: null },
    { id: 2, code: 'L00228092026', date: '28/09/2026', desc: 'Descrição detalhada do lote textil recuperado', status: 'EM PRODUÇÃO', image: null },
    { id: 3, code: 'L00328092026', date: '28/09/2026', desc: 'Descrição detalhada do lote textil recuperado', status: 'RESERVADO', image: null }
  ];

  let activeFilter = 'ALL';
  let searchQuery = '';
  let currentEditingLotId = null;
  let lotAwaitingImage = null;
  let pendingModalImage = null;
  let authorizationConfirmed = false;
  let pendingStatusChange = null;
  let pendingNewLot = null;

  /* ==========================================================
     ELEMENTOS DO DOM
     ========================================================== */
  const byId = (id) => document.getElementById(id);

  const lotsGrid = byId('lotsGrid');
  const filterSearchInput = byId('filterSearchInput');
  const statusFilter = byId('statusFilter');
  const searchToggle = byId('searchToggle');
  const filterTrigger = byId('filterTrigger');
  const searchWrapper = document.querySelector('.filter-wrapper');
  const lotQuantity = byId('lotQuantity');
  const quantityField = byId('quantityField');
  const btnAddLote = byId('btnAddLote');
  const addModal = byId('addModal');
  const addModalClose = byId('addModalClose');
  const addModalCancel = byId('addModalCancel');
  const addLotForm = byId('addLotForm');
  const lotCodeInput = byId('lotCode');
  const lotDescInput = byId('lotDesc');
  const lotIdInput = byId('lotIdInput');
  const btnDeleteLot = byId('btnDeleteLot');
  const modalFormTitle = byId('modalFormTitle');
  const imageUploadInput = byId('imageUploadInput');
  const modalImageInput = byId('modalImageInput');
  const modalImgUploadArea = byId('modalImgUploadArea');
  const modalImgPreview = byId('modalImgPreview');
  const modalImgPlaceholder = byId('modalImgPlaceholder');
  const statusField = byId('statusField');
  const lotStatusSelect = byId('lotStatusSelect');
  const consentNoticeModal = byId('consentNoticeModal');
  const consentModal = byId('consentModal');
  const consentForm = byId('consentForm');
  const adminPassword = byId('adminPassword');
  const passwordToggle = byId('passwordToggle');
  const passwordMessage = byId('passwordMessage');
  const consentCheck = byId('consentCheck');
  const statusConfirmModal = byId('statusConfirmModal');
  const statusConfirmCopy = byId('statusConfirmCopy');
  const editorModalBox = addModal.querySelector('.modal-box');

  /* ==========================================================
     UTILIDADES
     ========================================================== */
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

  const slugifyStatus = (status) =>
    status.toLowerCase().replace(/ /g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const statusBadgeClass = (status) => `badge badge--${slugifyStatus(status)}`;

  const statusIconMarkup = (value) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    `${STATUS_ICON_PATHS[value] || STATUS_ICON_PATHS.ALL}</svg>`;

  const statusOptionMarkup = (value, label) =>
    `${statusIconMarkup(value)}<span>${escapeHtml(label)}</span><span class="status-menu__check" aria-hidden="true">✓</span>`;

  const createStatusOptionButton = (value, label) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `status-menu__option status-menu__option--${slugifyStatus(value)}`;
    item.dataset.value = value;
    item.setAttribute('role', 'option');
    item.innerHTML = statusOptionMarkup(value, label);
    return item;
  };

  const setOptionSelected = (option, selected) => {
    option.classList.toggle('is-selected', selected);
    option.setAttribute('aria-selected', String(selected));
  };

  const getTodayStr = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${today.getFullYear()}`;
  };

  const getLotCode = (lot) => lot.code.split('|')[0].trim();

  const getLotDate = (lot) => {
    if (lot.date) return lot.date;
    const legacyDate = (lot.code.split('|')[1] || '').trim();
    if (legacyDate) return legacyDate;
    const compactDate = getLotCode(lot).match(/^L\d{3}(\d{2})(\d{2})(\d{4})$/i);
    return compactDate ? `${compactDate[1]}/${compactDate[2]}/${compactDate[3]}` : getTodayStr();
  };

  const getNextLotCode = () => {
    const highest = lotsData.reduce((value, lot) => {
      const match = getLotCode(lot).match(/^L(?:ote-)?(\d{3})/i);
      return match ? Math.max(value, Number(match[1])) : value;
    }, 0);
    return `L${String(highest + 1).padStart(3, '0')}${getTodayStr().replace(/\//g, '')}`;
  };

  const findLotById = (id) => lotsData.find((lot) => lot.id === id);

  const readImageAsDataUrl = (file, onLoad) => {
    const reader = new FileReader();
    reader.onload = (event) => onLoad(event.target.result);
    reader.readAsDataURL(file);
  };

  const createPatternSvg = (id) => {
    const patternId = `pat-${id}`;
    const label = (x, y) =>
      `<text x="${x}" y="${y}" fill="#782736" font-family="Anton,sans-serif" font-size="14" letter-spacing="2">CONTINUUM</text>`;
    return '<svg class="thumb-svg" viewBox="0 0 320 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      `<defs><pattern id="${patternId}" width="96" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-33)">` +
      `${label(6, 17)}${label(54, 42)}</pattern></defs>` +
      '<rect width="100%" height="100%" fill="#F5F2EB"/>' +
      `<rect width="100%" height="100%" fill="url(#${patternId})"/></svg>`;
  };

  /* ==========================================================
     MENU DE STATUS (filtro e editor)
     ========================================================== */
  const createStatusMenu = ({ extraClass = '', triggerContent = '', heading }) => {
    const menu = document.createElement('div');
    menu.className = `status-menu ${extraClass}`.trim();
    menu.innerHTML =
      `<button type="button" class="status-menu__trigger" aria-haspopup="listbox" aria-expanded="false">${triggerContent}</button>` +
      `<div class="status-menu__options" role="listbox" hidden><p class="status-menu__heading">${heading}</p></div>`;
    return {
      menu,
      trigger: menu.querySelector('.status-menu__trigger'),
      options: menu.querySelector('.status-menu__options')
    };
  };

  const bindMenuToggle = ({ menu, trigger, options }, { onOpen = () => {}, onClose = () => {} } = {}) => {
    const open = () => {
      options.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      onOpen();
      window.requestAnimationFrame(() => options.classList.add('is-open'));
    };

    const close = () => {
      options.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      onClose();
      window.setTimeout(() => {
        if (!options.classList.contains('is-open')) options.hidden = true;
      }, MENU_CLOSE_DELAY_MS);
    };

    trigger.addEventListener('click', () => (options.classList.contains('is-open') ? close() : open()));
    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && !options.hidden) close();
    });
    return { open, close };
  };

  const populateSelect = (select, options) => {
    select.innerHTML = '';
    options.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  };

  // ---- Filtro de status (barra superior) ----
  const filterMenu = createStatusMenu({
    triggerContent: `${statusIconMarkup('ALL')}<span class="status-menu__label">Todos os status</span><span class="status-menu__chevron" aria-hidden="true">⌄</span>`,
    heading: 'Filtrar por status'
  });
  const filterMenuControls = (() => {
    populateSelect(statusFilter, STATUS_OPTIONS);
    statusFilter.hidden = true;
    statusFilter.after(filterMenu.menu);
    filterMenu.trigger.dataset.status = 'all';

    STATUS_OPTIONS.forEach(({ value, label }) => {
      const item = createStatusOptionButton(value, label);
      setOptionSelected(item, value === 'ALL');
      filterMenu.options.appendChild(item);
    });
    return bindMenuToggle(filterMenu);
  })();

  const selectFilterOption = (item) => {
    const { value } = item.dataset;
    statusFilter.value = value;
    activeFilter = value;
    filterMenu.trigger.querySelector('.status-menu__label').textContent = item.querySelector('span').textContent;
    filterMenu.trigger.querySelector('svg').outerHTML = statusIconMarkup(value);
    filterMenu.trigger.dataset.status = slugifyStatus(value);
    filterMenu.options.querySelectorAll('.status-menu__option').forEach((option) => setOptionSelected(option, option === item));
    filterMenuControls.close();
    renderLots();
  };

  filterMenu.options.addEventListener('click', (event) => {
    const item = event.target.closest('.status-menu__option');
    if (item) selectFilterOption(item);
  });

  // ---- Seletor de status (modal de edição) ----
  const animateEditorModal = (expand) => {
    if (!editorModalBox || typeof editorModalBox.animate !== 'function') return;

    const currentHeight = editorModalBox.getBoundingClientRect().height;
    editorModalBox.style.height = `${currentHeight}px`;

    if (expand) {
      editorModalBox.classList.add('modal-box--status-expanded');
      const targetHeight = Math.min(window.innerHeight - 40, Math.max(currentHeight + 250, 540));
      editorModalBox.animate(
        [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
        { duration: 360, easing: MODAL_EASING }
      ).onfinish = () => { editorModalBox.style.height = `${targetHeight}px`; };
      return;
    }

    editorModalBox.classList.remove('modal-box--status-expanded');
    editorModalBox.style.height = 'auto';
    const naturalHeight = editorModalBox.getBoundingClientRect().height;
    editorModalBox.style.height = `${currentHeight}px`;
    editorModalBox.animate(
      [{ height: `${currentHeight}px` }, { height: `${naturalHeight}px` }],
      { duration: 300, easing: MODAL_EASING }
    ).onfinish = () => { editorModalBox.style.height = ''; };
  };

  const editorMenu = createStatusMenu({ extraClass: 'status-menu--editor', heading: 'Alterar status' });
  populateSelect(lotStatusSelect, LOT_STATUS_OPTIONS);
  lotStatusSelect.hidden = true;
  lotStatusSelect.after(editorMenu.menu);
  LOT_STATUS_OPTIONS.forEach(({ value, label }) => {
    const item = createStatusOptionButton(value, label);
    item.setAttribute('aria-selected', 'false');
    editorMenu.options.appendChild(item);
  });

  const syncEditorStatus = () => {
    const selected = STATUS_OPTIONS.find(({ value }) => value === lotStatusSelect.value) || STATUS_OPTIONS[1];
    editorMenu.trigger.dataset.status = slugifyStatus(selected.value);
    editorMenu.trigger.innerHTML =
      `${statusIconMarkup(selected.value)}<span class="status-menu__label">${escapeHtml(selected.label)}</span>` +
      '<span class="status-menu__chevron" aria-hidden="true">⌄</span>';
    editorMenu.options.querySelectorAll('.status-menu__option').forEach((option) =>
      setOptionSelected(option, option.dataset.value === selected.value));
  };

  const editorMenuControls = bindMenuToggle(editorMenu, {
    onOpen: () => animateEditorModal(true),
    onClose: () => animateEditorModal(false)
  });

  editorMenu.options.addEventListener('click', (event) => {
    const item = event.target.closest('.status-menu__option');
    if (!item) return;
    lotStatusSelect.value = item.dataset.value;
    syncEditorStatus();
    editorMenuControls.close();
  });
  lotStatusSelect.addEventListener('change', syncEditorStatus);
  syncEditorStatus();

  /* ==========================================================
     RENDERIZAÇÃO
     ========================================================== */
  const updateGridScrollFlags = () => {
    lotsGrid.classList.toggle('is-scrolled', lotsGrid.scrollTop > SCROLL_FLAG_THRESHOLD_PX);
    lotsGrid.classList.toggle('is-scrollable', lotsGrid.scrollHeight > lotsGrid.clientHeight + SCROLLABLE_TOLERANCE_PX);
  };

  const matchesFilters = (lot) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesStatus = activeFilter === 'ALL' || lot.status === activeFilter;
    const matchesSearch = query === '' ||
      lot.code.toLowerCase().includes(query) ||
      (lot.desc || '').toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  };

  const byStatusThenId = (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.id - b.id;

  const lotCardMarkup = (lot) => {
    const thumb = lot.image
      ? `<img src="${lot.image}" class="card-lote__thumb-img" alt="${lot.code}">`
      : createPatternSvg(lot.id);

    return '<div class="card-lote__thumb" data-action="upload-image">' +
      `${thumb}<div class="card-lote__thumb-overlay">${PEN_ICON}<span>Trocar imagem</span></div></div>` +
      '<div class="card-lote__body" data-action="edit-lot">' +
      `<div class="card-lote__heading"><h3 class="card-lote__title">${escapeHtml(getLotCode(lot))}</h3>` +
      `<time class="card-lote__date">${escapeHtml(getLotDate(lot))}</time></div>` +
      `<p class="card-lote__desc">${escapeHtml(lot.desc || 'Sem descrição cadastrada.')}</p>` +
      `<div class="card-lote__footer"><span class="${statusBadgeClass(lot.status)}">${escapeHtml(lot.status)}</span></div></div>`;
  };

  const createLotCard = (lot) => {
    const card = document.createElement('article');
    card.className = 'card-lote';
    card.dataset.id = lot.id;
    card.innerHTML = lotCardMarkup(lot);
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="upload-image"]')) {
        lotAwaitingImage = lot.id;
        imageUploadInput.click();
      } else if (event.target.closest('[data-action="edit-lot"]')) {
        openEditModal(lot.id);
      }
    });
    return card;
  };

  function renderLots() {
    lotsGrid.innerHTML = '';
    lotsGrid.scrollTop = 0;
    const filtered = lotsData.filter(matchesFilters).sort(byStatusThenId);
    updateGridScrollFlags();

    if (filtered.length === 0) {
      lotsGrid.classList.remove('is-scrollable', 'is-scrolled');
      lotsGrid.innerHTML = '<div class="empty-state"><strong>Nenhum lote encontrado</strong><span>Tente buscar por outro termo ou limpar os filtros.</span></div>';
      return;
    }

    filtered.forEach((lot) => lotsGrid.appendChild(createLotCard(lot)));
    window.requestAnimationFrame(() => {
      lotsGrid.classList.toggle('is-scrollable', lotsGrid.scrollHeight > lotsGrid.clientHeight + SCROLLABLE_TOLERANCE_PX);
    });
  }

  lotsGrid.addEventListener('scroll', updateGridScrollFlags);

  /* ==========================================================
     UPLOAD DE IMAGEM
     ========================================================== */
  // ---- Card ----
  imageUploadInput.addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (!file || lotAwaitingImage === null) return;

    readImageAsDataUrl(file, (dataUrl) => {
      const lot = findLotById(lotAwaitingImage);
      if (lot) {
        lot.image = dataUrl;
        renderLots();
      }
      lotAwaitingImage = null;
      imageUploadInput.value = '';
    });
  });

  // ---- Modal ----
  const showModalImagePreview = (src) => {
    pendingModalImage = src;
    modalImgPreview.src = src;
    modalImgPreview.classList.remove('hidden');
    modalImgPlaceholder.classList.add('hidden');
  };

  const resetModalImage = () => {
    pendingModalImage = null;
    modalImgPreview.src = '';
    modalImgPreview.classList.add('hidden');
    modalImgPlaceholder.classList.remove('hidden');
    modalImageInput.value = '';
  };

  modalImgUploadArea.addEventListener('click', () => modalImageInput.click());
  modalImgUploadArea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') modalImageInput.click();
  });
  modalImageInput.addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (file) readImageAsDataUrl(file, showModalImagePreview);
  });

  /* ==========================================================
     FILTROS E BUSCA
     ========================================================== */
  const collapseSearch = () => {
    filterSearchInput.value = '';
    searchQuery = '';
    renderLots();
    filterTrigger.classList.remove('is-open');
    searchWrapper.classList.remove('search-open');
    searchToggle.setAttribute('aria-expanded', 'false');
  };

  statusFilter.addEventListener('change', () => {
    activeFilter = statusFilter.value;
    renderLots();
  });

  if (filterSearchInput) {
    filterSearchInput.addEventListener('input', (event) => {
      searchQuery = event.target.value;
      renderLots();
    });
  }

  if (filterTrigger) filterTrigger.hidden = false;

  if (searchToggle && filterTrigger && searchWrapper) {
    searchToggle.addEventListener('click', () => {
      searchWrapper.classList.add('search-open');
      filterTrigger.classList.add('is-open');
      searchToggle.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => filterSearchInput?.focus(), SEARCH_FOCUS_DELAY_MS);
    });

    const searchDismiss = document.createElement('button');
    searchDismiss.type = 'button';
    searchDismiss.className = 'search-dismiss';
    searchDismiss.setAttribute('aria-label', 'Fechar pesquisa');
    searchDismiss.textContent = '×';
    filterTrigger.appendChild(searchDismiss);
    searchDismiss.addEventListener('click', collapseSearch);
  }

  /* ==========================================================
     MODAL DE LOTE (abrir / fechar / salvar)
     ========================================================== */
  const setEditorFieldsMode = (isEditing) => {
    statusField.classList.toggle('hidden', !isEditing);
    quantityField.classList.toggle('hidden', isEditing);
    btnDeleteLot.style.display = isEditing ? 'inline-flex' : 'none';
  };

  const openNewLotModal = () => {
    if (pendingNewLot && authorizationConfirmed) {
      createLotBatch(pendingNewLot);
      pendingNewLot = null;
      authorizationConfirmed = false;
      return;
    }

    pendingNewLot = null;
    currentEditingLotId = null;
    lotIdInput.value = '';
    modalFormTitle.textContent = 'Novo Lote Têxtil';
    lotCodeInput.value = getNextLotCode();
    lotDescInput.value = '';
    lotQuantity.value = '1';
    lotStatusSelect.value = DEFAULT_STATUS;
    setEditorFieldsMode(false);
    syncEditorStatus();
    resetModalImage();
    addModal.classList.add('active');
    lotCodeInput.focus();
  };

  function openEditModal(id) {
    const lot = findLotById(id);
    if (!lot) return;

    currentEditingLotId = id;
    lotIdInput.value = id;
    modalFormTitle.textContent = 'Editar Lote';
    lotCodeInput.value = getLotCode(lot);
    lotDescInput.value = lot.desc;
    lotStatusSelect.value = lot.status;
    setEditorFieldsMode(true);
    syncEditorStatus();

    if (lot.image) showModalImagePreview(lot.image);
    else resetModalImage();

    addModal.classList.add('active');
    lotCodeInput.focus();
    lotCodeInput.select();
  }

  const closeAddModal = () => {
    addModal.classList.remove('active');
    editorModalBox.classList.remove('modal-box--status-expanded');
    editorModalBox.getAnimations().forEach((animation) => animation.cancel());
    editorModalBox.style.height = '';
    currentEditingLotId = null;
  };

  const applyLotChanges = (lot, { code, desc, status }) => {
    Object.assign(lot, { code, desc, status });
    if (pendingModalImage !== null) lot.image = pendingModalImage;
  };

  const handleEditSubmit = ({ code, desc, status }) => {
    const lot = findLotById(currentEditingLotId);
    if (!lot) return true;

    if (lot.status !== status) {
      pendingStatusChange = { lot, code, desc, status };
      statusConfirmCopy.textContent = `Deseja alterar o status deste lote para “${status}”?`;
      statusConfirmModal.classList.add('active');
      return false;
    }
    applyLotChanges(lot, { code, desc, status });
    return true;
  };

  addLotForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = lotCodeInput.value.trim();
    const desc = lotDescInput.value.trim();
    const status = lotStatusSelect.value;

    if (!code) {
      lotCodeInput.setCustomValidity('Informe o nome ou código do lote.');
      lotCodeInput.reportValidity();
      return;
    }
    lotCodeInput.setCustomValidity('');

    if (currentEditingLotId === null) {
      const count = Math.min(MAX_LOTS_PER_BATCH, Math.max(1, Number(lotQuantity.value) || 1));
      pendingNewLot = { desc, image: pendingModalImage, count };
      openConsentNotice();
      return;
    }

    if (!handleEditSubmit({ code, desc, status })) return;
    renderLots();
    closeAddModal();
  });

  btnAddLote.addEventListener('click', openNewLotModal);
  addModalClose.addEventListener('click', closeAddModal);
  addModalCancel.addEventListener('click', closeAddModal);
  addModal.addEventListener('click', (event) => {
    if (event.target === addModal) closeAddModal();
  });

  btnDeleteLot.addEventListener('click', () => {
    if (currentEditingLotId === null) return;
    lotsData = lotsData.filter((lot) => lot.id !== currentEditingLotId);
    renderLots();
    closeAddModal();
  });

  /* ==========================================================
     AUTORIZAÇÃO PARA CRIAR LOTES
     ========================================================== */
  const openConsentModal = () => {
    authorizationConfirmed = false;
    adminPassword.value = '';
    consentCheck.checked = false;
    passwordMessage.textContent = '';
    consentModal.classList.add('active');
    adminPassword.focus();
  };

  const closeConsentModal = () => {
    consentModal.classList.remove('active');
    if (!authorizationConfirmed) pendingNewLot = null;
  };

  const openConsentNotice = () => consentNoticeModal.classList.add('active');

  const closeConsentNotice = () => {
    consentNoticeModal.classList.remove('active');
    pendingNewLot = null;
  };

  function createLotBatch({ count, desc, image }) {
    const batchStart = Date.now();
    Array.from({ length: count }, (_, index) => {
      lotsData.push({ id: batchStart + index, code: getNextLotCode(), date: getTodayStr(), desc, status: DEFAULT_STATUS, image });
    });
    renderLots();
    closeAddModal();
  }

  // Listener em fase de captura: registra a autorização antes do submit principal
  consentForm.addEventListener('submit', () => {
    authorizationConfirmed = adminPassword.value === ADMIN_PASSWORD && consentCheck.checked;
  }, true);

  consentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (adminPassword.value !== ADMIN_PASSWORD) {
      passwordMessage.textContent = 'Senha incorreta.';
      return;
    }
    if (!consentCheck.checked) {
      passwordMessage.textContent = 'Confirme sua autorização para continuar.';
      return;
    }
    closeConsentModal();
    openNewLotModal();
  });

  passwordToggle.addEventListener('click', () => {
    const show = adminPassword.type === 'password';
    adminPassword.type = show ? 'text' : 'password';
    passwordToggle.textContent = show ? 'Ocultar' : 'Exibir';
  });

  byId('consentNoticeConfirm').addEventListener('click', () => {
    consentNoticeModal.classList.remove('active');
    openConsentModal();
  });
  byId('consentNoticeCancel').addEventListener('click', closeConsentNotice);
  byId('consentClose').addEventListener('click', closeConsentModal);
  byId('consentCancel').addEventListener('click', closeConsentModal);

  /* ==========================================================
     CONFIRMAÇÃO DE ALTERAÇÃO DE STATUS
     ========================================================== */
  const closeStatusConfirm = () => {
    statusConfirmModal.classList.remove('active');
    pendingStatusChange = null;
  };

  byId('statusConfirmAccept').addEventListener('click', () => {
    if (!pendingStatusChange) return;
    const { lot, ...changes } = pendingStatusChange;
    applyLotChanges(lot, changes);
    renderLots();
    closeStatusConfirm();
    closeAddModal();
  });
  byId('statusConfirmCancel').addEventListener('click', closeStatusConfirm);
  byId('statusConfirmClose').addEventListener('click', closeStatusConfirm);

  /* ==========================================================
     TECLADO
     ========================================================== */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    closeAddModal();
    closeConsentNotice();
    closeConsentModal();
    closeStatusConfirm();
    if (filterTrigger?.classList.contains('is-open')) collapseSearch();
    if (!filterMenu.options.hidden) filterMenuControls.close();
    if (!editorMenu.options.hidden) editorMenuControls.close();
  });

  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */
  statusField.after(quantityField);
  renderLots();
})();
