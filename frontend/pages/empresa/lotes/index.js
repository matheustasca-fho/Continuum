import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { store } from "../../../js/shared/store.js";
import { runWithDynamicLoading } from "../../../js/shared/loader.js";

(() => {
  "use strict";

  const SCROLL_FLAG_THRESHOLD_PX = 12;
  const SCROLLABLE_TOLERANCE_PX = 8;
  const MENU_CLOSE_DELAY_MS = 180;
  const DEFAULT_STATUS = STATUS_LOTE.DISPONIVEL;

  const STATUS_OPTIONS = [
    { value: "ALL", label: "Todos os status" },
    ...Object.values(STATUS_LOTE).map((value) => ({ value, label: value })),
  ];
  const LOT_STATUS_OPTIONS = STATUS_OPTIONS.slice(1);
  const STATUS_ORDER = LOT_STATUS_OPTIONS.map(({ value }) => value);

  const STATUS_ICON_PATHS = {
    ALL: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    [STATUS_LOTE.DISPONIVEL]:
      '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
    RESERVADO:
      '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>',
    [STATUS_LOTE.EM_PRODUCAO]:
      '<path d="M3 21V10l6 5v-5l6 5V8h6v13H3z"/><path d="M18 4h3M7 19h.01M12 19h.01M17 19h.01"/>',
    [STATUS_LOTE.ENVIADO_LOJA]:
      '<path d="M3 12h12m-5-5 5 5-5 5"/><path d="M15 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/>',
    FINALIZADO:
      '<path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-2.64-6.36"/>',
  };

  const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  const PEN_ICON =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

  /* ==========================================================
     ESTADO
     ========================================================== */
  let lotsData = [];
  let currentCompany = null;
  let activeFilter = "ALL";
  let searchQuery = "";
  let currentEditingLotId = null;
  let lotAwaitingImage = null;
  let pendingModalImage = null;
  let pendingStatusChange = null;
  let toastTimer = null;

  /* ==========================================================
     ELEMENTOS DO DOM
     ========================================================== */
  const byId = (id) => document.getElementById(id);

  const lotsGrid = byId("lotsGrid");
  const filterSearchInput = byId("filterSearchInput");
  const statusFilter = byId("statusFilter");
  const btnAddLote = byId("btnAddLote");
  const btnHeaderAddLote = byId("btnHeaderAddLote");
  const addModal = byId("addModal");
  const addModalClose = byId("addModalClose");
  const addModalCancel = byId("addModalCancel");
  const addLotForm = byId("addLotForm");
  const lotCodeInput = byId("lotCode");
  const lotTitleInput = byId("lotTitle");
  const lotMaterialInput = byId("lotMaterial");
  const lotDescInput = byId("lotDesc");
  const lotWeightInput = byId("lotWeight");
  const lotPiecesInput = byId("lotPieces");
  const lotIdInput = byId("lotIdInput");
  const lotFormError = byId("lotFormError");
  const btnDeleteLot = byId("btnDeleteLot");
  const btnSaveLot = byId("btnSaveLot");
  const modalFormTitle = byId("modalFormTitle");
  const imageUploadInput = byId("imageUploadInput");
  const modalImageInput = byId("modalImageInput");
  const modalImgUploadArea = byId("modalImgUploadArea");
  const modalImgPreview = byId("modalImgPreview");
  const modalImgPlaceholder = byId("modalImgPlaceholder");
  const statusField = byId("statusField");
  const lotStatusSelect = byId("lotStatusSelect");
  const statusConfirmModal = byId("statusConfirmModal");
  const statusConfirmCopy = byId("statusConfirmCopy");
  const deleteConfirmModal = byId("deleteConfirmModal");
  const lotToast = byId("lotToast");
  const lotToastMsg = byId("lotToastMsg");

  /* ==========================================================
     UTILIDADES
     ========================================================== */
  const showToast = (msg) => {
    if (!lotToast || !lotToastMsg) return;
    lotToastMsg.textContent = msg;
    lotToast.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      lotToast.classList.remove("toast--visible");
    }, 3200);
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

  const slugifyStatus = (status) =>
    String(status || "")
      .toLowerCase()
      .replace(/ /g, "-")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const statusBadgeClass = (status) => `badge badge--${slugifyStatus(status)}`;

  const statusIconMarkup = (value) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    `${STATUS_ICON_PATHS[value] || STATUS_ICON_PATHS.ALL}</svg>`;

  const statusOptionMarkup = (value, label) =>
    `${statusIconMarkup(value)}<span>${escapeHtml(label)}</span><span class="status-menu__check" aria-hidden="true">✓</span>`;

  const createStatusOptionButton = (value, label) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `status-menu__option status-menu__option--${slugifyStatus(value)}`;
    item.dataset.value = value;
    item.setAttribute("role", "option");
    item.innerHTML = statusOptionMarkup(value, label);
    return item;
  };

  const setOptionSelected = (option, selected) => {
    option.classList.toggle("is-selected", selected);
    option.setAttribute("aria-selected", String(selected));
  };

  const getTodayStr = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${today.getFullYear()}`;
  };

  const getLotCode = (lot) => String(lot.code || "").split("|")[0].trim();

  const getLotDate = (lot) => {
    if (lot.date) return lot.date;
    const legacyDate = (String(lot.code || "").split("|")[1] || "").trim();
    if (legacyDate) return legacyDate;
    return getTodayStr();
  };

  const getNextLotCode = () => {
    const allStored = store.get("lotes") || [];
    const nextNum = Math.max(allStored.length, lotsData.length) + 1;
    return `LOT-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`;
  };

  const findLotById = (id) => lotsData.find((lot) => lot.id === id);

  const readImageAsDataUrl = (file, onLoad) => {
    const reader = new FileReader();
    reader.onload = (event) => onLoad(event.target.result);
    reader.readAsDataURL(file);
  };

  const createPatternSvg = (id) => {
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
    const patternId = `pat-${safeId}`;
    const label = (x, y) =>
      `<text x="${x}" y="${y}" fill="#782736" font-family="Anton,sans-serif" font-size="14" letter-spacing="2">CONTINUUM</text>`;
    return (
      '<svg class="thumb-svg" viewBox="0 0 320 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
      `<defs><pattern id="${patternId}" width="96" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-33)">` +
      `${label(6, 17)}${label(54, 42)}</pattern></defs>` +
      '<rect width="100%" height="100%" fill="#F5F2EB"/>' +
      `<rect width="100%" height="100%" fill="url(#${patternId})"/></svg>`
    );
  };

  /* ==========================================================
     MENU DE STATUS (filtro da barra superior + seletor de edição)
     ========================================================== */
  const createStatusMenu = ({
    extraClass = "",
    triggerContent = "",
    heading,
  }) => {
    const menu = document.createElement("div");
    menu.className = `status-menu ${extraClass}`.trim();
    menu.innerHTML =
      `<button type="button" class="status-menu__trigger" aria-haspopup="listbox" aria-expanded="false">${triggerContent}</button>` +
      `<div class="status-menu__options" role="listbox" hidden><p class="status-menu__heading">${heading}</p></div>`;
    return {
      menu,
      trigger: menu.querySelector(".status-menu__trigger"),
      options: menu.querySelector(".status-menu__options"),
    };
  };

  const bindMenuToggle = ({ menu, trigger, options }) => {
    const open = () => {
      options.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      window.requestAnimationFrame(() => options.classList.add("is-open"));
    };

    const close = () => {
      options.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      window.setTimeout(() => {
        if (!options.classList.contains("is-open")) options.hidden = true;
      }, MENU_CLOSE_DELAY_MS);
    };

    trigger.addEventListener("click", () =>
      options.classList.contains("is-open") ? close() : open(),
    );
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target) && !options.hidden) close();
    });
    return { open, close };
  };

  const populateSelect = (select, options) => {
    if (!select) return;
    select.innerHTML = "";
    options.forEach(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  };

  const filterMenu = createStatusMenu({
    triggerContent: `${statusIconMarkup("ALL")}<span class="status-menu__label">Todos os status</span><span class="status-menu__chevron" aria-hidden="true">⌄</span>`,
    heading: "Filtrar por status",
  });

  const filterMenuControls = (() => {
    populateSelect(statusFilter, STATUS_OPTIONS);
    statusFilter.hidden = true;
    statusFilter.after(filterMenu.menu);
    filterMenu.trigger.dataset.status = "all";

    STATUS_OPTIONS.forEach(({ value, label }) => {
      const item = createStatusOptionButton(value, label);
      setOptionSelected(item, value === "ALL");
      filterMenu.options.appendChild(item);
    });
    return bindMenuToggle(filterMenu);
  })();

  const selectFilterOption = (item) => {
    const { value } = item.dataset;
    statusFilter.value = value;
    activeFilter = value;
    filterMenu.trigger.querySelector(".status-menu__label").textContent =
      item.querySelector("span").textContent;
    filterMenu.trigger.querySelector("svg").outerHTML = statusIconMarkup(value);
    filterMenu.trigger.dataset.status = slugifyStatus(value);
    filterMenu.options
      .querySelectorAll(".status-menu__option")
      .forEach((option) => setOptionSelected(option, option === item));
    filterMenuControls.close();
    renderLots();
  };

  filterMenu.options.addEventListener("click", (event) => {
    const item = event.target.closest(".status-menu__option");
    if (item) selectFilterOption(item);
  });

  // ---- Seletor de status (modal de edição) ----
  const animateEditorModal = (expand) => {
    if (!editorModalBox || typeof editorModalBox.animate !== "function") return;

    const currentHeight = editorModalBox.getBoundingClientRect().height;
    editorModalBox.style.height = `${currentHeight}px`;

    if (expand) {
      editorModalBox.classList.add("modal-box--status-expanded");
      const targetHeight = Math.min(
        window.innerHeight - 40,
        Math.max(currentHeight + 250, 540),
      );
      editorModalBox.animate(
        [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
        { duration: 360, easing: MODAL_EASING },
      ).onfinish = () => {
        editorModalBox.style.height = `${targetHeight}px`;
      };
      return;
    }

    editorModalBox.classList.remove("modal-box--status-expanded");
    editorModalBox.style.height = "auto";
    const naturalHeight = editorModalBox.getBoundingClientRect().height;
    editorModalBox.style.height = `${currentHeight}px`;
    editorModalBox.animate(
      [{ height: `${currentHeight}px` }, { height: `${naturalHeight}px` }],
      { duration: 300, easing: MODAL_EASING },
    ).onfinish = () => {
      editorModalBox.style.height = "";
    };
  };

  let editorMenu = null;
  let editorMenuControls = null;
  let syncEditorStatus = () => {};

  if (lotStatusSelect) {
    editorMenu = createStatusMenu({
      extraClass: "status-menu--editor",
      heading: "Alterar status",
    });
    populateSelect(lotStatusSelect, LOT_STATUS_OPTIONS);
    lotStatusSelect.hidden = true;
    lotStatusSelect.after(editorMenu.menu);
    LOT_STATUS_OPTIONS.forEach(({ value, label }) => {
      const item = createStatusOptionButton(value, label);
      item.setAttribute("aria-selected", "false");
      editorMenu.options.appendChild(item);
    });

    syncEditorStatus = () => {
      const selected =
        STATUS_OPTIONS.find(({ value }) => value === lotStatusSelect.value) ||
        STATUS_OPTIONS[1];
      editorMenu.trigger.dataset.status = slugifyStatus(selected.value);
      editorMenu.trigger.innerHTML =
        `${statusIconMarkup(selected.value)}<span class="status-menu__label">${escapeHtml(selected.label)}</span>` +
        '<span class="status-menu__chevron" aria-hidden="true">⌄</span>';
      editorMenu.options
        .querySelectorAll(".status-menu__option")
        .forEach((option) =>
          setOptionSelected(option, option.dataset.value === selected.value),
        );
    };

    editorMenuControls = bindMenuToggle(editorMenu, {
      onOpen: () => animateEditorModal(true),
      onClose: () => animateEditorModal(false),
    });

    editorMenu.options.addEventListener("click", (event) => {
      const item = event.target.closest(".status-menu__option");
      if (!item) return;
      lotStatusSelect.value = item.dataset.value;
      syncEditorStatus();
      editorMenuControls.close();
    });
    lotStatusSelect.addEventListener("change", syncEditorStatus);
    syncEditorStatus();
  }

  /* ==========================================================
     RENDERIZAÇÃO DOS LOTES
     ========================================================== */
  const updateGridScrollFlags = () => {
    lotsGrid.classList.toggle(
      "is-scrolled",
      lotsGrid.scrollTop > SCROLL_FLAG_THRESHOLD_PX,
    );
    lotsGrid.classList.toggle(
      "is-scrollable",
      lotsGrid.scrollHeight > lotsGrid.clientHeight + SCROLLABLE_TOLERANCE_PX,
    );
  };

  const matchesFilters = (lot) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesStatus = activeFilter === "ALL" || lot.status === activeFilter;
    const matchesSearch =
      query === "" ||
      String(lot.code || "").toLowerCase().includes(query) ||
      String(lot.title || "").toLowerCase().includes(query) ||
      String(lot.material || "").toLowerCase().includes(query) ||
      String(lot.desc || "").toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  };

  const byStatusThenId = (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    String(b.id).localeCompare(String(a.id));

  const lotCardMarkup = (lot) => {
    const canChangeImg = api.podeExecutar("ALTERAR_IMAGEM_LOTE");
    const canEditLot = api.podeExecutar("EDITAR_EXCLUIR_LOTE");
    const thumb = lot.image
      ? `<img src="${lot.image}" class="card-lote__thumb-img" alt="${escapeHtml(lot.title || lot.code)}">`
      : createPatternSvg(lot.id);

    const displayTitle = lot.title || getLotCode(lot);
    const metaLine = [
      getLotCode(lot),
      lot.material || null,
      `${String(lot.pesoKg ?? 0).replace(".", ",")} kg`,
    ]
      .filter(Boolean)
      .join(" · ");

    const thumbOverlay = canChangeImg
      ? `<div class="card-lote__thumb-overlay">${PEN_ICON}<span>Trocar imagem</span></div>`
      : "";

    return (
      `<div class="card-lote__thumb ${canChangeImg ? "" : "card-lote__thumb--readonly"}" ${canChangeImg ? 'data-action="upload-image"' : ""}>` +
      `${thumb}${thumbOverlay}</div>` +
      `<div class="card-lote__body ${canEditLot ? "" : "card-lote__body--readonly"}" ${canEditLot ? 'data-action="edit-lot"' : ""}>` +
      `<div class="card-lote__heading"><h3 class="card-lote__title">${escapeHtml(displayTitle)}</h3>` +
      `<time class="card-lote__date">${escapeHtml(getLotDate(lot))}</time></div>` +
      `<p class="card-lote__meta">${escapeHtml(metaLine)}</p>` +
      `<p class="card-lote__desc">${escapeHtml(lot.desc || lot.briefing?.ideiaMarca || "Lote disponível para criação autoral.")}</p>` +
      `<div class="card-lote__footer"><span class="${statusBadgeClass(lot.status)}">${escapeHtml(lot.status)}</span></div></div>`
    );
  };

  const createLotCard = (lot) => {
    const card = document.createElement("article");
    card.className = "card-lote";
    card.dataset.id = lot.id;
    card.innerHTML = lotCardMarkup(lot);
    card.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="upload-image"]')) {
        if (!api.podeExecutar("ALTERAR_IMAGEM_LOTE")) return;
        lotAwaitingImage = lot.id;
        imageUploadInput.click();
      } else if (event.target.closest('[data-action="edit-lot"]')) {
        if (!api.podeExecutar("EDITAR_EXCLUIR_LOTE")) return;
        openEditModal(lot.id);
      }
    });
    return card;
  };

  function renderLots() {
    lotsGrid.innerHTML = "";
    lotsGrid.scrollTop = 0;
    const filtered = lotsData.filter(matchesFilters).sort(byStatusThenId);
    updateGridScrollFlags();

    if (filtered.length === 0) {
      lotsGrid.classList.remove("is-scrollable", "is-scrolled");
      lotsGrid.innerHTML =
        '<div class="empty-state"><strong>Nenhum lote encontrado</strong><span>Clique em "Novo Lote" para cadastrar um lote têxtil ou ajuste os filtros de busca.</span></div>';
      return;
    }

    filtered.forEach((lot) => lotsGrid.appendChild(createLotCard(lot)));
    window.requestAnimationFrame(() => {
      lotsGrid.classList.toggle(
        "is-scrollable",
        lotsGrid.scrollHeight > lotsGrid.clientHeight + SCROLLABLE_TOLERANCE_PX,
      );
    });
  }

  lotsGrid.addEventListener("scroll", updateGridScrollFlags);

  /* ==========================================================
     UPLOAD DE IMAGEM
     ========================================================== */
  imageUploadInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file || lotAwaitingImage === null) return;

    readImageAsDataUrl(file, async (dataUrl) => {
      const lot = findLotById(lotAwaitingImage);
      if (lot) {
        lot.image = dataUrl;
        try {
          await api.atualizarLote(lot.id, { image: dataUrl });
        } catch {}
        renderLots();
        showToast("Imagem do lote atualizada!");
      }
      lotAwaitingImage = null;
      imageUploadInput.value = "";
    });
  });

  const showModalImagePreview = (src) => {
    pendingModalImage = src;
    modalImgPreview.src = src;
    modalImgPreview.classList.remove("hidden");
    modalImgPlaceholder.classList.add("hidden");
  };

  const resetModalImage = () => {
    pendingModalImage = null;
    modalImgPreview.src = "";
    modalImgPreview.classList.add("hidden");
    modalImgPlaceholder.classList.remove("hidden");
    modalImageInput.value = "";
  };

  modalImgUploadArea.addEventListener("click", () => modalImageInput.click());
  modalImgUploadArea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      modalImageInput.click();
    }
  });
  modalImageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) readImageAsDataUrl(file, showModalImagePreview);
  });

  /* ==========================================================
     FILTROS E BUSCA
     ========================================================== */
  statusFilter.addEventListener("change", () => {
    activeFilter = statusFilter.value;
    renderLots();
  });

  filterSearchInput?.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderLots();
  });

  /* ==========================================================
     CURADORIA & BRIEFING
     ========================================================== */
  const setEditorFieldsMode = (isEditing) => {
    const canEdit = api.podeExecutar("EDITAR_EXCLUIR_LOTE");
    btnDeleteLot.style.display = isEditing && canEdit ? "inline-flex" : "none";
    if (statusField) statusField.hidden = !isEditing;
    if (btnSaveLot) {
      btnSaveLot.textContent = isEditing ? "Salvar Alterações" : "Criar Lote";
    }
  };

  let doacoesEmpresaCache = [];

  const loadBriefingAndCuradoria = async () => {
    const cartilhaEl = byId("cartilhaPadraoReadonly");
    if (cartilhaEl) {
      try {
        const emp = currentCompany || (await api.getEmpresa());
        currentCompany = emp;
        const ver = emp?.cartilhaPadrao?.versao || "v1.0";
        const txt =
          emp?.cartilhaPadrao?.conteudo ||
          "Nenhuma cartilha padrão cadastrada no perfil da empresa.";
        cartilhaEl.textContent = `[${ver}] ${txt}`;
      } catch {
        cartilhaEl.textContent = "Não foi possível carregar a cartilha.";
      }
    }
    try {
      doacoesEmpresaCache = (await api.listarDoacoesEmpresa()) || [];
    } catch {
      doacoesEmpresaCache = [];
    }
    renderCuradoriaDoacoes();
  };

  const renderCuradoriaDoacoes = (preselected = []) => {
    const listEl = byId("curadoriaDoacoesList");
    const resumoEl = byId("curadoriaPesoSugerido");
    if (!listEl) return;

    const tipoFiltro = (byId("curadoriaFiltroTipo")?.value || "")
      .trim()
      .toLowerCase();
    const dataFiltro = byId("curadoriaFiltroData")?.value || "";

    const todas = doacoesEmpresaCache;
    const pendentes = todas.filter((d) => {
      if (empId && d.empresaId && d.empresaId !== empId) return false;
      const jaVinculadaNesteLote = preselected.includes(d.id);
      if (
        !jaVinculadaNesteLote &&
        d.statusCuradoria !== "Aguardando curadoria"
      )
        return false;
      if (
        tipoFiltro &&
        !String(d.tipoPeca || d.tipo || "")
          .toLowerCase()
          .includes(tipoFiltro)
      )
        return false;
      if (dataFiltro && !String(d.criadoEm || "").startsWith(dataFiltro))
        return false;
      return true;
    });

    if (pendentes.length === 0) {
      listEl.innerHTML =
        '<span class="curadoria-empty">Nenhuma doação aguardando curadoria no momento. Você ainda pode cadastrar o lote avulso normalmente.</span>';
    } else {
      listEl.innerHTML = pendentes
        .map((d) => {
          const dt = d.criadoEm
            ? new Date(d.criadoEm).toLocaleDateString("pt-BR")
            : "—";
          const peso = Number(d.pesoKg || 0);
          const tipo = d.tipoPeca || d.tipo || "Peças diversas";
          const checkedAttr = preselected.includes(d.id) ? "checked" : "";
          return `
            <label class="curadoria-item">
              <input type="checkbox" class="curadoria-check" value="${escapeHtml(d.id)}" data-peso="${peso}" ${checkedAttr} />
              <span><strong>${escapeHtml(d.id)}</strong> · ${escapeHtml(tipo)} · ${Number(d.pecas || 1)} pç(s) · ${peso.toFixed(1).replace(".", ",")} kg · ${escapeHtml(dt)}</span>
            </label>
          `;
        })
        .join("");
    }

    const updatePeso = () => {
      const checked = Array.from(
        listEl.querySelectorAll(".curadoria-check:checked"),
      );
      const totalPeso = checked.reduce(
        (acc, el) => acc + Number(el.dataset.peso || 0),
        0,
      );
      if (resumoEl) {
        resumoEl.textContent = `${checked.length} doação(ões) selecionada(s) · Peso sugerido: ${totalPeso.toFixed(1).replace(".", ",")} kg`;
      }
      if (checked.length > 0 && lotWeightInput && currentEditingLotId === null) {
        lotWeightInput.value = totalPeso.toFixed(1);
      }
    };

    listEl.querySelectorAll(".curadoria-check").forEach((cb) => {
      cb.addEventListener("change", updatePeso);
    });
    updatePeso();
  };

  byId("curadoriaFiltroTipo")?.addEventListener("input", () =>
    renderCuradoriaDoacoes(),
  );
  byId("curadoriaFiltroData")?.addEventListener("change", () =>
    renderCuradoriaDoacoes(),
  );

  /* ==========================================================
     MODAL DE LOTE (abrir / fechar / criar / editar / excluir)
     ========================================================== */
  const openNewLotModal = () => {
    if (!api.podeExecutar("CADASTRAR_LOTE")) {
      alert("Sua conta não possui permissão para cadastrar lotes.");
      return;
    }

    currentEditingLotId = null;
    lotIdInput.value = "";
    if (lotFormError) lotFormError.textContent = "";
    modalFormTitle.textContent = "Novo Lote Têxtil";
    lotCodeInput.value = getNextLotCode();
    if (lotTitleInput) lotTitleInput.value = "";
    if (lotMaterialInput) lotMaterialInput.value = "";
    lotDescInput.value = "";
    lotWeightInput.value = "1.0";
    if (lotPiecesInput) lotPiecesInput.value = "10";
    if (byId("briefingIdeiaMarca")) byId("briefingIdeiaMarca").value = "";
    if (byId("briefingExpectativa")) byId("briefingExpectativa").value = "";
    if (byId("briefingLiberdadeCriativa"))
      byId("briefingLiberdadeCriativa").value = "";
    if (byId("briefingPrazoProducao"))
      byId("briefingPrazoProducao").value = "30";

    setEditorFieldsMode(false);
    resetModalImage();
    loadBriefingAndCuradoria([]);
    addModal.classList.add("active");
    window.setTimeout(() => (lotTitleInput || lotDescInput)?.focus(), 60);
  };

  function openEditModal(id) {
    if (!api.podeExecutar("EDITAR_EXCLUIR_LOTE")) {
      alert("Acesso restrito ao administrador da loja.");
      return;
    }
    const lot = findLotById(id);
    if (!lot) return;

    if (lot.status === "RESERVADO" || lot.status !== STATUS_LOTE.DISPONIVEL) {
      alert("Lotes reservados ou em produção não podem ser editados ou excluídos.");
      return;
    }

    currentEditingLotId = id;
    lotIdInput.value = id;
    if (lotFormError) lotFormError.textContent = "";
    modalFormTitle.textContent = "Editar Lote Têxtil";
    lotCodeInput.value = getLotCode(lot);
    if (lotTitleInput) lotTitleInput.value = lot.title || "";
    if (lotMaterialInput) lotMaterialInput.value = lot.material || "";
    lotDescInput.value = lot.desc || "";
    lotWeightInput.value = lot.pesoKg || 1;
    if (lotStatusSelect) {
      lotStatusSelect.value = lot.status;
      syncEditorStatus();
    }
    setEditorFieldsMode(true);

    if (lot.image) showModalImagePreview(lot.image);
    else resetModalImage();

    addModal.classList.add("active");
  }

  const closeAddModal = () => {
    addModal.classList.remove("active");
    if (lotFormError) lotFormError.textContent = "";
    currentEditingLotId = null;
  };

  const applyLotChanges = async (
    lot,
    { code, title, material, desc, status, pesoKg, quantidadePecas, briefing, doacoesVinculadas },
  ) => {
    Object.assign(lot, {
      code,
      title,
      material,
      desc,
      status,
      pesoKg,
      quantidadePecas,
      briefing,
      doacoesVinculadas,
    });
    if (pendingModalImage !== null) lot.image = pendingModalImage;

    await api.atualizarLote(lot.id, {
      codigo: code,
      titulo: title || desc || code,
      composicao: material,
      material,
      descricao: desc,
      status,
      pesoKg,
      peso: `${String(pesoKg).replace(".", ",")} kg`,
      quantidadePecas,
      briefing,
      direcao: briefing?.ideiaMarca || desc,
      doacoesVinculadas,
      ...(pendingModalImage !== null ? { image: pendingModalImage } : {}),
    });
  };

  addLotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (lotFormError) lotFormError.textContent = "";

    const code = lotCodeInput.value.trim();
    const title = (lotTitleInput?.value || "").trim();
    const material = (lotMaterialInput?.value || "").trim();
    const desc = lotDescInput.value.trim();
    const pesoKg = Number(lotWeightInput.value);
    const quantidadePecas = Math.max(0, Number(lotPiecesInput?.value || 0));

    if (!title) {
      if (lotFormError) lotFormError.textContent = "Informe um título para o lote.";
      lotTitleInput?.focus();
      return;
    }
    if (!pesoKg || pesoKg <= 0) {
      if (lotFormError)
        lotFormError.textContent = "Informe um peso válido maior que zero.";
      lotWeightInput?.focus();
      return;
    }

    const briefing = {
      ideiaMarca: byId("briefingIdeiaMarca")?.value.trim() || "",
      expectativa: byId("briefingExpectativa")?.value.trim() || "",
      liberdadeCriativa: byId("briefingLiberdadeCriativa")?.value.trim() || "",
      prazoProducaoDias: Number(byId("briefingPrazoProducao")?.value) || 30,
    };

    const doacoesVinculadas = Array.from(
      document.querySelectorAll("#curadoriaDoacoesList .curadoria-check:checked"),
    ).map((el) => el.value);

    if (currentEditingLotId === null) {
      pendingNewLot = { code, desc, image: pendingModalImage, count: 1, briefing, doacoesVinculadas };
      openConsentNotice();
      return;
    }

    if (!handleEditSubmit({ code, desc, status: DEFAULT_STATUS, briefing, doacoesVinculadas })) return;
    renderLots();
    closeAddModal();
  });

  btnAddLote.addEventListener("click", openNewLotModal);
  addModalClose.addEventListener("click", closeAddModal);
  addModalCancel.addEventListener("click", closeAddModal);
  addModal.addEventListener("click", (event) => {
    if (event.target === addModal) closeAddModal();
  });

  btnDeleteLot.addEventListener("click", async () => {
    if (currentEditingLotId === null) return;
    try {
      await api.excluirLote(currentEditingLotId);
    } catch (error) {
      alert(error.message);
      return;
    }
    lotsData = lotsData.filter((lot) => lot.id !== currentEditingLotId);
    renderLots();
    closeAddModal();
  });

  /* ==========================================================
     AUTORIZAÇÃO PARA CRIAR LOTES
     ========================================================== */
  const openConsentModal = () => {
    authorizationConfirmed = false;
    adminPassword.value = "";
    consentCheck.checked = false;
    passwordMessage.textContent = "";
    consentModal.classList.add("active");
    adminPassword.focus();
  };

  const closeConsentModal = () => {
    consentModal.classList.remove("active");
    if (!authorizationConfirmed) pendingNewLot = null;
  };

  const openConsentNotice = () => consentNoticeModal.classList.add("active");

  const closeConsentNotice = () => {
    consentNoticeModal.classList.remove("active");
    pendingNewLot = null;
  };

  async function createLotBatch({ code, count, desc, image, briefing, doacoesVinculadas }) {
    const empresa = await api.getEmpresa();
    for (let index = 0; index < count; index++) {
      const saved = await api.criarLote({
        empresaId: empresa.id,
        codigo: code || undefined,
        titulo: desc || "Novo lote têxtil",
        descricao: desc,
        pesoKg: Number(lotWeightInput.value) || 1,
        quantidadePecas: 0,
        cartilhaPadrao: empresa.cartilhaPadrao,
        briefing: briefing || {
          ideiaMarca: "",
          expectativa: "",
          liberdadeCriativa: "",
          prazoProducaoDias: 30,
        },
        doacoesVinculadas: doacoesVinculadas || [],
      });
      lotsData.push({
        id: saved.id,
        code: saved.codigo,
        date: getTodayStr(),
        desc: saved.descricao,
        status: saved.status,
        image,
        pesoKg: saved.pesoKg,
      });
    }
    renderLots();
    closeAddModal();
  }

  // Listener em fase de captura: registra a autorização antes do submit principal
  consentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(await api.validarSenhaAdmin(adminPassword.value))) {
      passwordMessage.textContent = "Senha incorreta.";
      return;
    }
    if (!consentCheck.checked) {
      passwordMessage.textContent = "Confirme sua autorização para continuar.";
      return;
    }
    authorizationConfirmed = true;
    closeConsentModal();
    openNewLotModal();
  });

  passwordToggle.addEventListener("click", () => {
    const show = adminPassword.type === "password";
    adminPassword.type = show ? "text" : "password";
    passwordToggle.textContent = show ? "Ocultar" : "Exibir";
  });

  btnDeleteLot?.addEventListener("click", () => {
    if (currentEditingLotId === null) return;
    deleteConfirmModal?.classList.add("active");
  });

  byId("deleteConfirmCancel")?.addEventListener("click", closeDeleteConfirm);
  byId("deleteConfirmClose")?.addEventListener("click", closeDeleteConfirm);
  byId("deleteConfirmAccept")?.addEventListener("click", async () => {
    if (currentEditingLotId === null) return;
    try {
      await api.excluirLote(currentEditingLotId);
      lotsData = lotsData.filter((lot) => lot.id !== currentEditingLotId);
      closeDeleteConfirm();
      closeAddModal();
      renderLots();
      showToast("Lote excluído do catálogo.");
    } catch (error) {
      closeDeleteConfirm();
      if (lotFormError) lotFormError.textContent = error.message;
    }
  });

  /* ==========================================================
     CONFIRMAÇÃO DE ALTERAÇÃO DE STATUS
     ========================================================== */
  const closeStatusConfirm = () => {
    statusConfirmModal?.classList.remove("active");
    pendingStatusChange = null;
  };

  byId("statusConfirmAccept")?.addEventListener("click", async () => {
    if (!pendingStatusChange) return;
    const { lot, ...changes } = pendingStatusChange;
    try {
      await applyLotChanges(lot, changes);
      renderLots();
      closeStatusConfirm();
      closeAddModal();
      showToast("Status do lote atualizado!");
    } catch (error) {
      closeStatusConfirm();
      if (lotFormError) lotFormError.textContent = error.message;
    }
  });
  byId("statusConfirmCancel")?.addEventListener("click", closeStatusConfirm);
  byId("statusConfirmClose")?.addEventListener("click", closeStatusConfirm);

  /* ==========================================================
     TECLADO (ESC)
     ========================================================== */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeDeleteConfirm();
    closeStatusConfirm();
    closeAddModal();
    if (!filterMenu.options.hidden) filterMenuControls.close();
    if (editorMenu && !editorMenu.options.hidden) editorMenuControls?.close();
    if (editorMenu && !editorMenu.options.hidden) editorMenuControls?.close();
  });

  /* ==========================================================
     INICIALIZAÇÃO
     ========================================================== */
  if (statusField && quantityField) statusField.after(quantityField);
  (async () => {
    try {
      const company = await api.getEmpresa();
      currentCompany = company;
      lotsData = (await api.listarLotesEmpresa(company.id)).map((l) => ({
        id: l.id,
        code: l.codigo,
        title: l.titulo || l.codigo,
        material: l.composicao || l.material || "",
        date: l.criadoEm
          ? new Date(l.criadoEm).toLocaleDateString("pt-BR")
          : getTodayStr(),
        desc: l.descricao || l.titulo,
        status: l.status,
        image: l.image || null,
        pesoKg: l.pesoKg,
        quantidadePecas: l.quantidadePecas ?? 0,
        briefing: l.briefing || {},
        doacoesVinculadas: l.doacoesVinculadas || [],
      }));

      const canCreate = api.podeExecutar("CADASTRAR_LOTE");
      if (btnAddLote) {
        btnAddLote.hidden = !canCreate;
        btnAddLote.style.display = canCreate ? "" : "none";
      }
      if (btnHeaderAddLote) {
        btnHeaderAddLote.hidden = !canCreate;
        btnHeaderAddLote.style.display = canCreate ? "" : "none";
      }
      renderLots();
    } catch (err) {
      console.error("Erro ao inicializar lotes:", err);
      renderLots();
    }
  })();
})();
