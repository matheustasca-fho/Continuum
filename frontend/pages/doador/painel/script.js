import { api } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const stats = await api.getDoadorStats();
  const titleEl = document.querySelector(".page-header__title");
  if (titleEl && stats.doador?.nome) {
    titleEl.textContent = `OLÁ, ${stats.doador.nome.toUpperCase()}`;
  }

  const progress = document.querySelector(".donations-progress__label");
  const hint = document.querySelector(".donations-progress__hint");
  const dots = [...document.querySelectorAll(".donations-progress__dots .dot")];
  const count = stats.doacoes.length;
  const cicloAtual = count % 5;
  const progressoCiclo = count > 0 && cicloAtual === 0 ? 5 : cicloAtual;
  const percent = Math.min(100, Math.floor((progressoCiclo / 5) * 100));

  if (progress) progress.textContent = `Doações — ${percent}%`;
  if (hint) {
    hint.textContent =
      progressoCiclo >= 5
        ? "Você já atingiu o próximo cupom."
        : `Faltam ${5 - progressoCiclo} doações para liberar seu próximo cupom de desconto`;
  }
  dots.forEach((dot, index) =>
    dot.classList.toggle("dot--active", index < progressoCiclo),
  );

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
      brand.textContent = `${c.empresaNome} ${c.codigo}`;
      const discount = document.createElement("span");
      discount.className = "discount-value";
      discount.textContent = `${c.percentual}% (${c.status})`;
      const validity = document.createElement("span");
      validity.className = "discount-validity text-right";
      validity.textContent = c.validade || c.status;
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

  const totalKg = Math.round(
    stats.doacoes.reduce((acc, d) => acc + (Number(d.pesoKg) || 0), 0),
  );
  const designersApoiados = new Set(
    stats.doacoes.map((d) => d.empresaId).filter(Boolean),
  ).size;
  const aguaPoupada = totalKg * 80;

  const counters = document.querySelectorAll(".counter");
  const targets = [count, totalKg, totalKg, designersApoiados, aguaPoupada];

  const animate = (obj, end, duration = 1200) => {
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
    250,
  );
});
