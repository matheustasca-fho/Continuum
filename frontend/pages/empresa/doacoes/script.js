import { api, STATUS_CURADORIA } from "../../../js/shared/api.js";
import { store } from "../../../js/shared/store.js";

const form = document.getElementById("registroDoacaoForm");
const cpfEl = document.getElementById("cpfDoador");
const tipoPecaEl = document.getElementById("tipoPeca");
const qtdEl = document.getElementById("quantidadePecas");
const pesoEl = document.getElementById("pesoEstimado");
const obsEl = document.getElementById("observacoesDoacao");
const listBody = document.getElementById("doacoesListBody");
const filterBtns = document.querySelectorAll(".filter-btn");

let filtroAtual = "TODOS";

function renderDoacoes() {
  const todas = (store.get("doacoes") || []).slice().reverse();
  const filtradas =
    filtroAtual === "TODOS"
      ? todas
      : todas.filter((d) => d.statusCuradoria === filtroAtual);

  if (filtradas.length === 0) {
    listBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#666;padding:1.5rem;">Nenhuma doação encontrada para este filtro.</td></tr>`;
    return;
  }

  listBody.innerHTML = filtradas
    .map((d) => {
      const dt = d.criadoEm ? new Date(d.criadoEm).toLocaleDateString("pt-BR") : "—";
      const badgeClass =
        d.statusCuradoria === STATUS_CURADORIA.AGUARDANDO
          ? "badge-aguardando"
          : "badge-emlote";
      return `
        <tr>
          <td><strong>${d.id}</strong></td>
          <td>${dt}</td>
          <td>${d.tipoPeca || d.tipo || "Peças diversas"}</td>
          <td>${d.pecas || 1} pç(s) · ${Number(d.pesoKg || 0).toFixed(1)} kg</td>
          <td>${d.cpfInformado ? d.cpfInformado : "<span style='color:#999'>Sem CPF</span>"}</td>
          <td><span class="badge-status ${badgeClass}">${d.statusCuradoria}</span></td>
        </tr>
      `;
    })
    .join("");
}

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filtroAtual = btn.dataset.filter;
    renderDoacoes();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const emp = await api.getEmpresa();
  const cpfLimpo = cpfEl.value.replace(/\D/g, "");
  const todas = store.get("doacoes") || [];
  const nextNum = todas.length + 1;
  const novaDoacao = {
    id: `DOA-${String(nextNum).padStart(2, "0")}`,
    empresaId: emp?.id || "EMP-01",
    cpfInformado: cpfLimpo || "",
    doadorId: cpfLimpo ? "DOR-01" : null,
    tipoPeca: tipoPecaEl.value.trim(),
    pecas: Math.max(1, Number(qtdEl.value) || 1),
    pesoKg: Math.max(0.1, Number(pesoEl.value) || 1),
    observacoes: obsEl.value.trim(),
    statusCuradoria: STATUS_CURADORIA.AGUARDANDO,
    statusContagem: cpfLimpo ? "CONTANDO" : "SEM_CUPOM",
    criadoEm: new Date().toISOString(),
  };

  todas.push(novaDoacao);
  store.set("doacoes", todas);
  form.reset();
  qtdEl.value = "1";
  pesoEl.value = "1.0";
  renderDoacoes();
});

renderDoacoes();
