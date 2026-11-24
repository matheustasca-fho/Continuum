import { api } from "../../../js/shared/api.js";
import {
  onlyDigits,
  mascaraCPF,
  mascaraCNPJ,
  mascaraCEP,
} from "../../../js/shared/validators.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const user = await api.getDesigner();
  if (!user) return;

  let pendingAvatar = user.foto || null;
  let toastTimer = null;

  const showToast = (msg) => {
    const toast = $("toast");
    if (!toast) return;
    $("toastMsg").textContent = msg;
    toast.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("toast--visible"), 3200);
  };

  // Alternância de Abas (Meus Dados <-> Minha Vitrine)
  const tabButtons = [
    { btn: $("btn-dados"), panel: $("tab-dados") },
    { btn: $("btn-vitrine"), panel: $("tab-vitrine") },
  ];

  tabButtons.forEach(({ btn, panel }) => {
    btn?.addEventListener("click", () => {
      tabButtons.forEach((item) => {
        const active = item.btn === btn;
        item.btn?.classList.toggle("tabs__btn--active", active);
        item.btn?.setAttribute("aria-selected", String(active));
        item.panel?.classList.toggle("tabs__panel--active", active);
      });
    });
  });

  // Especialidades Têxteis
  const specialties = [
    "Alfaiataria",
    "Jeanswear / Denim",
    "Malharia",
    "Patchwork",
    "Bordado / Aplicações",
    "Tingimento Natural",
    "Acessórios / Bolsas",
    "Upcycling Estrutural",
    "Crochê / Tricô",
  ];
  const experience = [
    "Menos de 1 ano",
    "1 a 3 anos",
    "3 a 5 anos",
    "5 a 10 anos",
    "Mais de 10 anos",
  ];

  const specialtyGrid = $("specialtyGrid");
  const checkSvg =
    '<svg class="tag-chip__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  specialtyGrid.replaceChildren();
  specialties.forEach((name, index) => {
    const id = `specialty-${index}`;
    const wrap = document.createElement("div");
    wrap.className = "tag-chip";
    wrap.innerHTML = `<input type="checkbox" class="tag-chip__input" id="${id}" name="especialidades" value="${name}"><label class="tag-chip__label" for="${id}">${checkSvg}${name}</label>`;
    specialtyGrid.appendChild(wrap);
  });

  const exp = $("experiencia");
  exp.replaceChildren(
    new Option("Selecione...", ""),
    ...experience.map((x) => new Option(x, x)),
  );

  const formatPhone = (raw) => {
    const d = onlyDigits(raw || "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const formatDoc = (doc) => {
    const d = onlyDigits(doc || "");
    if (d.length <= 11) return mascaraCPF(d);
    return mascaraCNPJ(d);
  };

  // Preenche formulário
  $("apelido").value = user.nomeProfissional || user.nome || "";
  $("nomeCompleto").value = user.razaoSocial || user.nome || "";
  $("documento").value = formatDoc(user.documento || "");
  $("email").value = user.email || "";
  $("telefone").value = formatPhone(user.telefone || "");
  $("cep").value = user.cep ? mascaraCEP(user.cep) : "";
  $("cidadeEstado").value = [user.cidade, user.uf].filter(Boolean).join(" / ");
  $("logradouro").value = [user.logradouro, user.numero, user.complemento]
    .filter(Boolean)
    .join(", ");
  $("sobreMim").value = user.sobreMim || "";
  $("manifesto").value = user.manifesto || "";
  $("instagram").value = String(user.instagram || "").replace(/^@/, "");
  $("website").value = String(user.portfolio || user.site || "").replace(
    /^https?:\/\//,
    "",
  );
  exp.value = user.faixaExperiencia || "";
  $("consentimentoPerfilPublico").checked = !!user.consentimentoPerfilPublico;

  const updateManifestoCount = () => {
    const countEl = $("manifestoCount");
    if (countEl) countEl.textContent = `${$("manifesto").value.length} / 500`;
  };
  updateManifestoCount();
  $("manifesto").addEventListener("input", updateManifestoCount);

  const checked = new Set(user.especialidades || []);
  document
    .querySelectorAll('input[name="especialidades"]')
    .forEach((x) => (x.checked = checked.has(x.value)));

  // Foto de perfil
  const renderAvatar = (src) => {
    const img = $("avatarImg");
    const placeholder = $("avatarPlaceholder");
    if (src) {
      img.src = src;
      img.hidden = false;
      if (placeholder) placeholder.style.display = "none";
    }
  };
  renderAvatar(pendingAvatar);

  $("btnEditAvatar")?.addEventListener("click", () => {
    $("avatarUploadInput")?.click();
  });

  $("avatarUploadInput")?.addEventListener("change", (e) => {
    const [file] = e.target.files || [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingAvatar = ev.target.result;
      renderAvatar(pendingAvatar);
    };
    reader.readAsDataURL(file);
  });

  // Máscaras e busca de CEP
  $("telefone").addEventListener("input", () => {
    $("telefone").value = formatPhone($("telefone").value);
  });

  $("cep").addEventListener("input", async () => {
    $("cep").value = mascaraCEP($("cep").value);
    const d = onlyDigits($("cep").value);
    if (d.length === 8) {
      const addr = await api.buscarCep(d);
      if (addr) {
        $("cidadeEstado").value = [addr.localidade, addr.uf]
          .filter(Boolean)
          .join(" / ");
        if (addr.logradouro) {
          $("logradouro").value = [addr.logradouro, addr.bairro]
            .filter(Boolean)
            .join(" - ");
        }
      }
    }
  });

  // Salvar alterações
  $("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = [
      ...document.querySelectorAll('input[name="especialidades"]:checked'),
    ].map((x) => x.value);

    const [cidade = "São Paulo", uf = "SP"] = $("cidadeEstado")
      .value.split("/")
      .map((s) => s.trim());

    try {
      await api.atualizarPerfilConfeccionista(user.id, {
        nomeProfissional: $("apelido").value.trim(),
        nome: $("apelido").value.trim() || user.nome,
        razaoSocial: $("nomeCompleto").value.trim(),
        email: $("email").value.trim(),
        telefone: onlyDigits($("telefone").value),
        cep: onlyDigits($("cep").value),
        cidade,
        uf,
        logradouro: $("logradouro").value.trim(),
        sobreMim: $("sobreMim").value.trim(),
        manifesto: $("manifesto").value.trim(),
        instagram: $("instagram").value.trim()
          ? `@${$("instagram").value.trim().replace(/^@/, "")}`
          : "",
        portfolio: $("website").value.trim(),
        site: $("website").value.trim(),
        faixaExperiencia: exp.value,
        especialidades: selected,
        foto: pendingAvatar,
        consentimentoPerfilPublico: $("consentimentoPerfilPublico").checked,
      });
      showToast("Perfil e vitrine atualizados com sucesso!");
    } catch (error) {
      alert(error.message);
    }
  });

  // Sair da conta
  $("btnLogout")?.addEventListener("click", () => {
    try {
      sessionStorage.removeItem("continuum_sessao");
    } catch {}
    api.logout();
    location.href = "../../auth/login/index.html";
  });
});
