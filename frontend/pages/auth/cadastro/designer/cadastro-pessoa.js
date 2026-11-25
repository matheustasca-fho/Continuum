import { api } from "../../../../js/shared/api.js";
import {
  validarCPF,
  validarCNPJ,
  onlyDigits,
  mascaraCPF,
  mascaraCNPJ,
  mascaraCEP,
  mascaraTelefone,
} from "../../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../../js/shared/cep.js";
import {
  runWithDynamicLoading,
  evaluatePasswordStrength,
} from "../../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const card = $("designerSignupCard");
  const form = $("formCadastroPessoa");
  const status = $("personFormStatus");
  const stepper = $("designerStepper");
  const doneView = $("designerDoneView");
  const stepCounter = $("designerStepCounter");
  const btnPrev = $("designerBtnPrev");
  const btnNext = $("designerBtnNext");
  const btnSubmit = $("designerBtnSubmit");

  let type = "PF";
  let currentStep = 1;
  let maxUnlockedStep = 1;

  const f = {
    doc: $("documentoPessoa"),
    pass: $("senhaPessoa"),
    confirm: $("confirmarSenhaPessoa"),
    name: $("nomeConfeccionista"),
    email: $("emailConfeccionista"),
    phone: $("telefoneConfeccionista"),
    cep: $("cepPessoa"),
    street: $("logradouroPessoa"),
    number: $("numeroEndereco"),
    complement: $("complementoPessoa"),
    uf: $("ufPessoa"),
    city: $("cidadePessoa"),
    bairro: $("bairroPessoa"),
    razao: $("razaoSocialDesigner"),
  };

  const hints = {
    doc: $("docAjuda"),
    name: $("nomePessoaAjuda"),
    razao: $("razaoAjuda"),
    email: $("emailPessoaAjuda"),
    phone: $("telefonePessoaAjuda"),
    pass: $("senhaPessoaAjuda"),
    confirm: $("confirmarPessoaAjuda"),
    cep: $("cepPessoaAjuda"),
    street: $("logradouroAjuda"),
  };

  const setStatus = (msg, isSuccess = false) => {
    status.textContent = msg || "";
    status.classList.toggle("is-success", Boolean(msg && isSuccess));
  };

  const check = (key, msg) => {
    const el = f[key];
    const hint = hints[key];
    if (!el) return true;
    el.setCustomValidity(msg);
    el.setAttribute("aria-invalid", String(Boolean(msg)));
    if (hint) {
      hint.textContent = msg;
      hint.style.display = msg ? "block" : "none";
    }
    return !msg;
  };

  const v = {
    name: () =>
      check(
        "name",
        f.name.value.trim().length >= 3 ? "" : "Informe pelo menos 3 caracteres.",
      ),
    doc: () =>
      check(
        "doc",
        (type === "PF" ? validarCPF(f.doc.value) : validarCNPJ(f.doc.value))
          ? ""
          : `Informe um ${type === "PF" ? "CPF" : "CNPJ"} válido.`,
      ),
    razao: () =>
      type !== "PJ"
        ? check("razao", "")
        : check(
            "razao",
            f.razao.value.trim().length >= 2 ? "" : "Informe a Razão Social.",
          ),
    email: () =>
      check(
        "email",
        f.email.value.trim() && f.email.validity.valid
          ? ""
          : "Informe um e-mail válido.",
      ),
    phone: () =>
      check(
        "phone",
        onlyDigits(f.phone.value).length >= 10
          ? ""
          : "Informe telefone com DDD.",
      ),
    pass: () =>
      check(
        "pass",
        f.pass.value.length >= 8
          ? ""
          : "A senha deve ter pelo menos 8 caracteres.",
      ),
    confirm: () =>
      check(
        "confirm",
        f.confirm.value && f.confirm.value === f.pass.value
          ? ""
          : "As senhas precisam coincidir.",
      ),
    cep: () =>
      check(
        "cep",
        onlyDigits(f.cep.value).length === 8
          ? ""
          : "O CEP deve conter 8 dígitos.",
      ),
    city: () => check("city", f.city.value.trim() ? "" : "Informe a cidade."),
    uf: () =>
      check("uf", f.uf.value.trim().length === 2 ? "" : "Informe a UF."),
    street: () =>
      check("street", f.street.value.trim() ? "" : "Informe o logradouro."),
    number: () =>
      check("number", f.number.value.trim() ? "" : "Informe o número."),
    bairro: () =>
      check("bairro", f.bairro.value.trim() ? "" : "Informe o bairro."),
  };

  const setType = (t) => {
    type = t === "fisica" ? "PF" : "PJ";
    document
      .querySelectorAll(".person-switch__option")
      .forEach((x) => x.setAttribute("aria-pressed", String(x.value === t)));
    $("documentoTipo").textContent = type === "PF" ? "CPF" : "CNPJ";
    f.doc.name = type === "PF" ? "CPF" : "CNPJ";
    f.doc.placeholder =
      type === "PF" ? "000.000.000-00" : "00.000.000/0000-00";
    $("nomePessoaLabel").textContent =
      type === "PF" ? "Nome completo" : "Nome do responsável";
    f.name.placeholder =
      type === "PF" ? "Nome completo" : "Nome do responsável";
    f.doc.value = "";
    f.doc.setAttribute("aria-invalid", "false");
    if (hints.doc) hints.doc.style.display = "none";
    const docBadge = $("docStatusBadge");
    if (docBadge) {
      docBadge.textContent = "Obrigatório";
      docBadge.classList.remove("is-ok", "is-warn");
    }
    if ($("designerTypePill")) {
      $("designerTypePill").textContent =
        type === "PF" ? "PF · CPF" : "PJ · CNPJ";
    }
    if (type !== "PJ") f.razao.value = "";
    f.doc.maxLength = type === "PF" ? 14 : 18;
    $("razaoSocialField").hidden = type !== "PJ";
    f.razao.required = type === "PJ";
    f.razao.disabled = type !== "PJ";
  };

  document
    .querySelectorAll(".person-switch__option")
    .forEach((x) => x.addEventListener("click", () => setType(x.value)));
  setType("fisica");

  const updateSummary = () => {
    const nameEl = $("designerSummaryName");
    const metaEl = $("designerSummaryMeta");
    if (nameEl) {
      nameEl.textContent =
        (type === "PJ" && f.razao.value.trim()) ||
        f.name.value.trim() ||
        "Novo Designer";
    }
    if (metaEl) {
      metaEl.textContent = [
        type,
        f.doc.value || "Documento",
        f.city.value.trim()
          ? `${f.city.value.trim()}/${f.uf.value.trim().toUpperCase()}`
          : "Ateliê",
      ].join(" · ");
    }
  };

  const stepValidators = {
    1: () => {
      const keys = ["name", "doc", "razao", "email", "phone", "pass", "confirm"];
      const res = keys.map((k) => v[k]());
      if (!res.every(Boolean)) {
        setStatus("Confira os dados da conta e documento antes de avançar.");
        const bad = keys.find((_, i) => !res[i]);
        f[bad]?.focus();
        return false;
      }
      return true;
    },
    2: () => {
      const keys = ["cep", "city", "uf", "street", "number", "bairro"];
      const res = keys.map((k) => v[k]());
      if (!res.every(Boolean)) {
        setStatus("Preencha o endereço completo do ateliê.");
        const bad = keys.find((_, i) => !res[i]);
        f[bad]?.focus();
        return false;
      }
      return true;
    },
    3: () => {
      if (!$("maioridadeDesigner").checked || !$("termosDesigner").checked) {
        setStatus("Confirme a maioridade e aceite os termos obrigatórios.");
        return false;
      }
      return true;
    },
  };

  const goToStep = (step) => {
    currentStep = Math.max(1, Math.min(3, Number(step)));
    maxUnlockedStep = Math.max(maxUnlockedStep, currentStep);
    setStatus("");

    document.querySelectorAll("[data-step-pane]").forEach((pane) => {
      pane.hidden = Number(pane.dataset.stepPane) !== currentStep;
    });

    document.querySelectorAll("[data-step-btn]").forEach((btn) => {
      const idx = Number(btn.dataset.stepBtn);
      btn.classList.toggle("is-active", idx === currentStep);
      btn.classList.toggle("is-done", idx < currentStep);
      btn.disabled = idx > maxUnlockedStep;
    });

    if (stepCounter) stepCounter.textContent = `Etapa ${currentStep} de 3`;
    if (btnPrev) btnPrev.hidden = currentStep === 1;
    if (btnNext) btnNext.hidden = currentStep === 3;
    if (btnSubmit) btnSubmit.hidden = currentStep !== 3;
    if (currentStep === 3) updateSummary();
  };

  btnNext?.addEventListener("click", () => {
    if (stepValidators[currentStep]()) goToStep(currentStep + 1);
  });

  btnPrev?.addEventListener("click", () => goToStep(currentStep - 1));
  $("designerEditStep1")?.addEventListener("click", () => goToStep(1));

  document.querySelectorAll("[data-step-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.stepBtn);
      if (target < currentStep || stepValidators[currentStep]()) {
        goToStep(target);
      }
    });
  });

  // CEP dinâmico
  conectarBuscaCep(
    f.cep,
    { logradouro: f.street, bairro: f.bairro, cidade: f.city, uf: f.uf },
    {
      aoEncontrar: (dados) => {
        const badge = $("cepPessoaBadge");
        if (badge) {
          badge.textContent = `${dados.uf} ✓`;
          badge.classList.add("is-ok");
        }
        v.city();
        v.uf();
        v.street();
        v.bairro();
        f.number.focus();
      },
    },
  );

  // Documento com auto-consulta de CNPJ quando PJ
  f.doc.addEventListener("input", async () => {
    const targetLen = type === "PF" ? 11 : 14;
    const d = onlyDigits(f.doc.value).slice(0, targetLen);
    f.doc.value = type === "PF" ? mascaraCPF(d) : mascaraCNPJ(d);
    const docBadge = $("docStatusBadge");

    if (d.length === targetLen) {
      const ok = v.doc();
      if (docBadge) {
        docBadge.textContent = ok ? "Válido ✓" : "Inválido";
        docBadge.classList.toggle("is-ok", ok);
        docBadge.classList.toggle("is-warn", !ok);
      }
      if (ok && type === "PJ") {
        const wrap = $("docLookupWrap");
        wrap?.classList.add("is-loading");
        try {
          const res = await api.consultarCNPJ(d);
          if (res?.razaoSocial && !f.razao.value.trim()) {
            f.razao.value = res.razaoSocial;
            f.razao.classList.add("is-autofilled");
            v.razao();
          }
        } catch {}
        wrap?.classList.remove("is-loading");
      }
    } else if (docBadge) {
      docBadge.textContent = "Obrigatório";
      docBadge.classList.remove("is-ok", "is-warn");
    }
  });

  f.cep.addEventListener("input", () => {
    f.cep.value = mascaraCEP(f.cep.value);
    if (onlyDigits(f.cep.value).length === 8) v.cep();
  });

  f.phone.addEventListener("input", () => {
    f.phone.value = mascaraTelefone(f.phone.value);
    if (onlyDigits(f.phone.value).length >= 10) v.phone();
  });

  f.uf.addEventListener("input", () => {
    f.uf.value = f.uf.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  });

  const syncPasswordFeedback = () => {
    const info = evaluatePasswordStrength(f.pass.value);
    const meter = $("designerPassStrength");
    const label = $("designerPassStrengthLabel");
    if (meter) meter.dataset.tone = info.tone;
    if (label) label.textContent = info.label;

    const matchBadge = $("designerMatchBadge");
    if (matchBadge) {
      const matched =
        f.confirm.value.length >= 8 && f.confirm.value === f.pass.value;
      matchBadge.hidden = !matched;
      matchBadge.classList.toggle("is-ok", matched);
    }
  };

  f.pass.addEventListener("input", () => {
    syncPasswordFeedback();
    if (f.pass.value.length >= 8) v.pass();
    if (f.confirm.value) v.confirm();
  });

  f.confirm.addEventListener("input", () => {
    syncPasswordFeedback();
    v.confirm();
  });

  Object.entries(v).forEach(([k, fn]) => {
    f[k]?.addEventListener("blur", fn);
  });

  document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.togglePass);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && currentStep < 3 && e.target.tagName === "INPUT") {
      e.preventDefault();
      if (stepValidators[currentStep]()) goToStep(currentStep + 1);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const s of [1, 2, 3]) {
      if (!stepValidators[s]()) {
        goToStep(s);
        return;
      }
    }

    setStatus("");
    try {
      await runWithDynamicLoading({
        button: btnSubmit,
        container: card,
        title: "Credenciando seu Ateliê no CONTINUUM",
        steps: [
          `Validando ${type === "PF" ? "CPF" : "CNPJ"} e credenciais…`,
          "Configurando vitrine de lotes e rastreabilidade QR…",
          "Liberando acesso ao Painel Designer…",
        ],
        buttonLabel: "Cadastrando…",
        successText: "Ateliê cadastrado!",
        task: async () => {
          const docDigits = onlyDigits(f.doc.value);
          const passVal = f.pass.value;
          const novo = await api.registrarConfeccionista({
            tipoPessoa: type,
            documento: docDigits,
            razaoSocial: f.razao.value.trim(),
            nomeProfissional: f.name.value.trim(),
            nome: f.name.value.trim(),
            email: f.email.value.trim(),
            telefone: onlyDigits(f.phone.value),
            cep: onlyDigits(f.cep.value),
            logradouro: f.street.value.trim(),
            numero: f.number.value.trim(),
            complemento: f.complement.value.trim(),
            bairro: f.bairro.value.trim(),
            cidade: f.city.value.trim(),
            uf: f.uf.value.trim().toUpperCase(),
            senhaHash: passVal,
            maioridadeConfirmada: true,
            comoConheceu: $("canalDesigner").value,
            consentimentoPerfilPublico: $("consentimentoPublicoDesigner").checked,
            consentimentoUsoImagem: $("consentimentoPublicoDesigner").checked,
            especialidades: [],
            faixaExperiencia: "",
            portfolio: "",
            manifesto: "",
            instagram: "",
            site: "",
          });
          try {
            await api.login("designer", docDigits, passVal);
            sessionStorage.setItem(
              "continuum_sessao",
              JSON.stringify({ perfil: "designer", nome: novo.nome }),
            );
          } catch {}
        },
      });

      setStatus("Cadastro realizado com sucesso!", true);
      form.hidden = true;
      if (stepper) stepper.hidden = true;
      if (doneView) doneView.hidden = false;
      setTimeout(() => {
        window.location.href = "../../../designer/painel/index.html";
      }, 650);
    } catch (err) {
      setStatus(err.message || "Não foi possível concluir o cadastro.");
    }
  });
});
