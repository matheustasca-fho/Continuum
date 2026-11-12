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
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id),
    form = $("formCadastroPessoa"),
    status = $("personFormStatus");
  let type = "PF";
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
  conectarBuscaCep(
    f.cep,
    { logradouro: f.street, bairro: f.bairro, cidade: f.city, uf: f.uf },
    { aoEncontrar: () => f.number.focus() },
  );
  const setType = (t) => {
    type = t === "fisica" ? "PF" : "PJ";
    document
      .querySelectorAll(".person-switch__option")
      .forEach((x) => x.setAttribute("aria-pressed", String(x.value === t)));
    $("documentoTipo").textContent = type === "PF" ? "CPF" : "CNPJ";
    f.doc.value = "";
    f.doc.maxLength = type === "PF" ? 14 : 18;
    $("razaoSocialField").hidden = type !== "PJ";
    f.razao.required = type === "PJ";
  };
  document
    .querySelectorAll(".person-switch__option")
    .forEach((x) => x.addEventListener("click", () => setType(x.value)));
  const phoneMask = (v) => {
    const d = onlyDigits(v).slice(0, 11);
    return d.length > 2
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}${d.length > 7 ? `-${d.slice(7)}` : ""}`
      : d;
  };
  f.doc.addEventListener("input", () => {
    const d = onlyDigits(f.doc.value).slice(0, type === "PF" ? 11 : 14);
    f.doc.value = type === "PF" ? mascaraCPF(d) : mascaraCNPJ(d);
  });
  f.cep.addEventListener(
    "input",
    () => (f.cep.value = mascaraCEP(f.cep.value)),
  );
  f.phone.addEventListener(
    "input",
    () => (f.phone.value = phoneMask(f.phone.value)),
  );
  document
    .querySelector(".person-form__password-toggle")
    ?.addEventListener(
      "click",
      () => (f.pass.type = f.pass.type === "password" ? "text" : "password"),
    );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const valid =
      (type === "PF" ? validarCPF(f.doc.value) : validarCNPJ(f.doc.value)) &&
      f.name.value.trim().length >= 3 &&
      f.email.validity.valid &&
      onlyDigits(f.phone.value).length >= 10 &&
      onlyDigits(f.cep.value).length === 8 &&
      f.street.value.trim() &&
      f.bairro.value.trim() &&
      f.city.value.trim() &&
      f.uf.value.trim() &&
      f.number.value.trim() &&
      f.pass.value.length >= 8 &&
      f.pass.value === f.confirm.value &&
      (type !== "PJ" || f.razao.value.trim()) &&
      $("maioridadeDesigner").checked &&
      $("termosDesigner").checked;
    if (!valid) {
      status.textContent =
        "Confira os dados: documento, endereço, senhas, maioridade e termos são obrigatórios.";
      return;
    }
    try {
      await api.registrarConfeccionista({
        tipoPessoa: type,
        documento: onlyDigits(f.doc.value),
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
        senhaHash: f.pass.value,
        maioridadeConfirmada: true,
        comoConheceu: $("canalDesigner").value,
        consentimentoPerfilPublico: $("consentimentoPublicoDesigner").checked,
        especialidades: [],
        faixaExperiencia: "",
        portfolio: "",
        manifesto: "",
        instagram: "",
        site: "",
      });
      status.textContent = "Cadastro realizado com sucesso!";
      form.reset();
    } catch (err) {
      status.textContent = err.message;
    }
  });
});
