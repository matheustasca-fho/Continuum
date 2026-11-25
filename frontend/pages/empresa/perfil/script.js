import { api } from "../../../js/shared/api.js";
import {
  onlyDigits,
  mascaraCNPJ,
  mascaraCEP,
} from "../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../js/shared/cep.js";

const $ = (id) => document.getElementById(id);

const form = $("perfilEmpresaForm");
const feedback = $("perfilFeedback");
const toast = $("perfilToast");
const toastMsg = $("perfilToastMsg");

const nomeFantasiaEl = $("nomeFantasia");
const segmentoEl = $("segmento");
const razaoSocialEl = $("razaoSocial");
const cnpjReadonlyEl = $("cnpjReadonly");
const perfilLojaEl = $("perfilLoja");
const perfilLojaCountEl = $("perfilLojaCount");

const cepEl = $("cep");
const cidadeEl = $("cidade");
const ufEl = $("uf");
const logradouroEl = $("logradouro");
const numeroEl = $("numero");
const bairroEl = $("bairro");
const complementoEl = $("complemento");

const aceitaRetiradaEl = $("aceitaRetirada");
const horarioRetiradaEl = $("horarioRetirada");
const freteEl = $("frete");
const cupomPercentualEl = $("cupomPercentual");
const cupomValidadeEl = $("cupomValidade");

const cartilhaConteudoEl = $("cartilhaConteudo");
const cartilhaVersaoEl = $("cartilhaVersao");
const cartilhaAtualizadoEmEl = $("cartilhaAtualizadoEm");
const cartilhaCharCountEl = $("cartilhaCharCount");

let empresaAtual = null;
let toastTimer = null;

function showFeedback(message, type = "success") {
  if (feedback) {
    feedback.textContent = message;
    feedback.className = `alert-banner ${type}`;
    setTimeout(() => {
      feedback.className = "alert-banner";
    }, 4500);
  }
  if (type === "success" && toast && toastMsg) {
    toastMsg.textContent = message;
    toast.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("toast--visible");
    }, 3200);
  }
}

function getInitials(name) {
  const parts = String(name || "Empresa")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateCounters() {
  if (perfilLojaCountEl && perfilLojaEl) {
    perfilLojaCountEl.textContent = `${perfilLojaEl.value.length} / 500`;
  }
  if (cartilhaCharCountEl && cartilhaConteudoEl) {
    cartilhaCharCountEl.textContent = `${cartilhaConteudoEl.value.length} caracteres`;
  }
}

function updateHeaderSummary(emp) {
  const fantasy = emp.nomeFantasia || emp.razaoSocial || "Loja Parceira";
  if ($("empresaInitials")) $("empresaInitials").textContent = getInitials(fantasy);
  if ($("headerFantasyName")) $("headerFantasyName").textContent = fantasy;
  if ($("displayCnpj")) {
    $("displayCnpj").textContent = emp.cnpj
      ? `CNPJ ${mascaraCNPJ(onlyDigits(emp.cnpj))}`
      : "CNPJ não informado";
  }
  if ($("displayLocation")) {
    const loc = [emp.bairro, emp.cidade || "São Paulo", emp.uf || "SP"]
      .filter(Boolean)
      .join(" · ");
    $("displayLocation").textContent = loc;
  }
  if ($("displayPlanBadge")) {
    const plano = emp.assinatura?.plano || "Parceiro Circular";
    const status = emp.assinatura?.status || "ATIVA";
    $("displayPlanBadge").innerHTML = `<span class="plan-pill__dot"></span> ${plano} · ${status}`;
  }
}

function toggleHorarioState() {
  horarioRetiradaEl.disabled = !aceitaRetiradaEl.checked;
  if (!aceitaRetiradaEl.checked && !horarioRetiradaEl.value) {
    horarioRetiradaEl.placeholder = "Retirada presencial desativada";
  } else {
    horarioRetiradaEl.placeholder = "Ex.: Seg a Sex das 10h às 18h";
  }
}

function populateForm(emp) {
  nomeFantasiaEl.value = emp.nomeFantasia || "";
  if (segmentoEl) segmentoEl.value = emp.segmento || "";
  if (razaoSocialEl) razaoSocialEl.value = emp.razaoSocial || "";
  if (cnpjReadonlyEl) {
    cnpjReadonlyEl.value = emp.cnpj ? mascaraCNPJ(onlyDigits(emp.cnpj)) : "";
  }
  perfilLojaEl.value = emp.perfilLoja || "";

  if (cepEl) cepEl.value = emp.cep ? mascaraCEP(emp.cep) : "";
  if (cidadeEl) cidadeEl.value = emp.cidade || "";
  if (ufEl) ufEl.value = emp.uf || "SP";
  if (logradouroEl) logradouroEl.value = emp.logradouro || "";
  if (numeroEl) numeroEl.value = emp.numero || "";
  if (bairroEl) bairroEl.value = emp.bairro || "";
  if (complementoEl) complementoEl.value = emp.complemento || "";

  aceitaRetiradaEl.checked = Boolean(emp.aceitaRetirada);
  horarioRetiradaEl.value = emp.horarioRetirada || "";
  freteEl.value = emp.frete || "Envio custeado na rede CONTINUUM em SP";

  if (cupomPercentualEl) {
    cupomPercentualEl.value = emp.politicaCupom?.percentual ?? 15;
  }
  if (cupomValidadeEl) {
    cupomValidadeEl.value = emp.politicaCupom?.validadeDias ?? 30;
  }

  cartilhaConteudoEl.value = emp.cartilhaPadrao?.conteudo || "";
  cartilhaVersaoEl.textContent = emp.cartilhaPadrao?.versao || "v1.0";

  if (emp.cartilhaPadrao?.atualizadoEm) {
    const dt = new Date(emp.cartilhaPadrao.atualizadoEm);
    cartilhaAtualizadoEmEl.textContent = `Última atualização: ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    cartilhaAtualizadoEmEl.textContent = "Versão inicial da cartilha.";
  }

  toggleHorarioState();
  updateCounters();
  updateHeaderSummary(emp);
}

async function carregarPerfil() {
  try {
    empresaAtual = await api.getEmpresa();
    if (!empresaAtual) {
      showFeedback("Nenhuma empresa ativa encontrada na sessão.", "error");
      return;
    }
    populateForm(empresaAtual);
  } catch (err) {
    showFeedback(err.message || "Erro ao carregar perfil da empresa.", "error");
  }
}

aceitaRetiradaEl.addEventListener("change", toggleHorarioState);
perfilLojaEl?.addEventListener("input", updateCounters);
cartilhaConteudoEl?.addEventListener("input", updateCounters);

if (cepEl) {
  cepEl.addEventListener("input", () => {
    cepEl.value = mascaraCEP(cepEl.value);
  });
  conectarBuscaCep(cepEl, {
    uf: ufEl,
    cidade: cidadeEl,
    bairro: bairroEl,
    logradouro: logradouroEl,
  });
}

document.querySelectorAll("[data-insert]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const snippet = btn.dataset.insert;
    if (!cartilhaConteudoEl || !snippet) return;
    if (cartilhaConteudoEl.value.includes(snippet)) return;
    cartilhaConteudoEl.value = cartilhaConteudoEl.value.trim()
      ? `${cartilhaConteudoEl.value.trim()}\n${snippet}`
      : snippet;
    updateCounters();
    cartilhaConteudoEl.focus();
  });
});

$("btnResetPerfil")?.addEventListener("click", () => {
  if (empresaAtual) {
    populateForm(empresaAtual);
    showFeedback("Alterações descartadas.", "success");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!empresaAtual) return;

  if (!nomeFantasiaEl.value.trim()) {
    showFeedback("Informe o Nome Fantasia da loja.", "error");
    nomeFantasiaEl.focus();
    return;
  }

  try {
    api.verificarPermissaoEmpresa("EDITAR_PERFIL_POLITICA_CARTILHA");
    const dados = {
      nomeFantasia: nomeFantasiaEl.value.trim(),
      segmento: segmentoEl?.value.trim() || empresaAtual.segmento || "",
      razaoSocial: razaoSocialEl?.value.trim() || empresaAtual.razaoSocial || "",
      perfilLoja: perfilLojaEl.value.trim(),
      cep: onlyDigits(cepEl?.value || empresaAtual.cep || ""),
      cidade: cidadeEl?.value.trim() || empresaAtual.cidade || "São Paulo",
      uf: (ufEl?.value.trim() || empresaAtual.uf || "SP").toUpperCase(),
      logradouro: logradouroEl?.value.trim() || "",
      numero: numeroEl?.value.trim() || "",
      bairro: bairroEl?.value.trim() || "",
      complemento: complementoEl?.value.trim() || "",
      aceitaRetirada: aceitaRetiradaEl.checked,
      horarioRetirada: horarioRetiradaEl.value.trim(),
      frete: freteEl.value.trim(),
      politicaCupom: {
        percentual: Math.max(5, Number(cupomPercentualEl?.value) || 15),
        validadeDias: Math.max(7, Number(cupomValidadeEl?.value) || 30),
      },
      cartilhaPadrao: {
        ...(empresaAtual.cartilhaPadrao || {}),
        conteudo: cartilhaConteudoEl.value.trim(),
      },
    };

    const atualizada = await api.atualizarPerfilEmpresa(empresaAtual.id, dados);
    empresaAtual = atualizada;
    populateForm(atualizada);
    showFeedback("Perfil da empresa e Cartilha Padrão salvos com sucesso!");
  } catch (err) {
    showFeedback(err.message || "Erro ao salvar perfil da empresa.", "error");
  }
});

carregarPerfil();
