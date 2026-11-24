import { api, cnpjValido } from "../../../js/shared/api.js";
import {
  onlyDigits,
  mascaraCNPJ,
  mascaraCEP,
  mascaraTelefone,
} from "../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../js/shared/cep.js";
import {
  runWithDynamicLoading,
  evaluatePasswordStrength,
} from "../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const wizardCard = $("empresaWizardCard");

  let currentSubStep = 1;
  let maxSubStep = 1;
  let data = null;

  const SUBSTEP_LABELS = {
    1: "Bloco 1 de 3 · Empresa e conta Diretor",
    2: "Bloco 2 de 3 · Endereço do ponto de coleta (SP)",
    3: "Bloco 3 de 3 · Horários, logística e termos",
  };

  const updateStepper = (stepNum) => {
    const indicators = document.querySelectorAll("[data-step-indicator]");
    indicators.forEach((item) => {
      const idx = Number(item.dataset.stepIndicator);
      item.classList.remove("is-active", "is-done");
      item.removeAttribute("aria-current");
      if (stepNum >= 5 || idx < stepNum) {
        item.classList.add("is-done");
      } else if (idx === stepNum) {
        item.classList.add("is-active");
        item.setAttribute("aria-current", "step");
      }
    });
  };

  const updateCompanySummary = () => {
    const nameEl = $("companySummaryName");
    const metaEl = $("companySummaryMeta");
    if (nameEl) {
      nameEl.textContent =
        $("fantasia").value.trim() ||
        $("razao").value.trim() ||
        "Nova Empresa Parceira";
    }
    if (metaEl) {
      metaEl.textContent = [
        $("cnpj").value || "CNPJ",
        $("adminNome").value.trim() || "Diretor",
        $("cidade").value.trim()
          ? `${$("cidade").value.trim()}/${$("uf").value.trim().toUpperCase()}`
          : "SP",
      ].join(" · ");
    }
  };

  const goCompanySubStep = (sub) => {
    currentSubStep = Math.max(1, Math.min(3, Number(sub)));
    maxSubStep = Math.max(maxSubStep, currentSubStep);
    $("companyError").textContent = "";

    document.querySelectorAll("[data-company-pane]").forEach((pane) => {
      pane.hidden = Number(pane.dataset.companyPane) !== currentSubStep;
    });

    document.querySelectorAll("[data-company-substep]").forEach((btn) => {
      const idx = Number(btn.dataset.companySubstep);
      btn.classList.toggle("is-active", idx === currentSubStep);
      btn.classList.toggle("is-done", idx < currentSubStep);
      btn.disabled = idx > maxSubStep;
    });

    if ($("companySubStepCounter")) {
      $("companySubStepCounter").textContent = SUBSTEP_LABELS[currentSubStep];
    }
    if ($("companyBtnBackToStep2")) {
      $("companyBtnBackToStep2").hidden = currentSubStep !== 1;
    }
    if ($("companyBtnSubPrev")) {
      $("companyBtnSubPrev").hidden = currentSubStep === 1;
    }
    if ($("companyBtnSubNext")) {
      $("companyBtnSubNext").hidden = currentSubStep === 3;
    }
    if ($("companyBtnSubmit")) {
      $("companyBtnSubmit").hidden = currentSubStep !== 3;
    }

    if (currentSubStep === 3) updateCompanySummary();
  };

  const validateCompanySubStep = (sub) => {
    const err = $("companyError");
    err.textContent = "";

    if (sub === 1) {
      if (!cnpjValido($("cnpj").value)) {
        err.textContent = "Informe um CNPJ válido (14 dígitos).";
        $("cnpj").focus();
        return false;
      }
      if (!$("razao").value.trim() || !$("fantasia").value.trim()) {
        err.textContent = "Preencha a Razão Social e o Nome Fantasia.";
        (!($("razao").value.trim()) ? $("razao") : $("fantasia")).focus();
        return false;
      }
      if (
        $("adminNome").value.trim().length < 3 ||
        !$("adminEmail").value.trim() ||
        !$("adminEmail").validity.valid ||
        onlyDigits($("adminTelefone").value).length < 10
      ) {
        err.textContent =
          "Informe nome, e-mail corporativo válido e telefone com DDD do Diretor.";
        return false;
      }
      if (
        $("adminSenha").value.length < 8 ||
        $("adminSenha").value !== $("adminConfirm").value
      ) {
        err.textContent =
          "As senhas devem ter pelo menos 8 caracteres e coincidir.";
        $("adminSenha").focus();
        return false;
      }
      return true;
    }

    if (sub === 2) {
      if (
        onlyDigits($("cep").value).length !== 8 ||
        $("uf").value.trim().toUpperCase() !== "SP"
      ) {
        err.textContent =
          "Informe um CEP válido do estado de São Paulo (UF = SP).";
        $("cep").focus();
        return false;
      }
      if (
        !$("cidade").value.trim() ||
        !$("bairro").value.trim() ||
        !$("logradouro").value.trim() ||
        !$("numero").value.trim()
      ) {
        err.textContent =
          "Preencha cidade, bairro, rua/logradouro e número do ponto de coleta.";
        return false;
      }
      return true;
    }

    if (sub === 3) {
      if (!$("abertura").value || !$("fechamento").value) {
        err.textContent = "Informe o horário de abertura e fechamento.";
        return false;
      }
      if (!$("termos").checked) {
        err.textContent = "Aceite os Termos de Parceria Circular para continuar.";
        return false;
      }
      return true;
    }
    return true;
  };

  const show = (n) => {
    const stepNum = Number(n);
    document.querySelectorAll(".step").forEach((x) => {
      x.hidden = true;
    });
    $("step" + stepNum)?.removeAttribute("hidden");
    if (stepNum === 3) {
      $("companyForm").hidden = false;
      goCompanySubStep(currentSubStep);
    }
    if (stepNum === 4) $("paymentForm").hidden = false;
    updateStepper(stepNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  document
    .querySelectorAll("[data-next]")
    .forEach((b) => (b.onclick = () => show(b.dataset.next)));

  $("companyBtnSubNext")?.addEventListener("click", () => {
    if (validateCompanySubStep(currentSubStep)) {
      goCompanySubStep(currentSubStep + 1);
    }
  });

  $("companyBtnSubPrev")?.addEventListener("click", () => {
    goCompanySubStep(currentSubStep - 1);
  });

  $("companyEditSub1")?.addEventListener("click", () => goCompanySubStep(1));

  document.querySelectorAll("[data-company-substep]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.companySubstep);
      if (target < currentSubStep || validateCompanySubStep(currentSubStep)) {
        goCompanySubStep(target);
      }
    });
  });

  $("companyForm").addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      currentSubStep < 3 &&
      e.target.tagName === "INPUT"
    ) {
      e.preventDefault();
      if (validateCompanySubStep(currentSubStep)) {
        goCompanySubStep(currentSubStep + 1);
      }
    }
  });

  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.togglePassword);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  api.getEmpresaDashboardStats().then((x) => {
    $("impactDonations").textContent = String(x.doacoes.length);
    $("impactKg").textContent = String(x.kg);
    $("impactPieces").textContent = String(x.pecas);
    $("impactDesigners").textContent = String(x.designers);
    $("impactCoupons").textContent = String(x.cupons);
  });

  $("cnpj").addEventListener("input", async () => {
    const d = onlyDigits($("cnpj").value).slice(0, 14);
    $("cnpj").value = mascaraCNPJ(d);
    const badge = $("cnpjBadge");

    if (d.length === 14) {
      const ok = cnpjValido(d);
      if (badge) {
        badge.textContent = ok ? "Válido ✓" : "Inválido";
        badge.classList.toggle("is-ok", ok);
        badge.classList.toggle("is-warn", !ok);
      }
      if (ok) {
        const wrap = $("cnpjLookupWrap");
        wrap?.classList.add("is-loading");
        try {
          const result = await api.consultarCNPJ(d);
          if (result?.razaoSocial) {
            $("razao").value = result.razaoSocial;
            $("razao").classList.add("is-autofilled");
          }
          if (result?.nomeFantasia) {
            $("fantasia").value = result.nomeFantasia;
            $("fantasia").classList.add("is-autofilled");
          }
        } finally {
          wrap?.classList.remove("is-loading");
        }
      }
    } else if (badge) {
      badge.textContent = "Auto";
      badge.classList.remove("is-ok", "is-warn");
    }
  });

  $("cep").addEventListener("input", () => {
    $("cep").value = mascaraCEP($("cep").value);
  });

  $("uf").addEventListener("input", () => {
    $("uf").value = $("uf")
      .value.toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 2);
  });

  conectarBuscaCep(
    $("cep"),
    {
      uf: $("uf"),
      cidade: $("cidade"),
      bairro: $("bairro"),
      logradouro: $("logradouro"),
    },
    {
      aoEncontrar: (dados) => {
        const badge = $("cepEmpresaBadge");
        const isSp = String(dados.uf || "").toUpperCase() === "SP";
        if (badge) {
          badge.textContent = isSp ? "SP ✓" : `${dados.uf} (apenas SP)`;
          badge.classList.toggle("is-ok", isSp);
          badge.classList.toggle("is-warn", !isSp);
        }
        $("numero")?.focus();
      },
    },
  );

  $("adminTelefone").addEventListener("input", () => {
    $("adminTelefone").value = mascaraTelefone($("adminTelefone").value);
  });

  const syncAdminPassword = () => {
    const info = evaluatePasswordStrength($("adminSenha").value);
    const meter = $("adminPassStrength");
    const label = $("adminPassStrengthLabel");
    if (meter) meter.dataset.tone = info.tone;
    if (label) label.textContent = info.label;

    const matchBadge = $("adminMatchBadge");
    if (matchBadge) {
      const matched =
        $("adminConfirm").value.length >= 8 &&
        $("adminConfirm").value === $("adminSenha").value;
      matchBadge.hidden = !matched;
      matchBadge.classList.toggle("is-ok", matched);
    }
  };

  $("adminSenha").addEventListener("input", syncAdminPassword);
  $("adminConfirm").addEventListener("input", syncAdminPassword);

  $("companyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    for (const s of [1, 2, 3]) {
      if (!validateCompanySubStep(s)) {
        goCompanySubStep(s);
        return;
      }
    }

    data = {
      cnpj: onlyDigits($("cnpj").value),
      razaoSocial: $("razao").value.trim(),
      nomeFantasia: $("fantasia").value.trim(),
      cep: onlyDigits($("cep").value),
      logradouro: $("logradouro").value.trim(),
      numero: $("numero").value.trim(),
      complemento: $("complemento").value.trim(),
      bairro: $("bairro").value.trim(),
      cidade: $("cidade").value.trim(),
      uf: "SP",
      horariosFuncionamento: [
        {
          diaSemana: "Segunda a sábado",
          abertura: $("abertura").value,
          fechamento: $("fechamento").value,
        },
      ],
      horarioRetirada: $("retirada").value.trim(),
      aceitaRetirada: $("aceitaRetirada").checked,
    };

    try {
      await runWithDynamicLoading({
        button: $("companyBtnSubmit"),
        container: wizardCard,
        title: "Registrando dados do Ponto de Coleta",
        steps: [
          "Validando CNPJ e endereço em São Paulo…",
          "Reservando credenciais de Diretor…",
          "Preparando ativação da assinatura…",
        ],
        buttonLabel: "Validando…",
        successText: "Dados validados!",
        minDuration: 820,
        task: async () => {
          await api.guardarEmpresaPendente(data, {
            nome: $("adminNome").value.trim(),
            email: $("adminEmail").value.trim(),
            telefone: onlyDigits($("adminTelefone").value),
            senhaHash: $("adminSenha").value,
          });
        },
      });
      show(4);
    } catch (error) {
      $("companyError").textContent = error.message;
    }
  });

  const detectBrand = (digits) => {
    if (!digits) return "CARTÃO";
    const first = digits[0];
    if (first === "4") return "VISA";
    if (first === "5") return "MASTERCARD";
    if (first === "3") return "AMEX";
    return "CARTÃO";
  };

  $("cardNumber").addEventListener("input", () => {
    const raw = $("cardNumber").value;
    if (/^[\d ]*$/.test(raw)) {
      const digits = onlyDigits(raw).slice(0, 16);
      $("cardNumber").value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
      const badge = $("cardBrandBadge");
      if (badge) badge.textContent = detectBrand(digits);
    }
  });

  $("expiry").addEventListener("input", () => {
    const raw = $("expiry").value;
    if (!/^\d*$/.test(raw.replace("/", ""))) return;
    const d = onlyDigits(raw).slice(0, 4);
    $("expiry").value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  });

  $("cvv").addEventListener("input", () => {
    if (/^\d*$/.test($("cvv").value))
      $("cvv").value = $("cvv").value.slice(0, 4);
  });

  $("paymentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("paymentError");
    err.textContent = "";
    const number = onlyDigits($("cardNumber").value),
      [mm, yy] = $("expiry").value.split("/").map(Number),
      now = new Date(),
      fullYear = 2000 + (yy || 0),
      validUntil =
        mm >= 1 &&
        mm <= 12 &&
        (fullYear > now.getFullYear() ||
          (fullYear === now.getFullYear() && mm >= now.getMonth() + 1));
    if (
      $("cardName").value.trim().length < 3 ||
      number.length !== 16 ||
      !validUntil ||
      !/^(\d{3}|\d{4})$/.test($("cvv").value)
    ) {
      err.textContent = "Confira nome, cartão de 16 dígitos, validade e CVV.";
      return;
    }
    let sum = 0,
      alt = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = +number[i];
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    if (sum % 10 !== 0) {
      err.textContent = "O número do cartão não passou na validação.";
      return;
    }
    const first = number[0],
      bandeira =
        first === "4"
          ? "VISA"
          : first === "5"
            ? "MASTERCARD"
            : first === "3"
              ? "AMEX"
              : "OUTRA";
    try {
      await runWithDynamicLoading({
        button: $("paymentBtnSubmit"),
        container: wizardCard,
        title: "Ativando Parceria Corporativa",
        steps: [
          "Confirmando assinatura demonstrativa…",
          "Homologando ponto de coleta e conta Diretor…",
          "Liberando Painel ESG da Empresa…",
        ],
        buttonLabel: "Ativando…",
        successText: "Parceria ativada!",
        minDuration: 960,
        task: async () => {
          await api.registrarEmpresaComAssinatura(
            data,
            {
              nome: $("adminNome").value.trim(),
              email: $("adminEmail").value.trim(),
              telefone: onlyDigits($("adminTelefone").value),
              senhaHash: $("adminSenha").value,
            },
            { bandeiraCartao: bandeira, ultimos4Digitos: number.slice(-4) },
          );
          try {
            sessionStorage.setItem(
              "continuum_sessao",
              JSON.stringify({
                perfil: "empresa",
                nome: $("adminNome").value.trim(),
                perfilEmpresa: "DIRETOR",
              }),
            );
          } catch {}
        },
      });
      show(5);
      setTimeout(() => (location.href = "../painel/index.html"), 700);
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
});
