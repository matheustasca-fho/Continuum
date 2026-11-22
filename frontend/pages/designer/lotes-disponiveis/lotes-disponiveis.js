import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";

// Elementos da DOM
const grid = document.getElementById("lotes-grid");
const lojasRibbon = document.getElementById("lojas-ribbon");
const countSalvos = document.getElementById("count-salvos");
const emptyState = document.getElementById("empty-state");
const bannerReserva = document.getElementById("faixa-reserva");
const textoReserva = document.getElementById("reserva-banner-texto");
const demoToggle = document.getElementById("demo-toggle");
const inputBusca = document.getElementById("input-busca");
const filterMenu = document.getElementById("filter-menu");

// Estado Local
let currentAba = "todos"; // todos | salvos
let filtroLojaId = "todas";
let filtroMaterial = "TODOS";
let filtroLogistica = "TODAS";
let termoBusca = "";
let designer = null;
let lotes = [];
let lojas = [];

// Formatação
const fmtTempo = (isoString) => {
  const diffHoras = Math.floor((new Date() - new Date(isoString)) / 3600000);
  if (diffHoras < 24) return `há ${Math.max(0, diffHoras)} h`;
  return `há ${Math.floor(diffHoras / 24)} dias`;
};

// Inicialização
async function init() {
  designer = await api.getDesigner();
  lotes = await api.listarLotesVitrineSP();
  if (
    designer.reservaAtiva &&
    !lotes.some((l) => l.id === designer.reservaAtiva)
  ) {
    const reserved = await api.obterLotePorCodigo(designer.reservaAtiva);
    if (reserved) {
      const companies = await api.listarEmpresas(),
        e = companies.find((x) => x.id === reserved.empresaId);
      lotes.push({
        ...reserved,
        lojaId: e?.id || reserved.empresaId,
        peso: `${String(reserved.pesoKg).replace(".", ",")} kg`,
        direcao: reserved.briefing?.ideiaMarca || reserved.descricao,
        logistica_aceita: e?.aceitaRetirada ? ["retirada", "envio"] : ["envio"],
      });
    }
  }
  lojas = (await api.listarEmpresas())
    .filter((e) => (e.uf || "SP").toUpperCase() === "SP" && e.assinatura?.status === "ATIVA")
    .map((e) => ({
      id: e.id,
      nome: e.nomeFantasia,
      sobre: e.perfilLoja,
      endereco: `${e.logradouro}, ${e.numero} - ${e.bairro}, ${e.cidade} - ${e.uf}`,
      horario_retirada: e.horarioRetirada,
      cartilhaPadrao: e.cartilhaPadrao,
    }));

  renderLojas();
  renderGrid();
  renderFaixaReserva();
  setupListeners();
}

function renderLojas() {
  let html = `<button class="chip ${filtroLojaId === "todas" ? "chip--active" : ""}" data-loja-id="todas">Todas as lojas</button>`;
  lojas.forEach((loja) => {
    const qtde = lotes.filter(
      (l) => l.lojaId === loja.id && l.status === STATUS_LOTE.DISPONIVEL,
    ).length;
    if (qtde > 0) {
      const active = filtroLojaId === loja.id ? "chip--active" : "";
      html += `<button class="chip ${active}" data-loja-id="${loja.id}">${loja.nome} (${qtde})</button>`;
    }
  });
  lojasRibbon.innerHTML = html;
}

function renderFaixaReserva() {
  if (designer.reservaAtiva) {
    const lote = lotes.find((l) => l.id === designer.reservaAtiva);
    const loja = lojas.find((l) => l.id === lote?.lojaId);
    if (lote) {
      textoReserva.innerHTML = `${lote.codigo} • ${loja?.nome || lote.nomeEmpresa} • retirar em 10 dias úteis`;
      bannerReserva.hidden = false;
      return;
    }
  }
  bannerReserva.hidden = true;
}

function renderGrid() {
  grid.innerHTML = "";

  const exibirLotes = lotes.filter((l) => {
    if (currentAba === "salvos" && !designer.favoritos.includes(l.id))
      return false;
    if (l.id === designer.reservaAtiva) return false;
    if (l.status !== STATUS_LOTE.DISPONIVEL) return false;

    // BE-07.1: Filtro por empresa/loja
    if (filtroLojaId !== "todas" && l.lojaId !== filtroLojaId && l.empresaId !== filtroLojaId) {
      return false;
    }
    // BE-07.2: Filtro por material
    if (filtroMaterial !== "TODOS") {
      const mat = String(l.material || l.descricao || "").toLowerCase();
      if (!mat.includes(filtroMaterial.toLowerCase())) return false;
    }
    // BE-07.3: Filtro por logística
    if (filtroLogistica !== "TODAS") {
      const aceitas = (l.logistica_aceita || []).map((x) => x.toLowerCase());
      if (!aceitas.includes(filtroLogistica.toLowerCase())) return false;
    }
    // Busca textual
    if (termoBusca) {
      const txt = `${l.codigo} ${l.titulo} ${l.descricao} ${l.nomeEmpresa}`.toLowerCase();
      if (!txt.includes(termoBusca.toLowerCase())) return false;
    }
    return true;
  });

  countSalvos.textContent = designer.favoritos.length;

  if (exibirLotes.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  exibirLotes.forEach((lote, index) => {
    const loja = lojas.find((lj) => lj.id === lote.lojaId) || {
      id: lote.empresaId,
      nome: lote.nomeEmpresa || "Empresa Parceira",
    };
    const isFav = designer.favoritos.includes(lote.id);
    const isNovo = new Date() - new Date(lote.publicado_em) < 172800000;

    const iconEnvio = lote.logistica_aceita.includes("envio")
      ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" title="Entrega disponível"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`
      : "";

    const div = document.createElement("div");
    div.className = "lote-card";
    div.dataset.id = lote.id;
    div.style.animationDelay = `${index * 0.08}s`;

    div.innerHTML = `
      <div class="lote-card__header">
        ${isNovo ? `<span class="lote-card__badge-novo">Novo</span>` : `<div></div>`}
        <button class="lote-card__btn-fav ${isFav ? "lote-card__btn-fav--active" : ""}" data-id="${lote.id}" aria-label="Favoritar lote" aria-pressed="${isFav}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div class="lote-card__body">
        <h3 class="lote-card__title">${lote.titulo}</h3>
        <p class="lote-card__tech">${lote.peso} • ${loja.nome}</p>
        <p style="font-size: 11px; color: var(--color-muted-text); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <span style="display:flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
            a ${lote.distancia} 
            ${iconEnvio}
          </span>
          <span>Publicado ${fmtTempo(lote.publicado_em)}</span>
        </p>
        <div class="lote-card__footer">
          <button class="btn btn--secondary" style="width: 100%">Ver detalhes</button>
          <button class="btn btn--primary lote-card__btn-reservar" 
                  ${designer.reservaAtiva ? 'aria-disabled="true" title="Você já tem um lote reservado"' : ""}>
            Reservar
          </button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
}

// Variáveis de Painel
const drawerLote = document.getElementById("drawer-lote");
const drawerLoja = document.getElementById("drawer-loja");
let loteSelecionado = null;

function openDrawerLote(id) {
  const lote = lotes.find((l) => l.id === id);
  if (!lote) return;
  const loja = lojas.find((l) => l.id === lote.lojaId) || {
    id: lote.empresaId,
    nome: lote.nomeEmpresa || "Empresa Parceira",
    sobre: lote.perfil_loja || "",
    endereco: lote.loja?.endereco || "São Paulo - SP",
    horario_retirada: lote.loja?.horarioRetirada || "Seg a Sex das 10h às 18h",
  };

  loteSelecionado = lote;
  const cartilha = lote.cartilhaPadrao || loja.cartilhaPadrao || { versao: "v1.0", conteudo: "Acabamento limpo e higienização adequada." };

  const body = document.getElementById("dl-body");
  body.innerHTML = `
    <div class="form-group">
      <label>Código do Lote</label>
      <input type="text" class="form-control" value="${lote.codigo}" readonly>
      <span class="form-helper">Gerado automaticamente pelo sistema.</span>
    </div>
    <div class="form-group">
      <label>Descrição e Direção (Briefing)</label>
      <textarea class="form-control" rows="3" readonly>${lote.direcao}</textarea>
    </div>
    <div class="form-group">
      <label>Cartilha Padrão da Loja (${cartilha.versao || "v1.0"})</label>
      <textarea class="form-control" rows="2" readonly>${cartilha.conteudo || ""}</textarea>
    </div>
    <div class="form-group">
      <label>Peso / Quantidade</label>
      <input type="text" class="form-control" value="${lote.peso} (${lote.quantidadePecas || 12} peças)" readonly>
    </div>
    <div class="form-group">
      <label>Logística e Origem</label>
      <div class="form-control" style="background:var(--color-sand-offwhite); display:flex; flex-direction:column; gap:4px; height:auto;">
         <strong style="color:var(--color-charcoal-text);">${loja.nome}</strong>
         <span style="font-size:11px; color:var(--color-muted-text);">Aprox. ${lote.distancia} • ${lote.logistica_aceita.includes("envio") ? "Aceita Envio ou Retirada" : "Somente Retirada"}</span>
      </div>
    </div>
    <button type="button" class="btn btn--secondary" id="btn-ver-loja" style="width:100%">Ver perfil da loja</button>
  `;
  document.getElementById("btn-ver-loja").addEventListener("click", () => {
    drawerLote.close();
    openDrawerLoja(loja);
  });

  const btnReserva = document.getElementById("btn-drawer-reservar");
  const hintReserva = document.getElementById("dl-reserva-hint");

  if (designer.reservaAtiva) {
    btnReserva.disabled = true;
    btnReserva.textContent = "Indisponível (Você já possui reserva)";
    btnReserva.style.background = "var(--color-border)";
    btnReserva.style.color = "var(--color-muted-text)";
    if (hintReserva) hintReserva.hidden = false;
  } else {
    btnReserva.disabled = false;
    btnReserva.textContent = "Reservar este lote";
    btnReserva.style.background = "var(--color-primary)";
    btnReserva.style.color = "var(--color-white)";
    if (hintReserva) hintReserva.hidden = true;
  }

  drawerLote.showModal();
}

function openDrawerLoja(loja) {
  document.getElementById("dloja-title").textContent = loja.nome;
  document.getElementById("dloja-sobre").textContent = loja.sobre;
  document.getElementById("dloja-endereco").textContent = loja.endereco;
  document.getElementById("dloja-horario").textContent = loja.horario_retirada;
  drawerLoja.classList.add("drawer--open");
  drawerLoja.setAttribute("aria-hidden", "false");
}

function closeDrawerLoja() {
  drawerLoja.classList.remove("drawer--open");
  drawerLoja.setAttribute("aria-hidden", "true");
}

function closeDrawers() {
  if (drawerLote && drawerLote.open) drawerLote.close();
  closeDrawerLoja();
}

function iniciarReserva() {
  const m1 = document.getElementById("modal-m1");
  const m5 = document.getElementById("modal-m5");
  if (!loteSelecionado) return;

  if (designer.reservaAtiva) {
    document.getElementById("m5-lote-atual").textContent =
      `#${designer.reservaAtiva}`;
    m5.showModal();
    return;
  }

  // Calcula 10 dias úteis pulando fins de semana e feriados (dates.addBusinessDays)
  const dataLimiteObj = dates.addBusinessDays(new Date().toISOString(), 10);
  const dataFormatada = dataLimiteObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);
  document.getElementById("m1-lote-nome").textContent = loteSelecionado.titulo;
  document.getElementById("m1-loja-nome").textContent = loja?.nome || loteSelecionado.nomeEmpresa;
  document.getElementById("m1-data-limite").textContent = dataFormatada;

  document.getElementById("chk-termo").checked = false;
  document.getElementById("btn-m1-confirmar").disabled = true;

  m1.showModal();
}

function setupListeners() {
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

  // BE-07.1: Listener de filtro por loja nos chips de lojasRibbon
  if (lojasRibbon) {
    lojasRibbon.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      filtroLojaId = chip.dataset.lojaId || "todas";
      renderLojas();
      renderGrid();
    });
  }

  // BE-07.2: Listener de busca textual
  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => {
      termoBusca = e.target.value.trim();
      renderGrid();
    });
  }

  // BE-07.2 e BE-07.3: Listener de filtro por material e logística
  if (filterMenu) {
    filterMenu.addEventListener("click", (e) => {
      const item = e.target.closest("[data-type], [data-logistica]");
      if (!item) return;
      if (item.dataset.type) {
        const mapMat = { ALG: "algodão", JEA: "jeans", MAL: "malha", MET: "metal", TODOS: "TODOS" };
        filtroMaterial = mapMat[item.dataset.type] || item.dataset.type;
      }
      if (item.dataset.logistica) {
        filtroLogistica = item.dataset.logistica;
      }
      renderGrid();
    });
  }

  grid.addEventListener("click", async (e) => {
    const btnFav = e.target.closest(".lote-card__btn-fav");
    if (btnFav) {
      const id = btnFav.dataset.id;
      designer.favoritos = await api.alternarFavorito(id);
      renderGrid();
      if (loteSelecionado && loteSelecionado.id === id) {
        openDrawerLote(id);
      }
      return;
    }

    const card = e.target.closest(".lote-card");
    if (!card) return;
    const lote = lotes.find((l) => l.id === card.dataset.id);
    if (!lote) return;

    if (e.target.closest(".lote-card__btn-reservar")) {
      loteSelecionado = lote;
      iniciarReserva();
      return;
    }

    openDrawerLote(lote.id);
  });

  document
    .getElementById("btn-close-lote")
    .addEventListener("click", closeDrawers);
  const btnDrawerCancel = document.getElementById("btn-drawer-cancel");
  if (btnDrawerCancel) btnDrawerCancel.addEventListener("click", closeDrawers);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawers();
  });

  const m1 = document.getElementById("modal-m1");
  const m2 = document.getElementById("modal-m2");
  const m3 = document.getElementById("modal-m3");
  const m5 = document.getElementById("modal-m5");

  document
    .getElementById("btn-drawer-reservar")
    .addEventListener("click", iniciarReserva);

  document
    .getElementById("btn-close-loja")
    .addEventListener("click", closeDrawerLoja);

  document.getElementById("chk-termo").addEventListener("change", (e) => {
    document.getElementById("btn-m1-confirmar").disabled = !e.target.checked;
  });

  // M1 -> M2 (BE-21.5 e BE-21.6: verifica se a loja aceita envio E se o designer é de SP)
  document.getElementById("btn-m1-confirmar").addEventListener("click", () => {
    m1.close();

    const designerEhSP = !designer.uf || designer.uf.toUpperCase() === "SP";
    const aceitaEnvio =
      designerEhSP &&
      loteSelecionado.logistica_aceita.includes("envio") &&
      loteSelecionado.envioDisponivel !== false;

    const boxEnvio = document.getElementById("m2-opt-envio-box");
    const inputEnvio = document.getElementById("m2-opt-envio");
    const txtRetirada = document.getElementById("m2-txt-retirada");

    const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);
    txtRetirada.textContent = `${loja?.endereco || "São Paulo - SP"} (${loja?.horario_retirada || "10h às 18h"})`;

    if (!aceitaEnvio) {
      boxEnvio.style.opacity = "0.5";
      inputEnvio.disabled = true;
      document.getElementById("m2-opt-retirada").checked = true;
    } else {
      boxEnvio.style.opacity = "1";
      inputEnvio.disabled = false;
    }

    m2.showModal();
  });

  document.getElementById("btn-m2-salvar").addEventListener("click", async () => {
    const modo = document.querySelector('input[name="logistica"]:checked');
    if (!modo) return;

    m2.close();

    try {
      await api.reservarLote(
        loteSelecionado.codigo || loteSelecionado.id,
        designer.id,
        modo.value === "retirada" ? "RETIRADA" : "ENVIO",
        { termoAceito: true },
      );
    } catch (error) {
      alert(error.message);
      return;
    }
    designer.reservaAtiva = loteSelecionado.id;

    const loja = lojas.find((l) => l.id === loteSelecionado.lojaId);
    document.getElementById("m3-loja-nome").textContent = loja?.nome || loteSelecionado.nomeEmpresa;
    const txtLog =
      modo.value === "retirada"
        ? "Você escolheu <strong>Retirar na loja</strong>. Organize-se para o prazo."
        : "Você escolheu <strong>Receber em casa</strong>. A loja enviará em breve.";
    document.getElementById("m3-resumo-logistica").innerHTML = txtLog;

    const tagAnim = document.getElementById("m3-tag-anim");
    tagAnim.classList.remove("anim-drop-tag");
    void tagAnim.offsetWidth;
    tagAnim.classList.add("anim-drop-tag");

    m3.showModal();
  });

  document
    .getElementById("btn-m1-cancelar")
    .addEventListener("click", () => m1.close());

  // BE-08.7: Escolher depois grava DEFINIR_DEPOIS para ser definido posteriormente em Meus Lotes
  document.getElementById("btn-m2-depois").addEventListener("click", async () => {
    try {
      await api.reservarLote(
        loteSelecionado.codigo || loteSelecionado.id,
        designer.id,
        "DEFINIR_DEPOIS",
        { termoAceito: true },
      );
    } catch (error) {
      alert(error.message);
      return;
    }
    location.reload();
  });

  document
    .getElementById("btn-m5-fechar")
    .addEventListener("click", () => m5.close());
  document.getElementById("btn-m5-meu-lote").addEventListener("click", () => {
    m5.close();
    closeDrawers();
    location.reload();
  });

  document
    .getElementById("btn-m3-meus-lotes")
    .addEventListener(
      "click",
      () => (location.href = "../meus-lotes/index.html"),
    );
  document
    .getElementById("btn-m3-explorar")
    .addEventListener("click", () => location.reload());

  demoToggle.addEventListener("click", () => {
    if (designer.reservaAtiva)
      alert("A reserva ativa deve ser concluída pela jornada do lote.");
    else alert("Reserve um lote pela vitrine para atualizar seus lotes.");
    location.reload();
  });
}

init();
