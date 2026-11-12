import { api, cnpjValido } from "../../../js/shared/api.js";
import {
  onlyDigits,
  mascaraCNPJ,
  mascaraCEP,
} from "../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../js/shared/cep.js";
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id),
    show = (n) => {
      document.querySelectorAll(".step").forEach((x) => (x.hidden = true));
      $("step" + n)?.removeAttribute("hidden");
      if (n === 3) $("companyForm").hidden = false;
      if (n === 4) $("paymentForm").hidden = false;
    };
  document
    .querySelectorAll("[data-next]")
    .forEach((b) => (b.onclick = () => show(b.dataset.next)));
  let data = null;
  api.getEmpresaDashboardStats().then((x) => {
    $("impactDonations").textContent = String(x.doacoes.length);
    $("impactKg").textContent = String(x.kg);
    $("impactPieces").textContent = String(x.pecas);
    $("impactDesigners").textContent = String(x.designers);
    $("impactCoupons").textContent = String(x.cupons);
  });
  $("cnpj").addEventListener("input", async () => {
    const d = onlyDigits($("cnpj").value);
    $("cnpj").value = mascaraCNPJ(d);
    if (d.length === 14 && cnpjValido(d)) {
      const result = await api.consultarCNPJ(d);
      $("razao").value = result.razaoSocial || "";
      $("fantasia").value = result.nomeFantasia || "";
    }
  });
  $("cep").addEventListener(
    "input",
    () => ($("cep").value = mascaraCEP($("cep").value)),
  );
  conectarBuscaCep($("cep"), {
    uf: $("uf"),
    cidade: $("cidade"),
    bairro: $("bairro"),
    logradouro: $("logradouro"),
  });
  $("adminTelefone").addEventListener("input", () => {
    const d = onlyDigits($("adminTelefone").value).slice(0, 11);
    $("adminTelefone").value =
      d.length > 2
        ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}${d.length > 7 ? `-${d.slice(7)}` : ""}`
        : d;
  });
  $("companyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("companyError");
    err.textContent = "";
    if (!cnpjValido($("cnpj").value)) {
      err.textContent = "Informe um CNPJ válido.";
      return;
    }
    if (
      onlyDigits($("cep").value).length !== 8 ||
      $("uf").value.trim().toUpperCase() !== "SP"
    ) {
      err.textContent = "Informe um CEP válido de SP para o ponto de coleta.";
      return;
    }
    if (
      $("adminSenha").value.length < 8 ||
      $("adminSenha").value !== $("adminConfirm").value
    ) {
      err.textContent =
        "As senhas devem ter pelo menos 8 caracteres e coincidir.";
      return;
    }
    if (!$("termos").checked) {
      err.textContent = "Aceite os termos para continuar.";
      return;
    }
    data = {
      cnpj: onlyDigits($("cnpj").value),
      razaoSocial: $("razao").value,
      nomeFantasia: $("fantasia").value,
      cep: onlyDigits($("cep").value),
      logradouro: $("logradouro").value,
      numero: $("numero").value,
      complemento: $("complemento").value,
      bairro: $("bairro").value,
      cidade: $("cidade").value,
      uf: "SP",
      horariosFuncionamento: [
        {
          diaSemana: "Segunda a sábado",
          abertura: $("abertura").value,
          fechamento: $("fechamento").value,
        },
      ],
      horarioRetirada: $("retirada").value,
      aceitaRetirada: $("aceitaRetirada").checked,
    };
    try {
      await api.guardarEmpresaPendente(data, {
        nome: $("adminNome").value,
        email: $("adminEmail").value,
        telefone: onlyDigits($("adminTelefone").value),
        senhaHash: $("adminSenha").value,
      });
      show(4);
    } catch (error) {
      err.textContent = error.message;
    }
  });
  $("cardNumber").addEventListener("input", () => {
    const raw = $("cardNumber").value;
    if (/^[\d ]*$/.test(raw))
      $("cardNumber").value = onlyDigits(raw)
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, "$1 ");
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
    const err = $("paymentError"),
      number = onlyDigits($("cardNumber").value),
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
      await api.registrarEmpresaComAssinatura(
        data,
        {
          nome: $("adminNome").value,
          email: $("adminEmail").value,
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
            nome: $("adminNome").value,
            perfilEmpresa: "ADMIN",
          }),
        );
      } catch {}
      show(5);
      setTimeout(() => (location.href = "../painel/index.html"), 700);
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
});
