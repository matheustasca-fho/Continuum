/* ==========================================================
       TABS
       ========================================================== */
    var tabBtns = document.querySelectorAll('.tabs__btn');
    var tabPanels = document.querySelectorAll('.tabs__panel');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabBtns.forEach(function (b) {
          b.classList.remove('tabs__btn--active');
          b.setAttribute('aria-selected', 'false');
          b.setAttribute('tabindex', '-1');
        });
        tabPanels.forEach(function (p) { p.classList.remove('tabs__panel--active'); });

        btn.classList.add('tabs__btn--active');
        btn.setAttribute('aria-selected', 'true');
        btn.removeAttribute('tabindex');

        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.classList.add('tabs__panel--active');
      });

      btn.addEventListener('keydown', function (e) {
        var arr = Array.from(tabBtns);
        var i = arr.indexOf(btn);
        var target;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); target = arr[(i+1) % arr.length]; }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); target = arr[(i-1+arr.length) % arr.length]; }
        else if (e.key === 'Home') { e.preventDefault(); target = arr[0]; }
        else if (e.key === 'End')  { e.preventDefault(); target = arr[arr.length-1]; }
        if (target) { target.click(); target.focus(); }
      });
    });

    /* ==========================================================
       THREAD TRAIL — fio que segue o mouse
       ========================================================== */
    var trail = document.getElementById('threadTrail');
    var trailDots = [];
    var mouseX = 0, mouseY = 0;
    var trailActive = false;

    for (var d = 0; d < 8; d++) {
      var dot = trail.cloneNode();
      dot.id = '';
      dot.style.position = 'fixed';
      dot.style.pointerEvents = 'none';
      dot.style.zIndex = '9999';
      dot.style.width = (6 - d * 0.5) + 'px';
      dot.style.height = (6 - d * 0.5) + 'px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = 'var(--color-primary)';
      dot.style.opacity = '0';
      dot.style.transition = 'opacity 0.3s';
      document.body.appendChild(dot);
      trailDots.push({ el: dot, x: 0, y: 0 });
    }
    trail.remove();

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!trailActive) {
        trailActive = true;
        trailDots.forEach(function (d) { d.el.style.opacity = '0.25'; });
      }
    });

    document.addEventListener('mouseleave', function () {
      trailActive = false;
      trailDots.forEach(function (d) { d.el.style.opacity = '0'; });
    });

    function animateTrail() {
      var prevX = mouseX, prevY = mouseY;
      trailDots.forEach(function (dot, i) {
        var speed = 0.25 - i * 0.02;
        dot.x += (prevX - dot.x) * speed;
        dot.y += (prevY - dot.y) * speed;
        dot.el.style.left = dot.x + 'px';
        dot.el.style.top = dot.y + 'px';
        prevX = dot.x;
        prevY = dot.y;
      });
      requestAnimationFrame(animateTrail);
    }
    animateTrail();


    /* ==========================================================
       AVATAR UPLOAD
       ========================================================== */
    document.querySelector('.avatar__edit').addEventListener('click', function () {
      var fi = document.createElement('input');
      fi.type = 'file'; fi.accept = 'image/jpeg,image/png'; fi.style.display = 'none';
      fi.addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        if (f.size > 2*1024*1024) { alert('Máximo 2MB.'); return; }
        var r = new FileReader();
        r.onload = function (ev) {
          var c = document.querySelector('.avatar__circle');
          c.innerHTML = '';
          var img = document.createElement('img');
          img.src = ev.target.result; img.alt = 'Foto de perfil';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%';
          c.appendChild(img);
        };
        r.readAsDataURL(f); fi.remove();
      });
      document.body.appendChild(fi); fi.click();
    });

    /* ==========================================================
       TEXTAREA CHAR COUNT
       ========================================================== */
    var manifesto = document.getElementById('manifesto');
    var manifestoCount = document.getElementById('manifestoCount');
    function updateCC() {
      var l = manifesto.value.length;
      manifestoCount.textContent = l + ' / 500';
      manifestoCount.style.color = l > 450 ? (l >= 500 ? 'var(--color-error)' : 'var(--color-warning)') : 'var(--color-muted-text)';
    }
    manifesto.addEventListener('input', updateCC); updateCC();

    /* ==========================================================
       MASKS
       ========================================================== */
    document.getElementById('cep').addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g,'');
      if (v.length>8) v=v.slice(0,8);
      if (v.length>5) v=v.slice(0,5)+'-'+v.slice(5);
      e.target.value = v;
    });

    document.getElementById('telefone').addEventListener('input', function (e) {
      var v = e.target.value.replace(/\D/g,'');
      if (v.length>11) v=v.slice(0,11);
      if (v.length>10) v='('+v.slice(0,2)+') '+v.slice(2,7)+'-'+v.slice(7);
      else if (v.length>6) v='('+v.slice(0,2)+') '+v.slice(2,6)+'-'+v.slice(6);
      else if (v.length>2) v='('+v.slice(0,2)+') '+v.slice(2);
      else if (v.length>0) v='('+v;
      e.target.value = v;
    });

    /* ==========================================================
       FORM + TOAST
       ========================================================== */
    var form = document.getElementById('profileForm');
    var toast = document.getElementById('toast');

    function showToast(msg) {
      document.getElementById('toastMsg').textContent = msg;
      toast.classList.add('toast--visible');
      setTimeout(function () { toast.classList.remove('toast--visible'); }, 3000);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      document.querySelectorAll('.form-group--error').forEach(function (g) {
        g.classList.remove('form-group--error');
        var m = g.querySelector('.form-message'); if (m) m.remove();
      });

      [{el:document.getElementById('apelido'),msg:'Informe o apelido ou nome do ateliê.'},
       {el:document.getElementById('nomeCompleto'),msg:'Informe o nome completo.'},
       {el:document.getElementById('email'),msg:'Informe um e-mail válido.'}
      ].forEach(function (f) {
        if (!f.el.value.trim()||(f.el.type==='email'&&!f.el.value.includes('@'))) {
          var g=f.el.closest('.form-group'); g.classList.add('form-group--error');
          f.el.setAttribute('aria-invalid','true');
          var s=document.createElement('span'); s.className='form-message'; s.textContent=f.msg; g.appendChild(s);
          ok=false;
        }
      });

      if (!ok) { document.getElementById('btn-dados').click(); return; }
      showToast('Alterações salvas com sucesso!');
    });

    document.querySelectorAll('.form-input,.form-textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        var g = this.closest('.form-group');
        if (g&&g.classList.contains('form-group--error')) {
          g.classList.remove('form-group--error'); this.removeAttribute('aria-invalid');
          var m=g.querySelector('.form-message'); if(m) m.remove();
        }
      });
    });

    /* ==========================================================
       LOGOUT
       ========================================================== */
    document.getElementById('btnLogout').addEventListener('click', function () {
      if (confirm('Tem certeza que deseja sair?')) { alert('Desconectado. Redirecionando...'); }
    });
