import { api, STATUS_LOTE } from "../../../js/shared/api.js";

const checkboxes = document.querySelectorAll(".chk-inspecao");
const btnAprovar = document.getElementById("btn-aprovar");
const helperAprovar = document.getElementById("helper-aprovar");

let projetoAtual = null;

function verificarChecklist() {
  const todosMarcados = Array.from(checkboxes).every((chk) => chk.checked);
  if (todosMarcados) {
    btnAprovar.disabled = false;
    helperAprovar.style.display = "none";
  } else {
    btnAprovar.disabled = true;
    helperAprovar.style.display = "block";
  }
}

checkboxes.forEach((chk) => chk.addEventListener("change", verificarChecklist));

const modalFinalizar = document.getElementById("modal-finalizar");
const modalAjuste = document.getElementById("modal-ajuste");

btnAprovar.onclick = () => modalFinalizar.showModal();
document.getElementById("btn-cancela-fim").onclick = () =>
  modalFinalizar.close();

document.getElementById("btn-confirma-fim").onclick = async () => {
  try {
    const checklist = Array.from(checkboxes).map((chk) => chk.checked);
    if (projetoAtual?.id) {
      await api.alterarStatusProjeto(projetoAtual.id, STATUS_LOTE.FINALIZADO, {
        checklist,
      });
    }
    modalFinalizar.close();
    const targetId = encodeURIComponent(projetoAtual?.id || "1");
    window.location.href = `../projeto-tag/index.html?id=${targetId}`;
  } catch (err) {
    alert(err.message);
  }
};

const btnAjuste = document.getElementById("btn-ajuste");
if (btnAjuste && modalAjuste) {
  btnAjuste.onclick = () => modalAjuste.showModal();
}
const btnCancelaAjuste = document.getElementById("btn-cancela-ajuste");
if (btnCancelaAjuste && modalAjuste) {
  btnCancelaAjuste.onclick = () => modalAjuste.close();
}
const btnConfirmaAjuste = document.getElementById("btn-confirma-ajuste");
if (btnConfirmaAjuste && modalAjuste) {
  btnConfirmaAjuste.onclick = async () => {
    const motivo = document.getElementById("motivo-ajuste")?.value.trim() || "";
    if (!motivo) {
      alert("Informe o motivo para solicitar ajuste na peça.");
      return;
    }
    try {
      if (projetoAtual?.id) {
        await api.alterarStatusProjeto(projetoAtual.id, "EM AJUSTE", {
          motivo,
        });
      }
      modalAjuste.close();
      window.location.href = `../projeto-detalhe/index.html?id=${encodeURIComponent(projetoAtual?.id || "1")}`;
    } catch (err) {
      alert(err.message);
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id") || "1";
  try {
    projetoAtual =
      (await api.getProjeto(id)) || (await api.listarProjetosEmpresa())?.[0];
    if (!projetoAtual) return;

    const bc = document.querySelector(".breadcrumb");
    if (bc) {
      bc.textContent = `Projetos › PRJ-${String(projetoAtual.id).padStart(2, "0")} › Revisão de Peça`;
    }
    const backBtn = document.querySelector(
      'a[href*="../projeto-detalhe/index.html"]',
    );
    if (backBtn) {
      backBtn.href = `../projeto-detalhe/index.html?id=${encodeURIComponent(projetoAtual.id)}`;
    }

    const boxes = document.querySelectorAll(".content-box");
    if (boxes[0]) {
      boxes[0].innerHTML = `
        <strong>Material Origem</strong>
        ${projetoAtual.lote?.descricao || "Material têxtil"} (${projetoAtual.codigoLote || `Lote #${projetoAtual.idLote}`})

        <strong>Perfil da Loja</strong>
        ${projetoAtual.lote?.perfil_loja || "Marca parceira focada em moda circular."}

        <strong>Expectativas e Diretrizes</strong>
        ${projetoAtual.lote?.briefing?.ideiaMarca || projetoAtual.lote?.descricao || ""}
      `;
    }
    if (boxes[1]) {
      boxes[1].innerHTML = `
        <strong>Processo Criativo do Designer (${projetoAtual.designer_nome || "Designer"})</strong>
        "${projetoAtual.processoCriativo || projetoAtual.ds_descricao || ""}"
      `;
    }
  } catch (err) {
    console.error("Erro ao carregar revisão do projeto:", err);
  }
});
