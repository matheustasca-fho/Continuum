import { api } from "../../../../js/shared/api.js";
import { mascaraCEP } from "../../../../js/shared/validators.js";
import { conectarBuscaCep } from "../../../../js/shared/cep.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id),
    session = api.getSessaoAtual();
  const form = $("profileForm");
  if (session?.usuarioEmpresa?.perfil !== "ADMIN") {
    form.hidden = true;
    $("accessMessage").textContent =
      "Acesso restrito ao administrador da loja.";
    setTimeout(() => (location.href = "../painel/index.html"), 1500);
    return;
  }
  const e = await api.getEmpresa();
  for (const [id, val] of Object.entries({
    razao: e.razaoSocial,
    fantasia: e.nomeFantasia,
    cnpj: e.cnpj,
    email: session.usuarioEmpresa.email,
    telefone: session.usuarioEmpresa.telefone,
    cep: e.cep,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    cidade: e.cidade,
    uf: e.uf,
    segmento: e.segmento,
    porte: e.porte,
    perfilLoja: e.perfilLoja,
    logo: e.logo,
    percentual: e.politicaCupom?.percentual,
    validade: e.politicaCupom?.validadeDias,
    cartilha: e.cartilhaPadrao?.conteudo,
    horario: e.horarioRetirada,
  }))
    $(id).value = val || "";
  $("aceitaRetirada").checked = !!e.aceitaRetirada;
  $("cep").addEventListener(
    "input",
    () => ($("cep").value = mascaraCEP($("cep").value)),
  );
  conectarBuscaCep($("cep"), {
    logradouro: $("logradouro"),
    bairro: $("bairro"),
    cidade: $("cidade"),
    uf: $("uf"),
  });
  const passwordFields = document.createElement("div");
  passwordFields.className = "wide";
  passwordFields.innerHTML =
    '<h2>Segurança do administrador</h2><label>Nova senha de Admin<input id="newAdminPassword" type="password" minlength="8"></label><label>Confirmar nova senha<input id="confirmAdminPassword" type="password" minlength="8"></label>';
  form.insertBefore(
    passwordFields,
    form.querySelector('button[type="submit"]'),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const password = $("newAdminPassword").value,
        confirmation = $("confirmAdminPassword").value;
      if (password || confirmation)
        await api.redefinirSenha(
          session.usuarioEmpresa.email,
          password,
          confirmation,
        );
      await api.atualizarPerfilEmpresa(e.id, {
        razaoSocial: $("razao").value,
        nomeFantasia: $("fantasia").value,
        cep: $("cep").value,
        logradouro: $("logradouro").value,
        numero: $("numero").value,
        complemento: $("complemento").value,
        bairro: $("bairro").value,
        cidade: $("cidade").value,
        segmento: $("segmento").value,
        porte: $("porte").value,
        perfilLoja: $("perfilLoja").value,
        logo: $("logo").value,
        aceitaRetirada: $("aceitaRetirada").checked,
        horarioRetirada: $("horario").value,
        politicaCupom: {
          percentual: Number($("percentual").value),
          validadeDias: Number($("validade").value),
        },
        cartilhaPadrao: { conteudo: $("cartilha").value },
      });
      $("saveMessage").textContent =
        "Alterações salvas. Cartilha atualizada para a próxima versão.";
    } catch (error) {
      $("saveMessage").textContent = error.message;
    }
  });
});
