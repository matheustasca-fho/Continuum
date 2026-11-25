import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";

// Thread trail cursor
const trail = document.getElementById("threadTrail");
const dots = [];
const numDots = 8;
if (trail) {
  for (let i = 0; i < numDots; i++) {
    const d = document.createElement("div");
    d.className = "thread-dot";
    trail.appendChild(d);
    dots.push({ x: 0, y: 0, node: d });
  }
}

let mouseX = 0,
  mouseY = 0;
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
function animateTrail() {
  let x = mouseX,
    y = mouseY;
  dots.forEach((dot, index) => {
    dot.x += (x - dot.x) * 0.4;
    dot.y += (y - dot.y) * 0.4;
    dot.node.style.transform = `translate(${dot.x}px, ${dot.y}px) scale(${1 - index * 0.08})`;
    x = dot.x;
    y = dot.y;
  });
  requestAnimationFrame(animateTrail);
}
if (trail) animateTrail();

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const designer = await api.getDesigner();
    const [dashboard, vitrine, projetos, meusLotes] = await Promise.all([
      api.getDashboardStats(designer?.id || ""),
      api.listarLotesVitrineSP(),
      api.getMeusProjetos(designer?.id || ""),
      api.listarMeusLotesDesigner(designer?.id || ""),
    ]);

    const titleEl = document.querySelector(".page-header__title");
    if (titleEl && designer?.nome) {
      titleEl.textContent = `OLÁ, ${designer.nome.toUpperCase()}`;
    }

    const subtitleEl = document.querySelector(".page-header__subtitle");
    if (subtitleEl) {
      subtitleEl.textContent = `Bem-vindo(a) ao seu ateliê circular. ${dates.today()}.`;
    }

    // Métricas de impacto ambiental baseadas nos projetos/lotes da API
    const kgSalvos = Math.round(
      (projetos || []).reduce((acc, p) => acc + (Number(p.pesoKg) || 0), 0),
    );
    const pecasRessignificadas = (projetos || []).reduce(
      (acc, p) => acc + (Number(p.quantidadePecas) || 0),
      0,
    );
    const totalProjetos = (projetos || []).length;
    const projetosNoPrazo = (projetos || []).filter((p) => !p.atrasado).length;
    const confiabilidadeSla = Math.round(
      (projetosNoPrazo / Math.max(1, totalProjetos)) * 100,
    );

    const impactNumbers = document.querySelectorAll(".impact-metrics .impact-number");
    if (impactNumbers[0]) impactNumbers[0].textContent = String(kgSalvos);
    if (impactNumbers[1]) impactNumbers[1].textContent = String(pecasRessignificadas);
    if (impactNumbers[2]) impactNumbers[2].textContent = String(confiabilidadeSla);

    // Contadores operacionais
    const dashNumbers = document.querySelectorAll(".dash-cards .dash-card__number");
    const stats = dashboard?.stats || {
      reservados: 0,
      em_andamento: 0,
      finalizados: 0,
    };
    if (dashNumbers[0])
      dashNumbers[0].textContent = String(stats.reservados ?? 0).padStart(2, "0");
    if (dashNumbers[1])
      dashNumbers[1].textContent = String(stats.em_andamento ?? 0).padStart(2, "0");
    if (dashNumbers[2])
      dashNumbers[2].textContent = String(stats.finalizados ?? 0).padStart(2, "0");

    // Matches perfeitos (lotes disponíveis da vitrine)
    const loteCardsContainer = document.querySelector(".lote-cards");
    if (loteCardsContainer) {
      const swatches = ["swatch-denim", "swatch-cotton", "swatch-leather"];
      const disponiveis = (vitrine || []).slice(0, 3);
      if (disponiveis.length === 0) {
        loteCardsContainer.innerHTML =
          '<p style="color:var(--color-muted-text);">Nenhum lote disponível no momento.</p>';
      } else {
        loteCardsContainer.innerHTML = disponiveis
          .map(
            (l, idx) => `
          <a href="../lotes-disponiveis/index.html" class="lote-card">
            <div class="lote-swatch ${swatches[idx % swatches.length]}"></div>
            <div class="lote-info">
              <span class="lote-id">${l.codigo || `LOTE #${l.id}`}</span>
              <h4 class="lote-title">${l.titulo || l.descricao}</h4>
              <div class="lote-meta">
                <span>${l.nomeEmpresa || "—"}${l.distancia ? ` (${l.distancia})` : ""}</span>
                <span>${l.peso || `${l.pesoKg} kg`}</span>
              </div>
            </div>
          </a>
        `,
          )
          .join("");
      }
    }

    // Pendências reais (lotes aguardando confirmação de recebimento e projetos em andamento)
    const taskList = document.querySelector(".task-list");
    if (taskList) {
      const pendencias = [];
      (meusLotes || [])
        .filter((l) => l.status === STATUS_LOTE.RESERVADO)
        .forEach((l) => {
          pendencias.push({
            texto: `Lote "${l.titulo}" (${l.codigo}) aguardando confirmação de recebimento`,
            href: "../meus-lotes/index.html",
          });
        });
      (projetos || [])
        .filter((p) => p.status === STATUS_LOTE.EM_PRODUCAO)
        .forEach((p) => {
          pendencias.push({
            texto: `Projeto "${p.tituloPeca || p.lote_nome}" em produção`,
            href: `../status-projetos/index.html?project=${encodeURIComponent(p.id)}`,
          });
        });

      if (pendencias.length === 0) {
        taskList.innerHTML =
          '<div class="task-item"><span class="task-item__text">Nenhuma pendência no momento.</span></div>';
      } else {
        taskList.innerHTML = pendencias
          .map(
            (item) => `
          <div class="task-item">
            <span class="task-item__text">${item.texto}</span>
            <a href="${item.href}" class="btn btn--outline btn--sm btn--compact">Ver</a>
          </div>
        `,
          )
          .join("");
      }
    }

    const quickBtn = document.querySelector(".btn--roomy");
    if (quickBtn) {
      quickBtn.addEventListener("click", () => {
        location.href = "../lotes-disponiveis/index.html";
      });
    }
  } catch (err) {
    console.error("Erro ao carregar painel do designer:", err);
  }
});
