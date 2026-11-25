import { api } from "../../../../js/shared/api.js";
import {
  validarCPF,
  onlyDigits,
  mascaraCPF,
  mascaraCEP,
  mascaraTelefone,
} from "../../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../../js/shared/cep.js";
import {
  runWithDynamicLoading,
  evaluatePasswordStrength,
} from "../../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id),
    form = $("formCadastroConta"),
    status = $("cadastroStatus"),
    f = {
      cpf: $("cpfDoador"),
      cep: $("cepDoador"),
      pass: $("senhaUsuario"),
      confirm: $("confirmarSenhaDoador"),
      name: $("nomeDoador"),
      email: $("emailDoador"),
      phone: $("telefoneDoador"),
      terms: $("aceiteTermosDoador"),
      uf: $("ufDoador"),
      city: $("cidadeDoador"),
      bairro: $("bairroDoador"),
      street: $("logradouroDoador"),
      number: $("numeroDoador"),
    };
  const fields = {
    uf: f.uf,
    cidade: f.city,
    bairro: f.bairro,
    logradouro: f.street,
  };
  const hints = {
    name: $("nomeAjuda"),
    cpf: $("cpfAjuda"),
    cep: $("cepAjuda"),
    pass: $("senhaAjuda"),
    confirm: $("confirmarSenhaAjuda"),
    email: $("emailAjuda"),
    phone: $("telefoneAjuda"),
    terms: $("termosAjuda"),
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
        f.name.value.trim().split(/\s+/).length >= 2 &&
          f.name.value.trim().length >= 3
          ? ""
          : "Informe nome e sobrenome.",
      ),
    cpf: () =>
      check("cpf", validarCPF(f.cpf.value) ? "" : "Informe um CPF válido."),
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
    uf: () =>
      check("uf", f.uf.value.trim().length === 2 ? "" : "Informe a UF."),
    city: () => check("city", f.city.value.trim() ? "" : "Informe a cidade."),
    bairro: () =>
      check("bairro", f.bairro.value.trim() ? "" : "Informe o bairro."),
    street: () =>
      check("street", f.street.value.trim() ? "" : "Informe a rua/logradouro."),
    number: () =>
      check("number", f.number.value.trim() ? "" : "Informe o número."),
    terms: () =>
      check(
        "terms",
        f.terms.checked ? "" : "Aceite os termos de uso para concluir.",
      ),
  };

  const stepValidators = {
    1: ["name", "cpf", "email", "phone", "pass", "confirm"],
    2: ["cep", "city", "uf", "street", "number", "bairro"],
    3: ["terms"],
  };

  const updateSummary = () => {
    const nameEl = $("doadorSummaryName");
    const metaEl = $("doadorSummaryMeta");
    if (nameEl) nameEl.textContent = f.name.value.trim() || "Novo Doador";
    if (metaEl) {
      const parts = [
        f.cpf.value || "CPF pendente",
        f.email.value.trim() || "E-mail",
        f.city.value.trim()
          ? `${f.city.value.trim()}/${f.uf.value.trim().toUpperCase()}`
          : "Endereço",
      ];
      metaEl.textContent = parts.join(" · ");
    }
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

  const validateStep = (step) => {
    const keys = stepValidators[step] || [];
    const results = keys.map((k) => v[k]());
    const ok = results.every(Boolean);
    if (!ok) {
      setStatus("Confira os campos destacados antes de avançar.");
      const firstInvalidKey = keys.find((_, i) => !results[i]);
      f[firstInvalidKey]?.focus();
    }
    return ok;
  };

  btnNext?.addEventListener("click", () => {
    if (validateStep(currentStep)) goToStep(currentStep + 1);
  });

  btnPrev?.addEventListener("click", () => goToStep(currentStep - 1));
  $("doadorEditStep1")?.addEventListener("click", () => goToStep(1));

  document.querySelectorAll("[data-step-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.stepBtn);
      if (target < currentStep || validateStep(currentStep)) {
        goToStep(target);
      }
    });
  });

  // CEP dinâmico com feedback visual
  conectarBuscaCep(
    f.cep,
    { uf: f.uf, cidade: f.city, bairro: f.bairro, logradouro: f.street },
    {
      aoEncontrar: (dados) => {
        const cepBadge = $("cepDoadorBadge");
        if (cepBadge) {
          cepBadge.textContent = `${dados.uf} ✓`;
          cepBadge.classList.add("is-ok");
        }
        v.uf();
        v.city();
        v.bairro();
        v.street();
        f.number.focus();
      },
    },
  );

  // Máscaras e indicadores em tempo real
  f.cpf.addEventListener("input", () => {
    f.cpf.value = mascaraCPF(f.cpf.value);
    const digits = onlyDigits(f.cpf.value);
    const badge = $("cpfBadge");
    if (digits.length === 11) {
      const ok = v.cpf();
      if (badge) {
        badge.textContent = ok ? "Válido ✓" : "Inválido";
        badge.classList.toggle("is-ok", ok);
        badge.classList.toggle("is-warn", !ok);
      }
    } else if (badge) {
      badge.textContent = "Cupom";
      badge.classList.remove("is-ok", "is-warn");
    }
  });

  f.cep.addEventListener("input", () => {
    f.cep.value = mascaraCEP(f.cep.value);
    if (onlyDigits(f.cep.value).length === 8) v.cep();
  });
  conectarBuscaCep(f.cep, fields, {
    aoEncontrar: () => {
      v.cep();
      v.uf();
      v.city();
      if (f.bairro.value.trim()) v.bairro();
      if (f.street.value.trim()) v.street();
    },
    aoErro: (msg) => check("cep", msg),
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
    const meter = $("doadorPassStrength");
    const label = $("doadorPassStrengthLabel");
    if (meter) meter.dataset.tone = info.tone;
    if (label) label.textContent = info.label;

    const matchBadge = $("doadorMatchBadge");
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
    f[k]?.addEventListener(k === "terms" ? "change" : "blur", fn);
  });

  document.querySelectorAll("[data-toggle-pass]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.togglePass);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // Navegação por Enter nas etapas 1 e 2 avança em vez de submeter prematuramente
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && currentStep < 3 && e.target.tagName === "INPUT") {
      e.preventDefault();
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const step of [1, 2, 3]) {
      const keys = stepValidators[step];
      const stepOk = keys.map((k) => v[k]()).every(Boolean);
      if (!stepOk) {
        goToStep(step);
        setStatus("Revise os campos destacados.");
        return;
      }
    }

    setStatus("");
    try {
      await api.registrarDoador({
        nome: f.name.value.trim(),
        cpf: onlyDigits(f.cpf.value),
        email: f.email.value.trim(),
        telefone: onlyDigits(f.phone.value),
        cep: onlyDigits(f.cep.value),
        uf: f.uf.value.trim().toUpperCase(),
        cidade: f.city.value.trim(),
        bairro: f.bairro.value.trim(),
        logradouro: f.street.value.trim(),
        numero: f.number.value.trim(),
        complemento: $("complementoDoador").value.trim(),
        faixaEtaria: $("faixaEtariaDoador").value,
        comoConheceu: $("comoConheceuDoador").value,
        termosAceitos: Boolean(f.terms.checked),
        senhaHash: f.pass.value,
      });
      status.textContent = "Cadastro realizado com sucesso!";
      form.reset();
    } catch (err) {
      setStatus(err.message || "Não foi possível concluir o cadastro.");
    }
  });
});
