(function () {
  var projectId = new URLSearchParams(window.location.search).get("project");
  var projects = {
    "1": { name: "Jaqueta reversível", origin: "ATELIÊ BOREAL", code: "L00128092026", deadline: "07/10/2026" },
    "2": { name: "Bolsa de retalho de malha", origin: "ATELIÊ BOREAL", code: "L00328092026", deadline: "FINALIZADO" },
    "3": { name: "Saia jean longa", origin: "ATELIÊ BOREAL", code: "L00228092026", deadline: "12/10/2026" }
  };
  var project = projects[projectId] || projects["1"];
  var storageKey = "continuum-project-finished-" + (projectId || "1");
  var consentDialog = document.getElementById("consentDialog");
  var finishButton = document.getElementById("finishProject");
  var consentConfirm = document.getElementById("consentConfirm");
  var consentCancel = document.getElementById("consentCancel");
  var trackingSteps = Array.prototype.slice.call(document.querySelectorAll(".lot-tracking__step"));
  var isFinished = false;
  try { isFinished = window.localStorage.getItem(storageKey) === "true"; } catch (error) {}
  document.getElementById("statusTitle").textContent = project.name;
  document.querySelector(".status-page__subtitle").textContent = "LOTE DE ORIGEM: " + project.origin;
  document.getElementById("lotCode").textContent = project.code;
  document.querySelector(".project-summary__data dd").textContent = project.deadline;
  function updateTracking() {
    if (!isFinished) return;
    trackingSteps.forEach(function (step) {
      step.classList.remove("lot-tracking__step--current");
      step.classList.add("lot-tracking__step--complete");
    });
    var finalStep = trackingSteps[trackingSteps.length - 1];
    if (finalStep) finalStep.querySelector("small").textContent = "Concluído";
    finishButton.textContent = "Projeto finalizado";
    finishButton.disabled = true;
    finishButton.classList.add("status-page__finish--done");
  }
  function closeConsent() {
    consentDialog.classList.remove("consent-dialog--visible");
    consentDialog.setAttribute("aria-hidden", "true");
  }
  finishButton.addEventListener("click", function () {
    if (isFinished) return;
    consentDialog.classList.add("consent-dialog--visible");
    consentDialog.setAttribute("aria-hidden", "false");
    consentConfirm.focus();
  });
  consentCancel.addEventListener("click", closeConsent);
  consentDialog.addEventListener("click", function (event) { if (event.target === consentDialog) closeConsent(); });
  consentConfirm.addEventListener("click", function () {
    isFinished = true;
    try { window.localStorage.setItem(storageKey, "true"); } catch (error) {}
    updateTracking();
    closeConsent();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && consentDialog.classList.contains("consent-dialog--visible")) closeConsent();
  });
  updateTracking();
})();
