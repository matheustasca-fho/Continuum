// CONTINUUM - Application Script

var lotsData = [
  { id: 1, code: "L00128092026", date: "28/09/2026", desc: "Descri\u00e7\u00e3o detalhada do lote textil recuperado", status: "DISPON\u00cdVEL", image: null },
  { id: 2, code: "L00228092026", date: "28/09/2026", desc: "Descri\u00e7\u00e3o detalhada do lote textil recuperado", status: "EM PRODU\u00c7\u00c3O", image: null },
  { id: 3, code: "L00328092026", date: "28/09/2026", desc: "Descri\u00e7\u00e3o detalhada do lote textil recuperado", status: "RESERVADO", image: null }
];

var activeFilter = "ALL";
var searchQuery = "";
var currentEditingLotId = null;
var lotAwaitingImage = null;
var pendingModalImage = null;

var lotsGrid          = document.getElementById("lotsGrid");
var filterSearchInput = document.getElementById("filterSearchInput");
var statusFilter      = document.getElementById("statusFilter");
var searchToggle      = document.getElementById("searchToggle");
var filterTrigger     = document.getElementById("filterTrigger");
var searchWrapper     = document.querySelector(".filter-wrapper");
var lotQuantity       = document.getElementById("lotQuantity");
var quantityField     = document.getElementById("quantityField");
var btnAddLote        = document.getElementById("btnAddLote");
var addModal          = document.getElementById("addModal");
var addModalClose     = document.getElementById("addModalClose");
var addModalCancel    = document.getElementById("addModalCancel");
var addLotForm        = document.getElementById("addLotForm");
var lotCodeInput      = document.getElementById("lotCode");
var lotDescInput      = document.getElementById("lotDesc");
var lotIdInput        = document.getElementById("lotIdInput");
var btnDeleteLot      = document.getElementById("btnDeleteLot");
var modalFormTitle    = document.getElementById("modalFormTitle");
var imageUploadInput  = document.getElementById("imageUploadInput");
var modalImageInput   = document.getElementById("modalImageInput");
var modalImgUploadArea = document.getElementById("modalImgUploadArea");
var modalImgPreview   = document.getElementById("modalImgPreview");
var modalImgPlaceholder = document.getElementById("modalImgPlaceholder");
var statusField = document.getElementById("statusField");
var lotStatusSelect = document.getElementById("lotStatusSelect");
var consentNoticeModal = document.getElementById("consentNoticeModal");
var consentModal = document.getElementById("consentModal");
var consentForm = document.getElementById("consentForm");
var adminPassword = document.getElementById("adminPassword");
var passwordToggle = document.getElementById("passwordToggle");
var passwordMessage = document.getElementById("passwordMessage");
var consentCheck = document.getElementById("consentCheck");
var authorizationConfirmed = false;
consentForm.addEventListener("submit", function() { authorizationConfirmed = adminPassword.value === "AdminEmpresa" && consentCheck.checked; }, true);
var statusConfirmModal = document.getElementById("statusConfirmModal");
var statusConfirmCopy = document.getElementById("statusConfirmCopy");
var pendingStatusChange = null;
var pendingNewLot = null;
var statusOrder = ["DISPONÍVEL", "RESERVADO", "EM PRODUÇÃO", "ENVIADO", "FINALIZADO"];
statusField.after(quantityField);
var statusOptions = [
  { value: "ALL", label: "Todos os status" },
  { value: "DISPON\u00cdVEL", label: "Dispon\u00edvel" },
  { value: "RESERVADO", label: "Reservado" },
  { value: "EM PRODU\u00c7\u00c3O", label: "Em Produ\u00e7\u00e3o" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "FINALIZADO", label: "Finalizado" }
];
statusOrder = statusOptions.slice(1).map(function(status) { return status.value; });
statusFilter.innerHTML = "";
statusOptions.forEach(function(status) { var option = document.createElement("option"); option.value = status.value; option.textContent = status.label; statusFilter.appendChild(option); });
lotStatusSelect.innerHTML = "";
statusOptions.slice(1).forEach(function(status) { var option = document.createElement("option"); option.value = status.value; option.textContent = status.label; lotStatusSelect.appendChild(option); });
function statusIconMarkup(value) {
  var paths = {
    ALL: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    "DISPON\u00cdVEL": '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
    RESERVADO: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>',
    "EM PRODU\u00c7\u00c3O": '<path d="M3 21V10l6 5v-5l6 5V8h6v13H3z"/><path d="M18 4h3M7 19h.01M12 19h.01M17 19h.01"/>',
    ENVIADO: '<path d="M3 12h12m-5-5 5 5-5 5"/><path d="M15 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/>',
    FINALIZADO: '<path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-2.64-6.36"/>'
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[value] || paths.ALL) + '</svg>';
}
var statusMenu = document.createElement("div");
statusMenu.className = "status-menu";
statusMenu.innerHTML = "<button type=\"button\" class=\"status-menu__trigger\" aria-haspopup=\"listbox\" aria-expanded=\"false\">" + statusIconMarkup("ALL") + "<span class=\"status-menu__label\">Todos os status</span><span class=\"status-menu__chevron\" aria-hidden=\"true\">⌄</span></button><div class=\"status-menu__options\" role=\"listbox\" hidden><p class=\"status-menu__heading\">Filtrar por status</p></div>";
statusFilter.hidden = true;
statusFilter.after(statusMenu);
var statusMenuTrigger = statusMenu.querySelector(".status-menu__trigger");
var statusMenuOptions = statusMenu.querySelector(".status-menu__options");
statusMenuTrigger.dataset.status = "all";
Array.prototype.forEach.call(statusFilter.options, function(option) {
  var item = document.createElement("button");
  item.type = "button";
  item.className = "status-menu__option status-menu__option--" + option.value.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", String(option.value === "ALL"));
  if (option.value === "ALL") item.classList.add("is-selected");
  item.dataset.value = option.value;
  item.innerHTML = statusIconMarkup(option.value) + "<span>" + escapeHtml(option.textContent) + "</span><span class=\"status-menu__check\" aria-hidden=\"true\">✓</span>";
  statusMenuOptions.appendChild(item);
});
function openStatusMenu() { statusMenuOptions.hidden = false; statusMenuTrigger.setAttribute("aria-expanded", "true"); window.requestAnimationFrame(function() { statusMenuOptions.classList.add("is-open"); }); }
function closeStatusMenu() { statusMenuOptions.classList.remove("is-open"); statusMenuTrigger.setAttribute("aria-expanded", "false"); window.setTimeout(function() { if (!statusMenuOptions.classList.contains("is-open")) statusMenuOptions.hidden = true; }, 180); }
statusMenuTrigger.addEventListener("click", function() { if (statusMenuOptions.classList.contains("is-open")) closeStatusMenu(); else openStatusMenu(); });
statusMenuOptions.addEventListener("click", function(event) { var item = event.target.closest(".status-menu__option"); if (!item) return; statusFilter.value = item.dataset.value; activeFilter = item.dataset.value; statusMenuTrigger.querySelector(".status-menu__label").textContent = item.querySelector("span").textContent; statusMenuTrigger.querySelector("svg").outerHTML = statusIconMarkup(item.dataset.value); statusMenuTrigger.dataset.status = item.dataset.value.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); statusMenuOptions.querySelectorAll(".status-menu__option").forEach(function(option) { var selected = option === item; option.classList.toggle("is-selected", selected); option.setAttribute("aria-selected", String(selected)); }); closeStatusMenu(); renderLots(); });
document.addEventListener("click", function(event) { if (!statusMenu.contains(event.target) && !statusMenuOptions.hidden) closeStatusMenu(); });
var editorStatusMenu = document.createElement("div");
editorStatusMenu.className = "status-menu status-menu--editor";
editorStatusMenu.innerHTML = "<button type=\"button\" class=\"status-menu__trigger\" aria-haspopup=\"listbox\" aria-expanded=\"false\"></button><div class=\"status-menu__options\" role=\"listbox\" hidden><p class=\"status-menu__heading\">Alterar status</p></div>";
lotStatusSelect.hidden = true;
lotStatusSelect.after(editorStatusMenu);
var editorStatusTrigger = editorStatusMenu.querySelector(".status-menu__trigger");
var editorStatusOptions = editorStatusMenu.querySelector(".status-menu__options");
var editorModalBox = addModal.querySelector(".modal-box");
statusOptions.slice(1).forEach(function(status) {
  var item = document.createElement("button");
  item.type = "button";
  item.className = "status-menu__option status-menu__option--" + status.value.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  item.dataset.value = status.value;
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", "false");
  item.innerHTML = statusIconMarkup(status.value) + "<span>" + escapeHtml(status.label) + "</span><span class=\"status-menu__check\" aria-hidden=\"true\">✓</span>";
  editorStatusOptions.appendChild(item);
});
function syncEditorStatus() {
  var selected = statusOptions.find(function(status) { return status.value === lotStatusSelect.value; }) || statusOptions[1];
  editorStatusTrigger.dataset.status = selected.value.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  editorStatusTrigger.innerHTML = statusIconMarkup(selected.value) + "<span class=\"status-menu__label\">" + escapeHtml(selected.label) + "</span><span class=\"status-menu__chevron\" aria-hidden=\"true\">⌄</span>";
  editorStatusOptions.querySelectorAll(".status-menu__option").forEach(function(option) { var isSelected = option.dataset.value === selected.value; option.classList.toggle("is-selected", isSelected); option.setAttribute("aria-selected", String(isSelected)); });
}
function animateEditorModal(expand) {
  if (!editorModalBox || typeof editorModalBox.animate !== "function") return;
  var currentHeight = editorModalBox.getBoundingClientRect().height;
  editorModalBox.style.height = currentHeight + "px";
  if (expand) {
    editorModalBox.classList.add("modal-box--status-expanded");
    var targetHeight = Math.min(window.innerHeight - 40, Math.max(currentHeight + 250, 540));
    editorModalBox.animate([{ height: currentHeight + "px" }, { height: targetHeight + "px" }], { duration: 360, easing: "cubic-bezier(.22,.75,.25,1)" }).onfinish = function() { editorModalBox.style.height = targetHeight + "px"; };
    return;
  }
  editorModalBox.classList.remove("modal-box--status-expanded");
  editorModalBox.style.height = "auto";
  var naturalHeight = editorModalBox.getBoundingClientRect().height;
  editorModalBox.style.height = currentHeight + "px";
  editorModalBox.animate([{ height: currentHeight + "px" }, { height: naturalHeight + "px" }], { duration: 300, easing: "cubic-bezier(.22,.75,.25,1)" }).onfinish = function() { editorModalBox.style.height = ""; };
}
function openEditorStatusMenu() { editorStatusOptions.hidden = false; editorStatusTrigger.setAttribute("aria-expanded", "true"); animateEditorModal(true); window.requestAnimationFrame(function() { editorStatusOptions.classList.add("is-open"); }); }
function closeEditorStatusMenu() { editorStatusOptions.classList.remove("is-open"); editorStatusTrigger.setAttribute("aria-expanded", "false"); animateEditorModal(false); window.setTimeout(function() { if (!editorStatusOptions.classList.contains("is-open")) editorStatusOptions.hidden = true; }, 180); }
editorStatusTrigger.addEventListener("click", function() { if (editorStatusOptions.classList.contains("is-open")) closeEditorStatusMenu(); else openEditorStatusMenu(); });
editorStatusOptions.addEventListener("click", function(event) { var item = event.target.closest(".status-menu__option"); if (!item) return; lotStatusSelect.value = item.dataset.value; syncEditorStatus(); closeEditorStatusMenu(); });
lotStatusSelect.addEventListener("change", syncEditorStatus);
document.addEventListener("click", function(event) { if (!editorStatusMenu.contains(event.target) && !editorStatusOptions.hidden) closeEditorStatusMenu(); });
syncEditorStatus();

// ---- Utilities ----
function getTodayStr() {
  var d = new Date();
  var dd = String(d.getDate()).padStart(2, "0");
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function getNextLotCode() {
  var max = lotsData.reduce(function(value, lot) { var match = getLotCode(lot).match(/^L(?:ote-)?(\d{3})/i); return match ? Math.max(value, Number(match[1])) : value; }, 0);
  var n = String(max + 1).padStart(3, "0");
  return "L" + n + getTodayStr().replace(/\//g, "");
}

function getLotCode(lot) { return lot.code.split("|")[0].trim(); }
function getLotDate(lot) {
  if (lot.date) return lot.date;
  var legacyDate = (lot.code.split("|")[1] || "").trim();
  if (legacyDate) return legacyDate;
  var compactDate = getLotCode(lot).match(/^L\d{3}(\d{2})(\d{2})(\d{4})$/i);
  return compactDate ? compactDate[1] + "/" + compactDate[2] + "/" + compactDate[3] : getTodayStr();
}

function statusBadgeClass(status) {
  return "badge badge--" + status.toLowerCase().replace(/ /g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, function(char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char];
  });
}

function createPatternSvg(id) {
  var pid = "pat-" + id;
  var svg = "<svg class=\"thumb-svg\" viewBox=\"0 0 320 135\" preserveAspectRatio=\"xMidYMid slice\" xmlns=\"http://www.w3.org/2000/svg\">";
  svg += "<defs><pattern id=\"" + pid + "\" width=\"96\" height=\"50\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(-33)\">";
  svg += "<text x=\"6\" y=\"17\" fill=\"#782736\" font-family=\"Anton,sans-serif\" font-size=\"14\" letter-spacing=\"2\">CONTINUUM</text>";
  svg += "<text x=\"54\" y=\"42\" fill=\"#782736\" font-family=\"Anton,sans-serif\" font-size=\"14\" letter-spacing=\"2\">CONTINUUM</text>";
  svg += "</pattern></defs>";
  svg += "<rect width=\"100%\" height=\"100%\" fill=\"#F5F2EB\"/>";
  svg += "<rect width=\"100%\" height=\"100%\" fill=\"url(#" + pid + ")\"/>";
  svg += "</svg>";
  return svg;
}

// ---- Render ----
function renderLots() {
  lotsGrid.innerHTML = "";
  lotsGrid.scrollTop = 0;
  var filtered = lotsData.filter(function(lot) {
    var mf = activeFilter === "ALL" || lot.status === activeFilter;
    var q  = searchQuery.trim().toLowerCase();
    var ms = q === "" || lot.code.toLowerCase().indexOf(q) >= 0 || (lot.desc || "").toLowerCase().indexOf(q) >= 0;
    return mf && ms;
  });
  filtered.sort(function(a, b) { return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.id - b.id; });
  lotsGrid.classList.toggle("is-scrolled", lotsGrid.scrollTop > 12);
  lotsGrid.classList.toggle("is-scrollable", lotsGrid.scrollHeight > lotsGrid.clientHeight + 8);
  if (filtered.length === 0) {
    lotsGrid.classList.remove("is-scrollable", "is-scrolled");
    lotsGrid.innerHTML = "<div class=\"empty-state\"><strong>Nenhum lote encontrado</strong><span>Tente buscar por outro termo ou limpar os filtros.</span></div>";
    return;
  }
  filtered.forEach(function(lot) {
    var card  = document.createElement("article");
    card.className   = "card-lote";
    card.dataset.id  = lot.id;
    var bc    = statusBadgeClass(lot.status);
    var thumb = lot.image
      ? "<img src=\"" + lot.image + "\" class=\"card-lote__thumb-img\" alt=\"" + lot.code + "\">"
      : createPatternSvg(lot.id);
    var penSvg = "<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">";
    penSvg += "<path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/>";
    penSvg += "<path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>";
    var html  = "<div class=\"card-lote__thumb\" data-action=\"upload-image\">";
    html += thumb;
    html += "<div class=\"card-lote__thumb-overlay\">" + penSvg + "<span>Trocar imagem</span></div>";
    html += "</div>";
    html += "<div class=\"card-lote__body\" data-action=\"edit-lot\">";
    html += "<div class=\"card-lote__heading\"><h3 class=\"card-lote__title\">" + escapeHtml(getLotCode(lot)) + "</h3>";
    html += "<time class=\"card-lote__date\">" + escapeHtml(getLotDate(lot)) + "</time></div>";
    html += "<p class=\"card-lote__desc\">" + escapeHtml(lot.desc || "Sem descrição cadastrada.") + "</p>";
    html += "<div class=\"card-lote__footer\">";
    html += "<span class=\"" + bc + "\">" + escapeHtml(lot.status) + "</span>";
    html += "</div></div>";
    card.innerHTML = html;
    card.addEventListener("click", function(e) {
      if (e.target.closest("[data-action=\"upload-image\"]")) { lotAwaitingImage = lot.id; imageUploadInput.click(); }
      else if (e.target.closest("[data-action=\"edit-lot\"]")) { openEditModal(lot.id); }
    });
    lotsGrid.appendChild(card);
  });
  window.requestAnimationFrame(function() {
    var scrollable = lotsGrid.scrollHeight > lotsGrid.clientHeight + 8;
    lotsGrid.classList.toggle("is-scrollable", scrollable);
  });
}

lotsGrid.addEventListener("scroll", function() {
  lotsGrid.classList.toggle("is-scrolled", lotsGrid.scrollTop > 12);
  lotsGrid.classList.toggle("is-scrollable", lotsGrid.scrollHeight > lotsGrid.clientHeight + 8);
});

// ---- Image upload (card thumb) ----
imageUploadInput.addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (file && lotAwaitingImage !== null) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var lot = lotsData.find(function(l) { return l.id === lotAwaitingImage; });
      if (lot) { lot.image = ev.target.result; renderLots(); }
      lotAwaitingImage = null;
      imageUploadInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

// ---- Image upload (modal) ----
modalImgUploadArea.addEventListener("click", function() { modalImageInput.click(); });
modalImgUploadArea.addEventListener("keydown", function(e) { if (e.key === "Enter" || e.key === " ") modalImageInput.click(); });
modalImageInput.addEventListener("change", function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    pendingModalImage = ev.target.result;
    modalImgPreview.src = ev.target.result;
    modalImgPreview.classList.remove("hidden");
    modalImgPlaceholder.classList.add("hidden");
  };
  reader.readAsDataURL(file);
});

// ---- Filters ----
statusFilter.addEventListener("change", function() { activeFilter = statusFilter.value; renderLots(); });
filterSearchInput.addEventListener("input", function(e) { searchQuery = e.target.value; renderLots(); });
filterTrigger.hidden = false;
searchToggle.addEventListener("click", function() { searchWrapper.classList.add("search-open"); filterTrigger.classList.add("is-open"); searchToggle.setAttribute("aria-expanded", "true"); window.setTimeout(function() { filterSearchInput.focus(); }, 180); });
var searchDismiss = document.createElement("button");
searchDismiss.type = "button";
searchDismiss.className = "search-dismiss";
searchDismiss.setAttribute("aria-label", "Fechar pesquisa");
searchDismiss.textContent = "×";
filterTrigger.appendChild(searchDismiss);
searchDismiss.addEventListener("click", function() { filterSearchInput.value = ""; searchQuery = ""; renderLots(); filterTrigger.classList.remove("is-open"); searchWrapper.classList.remove("search-open"); searchToggle.setAttribute("aria-expanded", "false"); });

// ---- Modal Open / Close ----
function resetModalImage() {
  pendingModalImage = null;
  modalImgPreview.src = "";
  modalImgPreview.classList.add("hidden");
  modalImgPlaceholder.classList.remove("hidden");
  modalImageInput.value = "";
}

btnAddLote.addEventListener("click", function() {
  openNewLotModal();
});

function openNewLotModal() {
  if (pendingNewLot && authorizationConfirmed) {
    createLotBatch(pendingNewLot);
    pendingNewLot = null;
    authorizationConfirmed = false;
    return;
  }
  pendingNewLot = null;
  currentEditingLotId = null;
  lotIdInput.value = "";
  modalFormTitle.textContent = "Novo Lote T\u00eaxtil";
  lotCodeInput.value = getNextLotCode();
  lotDescInput.value = "";
  statusField.classList.add("hidden");
  quantityField.classList.remove("hidden");
  lotQuantity.value = "1";
  lotStatusSelect.value = "DISPON\u00cdVEL";
  syncEditorStatus();
  btnDeleteLot.style.display = "none";
  resetModalImage();
  addModal.classList.add("active");
  lotCodeInput.focus();
}

function openEditModal(id) {
  var lot = lotsData.find(function(l) { return l.id === id; });
  if (!lot) return;
  currentEditingLotId = id;
  lotIdInput.value = id;
  modalFormTitle.textContent = "Editar Lote";
  statusField.classList.remove("hidden");
  quantityField.classList.add("hidden");
  lotCodeInput.value = getLotCode(lot);
  lotDescInput.value = lot.desc;
  lotStatusSelect.value = lot.status;
  syncEditorStatus();
  btnDeleteLot.style.display = "inline-flex";
  // show existing image
  if (lot.image) {
    pendingModalImage = lot.image;
    modalImgPreview.src = lot.image;
    modalImgPreview.classList.remove("hidden");
    modalImgPlaceholder.classList.add("hidden");
  } else { resetModalImage(); }
  addModal.classList.add("active");
  lotCodeInput.focus();
  lotCodeInput.select();
}

function closeAddModal() {
  addModal.classList.remove("active");
  editorModalBox.classList.remove("modal-box--status-expanded");
  editorModalBox.getAnimations().forEach(function(animation) { animation.cancel(); });
  editorModalBox.style.height = "";
  currentEditingLotId = null;
}
addModalClose.addEventListener("click", closeAddModal);
addModalCancel.addEventListener("click", closeAddModal);
addModal.addEventListener("click", function(e) { if (e.target === addModal) closeAddModal(); });

addLotForm.addEventListener("submit", function(e) {
  e.preventDefault();
  var code   = lotCodeInput.value.trim();
  var desc   = lotDescInput.value.trim();
  var status = lotStatusSelect.value;
  if (!code) { lotCodeInput.setCustomValidity("Informe o nome ou código do lote."); lotCodeInput.reportValidity(); return; }
  lotCodeInput.setCustomValidity("");
  if (currentEditingLotId !== null) {
    var lot = lotsData.find(function(l) { return l.id === currentEditingLotId; });
    if (lot) {
      if (lot.status !== status) {
        pendingStatusChange = { lot: lot, code: code, desc: desc, status: status };
        statusConfirmCopy.textContent = "Deseja alterar o status deste lote para “" + status + "”?";
        statusConfirmModal.classList.add("active");
        return;
      }
      lot.code   = code;
      lot.desc   = desc;
      lot.status = status;
      if (pendingModalImage !== null) lot.image = pendingModalImage;
    }
  } else {
    var count = Math.min(100, Math.max(1, Number(lotQuantity.value) || 1));
    pendingNewLot = { desc: desc, image: pendingModalImage, count: count };
    openConsentNotice();
    return;
  }
  renderLots();
  closeAddModal();
});

function openConsentModal() { authorizationConfirmed = false; adminPassword.value = ""; consentCheck.checked = false; passwordMessage.textContent = ""; consentModal.classList.add("active"); adminPassword.focus(); }
function closeConsentModal() { consentModal.classList.remove("active"); if (!authorizationConfirmed) pendingNewLot = null; }
function openConsentNotice() { consentNoticeModal.classList.add("active"); }
function closeConsentNotice() { consentNoticeModal.classList.remove("active"); pendingNewLot = null; }
document.getElementById("consentNoticeConfirm").addEventListener("click", function() { consentNoticeModal.classList.remove("active"); openConsentModal(); });
document.getElementById("consentNoticeCancel").addEventListener("click", closeConsentNotice);
passwordToggle.addEventListener("click", function() { var show = adminPassword.type === "password"; adminPassword.type = show ? "text" : "password"; passwordToggle.textContent = show ? "Ocultar" : "Exibir"; });
consentForm.addEventListener("submit", function(e) { e.preventDefault(); if (adminPassword.value !== "AdminEmpresa") { passwordMessage.textContent = "Senha incorreta."; return; } if (!consentCheck.checked) { passwordMessage.textContent = "Confirme sua autorização para continuar."; return; } closeConsentModal(); openNewLotModal(); });
document.getElementById("consentClose").addEventListener("click", closeConsentModal);
document.getElementById("consentCancel").addEventListener("click", closeConsentModal);
function createLotBatch(data) {
  for (var i = 0; i < data.count; i++) {
    lotsData.push({ id: Date.now() + i, code: getNextLotCode(), date: getTodayStr(), desc: data.desc, status: "DISPONÍVEL", image: data.image });
  }
  renderLots();
  closeAddModal();
}
function closeStatusConfirm() { statusConfirmModal.classList.remove("active"); pendingStatusChange = null; }
document.getElementById("statusConfirmAccept").addEventListener("click", function() { if (!pendingStatusChange) return; var change = pendingStatusChange; change.lot.code = change.code; change.lot.desc = change.desc; change.lot.status = change.status; if (pendingModalImage !== null) change.lot.image = pendingModalImage; renderLots(); closeStatusConfirm(); closeAddModal(); });
document.getElementById("statusConfirmCancel").addEventListener("click", closeStatusConfirm);
document.getElementById("statusConfirmClose").addEventListener("click", closeStatusConfirm);

btnDeleteLot.addEventListener("click", function() {
  if (currentEditingLotId !== null) {
    lotsData = lotsData.filter(function(l) { return l.id !== currentEditingLotId; });
    renderLots();
    closeAddModal();
  }
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") { closeAddModal(); closeConsentNotice(); closeConsentModal(); closeStatusConfirm(); if (filterTrigger.classList.contains("is-open")) { filterSearchInput.value = ""; searchQuery = ""; renderLots(); filterTrigger.classList.remove("is-open"); searchWrapper.classList.remove("search-open"); searchToggle.setAttribute("aria-expanded", "false"); } if (!statusMenuOptions.hidden) closeStatusMenu(); if (!editorStatusOptions.hidden) closeEditorStatusMenu(); }
});

renderLots();
