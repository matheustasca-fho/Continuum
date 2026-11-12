import { api, STATUS_LOTE } from "../../../js/shared/api.js";
document.addEventListener("DOMContentLoaded", async () => {
  const data = await api.getEmpresaDashboardStats(),
    counters = [...document.querySelectorAll(".counter")],
    targets = [data.doacoes.length, data.projetos.length, data.kg, data.pecas];
  counters.forEach((counter, index) => {
    counter.dataset.target = String(targets[index] ?? 0);
    counter.textContent = String(targets[index] ?? 0);
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
});
