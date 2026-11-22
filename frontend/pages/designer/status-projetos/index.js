import { api, STATUS_LOTE } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search),
    id = params.get("project"),
    project = await api.getProjeto(id),
    dialog = document.getElementById("consentDialog"),
    finish = document.getElementById("finishProject"),
    confirm = document.getElementById("consentConfirm"),
    cancel = document.getElementById("consentCancel"),
    steps = [...document.querySelectorAll(".lot-tracking__step")];

  if (!project) {
    document.getElementById("statusTitle").textContent = "Projeto indisponível";
    finish.disabled = true;
    return;
  }

  document.getElementById("statusTitle").textContent =
    project.tituloPeca || project.lote?.titulo || "Projeto";
  document.querySelector(".status-page__subtitle").textContent =
    `EMPRESA PARCEIRA: ${project.lote?.nomeEmpresa || project.lote?.empresaId || ""}`;
  document.getElementById("projectLotCode").textContent =
    project.codigoLote || "—";
  document.getElementById("projectDescription").textContent =
    project.processoCriativo || project.lote?.descricao || "";
  document.getElementById("projectDeadline").textContent = project.status;

  // Injeta textarea obrigatório de processo criativo no modal de confirmação (BE-11.1)
  if (dialog && !document.getElementById("statusProcessoCriativo")) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "margin:0.75rem 0;text-align:left;";
    wrap.innerHTML = `
      <label style="font-size:0.85rem;font-weight:600;display:block;">Relato do Processo Criativo *
        <textarea id="statusProcessoCriativo" rows="3" required placeholder="Descreva as técnicas e transformações aplicadas na peça..." style="width:100%;padding:0.5rem;margin-top:0.25rem;border:1px solid #ccc;border-radius:6px;"></textarea>
      </label>
    `;
    confirm?.parentElement?.before(wrap);
  }

  let done = [STATUS_LOTE.ENVIADO_LOJA, STATUS_LOTE.FINALIZADO].includes(project.status);

  const update = () => {
    if (!done) return;
    steps.forEach((x) => {
      x.classList.remove("lot-tracking__step--current");
      x.classList.add("lot-tracking__step--complete");
    });
    const last = steps.at(-1);
    if (last) last.querySelector("small").textContent = project.status;
    finish.textContent = "Enviado para revisão da loja";
    finish.disabled = true;
    finish.classList.add("status-page__finish--done");
  };

  const close = () => {
    dialog.classList.remove("consent-dialog--visible");
    dialog.setAttribute("aria-hidden", "true");
  };

  finish.addEventListener("click", () => {
    if (done) return;
    const procEl = document.getElementById("statusProcessoCriativo");
    if (procEl && !procEl.value) {
      procEl.value = project.processoCriativo || "";
    }
    dialog.classList.add("consent-dialog--visible");
    dialog.setAttribute("aria-hidden", "false");
    confirm.focus();
  });

  cancel.addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  confirm.addEventListener("click", async () => {
    const processoCriativo =
      document.getElementById("statusProcessoCriativo")?.value.trim() || "";
    if (!processoCriativo) {
      alert("O relato do processo criativo é obrigatório para concluir o projeto.");
      return;
    }
    try {
      const updated = await api.finalizarProjetoDesigner(project.id, {
        tituloPeca: project.tituloPeca || "Peça Autoral",
        descricao: processoCriativo,
        processoCriativo,
        quantidadePecas: project.quantidadePecas || 1,
        fotos: ["peca-concluida.jpg"],
      });
      project.status = updated?.status || STATUS_LOTE.ENVIADO_LOJA;
      done = true;
      update();
      close();
    } catch (error) {
      alert(error.message);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  update();
});
