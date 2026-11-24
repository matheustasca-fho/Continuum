import { api } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const stats = await api.getDoadorStats();
  const progress = document.querySelector(".donations-progress__label");
  const hint = document.querySelector(".donations-progress__hint");
  const dots = [
    ...document.querySelectorAll(".donations-progress__dots .dot"),
  ];

  const totalDoacoes = stats.doacoes.length;
  const cicloAtual = Array.isArray(stats.doacoesCicloAtual)
    ? stats.doacoesCicloAtual.length
    : totalDoacoes % 5;
  const percent = Math.min(100, Math.floor((cicloAtual / 5) * 100));

  if (progress) {
    progress.textContent = `Progresso do próximo cupom — ${cicloAtual}/5 (${percent}%)`;
  }
  if (hint) {
    hint.textContent =
      cicloAtual === 0 && stats.cupons.length > 0
        ? `Você possui ${stats.cupons.length} cupom(ns) liberado(s)! Faça novas doações com seu CPF para iniciar outro ciclo.`
        : `Faltam ${5 - cicloAtual} doação(ões) com seu CPF para liberar seu próximo cupom de desconto`;
  }
  dots.forEach((dot, index) => dot.classList.toggle("dot--active", index < cicloAtual));

  const table = document.querySelector(".discounts-table");
  if (table) {
    table
      .querySelectorAll(".discounts-table__row")
      .forEach((row) => row.remove());
    stats.cupons.forEach((c) => {
      const row = document.createElement("div");
      row.className = "discounts-table__row";
      const brand = document.createElement("span");
      brand.className = "discount-code";
      brand.textContent = `${c.empresaNome} · ${c.codigo}`;
      const discount = document.createElement("span");
      discount.className = "discount-value";
      discount.textContent = `${c.percentual}%`;
      const validity = document.createElement("span");
      validity.className = "discount-validity text-right";
      validity.textContent = c.status;
      row.append(brand, discount, validity);
      table.appendChild(row);
    });
    if (!stats.cupons.length) {
      const row = document.createElement("div");
      row.className = "discounts-table__row discounts-table__row--empty";
      row.textContent = "Nenhum cupom disponível no momento";
      table.appendChild(row);
    }
  }

  const counters = document.querySelectorAll(".counter");
  const targets = [
    totalDoacoes,
    stats.cupons.length,
    ...[...counters].slice(2).map((x) => Number(x.dataset.target) || 0),
  ];
  const animate = (obj, end, duration = 900) => {
    let start = null;
    const frame = (time) => {
      if (start === null) start = time;
      const p = Math.min((time - start) / duration, 1);
      obj.textContent = String(Math.floor(p * end));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  setTimeout(
    () => counters.forEach((el, i) => animate(el, targets[i] ?? 0)),
    200,
  );
});
