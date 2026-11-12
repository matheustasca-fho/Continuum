import { api } from "../../../../js/shared/api.js";
import {
  validarCPF,
  onlyDigits,
  mascaraCPF,
  mascaraCEP,
  mascaraTelefone,
} from "../../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../../js/shared/cep.js";
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
  conectarBuscaCep(f.cep, fields, { aoEncontrar: () => f.number.focus() });
  const hints = {
    cpf: $("cpfAjuda"),
    cep: $("cepAjuda"),
    pass: $("senhaAjuda"),
    confirm: $("confirmarSenhaAjuda"),
    email: $("emailAjuda"),
    phone: $("telefoneAjuda"),
    terms: $("termosAjuda"),
  };
  const check = (key, msg) => {
    const el = f[key],
      hint = hints[key];
    el.setCustomValidity(msg);
    el.setAttribute("aria-invalid", String(!!msg));
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
          : "Informe nome e sobrenome (mínimo 3 caracteres).",
      ),
    cpf: () =>
      check("cpf", validarCPF(f.cpf.value) ? "" : "Informe um CPF válido."),
    email: () =>
      check("email", f.email.validity.valid ? "" : "Informe um e-mail válido."),
    phone: () =>
      check(
        "phone",
        onlyDigits(f.phone.value).length >= 10
          ? ""
          : "Informe telefone com DDD.",
      ),
    cep: () =>
      check(
        "cep",
        onlyDigits(f.cep.value).length === 8
          ? ""
          : "O CEP deve conter 8 dígitos.",
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
          : "As senhas precisam ser iguais.",
      ),
    terms: () =>
      check("terms", f.terms.checked ? "" : "Você precisa aceitar os termos."),
    uf: () =>
      check("uf", f.uf.value.trim() ? "" : "Informe a UF. Consulte o CEP."),
    city: () =>
      check(
        "city",
        f.city.value.trim() ? "" : "Informe a cidade. Consulte o CEP.",
      ),
    bairro: () =>
      check(
        "bairro",
        f.bairro.value.trim() ? "" : "Informe o bairro. Consulte o CEP.",
      ),
    street: () =>
      check(
        "street",
        f.street.value.trim() ? "" : "Informe o logradouro. Consulte o CEP.",
      ),
    number: () =>
      check(
        "number",
        f.number.value.trim() ? "" : "Informe o número do endereço.",
      ),
  };
  f.cpf.addEventListener("input", () => {
    f.cpf.value = mascaraCPF(f.cpf.value);
    v.cpf();
  });
  f.cep.addEventListener("input", () => {
    f.cep.value = mascaraCEP(f.cep.value);
    v.cep();
  });
  f.phone.addEventListener("input", () => {
    f.phone.value = mascaraTelefone(f.phone.value);
    v.phone();
  });
  Object.entries(v).forEach(([k, fn]) =>
    f[k].addEventListener(k === "terms" ? "change" : "blur", fn),
  );
  f.pass.addEventListener("input", () => {
    v.pass();
    v.confirm();
  });
  f.confirm.addEventListener("input", v.confirm);
  document
    .querySelector(".signup-form__password-toggle")
    ?.addEventListener(
      "click",
      () => (f.pass.type = f.pass.type === "password" ? "text" : "password"),
    );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valid = Object.values(v)
      .map((fn) => fn())
      .every(Boolean);
    if (!valid) {
      status.textContent = "Revise os campos destacados.";
      return;
    }
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
        senhaHash: f.pass.value,
      });
      status.textContent = "Cadastro realizado com sucesso!";
      form.reset();
    } catch (err) {
      status.textContent = err.message;
    }
  });
});
