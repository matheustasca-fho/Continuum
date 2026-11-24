import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";

const $ = (id) => document.getElementById(id);

const grid = $("lotes-grid");
const lojasRibbon = $("lojas-ribbon");
const countSalvos = $("count-salvos");
const emptyState = $("empty-state");
const bannerReserva = $("faixa-reserva");
const textoReserva = $("reserva-banner-texto");
const inputBusca = $("input-busca");
const btnAbrirFiltros = $("btn-abrir-filtros");
const filterMenu = $("filter-menu");
const filtrosAtivosWrap = $("filtros-ativos");
const listaChipsFiltros = $("lista-chips-filtros");
const drawerLote = $("drawer-lote");
const drawerLoja = $("drawer-loja");

let currentAba = "todos";
let selectedLojaId = "TODAS";
let selectedMaterial = "TODOS";
let searchQuery = "";
let designer = null;
let lotes = [];
let lojas = [];
let loteSelecionado = null;

const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[c],
  );

const fmtTempo = (isoString) => {
  if (!isoString) return "recentemente";
  const diffHoras = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoString).getTime()) / 3600000),
  );
  if (diffHoras < 1) return "agora há pouco";
  if (diffHoras < 24) return `há ${diffHoras}h`;
  return `há ${Math.floor(diffHoras / 24)} dia(s)`;
};

async function init() {
  designer = await api.getDesigner();
  lotes = await api.listarLotesVitrineSP();

  if (
    designer.reservaAtiva &&
    !lotes.some((l) => l.id === designer.reservaAtiva)
  ) {
    const reserved = await api.obterLotePorCodigo(designer.reservaAtiva);
    if (reserved) {
      const companies = await api.listarEmpresas();
      const e = companies.find((x) => x.id === reserved.empresaId);
      lotes.push({
        ...reserved,
        lojaId: e?.id,
        empresaParceira: e,
        peso: `${String(reserved.pesoKg).replace(".", ",")} kg`,
        direcao: reserved.briefing?.ideiaMarca || reserved.descricao,
        logistica_aceita: e?.aceitaRetirada ? ["retirada", "envio"] : ["envio"],
      });
    }
  }

  lojas = (await api.listarEmpresas()).map((e) => ({
    id: e.id,
    nome: e.nomeFantasia || e.razaoSocial,
    sobre: e.perfilLoja || "Loja parceira credenciada na rede CONTINUUM.",
    endereco: [e.logradouro, e.numero, e.bairro, e.cidade, e.uf]
      .filter(Boolean)
      .join(", "),
    horario_retirada: e.horarioRetirada || "Seg a Sex das 10h às 18h",
    aceitaRetirada: !!e.aceitaRetirada,
    cartilha:
      e.cartilhaPadrao?.conteudo ||
      "Higienização prévia e acabamento limpo padrão ateliê.",
    cartilhaVersao: e.cartilhaPadrao?.versao || "v1.0",
  }));

  renderLojas();
  renderActiveFilters();
  renderGrid();
  renderFaixaReserva();
  setupListeners();
}

function renderLojas() {
  const disponiveis = lotes.filter(
    (l) => l.status === STATUS_LOTE.DISPONIVEL && l.id !== designer.reservaAtiva,
  );
  let html = `<button type="button" class="chip ${selectedLojaId === "TODAS" ? "chip--active" : ""}" data-loja-id="TODAS">Todas as lojas (${disponiveis.length})</button>`;

  lojas.forEach((loja) => {
    const qtde = disponiveis.filter((l) => l.lojaId === loja.id).length;
    if (qtde > 0) {
      const activeClass = selectedLojaId === loja.id ? "chip--active" : "";
      html += `<button type="button" class="chip ${activeClass}" data-loja-id="${escapeHtml(loja.id)}">${escapeHtml(loja.nome)} (${qtde})</button>`;
    }
  });
  lojasRibbon.innerHTML = html;
}

function renderActiveFilters() {
  const chips = [];
  if (selectedLojaId !== "TODAS") {
    const lj = lojas.find((x) => x.id === selectedLojaId);
    if (lj) chips.push(`Loja: ${lj.nome}`);
  }
  if (selectedMaterial !== "TODOS") {
    chips.push(`Material: ${selectedMaterial}`);
  }
  if (searchQuery.trim()) {
    chips.push(`Busca: "${searchQuery.trim()}"`);
  }

  if (chips.length === 0) {
    filtrosAtivosWrap.hidden = true;
    listaChipsFiltros.innerHTML = "";
    return;
  }

  filtrosAtivosWrap.hidden = false;
  listaChipsFiltros.innerHTML = chips
    .map((c) => `<span class="filter-chip-active">${escapeHtml(c)}</span>`)
    .join("");
}

function clearAllFilters() {
  selectedLojaId = "TODAS";
  selectedMaterial = "TODOS";
  searchQuery = "";
  if (inputBusca) inputBusca.value = "";
  if ($("label-filtro-material")) {
    $("label-filtro-material").textContent = "Filtrar material";
  }
  filterMenu
    ?.querySelectorAll(".dropdown-item")
    .forEach((li) =>
      li.classList.toggle("dropdown-item--active", li.dataset.material === "TODOS"),
    );
  renderLojas();
  renderActiveFilters();
  renderGrid();
}

function renderFaixaReserva() {
  if (designer.reservaAtiva) {
    const lote = lotes.find((l) => l.id === designer.reservaAtiva);
    const loja = lojas.find((l) => l.id === lote?.lojaId);
    textoReserva.textContent = `${lote?.codigo || designer.reservaAtiva} · ${loja?.nome || "Loja Parceira"} · prazo de 10 dias úteis`;
    bannerReserva.hidden = false;
  } else {
    bannerReserva.hidden = true;
  }
}

function renderGrid() {
  grid.innerHTML = "";
  const q = searchQuery.trim().toLowerCase();
  const mat = selectedMaterial.toLowerCase();

  const exibirLotes = lotes.filter((l) => {
    if (l.id === designer.reservaAtiva) return false;
    if (l.status !== STATUS_LOTE.DISPONIVEL) return false;
    if (currentAba === "salvos" && !designer.favoritos.includes(l.id))
      return false;
    if (selectedLojaId !== "TODAS" && l.lojaId !== selectedLojaId)
      return false;

    const loja = lojas.find((lj) => lj.id === l.lojaId);
    const haystack = [
      l.codigo,
      l.titulo,
      l.composicao,
      l.material,
      l.descricao,
      loja?.nome,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (selectedMaterial !== "TODOS" && !haystack.includes(mat)) return false;
    if (q && !haystack.includes(q)) return false;
    return true;
  });

  countSalvos.textContent = String(designer.favoritos.length);

  if (exibirLotes.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  exibirLotes.forEach((lote, index) => {
    const loja = lojas.find((lj) => lj.id === lote.lojaId);
    const isFav = designer.favoritos.includes(lote.id);
    const isNovo =
      Date.now() - new Date(lote.publicado_em || lote.criadoEm).getTime() <
      172800000;

    const div = document.createElement("article");
    div.className = "lote-card";
    div.dataset.lotId = lote.id;
    div.style.animationDelay = `${index * 0.05}s`;

    const headerStyle = lote.image
      ? `style="background-image:url('${lote.image}')"`
      : "";

    div.innerHTML = `
      <div class="lote-card__header ${lote.image ? "lote-card__header--photo" : ""}" ${headerStyle}>
        ${isNovo ? `<span class="lote-card__badge-novo">Novo</span>` : `<span></span>`}
        <button type="button" class="lote-card__btn-fav ${isFav ? "lote-card__btn-fav--active" : ""}" data-id="${escapeHtml(lote.id)}" aria-label="Favoritar lote" aria-pressed="${isFav}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div class="lote-card__body">
        <h3 class="lote-card__title">${escapeHtml(lote.titulo)}</h3>
        <p class="lote-card__tech">${escapeHtml(lote.codigo)} • ${escapeHtml(lote.peso)} • ${escapeHtml(loja?.nome || "Loja Parceira")}</p>
        <div class="lote-card__meta-row">
          <span>${escapeHtml(lote.composicao || lote.material || "Tecido selecionado")}</span>
          <span>${escapeHtml(fmtTempo(lote.publicado_em || lote.criadoEm))}</span>
        </div>
        <div class="lote-card__footer">
          <button type="button" class="btn btn--secondary lote-card__btn-detalhes">Detalhes</button>
          <button type="button" class="btn btn--primary lote-card__btn-reservar"
            ${designer.reservaAtiva ? 'aria-disabled="true" title="Você já possui uma reserva ativa"' : ""}>
            Reservar
          </button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
}

function openDrawerLote(id) {
  const lote = lotes.find((l) => l.id === id);
  if (!lote) return;
  const loja = lojas.find((l) => l.id === lote.lojaId);
  if (!loja) return;

  loteSelecionado = lote;
  $("dl-lote-title").textContent = lote.titulo || "DETALHES DO LOTE";

  const photoMarkup = lote.image
    ? `<img src="${lote.image}" alt="${escapeHtml(lote.titulo)}" class="dl-photo" />`
    : "";

  const briefing = lote.briefing || {};
  const body = $("dl-body");
  body.innerHTML = `
    ${photoMarkup}
    <div class="dl-specs-grid">
      <div class="dl-spec-box">
        <span class="dl-spec-box__label">Código</span>
        <span class="dl-spec-box__val">${escapeHtml(lote.codigo)}</span>
      </div>
      <div class="dl-spec-box">
        <span class="dl-spec-box__label">Peso / Volume</span>
        <span class="dl-spec-box__val">${escapeHtml(lote.peso)}${lote.quantidadePecas ? ` · ${lote.quantidadePecas} pçs` : ""}</span>
      </div>
      <div class="dl-spec-box">
        <span class="dl-spec-box__label">Material</span>
        <span class="dl-spec-box__val">${escapeHtml(lote.composicao || lote.material || "Têxtil")}</span>
      </div>
    </div>

    <div class="dl-briefing-card">
      <h4>Briefing Criativo da Loja</h4>
      <div class="dl-briefing-list">
        <div><strong>Descrição:</strong> ${escapeHtml(lote.descricao || lote.direcao || "Sem descrição adicional.")}</div>
        ${briefing.ideiaMarca ? `<div><strong>Ideia da marca:</strong> ${escapeHtml(briefing.ideiaMarca)}</div>` : ""}
        ${briefing.expectativa ? `<div><strong>Expectativa:</strong> ${escapeHtml(briefing.expectativa)}</div>` : ""}
        ${briefing.liberdadeCriativa ? `<div><strong>Liberdade criativa:</strong> ${escapeHtml(briefing.liberdadeCriativa)}</div>` : ""}
        <div><strong>Prazo de produção sugerido:</strong> ${Number(briefing.prazoProducaoDias || 30)} dias</div>
      </div>
    </div>

    <div class="dl-briefing-card">
      <h4>Cartilha Padrão (${escapeHtml(loja.cartilhaVersao)}) · ${escapeHtml(loja.nome)}</h4>
      <p style="font-size:13px; color:var(--color-muted-text); line-height:1.5;">${escapeHtml(loja.cartilha)}</p>
    </div>

    <div class="store-minicard">
      <div>
        <h4>${escapeHtml(loja.nome)}</h4>
        <span style="font-size:12px; color:var(--color-muted-text);">
          ${lote.logistica_aceita.includes("retirada") ? "Aceita Envio (Correios) ou Retirada na loja" : "Envio via Correios"}
        </span>
      </div>
      <button type="button" class="btn btn--secondary btn--sm" id="btn-ver-loja">
        Perfil da loja
      </button>
    </div>
  `;

  $("btn-ver-loja")?.addEventListener("click", () => {
    drawerLote.close();
    openDrawerLoja(loja);
  });

  const btnReserva = $("btn-drawer-reservar");
  const hintReserva = $("dl-reserva-hint");

  if (designer.reservaAtiva) {
    btnReserva.disabled = false;
    btnReserva.textContent = "Já possui reserva ativa";
    if (hintReserva) hintReserva.hidden = false;
  } else {
    btnReserva.disabled = false;
    btnReserva.textContent = "Reservar este lote";
    if (hintReserva) hintReserva.hidden = true;
  }

  drawerLote.showModal();
}

function openDrawerLoja(loja) {
  $("dloja-title").textContent = loja.nome;
  $("dloja-sobre").textContent = loja.sobre;
  $("dloja-endereco").textContent = loja.endereco;
  $("dloja-horario").textContent = loja.aceitaRetirada
    ? `Retirada presencial: ${loja.horario_retirada} · Envio via Correios disponível.`
    : "Somente envio via Correios (custeado na rede SP).";
  if ($("dloja-cartilha")) {
    $("dloja-cartilha").textContent = `[${loja.cartilhaVersao}] ${loja.cartilha}`;
  }
  drawerLoja.showModal();
}

function closeDrawers() {
  if (drawerLote?.open) drawerLote.close();
  if (drawerLoja?.open) drawerLoja.close();
}

function iniciarReserva() {
  const m1 = $("modal-m1");
  const m5 = $("modal-m5");
  if (!loteSelecionado) return;

  closeDrawers();

  if (designer.reservaAtiva) {
    const atual = lotes.find((l) => l.id === designer.reservaAtiva);
    $("m5-lote-atual").textContent = atual?.codigo || `#${designer.reservaAtiva}`;
    m5.showModal();
    return;
  }

  const limite = dates.addBusinessDays(new Date().toISOString(), 10);
  const dataFormatada = limite.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);
  $("m1-lote-nome").textContent = `${loteSelecionado.codigo} — ${loteSelecionado.titulo}`;
  $("m1-loja-nome").textContent = loja?.nome || "Loja Parceira";
  if ($("m1-briefing-resumo")) {
    const dir =
      loteSelecionado.briefing?.ideiaMarca ||
      loteSelecionado.direcao ||
      "Criação autoral livre dentro da cartilha da loja.";
    $("m1-briefing-resumo").textContent = `Direcionamento: ${dir}`;
  }
  $("m1-data-limite").textContent = dataFormatada;

  $("chk-termo").checked = false;
  $("btn-m1-confirmar").disabled = true;

  m1.showModal();
}

function setupListeners() {
  // Filtro por Loja (Ribbon)
  lojasRibbon.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-loja-id]");
    if (!chip) return;
    selectedLojaId = chip.dataset.lojaId;
    renderLojas();
    renderActiveFilters();
    renderGrid();
  });

  // Busca por texto
  inputBusca?.addEventListener("input", () => {
    searchQuery = inputBusca.value;
    renderActiveFilters();
    renderGrid();
  });

  // Menu de filtro de material
  btnAbrirFiltros?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = filterMenu.style.display === "block";
    filterMenu.style.display = isOpen ? "none" : "block";
    btnAbrirFiltros.setAttribute("aria-expanded", String(!isOpen));
  });

  filterMenu?.addEventListener("click", (e) => {
    const item = e.target.closest("[data-material]");
    if (!item) return;
    const val = item.dataset.material;
    filterMenu.style.display = "none";
    btnAbrirFiltros?.setAttribute("aria-expanded", "false");

    if (val === "LIMPAR") {
      clearAllFilters();
      return;
    }

    selectedMaterial = val;
    filterMenu
      .querySelectorAll(".dropdown-item")
      .forEach((li) => li.classList.toggle("dropdown-item--active", li === item));
    if ($("label-filtro-material")) {
      $("label-filtro-material").textContent =
        val === "TODOS" ? "Filtrar material" : item.textContent.trim();
    }
    renderActiveFilters();
    renderGrid();
  });

  document.addEventListener("click", (e) => {
    if (
      filterMenu &&
      filterMenu.style.display === "block" &&
      !e.target.closest("#materialFilterWrap")
    ) {
      filterMenu.style.display = "none";
      btnAbrirFiltros?.setAttribute("aria-expanded", "false");
    }
  });

  $("btn-limpar-filtros")?.addEventListener("click", clearAllFilters);
  $("btn-empty-limpar")?.addEventListener("click", clearAllFilters);
  $("btn-banner-ver")?.addEventListener("click", () => {
    location.href = "../meus-lotes/index.html";
  });

  // Abas Todos / Favoritos
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("tab--active"));
      e.currentTarget.classList.add("tab--active");
      currentAba = e.currentTarget.dataset.aba;
      renderGrid();
    });
  });

  // Cliques na Grade
  grid.addEventListener("click", async (e) => {
    const btnFav = e.target.closest(".lote-card__btn-fav");
    if (btnFav) {
      e.stopPropagation();
      const id = btnFav.dataset.id;
      designer.favoritos = await api.alternarFavorito(id);
      renderGrid();
      return;
    }

    const card = e.target.closest(".lote-card");
    if (!card) return;
    const lote = lotes.find((l) => l.id === card.dataset.lotId);
    if (!lote) return;

    if (e.target.closest(".lote-card__btn-reservar")) {
      loteSelecionado = lote;
      iniciarReserva();
      return;
    }

    openDrawerLote(lote.id);
  });

  $("btn-close-lote")?.addEventListener("click", closeDrawers);
  $("btn-drawer-cancel")?.addEventListener("click", closeDrawers);
  $("btn-close-loja")?.addEventListener("click", () => drawerLoja.close());
  $("btn-voltar-lote")?.addEventListener("click", () => {
    drawerLoja.close();
    if (loteSelecionado) openDrawerLote(loteSelecionado.id);
  });

  drawerLote?.addEventListener("click", (e) => {
    if (e.target === drawerLote) drawerLote.close();
  });
  drawerLoja?.addEventListener("click", (e) => {
    if (e.target === drawerLoja) drawerLoja.close();
  });

  // Modais de Reserva (M1, M2, M3, M5)
  const m1 = $("modal-m1");
  const m2 = $("modal-m2");
  const m3 = $("modal-m3");
  const m5 = $("modal-m5");

  $("btn-drawer-reservar")?.addEventListener("click", iniciarReserva);

  $("chk-termo")?.addEventListener("change", (e) => {
    $("btn-m1-confirmar").disabled = !e.target.checked;
  });

  $("btn-m1-confirmar")?.addEventListener("click", () => {
    m1.close();
    const aceitaRetirada = loteSelecionado.logistica_aceita.includes("retirada");
    const boxRetirada = $("m2-opt-retirada-box");
    const inputRetirada = $("m2-opt-retirada");
    const inputEnvio = $("m2-opt-envio");
    const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);

    $("m2-txt-retirada").textContent = `${loja?.endereco || ""} (${loja?.horario_retirada || ""})`;

    if (!aceitaRetirada) {
      boxRetirada.style.opacity = "0.5";
      inputRetirada.disabled = true;
      inputEnvio.checked = true;
    } else {
      boxRetirada.style.opacity = "1";
      inputRetirada.disabled = false;
      inputRetirada.checked = true;
    }

    m2.showModal();
  });

  $("btn-m2-depois")?.addEventListener("click", () => {
    m2.close();
    m1.showModal();
  });

  $("btn-m2-salvar")?.addEventListener("click", async () => {
    const modo = document.querySelector('input[name="logistica"]:checked');
    if (!modo || !loteSelecionado) return;

    try {
      await api.reservarLote(
        loteSelecionado.codigo || loteSelecionado.id,
        designer.id,
        modo.value === "retirada" ? "RETIRADA" : "ENVIO",
      );
    } catch (error) {
      alert(error.message);
      return;
    }

    m2.close();
    designer.reservaAtiva = loteSelecionado.id;

    const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);
    $("m3-loja-nome").textContent = loja?.nome || "Loja Parceira";
    $("m3-resumo-logistica").innerHTML =
      modo.value === "retirada"
        ? `Modalidade escolhida: <strong>Retirada presencial na loja</strong> (${escapeHtml(loja?.horario_retirada || "horário comercial")}).`
        : "Modalidade escolhida: <strong>Envio via Correios</strong> para o endereço do seu ateliê.";

    const tagAnim = $("m3-tag-anim");
    tagAnim.classList.remove("anim-drop-tag");
    void tagAnim.offsetWidth;
    tagAnim.classList.add("anim-drop-tag");

    renderFaixaReserva();
    renderLojas();
    renderGrid();
    m3.showModal();
  });

  $("btn-m1-cancelar")?.addEventListener("click", () => m1.close());
  $("btn-m5-fechar")?.addEventListener("click", () => m5.close());
  $("btn-m5-meu-lote")?.addEventListener("click", () => {
    location.href = "../meus-lotes/index.html";
  });
  $("btn-m3-meus-lotes")?.addEventListener("click", () => {
    location.href = "../meus-lotes/index.html";
  });
  $("btn-m3-explorar")?.addEventListener("click", () => {
    m3.close();
  });
}

init();
