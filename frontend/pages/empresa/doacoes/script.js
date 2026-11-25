import { api, STATUS_CURADORIA } from "../../../js/shared/api.js";
import { onlyDigits, mascaraCPF, validarCPF } from "../../../js/shared/validators.js";

const META_CICLO = 5;
const $ = (id) => document.getElementById(id);
const form = $("registroDoacaoForm");
const cpfEl = $("cpfDoador");
const tipoPecaEl = $("tipoPeca");
const qtdEl = $("quantidadePecas");
const pesoEl = $("pesoEstimado");
const obsEl = $("observacoesDoacao");
const errEl = $("doacaoFormError");
const listBody = $("doacoesListBody");
const searchEl = $("searchDoacoes");
const filterBtns = document.querySelectorAll(".filter-btn");

let filtroAtual = "TODOS";
let busca = "";
let doacoesCache = [];
let politicaPct = null;
let trackerSeq = 0;

const setErro = (msg) => (errEl.textContent = msg || "");

function renderKpis(cupons) {
  $("kpiTotalDoacoes").textContent = String(doacoesCache.length);
  $("kpiAguardando").textContent = String(
    doacoesCache.filter((d) => d.statusCuradoria === STATUS_CURADORIA.AGUARDANDO).length,
  );
  $("kpiComCpf").textContent = String(doacoesCache.filter((d) => d.cpfInformado).length);
  if (cupons !== undefined) $("kpiCuponsAtivos").textContent = String(cupons);
}

function renderDoacoes() {
  const q = busca.trim().toLowerCase();
  const filtradas = doacoesCache.filter(
    (d) =>
      (filtroAtual === "TODOS" || d.statusCuradoria === filtroAtual) &&
      (!q || `${d.cpfInformado || ""} ${d.id} ${d.tipoPeca || d.tipo || ""}`.toLowerCase().includes(q)),
  );

  if (filtradas.length === 0) {
    listBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#666;padding:1.5rem;">Nenhuma doação encontrada para este filtro.</td></tr>`;
    return;
  }

  listBody.innerHTML = filtradas
    .map((d) => {
      const dt = d.criadoEm ? new Date(d.criadoEm).toLocaleDateString("pt-BR") : "—";
      const badgeClass =
        d.statusCuradoria === STATUS_CURADORIA.AGUARDANDO ? "badge-aguardando" : "badge-emlote";
      return `
        <tr>
          <td><strong>${d.id}</strong></td>
          <td>${dt}</td>
          <td>${d.tipoPeca || d.tipo || "—"}</td>
          <td>${d.pecas || 1} pç(s) · ${Number(d.pesoKg || 0).toFixed(1)} kg</td>
          <td>${d.cpfInformado ? d.cpfInformado : "<span style='color:#999'>Sem CPF</span>"}</td>
          <td><span class="badge-status ${badgeClass}">${d.statusCuradoria}</span></td>
        </tr>
      `;
    })
    .join("");
}

async function carregarDoacoes() {
  try {
    doacoesCache = (await api.listarDoacoesEmpresa()) || [];
  } catch {
    doacoesCache = [];
  }
  renderKpis();
  renderDoacoes();
}

async function carregarContexto() {
  try {
    const [empresa, dash] = await Promise.all([api.getEmpresa(), api.getEmpresaDashboardStats()]);
    politicaPct = empresa?.politicaCupom?.percentual ?? null;
    if (politicaPct !== null) {
      $("storeCouponPolicyBadge").textContent = `${META_CICLO} doações = Cupom ${politicaPct}% OFF`;
    }
    renderKpis(dash?.cupons ?? 0);
  } catch {
    /* KPI de cupons e badge ficam como estão se a API falhar */
  }
}

/* Rastreador do ciclo de 5 doações por CPF nesta loja */
const TRACKER_HINT_PADRAO = $("cpfTrackerHint").textContent;
function resetTracker() {
  const box = $("cpfTrackerBox");
  box.classList.remove("is-linked", "is-invalid");
  $("cpfTrackerDonor").textContent = "Vínculo de Fidelidade Circular";
  $("cpfTrackerCount").textContent = `0 / ${META_CICLO} doações`;
  document.querySelectorAll("#cpfTrackerDots .cpf-dot").forEach((d) => d.classList.remove("is-filled", "is-next"));
  $("cpfTrackerHint").textContent = TRACKER_HINT_PADRAO;
}

async function atualizarTracker() {
  const cpf = onlyDigits(cpfEl.value);
  const seq = ++trackerSeq;
  resetTracker();
  if (cpf.length < 11) return;
  const box = $("cpfTrackerBox");
  if (!validarCPF(cpf)) {
    box.classList.add("is-invalid");
    $("cpfTrackerHint").textContent = "CPF inválido. Confira os números digitados.";
    return;
  }
  let doador = null;
  try {
    doador = await api.buscarDoador(cpf);
  } catch {
    doador = null;
  }
  if (seq !== trackerSeq) return; // o usuário já digitou outro CPF
  const contando = doacoesCache.filter((d) => d.cpfInformado === cpf && d.statusContagem === "CONTANDO").length;
  const n = Math.min(contando, META_CICLO);
  box.classList.add("is-linked");
  $("cpfTrackerDonor").textContent = doador?.nome || "Doador ainda sem conta";
  $("cpfTrackerCount").textContent = `${n} / ${META_CICLO} doações`;
  document.querySelectorAll("#cpfTrackerDots .cpf-dot").forEach((dot, i) => {
    dot.classList.toggle("is-filled", i < n);
    dot.classList.toggle("is-next", i === n);
  });
  const faltam = META_CICLO - n;
  const cupom = politicaPct !== null ? ` de ${politicaPct}%` : "";
  $("cpfTrackerHint").textContent = `${
    doador ? "" : "Sem conta ainda: as doações ficam vinculadas e contam quando o doador se cadastrar. "
  }${faltam === META_CICLO ? `Faltam ${META_CICLO} doações nesta loja para o cupom${cupom}.` : `Falta${faltam === 1 ? "" : "m"} ${faltam} doaç${faltam === 1 ? "ão" : "ões"} nesta loja para o cupom${cupom}.`}`;
}

function mostrarCupomGerado(res) {
  const novo = (res?.cuponsGerados || [])[0];
  if (!novo) return;
  $("couponCelebrationCode").textContent = novo.codigo || "";
  $("couponCelebration").classList.add("is-visible");
}

cpfEl.addEventListener("input", () => {
  cpfEl.value = mascaraCPF(cpfEl.value);
  atualizarTracker();
});
searchEl?.addEventListener("input", () => {
  busca = searchEl.value;
  renderDoacoes();
});
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
  setErro("");
  const cpf = onlyDigits(cpfEl.value);
  const tipoPeca = tipoPecaEl.value.trim();
  const peso = Number(String(pesoEl.value).replace(",", "."));
  const pecas = Number(qtdEl.value);

  if (!tipoPeca) return setErro("Informe o tipo de peça / material.");
  if (!Number.isInteger(pecas) || pecas < 1) return setErro("Informe ao menos 1 peça.");
  if (!(peso > 0)) return setErro("Informe um peso maior que zero.");

  try {
    const res = await api.registrarDoacaoEmpresa({
      cpfInformado: cpf,
      tipoPeca,
      pecas,
      pesoKg: peso,
      observacoes: obsEl.value.trim(),
    });
    form.reset();
    qtdEl.value = "1";
    pesoEl.value = "1.0";
    resetTracker();
    await carregarDoacoes();
    mostrarCupomGerado(res);
    carregarContexto();
  } catch (err) {
    setErro(err.message);
  }
});

/* Resgate de cupom */
const cupomResultado = $("cupomResultado");
const btnUsarCupom = $("btnUsarCupom");
const mostrarCupom = (msg, tipo) => {
  cupomResultado.textContent = msg;
  cupomResultado.className = `cupom-resgate__result ${tipo ? `is-${tipo}` : ""}`;
};

$("btnValidarCupom").addEventListener("click", async () => {
  const codigo = $("cupomCodigo").value.trim().toUpperCase();
  btnUsarCupom.disabled = true;
  if (!codigo) return mostrarCupom("Informe o código do cupom.", "error");
  try {
    const c = await api.validarCupom(codigo);
    const validade = c.validade ? new Date(`${c.validade}T00:00:00`).toLocaleDateString("pt-BR") : "sem validade";
    const ativo = c.status === "Ativo";
    mostrarCupom(`${c.codigo} · ${c.percentual}% OFF · validade ${validade} · ${c.status}`, ativo ? "ok" : "error");
    btnUsarCupom.disabled = !ativo;
  } catch (err) {
    mostrarCupom(err.message, "error");
  }
});

btnUsarCupom.addEventListener("click", async () => {
  const codigo = $("cupomCodigo").value.trim().toUpperCase();
  try {
    await api.utilizarCupom(codigo);
    mostrarCupom(`Cupom ${codigo} marcado como utilizado.`, "ok");
  } catch (err) {
    mostrarCupom(err.message, "error");
  }
  btnUsarCupom.disabled = true;
});

carregarDoacoes();
carregarContexto();
