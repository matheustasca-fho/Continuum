import { api, STATUS_LOTE, STATUS_RESERVA } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";
import { store } from "../../../js/shared/store.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (s) => document.querySelector(s);

  const list = $("#lotes");
  const empty = $("#empty");
  const search = $("#search");
  const modal = $("#confirmModal");
  const confirm = $("#modalConfirm");
  const cancelModal = $("#cancelModal");
  const cancelForm = $("#cancelForm");
  const filterBar = $("#filters");
  const indicator = $("#filterIndicator");
  const toast = $("#toast");
  const toastMsg = $("#toastMsg");

  let activeFilter = "todos";
  let selected = null;
  let toastTimer = null;

  const showToast = (text) => {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = text;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  };

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

  const classifyLot = (lot) => {
    if (
      lot.status === STATUS_LOTE.RESERVADO ||
      lot.status === STATUS_LOTE.EM_TRANSPORTE
    ) {
      return "aguardando";
    }
    if (
      lot.status === STATUS_LOTE.EM_PRODUCAO ||
      lot.status === STATUS_LOTE.ENVIADO_LOJA ||
      lot.status === STATUS_LOTE.FINALIZADO
    ) {
      return "recebido";
    }
    return "nao";
  };

  const moveIndicator = () => {
    const activeBtn = filterBar?.querySelector(".filter.is-active");
    if (!activeBtn || !indicator) return;
    indicator.style.width = `${activeBtn.offsetWidth}px`;
    indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
  };

  const designer = await api.getDesigner();
  let lots = await api.listarMeusLotesDesigner(designer.id);

  const updateCounts = () => {
    const counts = {
      todos: lots.length,
      aguardando: lots.filter((l) => classifyLot(l) === "aguardando").length,
      recebido: lots.filter((l) => classifyLot(l) === "recebido").length,
      nao: lots.filter((l) => classifyLot(l) === "nao").length,
    };
    Object.entries(counts).forEach(([key, val]) => {
      const el = document.querySelector(`[data-count="${key}"]`);
      if (el) el.textContent = String(val);
    });
  };

  const render = () => {
    updateCounts();
    const query = (search?.value || "").trim().toLowerCase();

    const items = lots.filter((l) => {
      if (activeFilter !== "todos" && classifyLot(l) !== activeFilter) {
        return false;
      }
      if (!query) return true;
      return `${l.codigo} ${l.titulo} ${l.empresaParceira} ${l.composicao || ""}`
        .toLowerCase()
        .includes(query);
    });

    $("#totalKg").textContent = lots
      .reduce((n, l) => n + (Number(l.pesoKg) || 0), 0)
      .toFixed(1)
      .replace(".", ",");
    $("#totalSub").textContent = `${lots.length} lote(s) no histórico`;

    if (items.length === 0) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    list.innerHTML = items
      .map((l) => {
        const cat = classifyLot(l);
        const prazoInfo = dates.getPrazoStatus(l.reservadoEm || l.criadoEm);
        const prazoFormatado = dates.formatShort(prazoInfo.prazoISO);
        const modalidade =
          l.modalidade === "envio"
            ? "Envio via Correios"
            : "Retirada presencial na loja";
        const canReceive = cat === "aguardando";
        const canCancel =
          l.status !== STATUS_LOTE.FINALIZADO &&
          l.status !== STATUS_LOTE.INTERROMPIDO;

        const badgeMod =
          cat === "aguardando"
            ? "badge--aguardando"
            : cat === "recebido"
              ? "badge--recebido"
              : "badge--nao";

        const swatchStyle = l.image
          ? `style="background-image:url('${l.image}')"`
          : "";
        const swatchClass = l.image ? "swatch" : "swatch swatch--stitch";

        const emp = l.empresaObj || {};
        const enderecoLoja = [
          emp.logradouro,
          emp.numero,
          emp.bairro,
          emp.cidade,
        ]
          .filter(Boolean)
          .join(", ");

        const stepProgress = cat === "recebido" ? 1 : cat === "aguardando" ? 0.5 : 0;

        return `
          <li class="lote" data-id="${escapeHtml(l.id)}">
            <div class="lote__row" data-action="toggle-detail">
              <div class="${swatchClass}" ${swatchStyle}></div>

              <div class="lote__info">
                <h3 class="lote__title">${escapeHtml(l.titulo)}</h3>
                <p class="lote__meta">
                  <span>${escapeHtml(l.codigo)}</span>
                  <span class="sep">·</span>
                  <span>${escapeHtml(String(l.pesoKg).replace(".", ","))} kg</span>
                  <span class="sep">·</span>
                  <span>${escapeHtml(l.empresaParceira)}</span>
                  <span class="sep">·</span>
                  <span><strong>${escapeHtml(modalidade)}</strong></span>
                </p>
                ${
                  canReceive
                    ? `<span class="lote__deadline ${prazoInfo.status !== "no_prazo" ? "is-urgent" : ""}">Prazo (10 dias úteis): até ${escapeHtml(prazoFormatado)}</span>`
                    : ""
                }
              </div>

              <div class="lote__aside">
                <span class="badge ${badgeMod}">${escapeHtml(l.status)}</span>
                ${
                  canReceive
                    ? '<button type="button" class="btn-pill" data-action="receive">Sinalizar recebido</button>'
                    : ""
                }
                ${
                  cat === "recebido"
                    ? '<a href="../meus-projetos/index.html" class="btn-pill" style="text-decoration:none;">Abrir projeto →</a>'
                    : ""
                }
                ${
                  canCancel
                    ? '<button type="button" class="btn-pill btn-pill--danger" data-action="cancel">Cancelar</button>'
                    : ""
                }
              </div>

              <button type="button" class="lote__toggle" aria-label="Expandir detalhes do lote">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            <div class="lote__detail">
              <div class="lote__detail-inner">
                <div class="detail">
                  <div>
                    <p class="detail__heading">Progresso Logístico</p>
                    <ol class="track" style="--p: ${stepProgress}">
                      <li class="track__step is-done">
                        <span class="track__dot">✓</span>
                        <span class="track__label">Reservado</span>
                        <span class="track__date">${escapeHtml(dates.formatShort(l.reservadoEm || l.criadoEm))}</span>
                      </li>
                      <li class="track__step ${cat === "recebido" ? "is-done" : "is-current"}">
                        <span class="track__dot">${cat === "recebido" ? "✓" : ""}</span>
                        <span class="track__label">${escapeHtml(modalidade)}</span>
                        <span class="track__date">${escapeHtml(l.codigoRastreio || "Prazo: " + prazoFormatado)}</span>
                      </li>
                      <li class="track__step ${cat === "recebido" ? "is-done" : ""}">
                        <span class="track__dot">${cat === "recebido" ? "✓" : ""}</span>
                        <span class="track__label">Em produção</span>
                        <span class="track__date">${cat === "recebido" ? "Confirmado" : "Pendente"}</span>
                      </li>
                    </ol>

                    <p class="detail__heading">Briefing Criativo</p>
                    <p style="font-size:13px; color:var(--color-charcoal-text); line-height:1.55;">
                      ${escapeHtml(l.briefing?.ideiaMarca || l.descricao || "Criação autoral livre respeitando a cartilha da loja.")}
                    </p>
                  </div>

                  <div>
                    <p class="detail__heading">Ficha Técnica & Origem</p>
                    <dl class="spec">
                      <dt>Código</dt>
                      <dd class="code">${escapeHtml(l.codigo)}</dd>
                      <dt>Composição</dt>
                      <dd>${escapeHtml(l.composicao || l.material || "Tecido selecionado")}</dd>
                      <dt>Peso</dt>
                      <dd>${escapeHtml(String(l.pesoKg).replace(".", ","))} kg</dd>
                      <dt>Loja</dt>
                      <dd>${escapeHtml(l.empresaParceira)}</dd>
                      <dt>Endereço</dt>
                      <dd>${escapeHtml(enderecoLoja || "São Paulo - SP")} (${escapeHtml(emp.horarioRetirada || "10h às 18h")})</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </li>
        `;
      })
      .join("");
  };

  filterBar?.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    filterBar.querySelectorAll(".filter").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
    activeFilter = btn.dataset.filter;
    moveIndicator();
    render();
  });

  window.addEventListener("resize", moveIndicator);
  search?.addEventListener("input", render);

  list.addEventListener("click", (e) => {
    const itemEl = e.target.closest(".lote[data-id]");
    if (!itemEl) return;
    const lotId = itemEl.dataset.id;

    if (e.target.closest('[data-action="receive"]')) {
      e.stopPropagation();
      selected = lotId;
      const lot = lots.find((l) => l.id === selected);
      $("#modalLote").textContent = lot?.titulo || "";
      $("#modalMeta").textContent = `${lot?.codigo || ""} · ${lot?.empresaParceira || ""}`;
      modal.showModal();
      return;
    }

    if (e.target.closest('[data-action="cancel"]')) {
      e.stopPropagation();
      selected = lotId;
      $("#cancelMotivo").value = "";
      $("#cancelTexto").value = "";
      cancelModal.showModal();
      return;
    }

    if (e.target.closest("a")) return;

    itemEl.classList.toggle("is-open");
  });

  confirm?.addEventListener("click", async (e) => {
    if (!selected) return;
    e.preventDefault();
    try {
      await api.confirmarRecebimentoDesigner(selected);
      lots = await api.listarMeusLotesDesigner(designer.id);
      modal.close();
      render();
      showToast("Recebimento confirmado! Projeto criado em Meus Projetos.");
    } catch (err) {
      alert(err.message);
    }
  });

  $("#cancelCloseBtn")?.addEventListener("click", () => cancelModal.close());
  cancelModal?.addEventListener("click", (e) => {
    if (e.target === cancelModal) cancelModal.close();
  });

  cancelForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selected) return;
    const motivo = $("#cancelMotivo").value;
    const texto = $("#cancelTexto").value.trim();
    if (!motivo || !texto) return;

    const allLots = store.get("lotes") || [];
    const lot = allLots.find((x) => x.id === selected);
    const jaRecebido = lot && lot.status === STATUS_LOTE.EM_PRODUCAO;
    if (lot) {
      lot.status = STATUS_LOTE.INTERROMPIDO;
      lot.status_lote = STATUS_LOTE.INTERROMPIDO;
      lot.cancelamento = { motivo, texto, data: new Date().toISOString() };
      store.set("lotes", allLots);
    }

    const reservas = store.get("reservas") || [];
    reservas.forEach((r) => {
      if (
        (r.idLote === selected || r.loteId === selected) &&
        r.status === STATUS_RESERVA.ATIVA
      ) {
        r.status = STATUS_RESERVA.CANCELADA;
      }
    });
    store.set("reservas", reservas);

    const projetos = store.get("projetos") || [];
    projetos.forEach((p) => {
      if (p.idLote === selected && p.status !== STATUS_LOTE.FINALIZADO) {
        p.status = STATUS_LOTE.INTERROMPIDO;
      }
    });
    store.set("projetos", projetos);

    const designers = store.get("confeccionistas") || [];
    const d = designers.find((x) => x.id === designer.id);
    if (d) {
      d.nota = Math.max(1, Number(((Number(d.nota) || 5) - 0.5).toFixed(1)));
      if (jaRecebido) d.restricaoAtiva = true;
      store.set("confeccionistas", designers);
    }

    lots = await api.listarMeusLotesDesigner(designer.id);
    cancelModal.close();
    render();
    showToast("Compromisso cancelado e loja notificada.");
  });

  render();
  window.requestAnimationFrame(moveIndicator);
});
