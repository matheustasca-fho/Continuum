/* ==========================================================
       DADOS (mock) — datas relativas a hoje para a demo sempre parecer atual
       ========================================================== */
const DAY = 86400000;
const HOJE = new Date();
HOJE.setHours(12, 0, 0, 0);
const PRAZO_DIAS = 7;

const STITCH = "swatch--stitch";

const lotes = [
  {
    id: "4520",
    titulo: "Linho misto natural",
    empresa: "Linhos Paulista",
    status: "aguardando",
    reservadoHa: 1,
    kg: 6,
    endereco: "Al. Santos, 1210 — Jardins",
    horario: "Seg a sex · 10h–18h",
    swatch: { bg: "#EFE7D6", cls: STITCH },
  },
  {
    id: "4471",
    titulo: "Retalhos de algodão cru",
    empresa: "Ateliê Boreal",
    status: "aguardando",
    reservadoHa: 3,
    kg: 12,
    endereco: "R. Harmonia, 412 — Vila Madalena",
    horario: "Seg a sex · 9h–17h",
    swatch: { bg: "#F6EFDF", cls: STITCH },
  },
  {
    id: "4502",
    titulo: "Veludo cotelê vinho",
    empresa: "Studio Trama",
    status: "aguardando",
    reservadoHa: 6,
    kg: 5,
    endereco: "R. Augusta, 2690 — Cerqueira César",
    horario: "Ter a sáb · 11h–19h",
    swatch: { img: "../../../assets/images/tecido-veludo.jpg", bg: "#6E2C3C" },
  },
  {
    id: "4398",
    titulo: "Peças de malha",
    empresa: "Confecção Aurora",
    status: "recebido",
    reservadoHa: 12,
    recebidoHa: 9,
    kg: 8,
    endereco: "Av. Celso Garcia, 1980 — Brás",
    horario: "Seg a sex · 8h–16h",
    swatch: { bg: "#F3ECEC", cls: STITCH },
  },
  {
    id: "4310",
    titulo: "Jeans lavado",
    empresa: "Denim Norte",
    status: "nao",
    reservadoHa: 18,
    kg: 20,
    endereco: "R. José Paulino, 77 — Bom Retiro",
    horario: "Seg a sex · 9h–17h",
    swatch: { img: "../../../assets/images/tecido-jeans.jpg", bg: "#2C3E50" },
  },
  {
    id: "4255",
    titulo: "Tricoline listrada",
    empresa: "Casa Fiação",
    status: "recebido",
    reservadoHa: 26,
    recebidoHa: 23,
    kg: 15,
    endereco: "R. Oriente, 540 — Brás",
    horario: "Seg a sex · 9h–17h",
    swatch: {
      img: "../../../assets/images/tecido-listrado.jpg",
      bg: "#E8DCC7",
    },
  },
];

const STATUS = {
  aguardando: { label: "Aguardando retirada" },
  recebido: { label: "Recebido" },
  nao: { label: "Não retirado" },
};

/* ==========================================================
       HELPERS
       ========================================================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const diasAtras = (n) => new Date(HOJE.getTime() - n * DAY);
const fmt = (d) => d.toLocaleDateString("pt-BR");
const fmtCurto = (d) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const diasRestantes = (l) => PRAZO_DIAS - l.reservadoHa;

const ICON = {
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
  chevron:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
};

function swatchAttrs(sw) {
  const style = [`--sw:${sw.bg}`];
  if (sw.img) style.push(`background-image:url('${sw.img}')`);
  return `class="swatch ${sw.cls || ""}" style="${style.join(";")}"`;
}

/* ==========================================================
       RENDER
       ========================================================== */
function renderRow(l) {
  const reservado = diasAtras(l.reservadoHa);
  let deadline = "";
  if (l.status === "aguardando") {
    const r = diasRestantes(l);
    const txt = r <= 1 ? "retire até amanhã" : `retire em ${r} dias`;
    deadline = `<span class="sep">•</span><span class="lote__deadline ${r <= 1 ? "is-urgent" : ""}">${ICON.clock}${txt}</span>`;
  }

  const action =
    l.status === "aguardando"
      ? `<button class="btn-pill" type="button" data-action="receber">${ICON.check}Sinalizar recebido</button>`
      : "";

  return `
        <div class="lote__row" data-action="toggle">
          <div ${swatchAttrs(l.swatch)} aria-hidden="true"></div>
          <div class="lote__info">
            <h3 class="lote__title">${l.titulo}</h3>
            <p class="lote__meta">${l.empresa}<span class="sep">•</span>reservado em ${fmt(reservado)}${deadline}</p>
          </div>
          <div class="lote__aside">
            <span class="badge badge--${l.status}">${STATUS[l.status].label}</span>
            ${action}
          </div>
          <button class="lote__toggle" type="button" data-action="toggle" aria-expanded="false" aria-controls="det-${l.id}" aria-label="Ver detalhes de ${l.titulo}">${ICON.chevron}</button>
        </div>
        <div class="lote__detail" id="det-${l.id}">
          <div class="lote__detail-inner">${renderDetail(l)}</div>
        </div>`;
}

function renderDetail(l) {
  const reservado = diasAtras(l.reservadoHa);
  const limite = new Date(reservado.getTime() + PRAZO_DIAS * DAY);
  let track, extra, actions;

  if (l.status === "aguardando") {
    const r = diasRestantes(l);
    const p = Math.min(l.reservadoHa / PRAZO_DIAS, 1);
    track = `
          <ol class="track" style="--p:0.5">
            <li class="track__step is-done"><span class="track__dot">${ICON.check}</span><span class="track__label">Reservado</span><span class="track__date">${fmtCurto(reservado)}</span></li>
            <li class="track__step is-current"><span class="track__dot"></span><span class="track__label">Retirada</span><span class="track__date">até ${fmtCurto(limite)}</span></li>
            <li class="track__step"><span class="track__dot"></span><span class="track__label">Recebido</span><span class="track__date">—</span></li>
          </ol>`;
    extra = `
          <div class="deadline-bar ${r <= 1 ? "is-urgent" : ""}">
            <div class="deadline-bar__top"><span>Prazo de retirada</span><strong>${r <= 1 ? "Último dia amanhã" : `${r} dias restantes`}</strong></div>
            <div class="deadline-bar__rail"><div class="deadline-bar__fill" style="--p:${p}"></div></div>
          </div>`;
    actions = `
          <button class="btn btn--primary" type="button" data-action="receber">${ICON.check}Sinalizar recebido</button>
          <a class="btn btn--ghost" href="#">${ICON.chat}Falar com a empresa</a>`;
  } else if (l.status === "recebido") {
    const recebido = diasAtras(l.recebidoHa);
    track = `
          <ol class="track" style="--p:1">
            <li class="track__step is-done"><span class="track__dot">${ICON.check}</span><span class="track__label">Reservado</span><span class="track__date">${fmtCurto(reservado)}</span></li>
            <li class="track__step is-done"><span class="track__dot">${ICON.check}</span><span class="track__label">Retirada</span><span class="track__date">${fmtCurto(recebido)}</span></li>
            <li class="track__step is-done"><span class="track__dot">${ICON.check}</span><span class="track__label">Recebido</span><span class="track__date">${fmtCurto(recebido)}</span></li>
          </ol>`;
    extra = `<div class="note note--ok">${ICON.check}<span>Recebido em ${fmt(recebido)}. Esse material já pode virar a próxima peça.</span></div>`;
    actions = `<a class="btn btn--stitched" href="#">Usar em um projeto ${ICON.arrow}</a>`;
  } else {
    track = `
          <ol class="track track--nao" style="--p:0.5">
            <li class="track__step is-done"><span class="track__dot">${ICON.check}</span><span class="track__label">Reservado</span><span class="track__date">${fmtCurto(reservado)}</span></li>
            <li class="track__step is-fail"><span class="track__dot">${ICON.x}</span><span class="track__label">Retirada</span><span class="track__date">expirou ${fmtCurto(limite)}</span></li>
            <li class="track__step"><span class="track__dot"></span><span class="track__label">Recebido</span><span class="track__date">—</span></li>
          </ol>`;
    extra = `<div class="note note--fail">${ICON.info}<span>O prazo terminou em ${fmt(limite)} e o lote voltou para a vitrine.</span></div>`;
    actions = `<a class="btn btn--ghost" href="#">Ver lotes parecidos ${ICON.arrow}</a>`;
  }

  return `
        <div class="detail">
          <div>
            <p class="detail__heading">Andamento</p>
            ${track}
            ${extra}
            <div class="detail__actions">${actions}</div>
          </div>
          <div>
            <p class="detail__heading">Ficha do lote</p>
            <dl class="spec">
              <dt>Lote</dt><dd>#${l.id}</dd>
              <dt>Quantidade</dt><dd>${l.kg} kg</dd>
              <dt>Retirada</dt><dd>${l.endereco}</dd>
              <dt>Horário</dt><dd>${l.horario}</dd>
              <dt>Código</dt>
              <dd><span class="code">CNT-${l.id}<button type="button" data-action="copiar" data-code="CNT-${l.id}" aria-label="Copiar código">${ICON.copy}</button></span></dd>
            </dl>
          </div>
        </div>`;
}

const list = $("#lotes");

function mount() {
  lotes.forEach((l, i) => {
    const li = document.createElement("li");
    li.className = "lote is-entering";
    li.dataset.id = l.id;
    li.style.setProperty("--i", i);
    li.innerHTML = renderRow(l);
    const onEnd = (e) => {
      if (e.target !== li) return;
      li.classList.remove("is-entering");
      li.removeEventListener("animationend", onEnd);
    };
    li.addEventListener("animationend", onEnd);
    list.appendChild(li);
  });
}

/* ==========================================================
       CONTADORES / RESUMO
       ========================================================== */
function animateNumber(el, to, duration = 1400) {
  const from = parseInt(el.textContent, 10) || 0;
  if (reduceMotion || from === to) {
    el.textContent = to;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function updateCounts(bump = false) {
  const c = { todos: lotes.length, aguardando: 0, recebido: 0, nao: 0 };
  lotes.forEach((l) => c[l.status]++);

  $$("[data-count]").forEach((el) => {
    const key = el.dataset.count;
    if (el.textContent !== String(c[key]) && bump) {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    }
    el.textContent = c[key];
  });

  window.__navBadgeCount = c.aguardando;
  const applyNavBadge = () => {
    const nb = document.getElementById("navBadge");
    if (!nb) return;
    nb.textContent = window.__navBadgeCount;
    nb.style.display = window.__navBadgeCount ? "" : "none";
  };
  applyNavBadge();
  if (!window.__navBadgeBound) {
    window.__navBadgeBound = true;
    document.addEventListener("header:ready", applyNavBadge);
  }

  const kgAtivos = lotes
    .filter((l) => l.status !== "nao")
    .reduce((s, l) => s + l.kg, 0);
  animateNumber($("#totalKg"), kgAtivos);
  $("#totalSub").textContent =
    `${c.todos} lotes · ${c.aguardando} para retirar`;
}

/* ==========================================================
       FILTRO + BUSCA (com animação FLIP)
       ========================================================== */
let filtroAtual = "todos";
let busca = "";

const normaliza = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function matches(l) {
  const okStatus = filtroAtual === "todos" || l.status === filtroAtual;
  const okBusca =
    !busca || normaliza(`${l.titulo} ${l.empresa}`).includes(busca);
  return okStatus && okBusca;
}

function applyFilter() {
  const items = $$(".lote", list);
  const first = new Map(
    items.map((el) => [el, el.hidden ? null : el.getBoundingClientRect()]),
  );

  let visiveis = 0;
  items.forEach((el) => {
    const l = lotes.find((x) => x.id === el.dataset.id);
    const show = matches(l);
    el.hidden = !show;
    if (show) visiveis++;
  });

  $("#empty").classList.toggle("is-visible", visiveis === 0);

  if (reduceMotion) return;
  items.forEach((el) => {
    if (el.hidden) return;
    const before = first.get(el);
    const after = el.getBoundingClientRect();
    if (!before) {
      el.animate(
        [
          { opacity: 0, transform: "translateY(14px) scale(0.98)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    } else {
      const dy = before.top - after.top;
      if (Math.abs(dy) > 1) {
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
          { duration: 550, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
      }
    }
  });
}

const filtersEl = $("#filters");
const indicator = $("#filterIndicator");

function moveIndicator() {
  const active = $(".filter.is-active", filtersEl);
  indicator.style.width = `${active.offsetWidth}px`;
  indicator.style.transform = `translateX(${active.offsetLeft}px)`;
}

filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn || btn.classList.contains("is-active")) return;
  $$(".filter", filtersEl).forEach((b) => {
    const on = b === btn;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on);
  });
  filtroAtual = btn.dataset.filter;
  moveIndicator();
  btn.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "smooth",
  });
  applyFilter();
});

$("#search").addEventListener("input", (e) => {
  busca = normaliza(e.target.value.trim());
  applyFilter();
});

window.addEventListener("resize", moveIndicator);

/* ==========================================================
       INTERAÇÕES NA LISTA (delegação)
       ========================================================== */
let loteSelecionado = null;
const modal = $("#confirmModal");

list.addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const li = actionEl.closest(".lote");
  const l = lotes.find((x) => x.id === li.dataset.id);
  const action = actionEl.dataset.action;

  if (action === "receber") {
    e.stopPropagation();
    abrirConfirmacao(l);
  } else if (action === "copiar") {
    e.stopPropagation();
    navigator.clipboard?.writeText(actionEl.dataset.code).catch(() => {});
    showToast(`Código ${actionEl.dataset.code} copiado`);
  } else if (action === "toggle") {
    // Evita toggle duplo (botão está dentro da linha)
    if (
      actionEl.classList.contains("lote__row") &&
      e.target.closest(".lote__toggle, a, .btn-pill")
    )
      return;
    toggle(li);
  }
});

function toggle(li, force) {
  const open = force ?? !li.classList.contains("is-open");
  li.classList.toggle("is-open", open);
  $(".lote__toggle", li).setAttribute("aria-expanded", open);
}

/* ==========================================================
       CONFIRMAR RECEBIMENTO
       ========================================================== */
function abrirConfirmacao(l) {
  loteSelecionado = l;
  const sw = $("#modalSwatch");
  sw.outerHTML = `<div ${swatchAttrs(l.swatch)} id="modalSwatch"></div>`;
  $("#modalLote").textContent = l.titulo;
  $("#modalMeta").textContent = `${l.empresa} · ${l.kg} kg · #${l.id}`;
  modal.showModal();
  $("#modalConfirm").focus();
}

modal.addEventListener("close", () => {
  if (modal.returnValue === "confirm" && loteSelecionado)
    confirmarRecebimento(loteSelecionado);
  loteSelecionado = null;
  modal.returnValue = "";
});

// Fecha clicando fora
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close("cancel");
});

function confirmarRecebimento(l) {
  l.status = "recebido";
  l.recebidoHa = 0;

  const li = list.querySelector(`[data-id="${l.id}"]`);
  const estavaAberto = li.classList.contains("is-open");
  li.innerHTML = renderRow(l);
  if (estavaAberto) {
    // reabre já com a linha do tempo se desenhando até o fim
    li.classList.remove("is-open");
    requestAnimationFrame(() => requestAnimationFrame(() => toggle(li, true)));
  }

  $(".badge", li).classList.add("pop");
  li.classList.remove("just-received");
  void li.offsetWidth;
  li.classList.add("just-received");
  setTimeout(() => li.classList.remove("just-received"), 1300);

  updateCounts(true);
  showToast(`Recebimento confirmado! ${l.empresa} foi avisada.`);

  // Se estiver filtrando "Aguardando", o lote desliza para fora depois do feedback
  if (filtroAtual !== "todos") setTimeout(applyFilter, 1100);
}

/* ==========================================================
       TOAST
       ========================================================== */
let toastTimer;
function showToast(msg) {
  const t = $("#toast");
  $("#toastMsg").textContent = msg;
  t.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-visible"), 3200);
}

// Links ainda sem página de destino não fazem a página pular para o topo
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href="#"]');
  if (!a) return;
  e.preventDefault();
  showToast("Essa tela ainda está sendo costurada ✂");
});

/* ==========================================================
       INIT
       ========================================================== */
mount();
updateCounts();
// espera fontes carregarem para medir o indicador corretamente
(document.fonts?.ready || Promise.resolve()).then(moveIndicator);
moveIndicator();
