// Lógica do Checklist para habilitar o botão Finalizar
const checkboxes = document.querySelectorAll('.chk-inspecao');
const btnAprovar = document.getElementById('btn-aprovar');
const helperAprovar = document.getElementById('helper-aprovar');

function verificarChecklist() {
  const todosMarcados = Array.from(checkboxes).every(chk => chk.checked);
  if (todosMarcados) {
    btnAprovar.disabled = false;
    helperAprovar.style.display = 'none';
  } else {
    btnAprovar.disabled = true;
    helperAprovar.style.display = 'block';
  }
}

checkboxes.forEach(chk => chk.addEventListener('change', verificarChecklist));

// Lógica dos Modais
const modalFinalizar = document.getElementById('modal-finalizar');
const modalAjuste = document.getElementById('modal-ajuste');

btnAprovar.onclick = () => modalFinalizar.showModal();
document.getElementById('btn-cancela-fim').onclick = () => modalFinalizar.close();

// Simula finalização e redirecionamento para Fase 4 (Tag QR Code)
document.getElementById('btn-confirma-fim').onclick = () => {
  modalFinalizar.close();
  window.location.href = "../projeto-tag/index.html";
};

document.getElementById('btn-ajuste').onclick = () => modalAjuste.showModal();
document.getElementById('btn-cancela-ajuste').onclick = () => modalAjuste.close();
