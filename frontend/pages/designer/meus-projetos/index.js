(function () {
  var projectsList = document.getElementById("projectsList");
  var emptyState = document.getElementById("projectsEmpty");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".projects-tabs__tab"));
  if (!projectsList) return;
  var projectDialog = document.getElementById("projectDialog");
  var consentDialog = document.getElementById("consentDialog");
  var lastFocus = null;

  var projects = [
    { id: 1, name: "Jaqueta reversível", meta: "LOTE: L00128092026 • PRAZO: 07/10/2026", status: "next", label: "Prazo próximo", filter: "andamento", note: "A modelagem está em revisão e aguarda a próxima etapa de corte." },
    { id: 2, name: "Bolsa de retalho de malha", meta: "LOTE: L00328092026 • PRAZO: FINALIZADO", status: "done", label: "Finalizado", filter: "finalizado", note: "Projeto concluído e pronto para consulta no histórico da empresa." },
    { id: 3, name: "Saia jean longa", meta: "LOTE: L00228092026 • PRAZO: 12/10/2026", status: "progress", label: "Em andamento", filter: "andamento", note: "A produção está em andamento conforme o planejamento do projeto." }
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char];
    });
  }

  function thumbnail(id) {
    var patternId = "project-pattern-" + id;
    return '<svg viewBox="0 0 64 64" role="img" aria-label="Amostra têxtil do projeto" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="' + patternId + '" width="38" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)"><text x="-4" y="12" fill="#782736" font-family="Anton, sans-serif" font-size="7" letter-spacing=".7">CONTINUUM</text></pattern></defs><rect width="64" height="64" fill="#fbfaf3"/><rect width="64" height="64" fill="url(#' + patternId + ')"/></svg>';
  }

  function render(filter) {
    projects.forEach(function (project) {
      if (project.isFinished) { project.status = "done"; project.label = "Finalizado"; project.filter = "finalizado"; }
    });
    var visible = projects.filter(function (project) { return filter === "todos" || project.filter === filter; });
    projectsList.innerHTML = visible.map(function (project, index) {
      return '<article class="project-row" data-project-id="' + project.id + '" style="animation-delay:' + (index * 55) + 'ms">' +
        '<div class="project-row__thumb">' + thumbnail(project.id) + '</div>' +
        '<div class="project-row__content"><h2 class="project-row__title">' + escapeHtml(project.name) + '</h2><p class="project-row__meta">' + escapeHtml(project.meta) + '</p></div>' +
        '<span class="project-row__status project-row__status--' + project.status + '">' + escapeHtml(project.label) + '</span>' +
        '<button class="project-row__more" type="button" data-project="' + project.id + '">Mais</button>' +
        '<div class="project-row__details"><div class="project-row__details-inner">' + escapeHtml(project.note) + '</div></div>' +
        '</article>';
    }).join("");
    emptyState.hidden = visible.length > 0;
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) { item.classList.remove("projects-tabs__tab--active"); item.setAttribute("aria-selected", "false"); });
      tab.classList.add("projects-tabs__tab--active");
      tab.setAttribute("aria-selected", "true");
      render(tab.dataset.filter);
    });
  });

  projectsList.addEventListener("click", function (event) {
    var button = event.target.closest(".project-row__more");
    if (!button) return;
    openProject(button.dataset.project, button);
  });

  function openProject(id, trigger) {
    var project = projects.find(function (item) { return String(item.id) === String(id); });
    if (!project) return;
    lastFocus = trigger;
    document.getElementById("statusTitle").textContent = project.name;
    document.getElementById("projectOrigin").textContent = "LOTE DE ORIGEM: ATELIÊ BOREAL";
    document.getElementById("projectDescription").textContent = project.note;
    document.getElementById("projectDeadline").textContent = project.meta.split("PRAZO: ")[1] || "A definir";
    document.getElementById("projectLotCode").textContent = project.meta.split("LOTE: ")[1].split(" •")[0];
    projectDialog.dataset.projectId = project.id;
    projectDialog.querySelectorAll(".lot-tracking__step").forEach(function (step, index) {
      step.classList.toggle("lot-tracking__step--complete", index < 2);
      step.classList.toggle("lot-tracking__step--current", index === 2);
      step.querySelector("small").textContent = ["05/07/2026", "20/07/2026", "Atual", "Pendente"][index];
    });
    projectDialog.classList.add("project-dialog--visible");
    projectDialog.setAttribute("aria-hidden", "false");
    document.getElementById("closeProjectDialog").focus();
    syncFinishedState(project);
  }

  function syncFinishedState(project) {
    var finished = project.isFinished === true;
    var finish = document.getElementById("finishProject");
    var steps = projectDialog.querySelectorAll(".lot-tracking__step");
    finish.disabled = finished;
    finish.textContent = finished ? "Projeto finalizado" : "Finalizar projeto";
    finish.classList.toggle("status-page__finish--done", finished);
    steps.forEach(function (step, index) {
      step.classList.toggle("lot-tracking__step--complete", finished || index < 2);
      step.classList.toggle("lot-tracking__step--current", !finished && index === 2);
    });
    if (finished && steps.length) steps[steps.length - 1].querySelector("small").textContent = "Concluído";
  }

  function closeConsent() {
    consentDialog.classList.remove("consent-dialog--visible");
    consentDialog.setAttribute("aria-hidden", "true");
    document.getElementById("finishProject").focus();
  }
  function closeProject() {
    if (consentDialog.classList.contains("consent-dialog--visible")) closeConsent();
    projectDialog.classList.remove("project-dialog--visible");
    projectDialog.setAttribute("aria-hidden", "true");
    var returnFocus = projectDialog.dataset.projectId && document.querySelector('.project-row__more[data-project="' + projectDialog.dataset.projectId + '"]');
    if (returnFocus) returnFocus.focus();
    else if (lastFocus) lastFocus.focus();
  }
  document.getElementById("closeProjectDialog").addEventListener("click", closeProject);
  projectDialog.addEventListener("click", function (event) { if (event.target === projectDialog) closeProject(); });
  document.getElementById("finishProject").addEventListener("click", function () {
    if (this.disabled) return;
    consentDialog.classList.add("consent-dialog--visible");
    consentDialog.setAttribute("aria-hidden", "false");
    document.getElementById("consentConfirm").focus();
  });
  document.getElementById("consentCancel").addEventListener("click", closeConsent);
  consentDialog.addEventListener("click", function (event) { if (event.target === consentDialog) closeConsent(); });
  document.getElementById("consentConfirm").addEventListener("click", function () {
    var project = projects.find(function (item) { return String(item.id) === projectDialog.dataset.projectId; });
    if (!project) return;
    project.isFinished = true;
    project.status = "done";
    project.label = "Finalizado";
    project.filter = "finalizado";
    syncFinishedState(project);
    closeConsent();
    var activeTab = document.querySelector(".projects-tabs__tab--active");
    render(activeTab ? activeTab.dataset.filter : "todos");
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (consentDialog.classList.contains("consent-dialog--visible")) closeConsent();
      else if (projectDialog.classList.contains("project-dialog--visible")) closeProject();
    }
  });

  render("todos");
})();
