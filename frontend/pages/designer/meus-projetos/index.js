import { api, STATUS_LOTE } from "../../../js/shared/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const designer = await api.getDesigner();
  const list = $("projectsList");
  const empty = $("projectsEmpty");
  const tabs = document.querySelector(".projects-tabs");
  const searchInput = $("searchProjects");
  const dialog = $("projectDialog");
  const consent = $("consentDialog");
  const creativeForm = $("creativeForm");
  const toast = $("projToast");
  const toastMsg = $("projToastMsg");

  let all = await api.getMeusProjetos(designer.id);
  let activeTab = "TODOS";
  let searchQuery = "";
  let selected = null;
  let toastTimer = null;

  const showToast = (text) => {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = text;
    toast.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("toast--visible"), 3200);
  };

  const TAB_DEFS = [
    { key: "TODOS", label: "Todos" },
    { key: "PRODUCAO", label: "Em produção" },
    { key: "ENVIADOS", label: "Enviados à loja" },
    { key: "FINALIZADOS", label: "Finalizados" },
  ];

  const matchesTab = (p, key) => {
    if (key === "TODOS") return true;
    if (key === "PRODUCAO") return p.status === STATUS_LOTE.EM_PRODUCAO;
    if (key === "ENVIADOS") return p.status === STATUS_LOTE.ENVIADO_LOJA;
    if (key === "FINALIZADOS") return p.status === STATUS_LOTE.FINALIZADO;
    return true;
  };

  const statusModClass = (status) => {
    if (status === STATUS_LOTE.FINALIZADO) return "project-row__status--done";
    if (status === STATUS_LOTE.ENVIADO_LOJA) return "project-row__status--next";
    if (status === STATUS_LOTE.INTERROMPIDO) return "project-row__status--late";
    return "project-row__status--progress";
  };

  const createThumbMarkup = (p) => {
    if (p.lote?.image) {
      return `<img src="${p.lote.image}" alt="" />`;
    }
    return `
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" fill="#FDF2F4"/>
        <path d="M16 16h24c4.4 0 8 3.6 8 8v24H16V16z" fill="none" stroke="#782736" stroke-width="2.2"/>
        <path d="M16 32h32M32 16v32" stroke="#782736" stroke-width="1.6" stroke-dasharray="4 3"/>
      </svg>
    `;
  };

  const renderTabs = () => {
    tabs.replaceChildren();
    TAB_DEFS.forEach(({ key, label }) => {
      const count = all.filter((p) => matchesTab(p, key)).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = `projects-tabs__tab ${activeTab === key ? "projects-tabs__tab--active" : ""}`;
      b.textContent = `${label} (${count})`;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(activeTab === key));
      b.addEventListener("click", () => {
        activeTab = key;
        renderTabs();
        render();
      });
      tabs.appendChild(b);
    });
  };

  const render = () => {
    const q = searchQuery.trim().toLowerCase();
    const rows = all.filter((p) => {
      if (!matchesTab(p, activeTab)) return false;
      if (!q) return true;
      return `${p.tituloPeca || ""} ${p.lote_nome || ""} ${p.codigoLote || ""} ${p.empresaParceira || ""}`
        .toLowerCase()
        .includes(q);
    });

    list.replaceChildren();
    empty.hidden = rows.length > 0;

    rows.forEach((p) => {
      const card = document.createElement("article");
      card.className = "project-row";

      const thumb = document.createElement("div");
      thumb.className = "project-row__thumb";
      thumb.innerHTML = createThumbMarkup(p);

      const content = document.createElement("div");
      content.className = "project-row__content";
      const title = document.createElement("h2");
      title.className = "project-row__title";
      title.textContent = p.tituloPeca || p.lote_nome || "Projeto em criação";

      const meta = document.createElement("p");
      meta.className = "project-row__meta";
      meta.textContent = [
        p.codigoLote || "Lote",
        p.empresaParceira || "Loja Parceira",
        p.pesoKg ? `${String(p.pesoKg).replace(".", ",")} kg` : null,
        p.quantidadePecas ? `${p.quantidadePecas} peça(s)` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      content.append(title, meta);

      const badge = document.createElement("span");
      badge.className = `project-row__status ${statusModClass(p.status)}`;
      badge.textContent = p.status;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "project-row__more";
      btn.textContent = "Gerenciar";
      btn.addEventListener("click", () => openProject(p));

      card.append(thumb, content, badge, btn);
      list.appendChild(card);
    });
  };

  const updateTrackingSteps = (status) => {
    const stepProd = document.querySelector('[data-step="producao"]');
    const stepEnv = document.querySelector('[data-step="enviado"]');
    [stepProd, stepEnv].forEach((el) =>
      el?.classList.remove("lot-tracking__step--complete", "lot-tracking__step--current"),
    );

    if (status === STATUS_LOTE.EM_PRODUCAO) {
      stepProd?.classList.add("lot-tracking__step--current");
    } else if (
      status === STATUS_LOTE.ENVIADO_LOJA ||
      status === STATUS_LOTE.FINALIZADO
    ) {
      stepProd?.classList.add("lot-tracking__step--complete");
      stepEnv?.classList.add(
        status === STATUS_LOTE.FINALIZADO
          ? "lot-tracking__step--complete"
          : "lot-tracking__step--current",
      );
    }
  };

  const openProject = (p) => {
    selected = p;
    const isLocked =
      p.status === STATUS_LOTE.FINALIZADO ||
      p.status === STATUS_LOTE.INTERROMPIDO;

    $("statusTitle").textContent =
      p.tituloPeca || p.lote_nome || "Projeto Autoral";
    $("projectOrigin").textContent = `LOJA PARCEIRA: ${(p.empresaParceira || "CONTINUUM").toUpperCase()} · ${p.pesoKg ?? 0} KG`;
    $("projectDescription").textContent =
      p.lote?.briefing?.ideiaMarca ||
      p.lote?.descricao ||
      "Criação autoral livre seguindo a Cartilha Padrão da loja parceira.";
    $("projectDeadline").textContent = p.status;
    $("projectLotCode").textContent = p.codigoLote || "—";

    $("editProjTitle").value = p.tituloPeca || p.lote_nome || "";
    $("editProjQty").value = p.quantidadePecas || 1;
    $("editProjStory").value = p.processoCriativo || "";

    $("editProjTitle").disabled = isLocked;
    $("editProjQty").disabled = isLocked;
    $("editProjStory").disabled = isLocked;
    $("btnSaveCreative").hidden = isLocked;
    $("finishProject").hidden =
      isLocked || p.status === STATUS_LOTE.ENVIADO_LOJA;

    updateTrackingSteps(p.status);
    dialog.classList.add("project-dialog--visible");
    dialog.setAttribute("aria-hidden", "false");
  };

  const saveCreativeDetails = async () => {
    if (!selected) return;
    const tituloPeca = $("editProjTitle").value.trim() || selected.tituloPeca;
    const quantidadePecas = Math.max(1, Number($("editProjQty").value) || 1);
    const processoCriativo = $("editProjStory").value.trim();

    await api.atualizarProjetoDesigner(selected.id, {
      tituloPeca,
      quantidadePecas,
      processoCriativo,
    });
    all = await api.getMeusProjetos(designer.id);
    selected = all.find((x) => x.id === selected.id) || selected;
    $("statusTitle").textContent = tituloPeca;
    renderTabs();
    render();
  };

  creativeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await saveCreativeDetails();
      showToast("Progresso criativo salvo!");
    } catch (err) {
      alert(err.message);
    }
  });

  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    render();
  });

  $("closeProjectDialog").onclick = () => {
    dialog.classList.remove("project-dialog--visible");
    dialog.setAttribute("aria-hidden", "true");
  };

  $("finishProject").onclick = () => {
    consent.classList.add("consent-dialog--visible");
    consent.setAttribute("aria-hidden", "false");
  };

  $("consentCancel").onclick = () => {
    consent.classList.remove("consent-dialog--visible");
    consent.setAttribute("aria-hidden", "true");
  };

  $("consentConfirm").onclick = async () => {
    try {
      await saveCreativeDetails();
      await api.finalizarProjetoDesigner(selected.id);
      all = await api.getMeusProjetos(designer.id);
      consent.classList.remove("consent-dialog--visible");
      consent.setAttribute("aria-hidden", "true");
      dialog.classList.remove("project-dialog--visible");
      dialog.setAttribute("aria-hidden", "true");
      renderTabs();
      render();
      showToast("Peça enviada para revisão da loja parceira!");
    } catch (error) {
      alert(error.message);
    }
  };

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    consent.classList.remove("consent-dialog--visible");
    dialog.classList.remove("project-dialog--visible");
  });

  renderTabs();
  render();
});
