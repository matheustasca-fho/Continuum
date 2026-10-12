/* THREAD TRAIL */

    // Thread trail cursor
    const trail = document.getElementById('threadTrail');
    const dots = [];
    const numDots = 8;
    for (let i = 0; i < numDots; i++) {
      let d = document.createElement('div');
      d.className = 'thread-dot';
      trail.appendChild(d);
      dots.push({ x: 0, y: 0, node: d });
    }

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    function animateTrail() {
      let x = mouseX, y = mouseY;
      dots.forEach((dot, index) => {
        let nextDot = dots[index + 1] || dots[0];
        dot.x += (x - dot.x) * 0.4;
        dot.y += (y - dot.y) * 0.4;
        dot.node.style.transform = `translate(${dot.x}px, ${dot.y}px) scale(${1 - index * 0.08})`;
        x = dot.x; y = dot.y;
      });
      requestAnimationFrame(animateTrail);
    }
    animateTrail();

    /* ==========================================================
       DASHBOARD ANIMATIONS
       ========================================================== */
    document.addEventListener('DOMContentLoaded', () => {
      // Fade in observer
      const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      };

      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Animate counters if they are inside this section
            const counters = entry.target.querySelectorAll('.counter');
            counters.forEach(counter => {
              if(!counter.classList.contains('counted')) {
                animateValue(counter, 0, parseInt(counter.getAttribute('data-target')), 2000);
                counter.classList.add('counted');
              }
            });
            observer.unobserve(entry.target);
          }
        });
      }, observerOptions);

      document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

      // Animate numbers function
      function animateValue(obj, start, end, duration) {
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
      }
      
      // Fallback pra garantir que apareçam mesmo se o observer demorar
      setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if(rect.top < window.innerHeight) {
             el.classList.add('visible');
             const counters = el.querySelectorAll('.counter');
             counters.forEach(counter => {
               if(!counter.classList.contains('counted')) {
                 animateValue(counter, 0, parseInt(counter.getAttribute('data-target')), 2500);
                 counter.classList.add('counted');
               }
             });
          }
        });
      }, 100);
    });
