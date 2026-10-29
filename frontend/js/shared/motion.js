/**
 * CONTINUUM — motion.js
 * Helpers de animação sem bibliotecas. Usa WAAPI e rAF.
 */

export const motion = {
  prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  /**
   * Anima um contador numérico de 0 até o valor alvo.
   * @param {HTMLElement} el - Elemento alvo
   * @param {number} endVal  - Valor final
   * @param {number} duration - Duração em ms
   */
  countUp(el, endVal, duration = 700) {
    if (this.prefersReduced()) {
      el.textContent = endVal;
      return;
    }

    let startTime = null;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.floor(easeOutCubic(progress) * endVal);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = endVal;
    };

    requestAnimationFrame(tick);
  },

  /**
   * Anima a entrada de uma lista de elementos com stagger.
   * @param {NodeList|HTMLElement[]} elements
   * @param {number} staggerMs - Atraso entre cada elemento
   */
  staggerIn(elements, staggerMs = 60) {
    if (this.prefersReduced()) return;

    elements.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";

      setTimeout(() => {
        el.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 280,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "forwards",
          },
        );
      }, i * staggerMs);
    });
  },

  /**
   * View Transition API para troca de "página" suave.
   * Fallback seguro para browsers sem suporte.
   * @param {Function} updateCallback - Função que muda o DOM
   */
  async viewTransition(updateCallback) {
    if (!document.startViewTransition || this.prefersReduced()) {
      await updateCallback();
      return;
    }
    await document.startViewTransition(updateCallback).finished;
  },
};
