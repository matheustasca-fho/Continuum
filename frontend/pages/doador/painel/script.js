/* ==========================================================
       DASHBOARD ANIMATIONS (Counters)
       ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".counter");

  const animateValue = (obj, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      obj.innerHTML = Math.floor(easeProgress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end;
      }
    };
    window.requestAnimationFrame(step);
  };

  // Delay counter animation slightly so it plays smoothly with slideUp
  setTimeout(() => {
    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute("data-target"), 10);
      animateValue(counter, 0, target, 2000);
    });
  }, 500);
});
