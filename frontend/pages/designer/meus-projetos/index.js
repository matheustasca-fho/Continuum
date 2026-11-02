(() => {
  "use strict";

  const SELECTORS = {
    visibleConsent: "consent-dialog--visible",
    visibleProject: "project-dialog--visible",
    activeTab: "projects-tabs__tab--active",
  };
  const DONE_STATE = {
    status: "done",
    label: "Finalizado",
    filter: "finalizado",
  };
  const STEP_DATES = ["05/07/2026", "20/07/2026", "Atual", "Pendente"];
  const COMPLETED_STEPS = 2;
  const ROW_ANIMATION_STEP_MS = 55;

  const projectsList = document.getElementById("projectsList");
  if (!projectsList) return;

  const emptyState = document.getElementById("projectsEmpty");
  const tabs = [...document.querySelectorAll(".projects-tabs__tab")];
  const projectDialog = document.getElementById("projectDialog");
  const consentDialog = document.getElementById("consentDialog");
  const finishButton = document.getElementById("finishProject");
  const consentConfirm = document.getElementById("consentConfirm");
  const closeProjectButton = document.getElementById("closeProjectDialog");

  let lastFocus = null;

  const projects = [
    {
      id: 1,
      name: "Jaqueta reversível",
      meta: "LOTE: L00128092026 • PRAZO: 07/10/2026",
      status: "next",
      label: "Prazo próximo",
      filter: "andamento",
      note: "A modelagem está em revisão e aguarda a próxima etapa de corte.",
    },
    {
      id: 2,
      name: "Bolsa de retalho de malha",
      meta: "LOTE: L00328092026 • PRAZO: FINALIZADO",
      status: "done",
      label: "Finalizado",
      filter: "finalizado",
      note: "Projeto concluído e pronto para consulta no histórico da empresa.",
    },
    {
      id: 3,
      name: "Saia jean longa",
      meta: "LOTE: L00228092026 • PRAZO: 12/10/2026",
      status: "progress",
      label: "Em andamento",
      filter: "andamento",
      note: "A produção está em andamento conforme o planejamento do projeto.",
    },
  ];

  const HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

  const findProjectById = (id) =>
    projects.find((item) => String(item.id) === String(id));

  const parseMeta = (meta) => ({
    deadline: meta.split("PRAZO: ")[1] || "A definir",
    lotCode: meta.split("LOTE: ")[1].split(" •")[0],
  });

  const thumbnail = (id) => {
    const patternId = `project-pattern-${id}`;
    return `<svg viewBox="0 0 64 64" role="img" aria-label="Amostra têxtil do projeto" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="${patternId}" width="38" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)"><text x="-4" y="12" fill="#782736" font-family="Anton, sans-serif" font-size="7" letter-spacing=".7">CONTINUUM</text></pattern></defs><rect width="64" height="64" fill="#fbfaf3"/><rect width="64" height="64" fill="url(#${patternId})"/></svg>`;
  };

  const projectRowTemplate = (project, index) => `
    <article class="project-row" data-project-id="${project.id}" style="animation-delay:${index * ROW_ANIMATION_STEP_MS}ms">
      <div class="project-row__thumb">${thumbnail(project.id)}</div>
      <div class="project-row__content"><h2 class="project-row__title">${escapeHtml(project.name)}</h2><p class="project-row__meta">${escapeHtml(project.meta)}</p></div>
      <span class="project-row__status project-row__status--${project.status}">${escapeHtml(project.label)}</span>
      <button class="project-row__more" type="button" data-project="${project.id}">Mais</button>
      <div class="project-row__details"><div class="project-row__details-inner">${escapeHtml(project.note)}</div></div>
    </article>`;

  const markAsDone = (project) => Object.assign(project, DONE_STATE);

  const render = (filter) => {
    projects.filter((project) => project.isFinished).forEach(markAsDone);

    const visible = projects.filter(
      (project) => filter === "todos" || project.filter === filter,
    );
    projectsList.innerHTML = visible.map(projectRowTemplate).join("");
    emptyState.hidden = visible.length > 0;
  };

  const getActiveFilter = () => {
    const activeTab = document.querySelector(`.${SELECTORS.activeTab}`);
    return activeTab ? activeTab.dataset.filter : "todos";
  };

  const selectTab = (selectedTab) => {
    tabs.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.classList.toggle(SELECTORS.activeTab, isSelected);
      tab.setAttribute("aria-selected", String(isSelected));
    });
    render(selectedTab.dataset.filter);
  };

  const syncFinishedState = (project) => {
    const finished = project.isFinished === true;
    const steps = projectDialog.querySelectorAll(".lot-tracking__step");

    finishButton.disabled = finished;
    finishButton.textContent = finished
      ? "Projeto finalizado"
      : "Finalizar projeto";
    finishButton.classList.toggle("status-page__finish--done", finished);

    steps.forEach((step, index) => {
      step.classList.toggle(
        "lot-tracking__step--complete",
        finished || index < COMPLETED_STEPS,
      );
      step.classList.toggle(
        "lot-tracking__step--current",
        !finished && index === COMPLETED_STEPS,
      );
    });
    if (finished && steps.length)
      steps[steps.length - 1].querySelector("small").textContent = "Concluído";
  };

  const fillProjectDialog = (project) => {
    const { deadline, lotCode } = parseMeta(project.meta);
    document.getElementById("statusTitle").textContent = project.name;
    document.getElementById("projectOrigin").textContent =
      "LOTE DE ORIGEM: ATELIÊ BOREAL";
    document.getElementById("projectDescription").textContent = project.note;
    document.getElementById("projectDeadline").textContent = deadline;
    document.getElementById("projectLotCode").textContent = lotCode;
    projectDialog.dataset.projectId = project.id;

    projectDialog
      .querySelectorAll(".lot-tracking__step")
      .forEach((step, index) => {
        step.classList.toggle(
          "lot-tracking__step--complete",
          index < COMPLETED_STEPS,
        );
        step.classList.toggle(
          "lot-tracking__step--current",
          index === COMPLETED_STEPS,
        );
        step.querySelector("small").textContent = STEP_DATES[index];
      });
  };

  const openProject = (id, trigger) => {
    const project = findProjectById(id);
    if (!project) return;

    lastFocus = trigger;
    fillProjectDialog(project);
    projectDialog.classList.add(SELECTORS.visibleProject);
    projectDialog.setAttribute("aria-hidden", "false");
    closeProjectButton.focus();
    syncFinishedState(project);
  };

  const openConsent = () => {
    consentDialog.classList.add(SELECTORS.visibleConsent);
    consentDialog.setAttribute("aria-hidden", "false");
    consentConfirm.focus();
  };

  const closeConsent = () => {
    consentDialog.classList.remove(SELECTORS.visibleConsent);
    consentDialog.setAttribute("aria-hidden", "true");
    finishButton.focus();
  };

  const closeProject = () => {
    if (consentDialog.classList.contains(SELECTORS.visibleConsent))
      closeConsent();

    projectDialog.classList.remove(SELECTORS.visibleProject);
    projectDialog.setAttribute("aria-hidden", "true");

    const { projectId } = projectDialog.dataset;
    const returnFocus =
      projectId &&
      document.querySelector(`.project-row__more[data-project="${projectId}"]`);
    (returnFocus || lastFocus)?.focus();
  };

  const confirmFinish = () => {
    const project = findProjectById(projectDialog.dataset.projectId);
    if (!project) return;

    project.isFinished = true;
    markAsDone(project);
    syncFinishedState(project);
    closeConsent();
    render(getActiveFilter());
  };

  const handleEscape = (event) => {
    if (event.key !== "Escape") return;
    if (consentDialog.classList.contains(SELECTORS.visibleConsent))
      closeConsent();
    else if (projectDialog.classList.contains(SELECTORS.visibleProject))
      closeProject();
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab)));

  projectsList.addEventListener("click", (event) => {
    const button = event.target.closest(".project-row__more");
    if (button) openProject(button.dataset.project, button);
  });

  closeProjectButton.addEventListener("click", closeProject);
  projectDialog.addEventListener("click", (event) => {
    if (event.target === projectDialog) closeProject();
  });
  finishButton.addEventListener("click", () => {
    if (!finishButton.disabled) openConsent();
  });
  document
    .getElementById("consentCancel")
    .addEventListener("click", closeConsent);
  consentDialog.addEventListener("click", (event) => {
    if (event.target === consentDialog) closeConsent();
  });
  consentConfirm.addEventListener("click", confirmFinish);
  document.addEventListener("keydown", handleEscape);

  render("todos");
})();
