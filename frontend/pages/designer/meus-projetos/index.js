import { api, STATUS_LOTE } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id),
    designer = await api.getDesigner(),
    list = $("projectsList"),
    empty = $("projectsEmpty"),
    tabs = document.querySelector(".projects-tabs"),
    dialog = $("projectDialog"),
    consent = $("consentDialog");
  let all = await api.getMeusProjetos(designer.id),
    filter = "TODOS",
    selected = null;

  // Injeta campos de documentação da peça e processo criativo no modal de conclusão (BE-11.1 a BE-11.4)
  const consentBox = consent?.querySelector(".consent-dialog__card") || consent;
  if (consentBox && !$("pecaProcessoCriativo")) {
    const formFields = document.createElement("div");
    formFields.style.cssText = "display:flex;flex-direction:column;gap:0.6rem;margin:0.75rem 0;text-align:left;";
    formFields.innerHTML = `
      <label style="font-size:0.85rem;font-weight:600;">Nome da Peça *
        <input id="pecaTitulo" type="text" required placeholder="Ex: Jaqueta Patchwork Autoral" style="width:100%;padding:0.45rem;margin-top:0.2rem;border:1px solid #ccc;border-radius:6px;" />
      </label>
      <label style="font-size:0.85rem;font-weight:600;">Processo Criativo *
        <textarea id="pecaProcessoCriativo" rows="3" required placeholder="Relate como os materiais foram transformados..." style="width:100%;padding:0.45rem;margin-top:0.2rem;border:1px solid #ccc;border-radius:6px;"></textarea>
      </label>
      <label style="font-size:0.85rem;font-weight:600;">Quantidade Produzida *
        <input id="pecaQuantidade" type="number" min="1" value="1" required style="width:100%;padding:0.45rem;margin-top:0.2rem;border:1px solid #ccc;border-radius:6px;" />
      </label>
      <label style="font-size:0.85rem;font-weight:600;">Foto da Peça (JPG/PNG até 2MB)
        <input id="pecaFotoInput" type="file" accept="image/jpeg,image/png" style="width:100%;margin-top:0.2rem;" />
      </label>
    `;
    const actionsEl = consentBox.querySelector(".consent-dialog__actions") || $("consentConfirm")?.parentElement;
    if (actionsEl) {
      actionsEl.before(formFields);
    } else {
      consentBox.appendChild(formFields);
    }
  }

  tabs.replaceChildren();
  const filters = ["TODOS", ...Object.values(STATUS_LOTE)];
  filters.forEach((status) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "projects-tabs__tab";
    b.textContent = status === "TODOS" ? "Todos" : status;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(status === "TODOS"));
    b.onclick = () => {
      filter = status;
      tabs.querySelectorAll("button").forEach((x) => {
        x.classList.remove("projects-tabs__tab--active");
        x.setAttribute("aria-selected", "false");
      });
      b.classList.add("projects-tabs__tab--active");
      b.setAttribute("aria-selected", "true");
      render();
    };
    tabs.appendChild(b);
  });

  const render = () => {
    const rows = all.filter((p) => filter === "TODOS" || p.status === filter);
    list.replaceChildren();
    empty.hidden = rows.length > 0;
    rows.forEach((p) => {
      const card = document.createElement("article");
      card.className = "project-row";
      card.innerHTML = `<div><h2 class="project-row__title"></h2><p class="project-row__meta"></p><span class="project-row__status"></span></div><button class="project-row__more" type="button">Detalhes</button>`;
      card.querySelector(".project-row__title").textContent =
        p.tituloPeca || p.lote_nome || "Projeto";
      card.querySelector(".project-row__meta").textContent =
        `${p.codigoLote || ""} · ${p.pesoKg ?? ""} kg`;
      card.querySelector(".project-row__status").textContent = p.status;
      card.querySelector("button").onclick = () => open(p);
      list.appendChild(card);
    });
  };

  const open = (p) => {
    selected = p;
    $("statusTitle").textContent = p.tituloPeca || p.lote_nome || "Projeto";
    $("projectOrigin").textContent =
      `Empresa Parceira · ${p.lote?.nomeEmpresa || p.lote?.empresaId || ""}`;
    $("projectDescription").textContent =
      p.processoCriativo || p.lote?.descricao || "";
    $("projectDeadline").textContent = p.status;
    $("projectLotCode").textContent = p.codigoLote || "—";
    $("finishProject").hidden = ![
      STATUS_LOTE.EM_PRODUCAO,
      "EM AJUSTE",
    ].includes(p.status);
    dialog.classList.add("project-dialog--visible");
    dialog.setAttribute("aria-hidden", "false");
  };

  $("closeProjectDialog").onclick = () => {
    dialog.classList.remove("project-dialog--visible");
    dialog.setAttribute("aria-hidden", "true");
  };

  $("finishProject").onclick = () => {
    if ($("pecaTitulo") && selected) {
      $("pecaTitulo").value = selected.tituloPeca || "";
    }
    if ($("pecaProcessoCriativo") && selected) {
      $("pecaProcessoCriativo").value = selected.processoCriativo || "";
    }
    consent.classList.add("consent-dialog--visible");
    consent.setAttribute("aria-hidden", "false");
  };

  $("consentCancel").onclick = () => {
    consent.classList.remove("consent-dialog--visible");
    consent.setAttribute("aria-hidden", "true");
  };

  $("consentConfirm").onclick = async () => {
    const processoCriativo = $("pecaProcessoCriativo")?.value.trim() || "";
    const tituloPeca = $("pecaTitulo")?.value.trim() || selected?.tituloPeca || "Peça Autoral";
    const quantidadePecas = Math.max(1, Number($("pecaQuantidade")?.value) || 1);

    if (!processoCriativo) {
      alert("Por favor, descreva o processo criativo para concluir o projeto.");
      return;
    }

    const file = $("pecaFotoInput")?.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 2 * 1024 * 1024) {
        alert("Formato de foto inválido ou arquivo acima de 2MB (use apenas JPG/PNG).");
        return;
      }
    }

    try {
      await api.finalizarProjetoDesigner(selected.id, {
        tituloPeca,
        descricao: processoCriativo,
        processoCriativo,
        quantidadePecas,
        materiais: [selected.lote?.material || "algodão"],
        fotos: file ? [file.name] : ["peca-autoral.jpg"],
      });
      all = await api.getMeusProjetos(designer.id);
      consent.classList.remove("consent-dialog--visible");
      consent.setAttribute("aria-hidden", "true");
      dialog.classList.remove("project-dialog--visible");
      dialog.setAttribute("aria-hidden", "true");
      render();
    } catch (error) {
      alert(error.message);
    }
  };

  render();
});
