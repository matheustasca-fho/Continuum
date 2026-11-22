import { api } from "../../../js/shared/api.js";

const form = document.getElementById("perfilEmpresaForm");
const feedback = document.getElementById("perfilFeedback");
const nomeFantasiaEl = document.getElementById("nomeFantasia");
const perfilLojaEl = document.getElementById("perfilLoja");
const aceitaRetiradaEl = document.getElementById("aceitaRetirada");
const horarioRetiradaEl = document.getElementById("horarioRetirada");
const freteEl = document.getElementById("frete");
const cartilhaConteudoEl = document.getElementById("cartilhaConteudo");
const cartilhaVersaoEl = document.getElementById("cartilhaVersao");
const cartilhaAtualizadoEmEl = document.getElementById("cartilhaAtualizadoEm");

let empresaAtual = null;

function showFeedback(message, type = "success") {
  feedback.textContent = message;
  feedback.className = `alert-banner ${type}`;
  setTimeout(() => {
    feedback.className = "alert-banner";
  }, 4500);
}

function toggleHorarioState() {
  horarioRetiradaEl.disabled = !aceitaRetiradaEl.checked;
  if (!aceitaRetiradaEl.checked && !horarioRetiradaEl.value) {
    horarioRetiradaEl.placeholder = "Retirada presencial desativada";
  } else {
    horarioRetiradaEl.placeholder = "Ex: Seg a Sex das 10h às 18h";
  }
}

async function carregarPerfil() {
  try {
    empresaAtual = await api.getEmpresa();
    if (!empresaAtual) {
      showFeedback("Nenhuma empresa ativa encontrada na sessão.", "error");
      return;
    }

    nomeFantasiaEl.value = empresaAtual.nomeFantasia || "";
    perfilLojaEl.value = empresaAtual.perfilLoja || "";
    aceitaRetiradaEl.checked = Boolean(empresaAtual.aceitaRetirada);
    horarioRetiradaEl.value = empresaAtual.horarioRetirada || "";
    freteEl.value = empresaAtual.frete || "Frete por conta do designer";
    cartilhaConteudoEl.value = empresaAtual.cartilhaPadrao?.conteudo || "";
    cartilhaVersaoEl.textContent = empresaAtual.cartilhaPadrao?.versao || "v1.0";

    if (empresaAtual.cartilhaPadrao?.atualizadoEm) {
      const dt = new Date(empresaAtual.cartilhaPadrao.atualizadoEm);
      cartilhaAtualizadoEmEl.textContent = `Última atualização: ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } else {
      cartilhaAtualizadoEmEl.textContent = "Versão inicial da cartilha.";
    }

    toggleHorarioState();
  } catch (err) {
    showFeedback(err.message || "Erro ao carregar perfil da empresa.", "error");
  }
}

aceitaRetiradaEl.addEventListener("change", toggleHorarioState);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!empresaAtual) return;

  try {
    api.verificarPermissaoEmpresa("EDITAR_PERFIL_POLITICA_CARTILHA");
    const dados = {
      nomeFantasia: nomeFantasiaEl.value.trim(),
      perfilLoja: perfilLojaEl.value.trim(),
      aceitaRetirada: aceitaRetiradaEl.checked,
      horarioRetirada: horarioRetiradaEl.value.trim(),
      frete: freteEl.value.trim(),
      cartilhaPadrao: {
        ...(empresaAtual.cartilhaPadrao || {}),
        conteudo: cartilhaConteudoEl.value.trim(),
      },
    };

    const atualizada = await api.atualizarPerfilEmpresa(empresaAtual.id, dados);
    empresaAtual = atualizada;
    cartilhaVersaoEl.textContent = atualizada.cartilhaPadrao?.versao || "v1.0";
    if (atualizada.cartilhaPadrao?.atualizadoEm) {
      const dt = new Date(atualizada.cartilhaPadrao.atualizadoEm);
      cartilhaAtualizadoEmEl.textContent = `Última atualização: ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    showFeedback("Perfil da empresa e Cartilha Padrão salvos com sucesso!");
  } catch (err) {
    showFeedback(err.message || "Erro ao salvar perfil da empresa.", "error");
  }
});

carregarPerfil();
