import { getProjetos, updateProjeto } from "../../../js/shared/store.js";

let filtroAtual = "TODOS";
let projetoSelecionado = null;

const grid = document.getElementById("projetos-grid");
const searchInput = document.getElementById("search-input");
const drawer = document.getElementById("drawer-detalhe");
const modal = document.getElementById("modal-acao");
const filtroBtn = document.getElementById("filtro-btn");
const dropdownBox = document.getElementById("dropdown-menu-box");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarRestore = document.getElementById("sidebarRestore");

// ==========================================
// RENDERIZAÇÃO E CÓDIGOS DE LOTE
// ==========================================
function getBadgeConfig(status) {
  if (status === "FINALIZADO")
    return { class: "badge--finalizado", text: "FINALIZADO" };
  if (status === "EM_PRODUCAO")
    return { class: "badge--em-producao", text: "EM PRODUÇÃO" };
  if (status === "ENVIADO") return { class: "badge--enviado", text: "ENVIADO" };
  if (status === "RESERVADO")
    return { class: "badge--reservado", text: "RESERVADO" };
  if (status === "DISPONIVEL")
    return { class: "badge--disponivel", text: "DISPONÍVEL" };
  if (status === "EXCEDIDO")
    return { class: "badge--excedido", text: "PRAZO EXCEDIDO" };
  return { class: "badge--reservado", text: status };
}

const STATUS_OPCOES_PROJETO = [
  { value: "DISPONIVEL", label: "Disponível", color: "#4f8a47" },
  { value: "RESERVADO", label: "Reservado", color: "#b95658" },
  { value: "EM_PRODUCAO", label: "Em Produção", color: "#a67b43" },
  { value: "ENVIADO", label: "Enviado", color: "#719a45" },
  { value: "FINALIZADO", label: "Finalizado", color: "#b4546c" },
  { value: "EXCEDIDO", label: "Prazo Excedido", color: "var(--color-error)" },
];

// Lógica da equipe: Gera um código falso para o lote baseado no ID e na data
function gerarCodigoLote(id) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `L${String(id).padStart(3, "0")}${day}${month}${year}`;
}
function getDataMock() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function renderGrid() {
  const projetos = getProjetos();
  const termoBusca = searchInput.value.toLowerCase();

  const filtrados = projetos.filter((p) => {
    const matchStatus = filtroAtual === "TODOS" || p.status === filtroAtual;
    const matchBusca =
      p.designer_nome.toLowerCase().includes(termoBusca) ||
      p.ds_descricao.toLowerCase().includes(termoBusca);
    return matchStatus && matchBusca;
  });

  grid.innerHTML = "";

  if (filtrados.length === 0) {
    grid.innerHTML =
      '<p style="color:var(--color-muted-text); grid-column: 1/-1;">Nenhum projeto encontrado.</p>';
    return;
  }

  filtrados.forEach((p) => {
    const badge = getBadgeConfig(p.status);
    const card = document.createElement("div");
    card.className = "proj-card";
    card.onclick = () => abrirDrawer(p);

    // Padrão visual idêntico ao de Meus Lotes
    const pid = `pat-proj-${p.cd_projeto}`;
    card.innerHTML = `
      <div class="proj-card__thumb">
        <svg class="thumb-svg" viewBox="0 0 320 135" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
          <defs>
            <pattern id="${pid}" width="96" height="50" patternUnits="userSpaceOnUse" patternTransform="rotate(-33)">
              <text x="6" y="17" fill="#782736" font-family="Anton,sans-serif" font-size="14" letter-spacing="2">CONTINUUM</text>
              <text x="54" y="42" fill="#782736" font-family="Anton,sans-serif" font-size="14" letter-spacing="2">CONTINUUM</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="#F5F2EB"/>
          <rect width="100%" height="100%" fill="url(#${pid})"/>
        </svg>
      </div>
      <div class="proj-card__body">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <h3 class="proj-card__designer" style="font-size: 14px; font-weight: bold; color: var(--color-charcoal-text); margin: 0;">${gerarCodigoLote(p.cd_projeto)}</h3>
          <span style="font-size: 11px; color: var(--color-muted-text);">${getDataMock()}</span>
        </div>
        <p style="font-size: 11px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px; text-transform: uppercase;">DESIGNER: ${p.designer_nome}</p>
        <p class="proj-card__desc" style="font-size: 12px; color: #596579; margin-bottom: 16px; min-height: 36px; line-height: 1.5;">${p.ds_descricao}</p>
        <div class="proj-card__footer">
          <span class="badge ${badge.class}">${badge.text}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ==========================================
// FILTROS & SIDEBAR (Interatividade)
// ==========================================
filtroBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownBox.style.display =
    dropdownBox.style.display === "none" || dropdownBox.style.display === ""
      ? "block"
      : "none";
});

document.addEventListener("click", (e) => {
  if (!filtroBtn.contains(e.target) && !dropdownBox.contains(e.target)) {
    dropdownBox.style.display = "none";
  }
});

document.getElementById("filter-menu").addEventListener("click", (e) => {
  const item = e.target.closest(".dropdown-item");
  if (item) {
    document
      .querySelectorAll(".dropdown-item")
      .forEach((c) => c.classList.remove("dropdown-item--active"));
    item.classList.add("dropdown-item--active");
    filtroAtual = item.dataset.status;

    document.getElementById("filtro-texto").textContent =
      item.textContent.trim();
    dropdownBox.style.display = "none";
    renderGrid();
  }
});

searchInput.addEventListener("input", renderGrid);

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () =>
    document.querySelector(".app-layout").classList.add("sidebar-collapsed"),
  );
}
if (sidebarRestore) {
  sidebarRestore.addEventListener("click", () =>
    document.querySelector(".app-layout").classList.remove("sidebar-collapsed"),
  );
}

// ==========================================
// MODAL DE GERENCIAMENTO (Substitui Drawer)
// ==========================================
function getIconForStatus(status) {
  if (status === "DISPONIVEL")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#4f8a47" stroke-width="2"><path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/></svg>`;
  if (status === "RESERVADO")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#b95658" stroke-width="2"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg>`;
  if (status === "EM_PRODUCAO")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a67b43" stroke-width="2"><path d="M3 21V10l6 5v-5l6 5V8h6v13H3z"/><path d="M18 4h3M7 19h.01M12 19h.01M17 19h.01"/></svg>`;
  if (status === "ENVIADO")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#719a45" stroke-width="2"><path d="M3 12h12m-5-5 5 5-5 5"/><path d="M15 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4"/></svg>`;
  if (status === "FINALIZADO")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#b4546c" stroke-width="2"><path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-2.64-6.36"/></svg>`;
  if (status === "EXCEDIDO")
    return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  return "";
}

function abrirDrawer(p) {
  projetoSelecionado = p;

  const body = document.getElementById("drawer-body");
  body.innerHTML = `
    <div class="form-group">
      <label>Código do Projeto</label>
      <input type="text" class="form-control" value="${gerarCodigoLote(p.cd_projeto)}" readonly>
      <span class="form-helper">Gerado automaticamente pelo sistema.</span>
    </div>
    <div class="form-group">
      <label>Descrição do Projeto</label>
      <textarea class="form-control" rows="3" readonly>${p.ds_descricao}</textarea>
    </div>
    <div class="form-group">
      <label>Designer Responsável</label>
      <input type="text" class="form-control" value="${p.designer_nome}" readonly>
    </div>
    <div class="form-group">
      <label>Status (clique para alterar)</label>
      <div class="status-menu" id="modal-status-menu">
        <button type="button" class="status-menu__trigger" id="modal-status-trigger" aria-haspopup="listbox" aria-expanded="false">
          ${getIconForStatus(p.status)}
          <span class="status-menu__label">${getBadgeConfig(p.status).text}</span>
          <span class="status-menu__chevron" aria-hidden="true">⌄</span>
        </button>
        <div class="status-menu__options" id="modal-status-options" role="listbox">
          ${STATUS_OPCOES_PROJETO.map(
            (opt) => `
            <button type="button" class="status-menu__option ${opt.value === p.status ? "is-selected" : ""}" data-status="${opt.value}">
              ${getIconForStatus(opt.value)}
              <span>${opt.label}</span>
              <span class="status-menu__check">✓</span>
            </button>
          `,
          ).join("")}
        </div>
      </div>
    </div>
  `;

  const statusTrigger = document.getElementById("modal-status-trigger");
  const statusOptions = document.getElementById("modal-status-options");

  statusTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = statusOptions.classList.contains("is-open");
    if (isOpen) {
      statusOptions.classList.remove("is-open");
      statusTrigger.setAttribute("aria-expanded", "false");
    } else {
      statusOptions.classList.add("is-open");
      statusTrigger.setAttribute("aria-expanded", "true");
    }
  });

  statusOptions.addEventListener("click", (e) => {
    const opt = e.target.closest(".status-menu__option");
    if (!opt) return;
    const newStatus = opt.dataset.status;
    p.status = newStatus;
    updateProjeto(p.cd_projeto, newStatus);

    statusTrigger.querySelector(".status-menu__label").textContent =
      getBadgeConfig(newStatus).text;
    statusTrigger.querySelector("svg").outerHTML = getIconForStatus(newStatus);

    statusOptions.querySelectorAll(".status-menu__option").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.status === newStatus);
    });

    statusOptions.classList.remove("is-open");
    statusTrigger.setAttribute("aria-expanded", "false");
    renderGrid();
  });

  const footer = document.getElementById("drawer-footer");
  let acaoEsquerda = `<button class="btn-form-cancel" style="border:none; color:var(--color-primary); background:transparent; padding:0; box-shadow:none;" onclick="window.location.href='../projeto-detalhe/index.html'">Acessar Histórico</button>`;
  let acaoDireita = "";

  if (p.status === "EM_PRODUCAO" || p.status === "ENVIADO") {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Cancelar</button>
      <button class="btn-form-submit" onclick="window.location.href='../projeto-revisao/index.html'">Avançar e Concluir</button>
    `;
  } else if (p.status === "EXCEDIDO") {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Cancelar</button>
      <button class="btn-form-danger" onclick="abrirModal('EM_PRODUCAO')">Liberar Prazo</button>
    `;
  } else if (p.status === "FINALIZADO") {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Fechar</button>
      <button class="btn-form-submit" style="background:var(--color-charcoal-text);" onclick="window.location.href='../projeto-tag/index.html'">Imprimir Tag</button>
    `;
  } else {
    acaoDireita = `<button class="btn-form-cancel" id="btn-cancelar-modal-form">Fechar</button>`;
  }

  footer.innerHTML = `
    <div>${acaoEsquerda}</div>
    <div class="modal-form__footer-right">${acaoDireita}</div>
  `;

  drawer.showModal();

  const btnCancelar = document.getElementById("btn-cancelar-modal-form");
  if (btnCancelar) btnCancelar.onclick = () => drawer.close();
}

document.getElementById("btn-close-drawer").onclick = () => {
  drawer.close();
};

// ==========================================
// MODAL
// ==========================================
window.abrirModal = function (acaoDestino) {
  document.getElementById("modal-title").textContent = "Sinalizar Recebimento";
  document.getElementById("modal-desc").textContent =
    "Confirma o recebimento físico do material deste designer?";
  document.getElementById("btn-confirmar-modal").textContent =
    "Confirmar Recebimento";
  document.getElementById("btn-confirmar-modal").dataset.acao = acaoDestino;
  drawer.classList.remove("drawer--open");
  modal.showModal();
};

document.getElementById("btn-cancelar-modal").onclick = () => modal.close();

document.getElementById("btn-confirmar-modal").onclick = (e) => {
  const acao = e.target.dataset.acao;
  if (projetoSelecionado) {
    updateProjeto(projetoSelecionado.cd_projeto, acao);
    renderGrid();
  }
  modal.close();
};

// Start
renderGrid();
