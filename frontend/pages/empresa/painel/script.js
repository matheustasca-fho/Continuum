
    /* ==========================================================
       DASHBOARD ANIMATIONS (Counters)
       ========================================================== */
    document.addEventListener('DOMContentLoaded', () => {
      const counters = document.querySelectorAll('.counter');
      
      const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          
          let currentVal = Math.floor(easeProgress * (end - start) + start);
          obj.innerHTML = currentVal < 10 && end < 100 ? '0' + currentVal : currentVal;
          
          if (progress < 1) {
            window.requestAnimationFrame(step);
          } else {
            obj.innerHTML = end < 10 && end < 100 ? '0' + end : end;
          }
        };
        window.requestAnimationFrame(step);
      };

      setTimeout(() => {
        counters.forEach(counter => {
          const target = parseInt(counter.getAttribute('data-target'), 10);
          // Varia o tempo da animação dependendo do tamanho do número
          const duration = target > 1000 ? 3000 : 2000;
          animateValue(counter, 0, target, duration);
        });
      }, 500);
    });
