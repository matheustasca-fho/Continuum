import { api, STATUS_LOTE } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const data = await api.getEmpresaDashboardStats(),
    counters = [...document.querySelectorAll(".counter")],
    imp = data.impactoAmbiental || {},
    targets = [
      data.doacoes.length,
      data.projetos.length,
      data.kg,
      data.pecas,
      imp.toneladasRedirecionadas ?? Math.round((data.kg || 0) / 1000),
      imp.aguaEconomizadaLitros ?? Math.round((data.kg || 0) * 80),
      imp.co2EvitadoKg ?? Math.round((data.kg || 0) * 2.5),
      imp.marcasFomentadas ?? Math.max(1, data.designers || 1),
    ];

  counters.forEach((counter, index) => {
    if (targets[index] !== undefined) {
      counter.dataset.target = String(targets[index] ?? 0);
      counter.textContent = String(targets[index] ?? 0);
    }
  });

  const title = document.querySelector(".page-header__title");
  if (title)
    title.textContent = `OLÁ, ${data.empresa?.nomeFantasia || "PONTO DE COLETA"}`;

  const list = document.querySelector(".status-list");
  if (list) {
    list.replaceChildren();
    Object.values(STATUS_LOTE).forEach((status) => {
      const count = data.lotes.filter((l) => l.status === status).length,
        row = document.createElement("div");
      row.className = "status-item";
      row.innerHTML =
        '<div class="status-item__content"><span class="status-item__title"></span><span class="status-item__count"></span></div>';
      row.querySelector(".status-item__title").textContent = status;
      row.querySelector(".status-item__count").textContent = `${count} lotes`;
      list.appendChild(row);
    });
  }

  // Botão "Baixar Relatório Mensal" / Certificado de Sustentabilidade ESG (BE-22.2 e BE-22.3)
  const btnRelatorio = document.querySelector(".impact-banner .btn");
  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", async () => {
      try {
        const cert = await api.obterCertificadoEmpresa();
        if (cert?.svg) {
          const blob = new Blob([cert.svg], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } else {
          window.print();
        }
      } catch (err) {
        alert(err.message || "Erro ao gerar certificado de sustentabilidade.");
      }
    });
  }
});
