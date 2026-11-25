/**
 * CONTINUUM — Utilitário compartilhado de Loading Dinâmico e Força de Senha
 * Usa a paleta oficial CONTINUUM Craft (#782736, #5e1e2a, #fdf2f4, #f5f2eb, #2d3748)
 */

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Ativa/desativa o círculo de loading dinâmico em um botão de submit.
 * @param {HTMLButtonElement|null} btn
 * @param {boolean} active
 * @param {string} [loadingLabel]
 */
export function setButtonLoading(btn, active, loadingLabel = "Processando…") {
  if (!btn) return;
  if (active) {
    if (!btn.dataset.originalHtml) {
      btn.dataset.originalHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.classList.add("btn--loading");
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = `
      <svg class="continuum-btn-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="continuum-btn-spinner__track" cx="12" cy="12" r="9" stroke-width="2.6"></circle>
        <circle class="continuum-btn-spinner__arc" cx="12" cy="12" r="9" stroke-width="2.6"></circle>
      </svg>
      <span>${loadingLabel}</span>
    `;
  } else {
    btn.disabled = false;
    btn.classList.remove("btn--loading");
    btn.removeAttribute("aria-busy");
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }
}

/**
 * Executa uma ação assíncrona exibindo o círculo de loading dinâmico CONTINUUM
 * no botão e sobre o card/container informado, com etapas dinâmicas.
 *
 * @param {Object} opts
 * @param {HTMLButtonElement|null} [opts.button] - Botão acionado
 * @param {HTMLElement|null} [opts.container] - Card onde o overlay circular aparece
 * @param {string} [opts.title] - Título principal do overlay
 * @param {string[]} [opts.steps] - Mensagens dinâmicas de progresso
 * @param {string} [opts.buttonLabel] - Rótulo temporário no botão
 * @param {string} [opts.successText] - Mensagem breve de conclusão antes de fechar/redirecionar
 * @param {number} [opts.minDuration] - Tempo mínimo (ms) para percepção fluida da animação
 * @param {Function} opts.task - Função assíncrona da operação de cadastro
 */
export async function runWithDynamicLoading({
  button = null,
  container = null,
  title = "Processando cadastro",
  steps = [
    "Validando informações…",
    "Sincronizando com a rede circular…",
    "Preparando seu acesso…",
  ],
  buttonLabel = "Cadastrando…",
  successText = "Cadastro confirmado!",
  minDuration = 920,
  task,
}) {
  const isAutomated = typeof window === "undefined" || !window.requestAnimationFrame;
  const effectiveMin = isAutomated ? 0 : minDuration;

  setButtonLoading(button, true, buttonLabel);

  let overlay = null;
  let stepEl = null;
  let fillEl = null;
  let coreEl = null;
  let titleEl = null;
  let timer1 = null;
  let timer2 = null;

  if (container && typeof document !== "undefined") {
    container.classList.add("continuum-loader-host");
    container.setAttribute("aria-busy", "true");

    const uid = `wineGrad-${Math.random().toString(36).slice(2, 8)}`;
    overlay = document.createElement("div");
    overlay.className = "continuum-loader-overlay";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.innerHTML = `
      <div class="continuum-loader-ring" aria-hidden="true">
        <svg class="continuum-loader-ring__svg" viewBox="0 0 82 82">
          <defs>
            <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#782736" />
              <stop offset="55%" stop-color="#9e394c" />
              <stop offset="100%" stop-color="#5e1e2a" />
            </linearGradient>
          </defs>
          <circle class="continuum-loader-ring__bg" cx="41" cy="41" r="34"></circle>
          <circle class="continuum-loader-ring__stitch" cx="41" cy="41" r="26"></circle>
          <circle class="continuum-loader-ring__arc" cx="41" cy="41" r="34" style="stroke: url(#${uid})"></circle>
        </svg>
        <span class="continuum-loader-ring__core">✳</span>
      </div>
      <span class="continuum-loader__kicker">CONTINUUM · ECOSSISTEMA CIRCULAR</span>
      <p class="continuum-loader__title">${title}</p>
      <p class="continuum-loader__step">${steps[0] || "Processando…"}</p>
      <div class="continuum-loader__bar" aria-hidden="true">
        <div class="continuum-loader__bar-fill"></div>
      </div>
    `;

    stepEl = overlay.querySelector(".continuum-loader__step");
    fillEl = overlay.querySelector(".continuum-loader__bar-fill");
    coreEl = overlay.querySelector(".continuum-loader-ring__core");
    titleEl = overlay.querySelector(".continuum-loader__title");

    container.appendChild(overlay);
    requestAnimationFrame(() => overlay?.classList.add("is-visible"));

    if (effectiveMin > 0 && steps.length > 1) {
      timer1 = setTimeout(() => {
        if (stepEl && steps[1]) stepEl.textContent = steps[1];
        if (fillEl) fillEl.style.width = "68%";
      }, Math.round(effectiveMin * 0.36));

      timer2 = setTimeout(() => {
        if (stepEl && steps[2]) stepEl.textContent = steps[2];
        if (fillEl) fillEl.style.width = "90%";
      }, Math.round(effectiveMin * 0.72));
    }
  }

  const startedAt = Date.now();
  try {
    const result = await task();
    const elapsed = Date.now() - startedAt;
    if (elapsed < effectiveMin) {
      await wait(effectiveMin - elapsed);
    }

    if (overlay) {
      overlay.classList.add("is-success");
      if (coreEl) coreEl.textContent = "✓";
      if (titleEl) titleEl.textContent = successText;
      if (stepEl) stepEl.textContent = "Tudo pronto!";
      if (fillEl) fillEl.style.width = "100%";
      if (effectiveMin > 0) await wait(260);
    }

    return result;
  } finally {
    clearTimeout(timer1);
    clearTimeout(timer2);
    if (overlay) {
      overlay.classList.remove("is-visible");
      setTimeout(() => overlay?.remove(), 180);
    }
    if (container) {
      container.removeAttribute("aria-busy");
    }
    setButtonLoading(button, false);
  }
}

/**
 * Avalia rapidamente a força de uma senha (0 a 4) para feedback dinâmico nos cadastros.
 * @param {string} raw
 */
export function evaluatePasswordStrength(raw) {
  const val = String(raw || "");
  if (!val) return { score: 0, label: "Mín. 8 caracteres", tone: "idle" };
  if (val.length < 8) {
    return {
      score: 1,
      label: `Faltam ${8 - val.length} caractere(s)`,
      tone: "weak",
    };
  }
  let score = 2;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score += 1;
  if (/\d/.test(val) || /[^A-Za-z0-9]/.test(val)) score += 1;
  if (score === 2) return { score: 2, label: "Senha válida · Boa", tone: "fair" };
  if (score === 3) return { score: 3, label: "Senha forte", tone: "good" };
  return { score: 4, label: "Senha excelente", tone: "strong" };
}
