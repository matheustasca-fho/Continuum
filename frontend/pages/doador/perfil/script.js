(() => {
  "use strict";

  const TRAIL_DOT_COUNT = 8;
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  const MANIFESTO_LIMIT = 500;
  const MANIFESTO_WARNING = 450;
  const TOAST_DURATION_MS = 3000;

  const $ = (id) => document.getElementById(id);

  /* ==========================================================
     THREAD TRAIL — fio que segue o mouse
     ========================================================== */
  const initThreadTrail = () => {
    const trail = $("threadTrail");
    if (!trail) return;

    const mouse = { x: 0, y: 0 };
    let trailActive = false;

    const createDot = (index) => {
      const dot = trail.cloneNode();
      const size = `${6 - index * 0.5}px`;
      dot.id = "";
      Object.assign(dot.style, {
        position: "fixed",
        pointerEvents: "none",
        zIndex: "9999",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "var(--color-primary)",
        opacity: "0",
        transition: "opacity 0.3s",
      });
      document.body.appendChild(dot);
      return { el: dot, x: 0, y: 0 };
    };

    const trailDots = Array.from({ length: TRAIL_DOT_COUNT }, (_, index) =>
      createDot(index),
    );
    trail.remove();

    const setTrailOpacity = (value) =>
      trailDots.forEach(({ el }) => {
        el.style.opacity = value;
      });

    document.addEventListener("mousemove", (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      if (!trailActive) {
        trailActive = true;
        setTrailOpacity("0.25");
      }
    });

    document.addEventListener("mouseleave", () => {
      trailActive = false;
      setTrailOpacity("0");
    });

    const animateTrail = () => {
      let prevX = mouse.x;
      let prevY = mouse.y;
      trailDots.forEach((dot, index) => {
        const speed = 0.25 - index * 0.02;
        dot.x += (prevX - dot.x) * speed;
        dot.y += (prevY - dot.y) * speed;
        dot.el.style.left = `${dot.x}px`;
        dot.el.style.top = `${dot.y}px`;
        prevX = dot.x;
        prevY = dot.y;
      });
      requestAnimationFrame(animateTrail);
    };
    animateTrail();
  };

  /* ==========================================================
     AVATAR UPLOAD
     ========================================================== */
  const showAvatar = (src) => {
    const circle = document.querySelector(".avatar__circle");
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Foto de perfil";
    img.style.cssText =
      "width:100%;height:100%;object-fit:cover;border-radius:50%";
    circle.innerHTML = "";
    circle.appendChild(img);
  };

  const handleAvatarSelected = (event, fileInput) => {
    const [file] = event.target.files;
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      alert("Máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => showAvatar(loadEvent.target.result);
    reader.readAsDataURL(file);
    fileInput.remove();
  };

  const initAvatarUpload = () => {
    document.querySelector(".avatar__edit").addEventListener("click", () => {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/jpeg,image/png";
      fileInput.style.display = "none";
      fileInput.addEventListener("change", (event) =>
        handleAvatarSelected(event, fileInput),
      );
      document.body.appendChild(fileInput);
      fileInput.click();
    });
  };

  /* ==========================================================
     TEXTAREA CHAR COUNT
     ========================================================== */
  const initManifestoCounter = () => {
    const manifesto = $("manifesto");
    const counter = $("manifestoCount");

    const counterColor = (length) => {
      if (length >= MANIFESTO_LIMIT) return "var(--color-error)";
      if (length > MANIFESTO_WARNING) return "var(--color-warning)";
      return "var(--color-muted-text)";
    };

    const update = () => {
      const { length } = manifesto.value;
      counter.textContent = `${length} / ${MANIFESTO_LIMIT}`;
      counter.style.color = counterColor(length);
    };

    manifesto.addEventListener("input", update);
    update();
  };

  /* ==========================================================
     MASKS
     ========================================================== */
  const onlyDigits = (value) => value.replace(/\D/g, "");

  const maskCep = (value) => {
    const digits = onlyDigits(value).slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  };

  const maskPhone = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length > 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length > 6)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 0) return `(${digits}`;
    return digits;
  };

  const bindMask = (id, maskFn) => {
    $(id).addEventListener("input", (event) => {
      event.target.value = maskFn(event.target.value);
    });
  };

  /* ==========================================================
     FORM + TOAST
     ========================================================== */
  const showToast = (message) => {
    const toast = $("toast");
    $("toastMsg").textContent = message;
    toast.classList.add("toast--visible");
    setTimeout(
      () => toast.classList.remove("toast--visible"),
      TOAST_DURATION_MS,
    );
  };

  const clearGroupError = (group) => {
    group.classList.remove("form-group--error");
    group.querySelector(".form-message")?.remove();
  };

  const markFieldInvalid = (field, message) => {
    const group = field.closest(".form-group");
    const feedback = document.createElement("span");
    feedback.className = "form-message";
    feedback.textContent = message;
    group.classList.add("form-group--error");
    group.appendChild(feedback);
    field.setAttribute("aria-invalid", "true");
  };

  const isInvalid = (field) =>
    !field.value.trim() ||
    (field.type === "email" && !field.value.includes("@"));

  const initProfileForm = () => {
    const requiredFields = [
      { el: $("apelido"), msg: "Informe o apelido ou nome do ateliê." },
      { el: $("nomeCompleto"), msg: "Informe o nome completo." },
      { el: $("email"), msg: "Informe um e-mail válido." },
    ];

    $("profileForm").addEventListener("submit", (event) => {
      event.preventDefault();
      document.querySelectorAll(".form-group--error").forEach(clearGroupError);

      const invalidFields = requiredFields.filter(({ el }) => isInvalid(el));
      invalidFields.forEach(({ el, msg }) => markFieldInvalid(el, msg));

      if (invalidFields.length) {
        $("btn-dados").click();
        return;
      }
      showToast("Alterações salvas com sucesso!");
    });

    document.querySelectorAll(".form-input,.form-textarea").forEach((field) => {
      field.addEventListener("input", () => {
        const group = field.closest(".form-group");
        if (!group?.classList.contains("form-group--error")) return;
        clearGroupError(group);
        field.removeAttribute("aria-invalid");
      });
    });
  };

  /* ==========================================================
     LOGOUT
     ========================================================== */
  const initLogout = () => {
    $("btnLogout").addEventListener("click", () => {
      if (confirm("Tem certeza que deseja sair?"))
        alert("Desconectado. Redirecionando...");
    });
  };

  initThreadTrail();
  initAvatarUpload();
  initManifestoCounter();
  bindMask("cep", maskCep);
  bindMask("telefone", maskPhone);
  initProfileForm();
  initLogout();
})();
