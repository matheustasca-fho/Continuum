import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

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

  const designer = await api.getDesigner();
  const dash = await api.getDashboardStats(designer.id);
  const vitrine = await api.listarLotesVitrineSP();
  const meusLotes = await api.listarMeusLotesDesigner(designer.id);
  const meusProjetos = await api.getMeusProjetos(designer.id);

  // Saudação e data real
  const displayName = (designer.nomeProfissional || designer.nome || "Designer")
    .split(" ")
    .slice(0, 2)
    .join(" ")
    .toUpperCase();
  if ($("designerGreeting")) {
    $("designerGreeting").textContent = `OLÁ, ${displayName}`;
  }
  if ($("designerDateSubtitle")) {
    const todayStr = dates.today();
    const capDate = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
    $("designerDateSubtitle").textContent = `Bem-vindo(a) ao seu ateliê circular · ${capDate}.`;
  }

  // Impacto e reputação
  const stats = dash.stats || {};
  if ($("impactKgSaved")) {
    $("impactKgSaved").textContent = String(
      Number(stats.kgSalvos || 0).toFixed(1).replace(".0", ""),
    );
  }
  if ($("impactPiecesCreated")) {
    $("impactPiecesCreated").textContent = String(stats.pecasGeradas || 0);
  }
  if ($("impactRating")) {
    $("impactRating").textContent = Number(designer.nota ?? 5).toFixed(1);
  }

  // Cards operacionais
  const pad2 = (n) => String(n || 0).padStart(2, "0");
  if ($("statReservados")) $("statReservados").textContent = pad2(stats.reservados);
  if ($("statEmAndamento")) $("statEmAndamento").textContent = pad2(stats.em_andamento);
  if ($("statFinalizados")) $("statFinalizados").textContent = pad2(stats.finalizados);

  // Atualiza badge da sidebar quando pronta
  const syncBadge = () => {
    const badge = document.getElementById("navBadge");
    if (badge && stats.reservados > 0) {
      badge.textContent = String(stats.reservados);
      badge.style.display = "inline-flex";
    }
  };
  syncBadge();
  document.addEventListener("header:ready", syncBadge);

  // Vitrine de Lotes (Matches)
  const matchesContainer = $("matchesContainer");
  if (matchesContainer) {
    const topMatches = vitrine.slice(0, 3);
    const swatches = ["swatch-denim", "swatch-cotton", "swatch-leather"];

    if (topMatches.length === 0) {
      matchesContainer.innerHTML = `
        <div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 28px;">
          <strong style="display:block; margin-bottom:6px;">Nenhum lote disponível na vitrine agora</strong>
          <span style="font-size:13px; color:var(--color-muted-text);">Assim que as lojas parceiras publicarem novos lotes em SP, eles aparecerão aqui.</span>
        </div>
      `;
    } else {
      matchesContainer.innerHTML = topMatches
        .map((lote, idx) => {
          const swatchClass = swatches[idx % swatches.length];
          const swatchStyle = lote.image
            ? `style="background-image:url('${lote.image}');"`
            : "";
          return `
            <a href="../lotes-disponiveis/index.html" class="lote-card">
              <div class="lote-swatch ${lote.image ? "" : swatchClass}" ${swatchStyle}></div>
              <div class="lote-info">
                <span class="lote-id">${escapeHtml(lote.codigo)}</span>
                <h3 class="lote-title">${escapeHtml(lote.titulo)}</h3>
                <div class="lote-meta">
                  <span>${escapeHtml(lote.nomeEmpresa || "Loja Parceira")}</span>
                  <span>·</span>
                  <span>${escapeHtml(lote.peso)}</span>
                </div>
              </div>
            </a>
          `;
        })
        .join("");
    }
  }

  // Pendências reais
  const tasksContainer = $("tasksContainer");
  if (tasksContainer) {
    const tasks = [];

    meusLotes
      .filter(
        (l) =>
          l.status === STATUS_LOTE.RESERVADO ||
          l.status === STATUS_LOTE.EM_TRANSPORTE,
      )
      .forEach((l) => {
        const prazo = dates.getPrazoStatus(l.reservadoEm || l.criadoEm);
        tasks.push({
          text: `Lote "${l.titulo}" (${l.empresaParceira}) aguardando confirmação de recebimento até ${dates.formatShort(prazo.prazoISO)}`,
          href: "../meus-lotes/index.html",
          cta: "Ver lote",
        });
      });

    meusProjetos
      .filter((p) => p.status === STATUS_LOTE.EM_PRODUCAO)
      .forEach((p) => {
        tasks.push({
          text: `Projeto "${p.tituloPeca || p.lote_nome}" em produção — registre o processo criativo e envie à loja`,
          href: "../meus-projetos/index.html",
          cta: "Abrir",
        });
      });

    if (tasks.length === 0) {
      tasks.push({
        text: "Tudo em dia! Explore a vitrine para reservar um novo lote de matéria-prima.",
        href: "../lotes-disponiveis/index.html",
        cta: "Explorar",
      });
    }

    tasksContainer.innerHTML = tasks
      .map(
        (t) => `
        <div class="task-item">
          <span class="task-item__text">${escapeHtml(t.text)}</span>
          <a href="${t.href}" class="btn btn--outline btn--sm btn--compact">${escapeHtml(t.cta)}</a>
        </div>
      `,
      )
      .join("");
  }
});
