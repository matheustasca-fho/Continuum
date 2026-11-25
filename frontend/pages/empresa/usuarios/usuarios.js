import {
  api,
  ROLE_LABELS_EMPRESA,
  getPerfilEmpresaAtual,
} from "../../../js/shared/api.js";
import { onlyDigits, mascaraTelefone } from "../../../js/shared/validators.js";
import { runWithDynamicLoading } from "../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id),
    msg = $("message"),
    form = $("userForm"),
    rows = $("rows");
  const render = async () => {
    try {
      api.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
      const users = await api.listarUsuariosEmpresa();
      rows.replaceChildren();
      users.forEach((u) => {
        const tr = document.createElement("tr");
        for (const val of [
          u.nome,
          u.email,
          u.telefone || "",
          u.perfil,
          u.ativo ? "Ativo" : "Inativo",
        ]) {
          const td = document.createElement("td");
          td.textContent = val;
          tr.appendChild(td);
        }
        const td = document.createElement("td"),
          toggle = document.createElement("button"),
          edit = document.createElement("button");
        toggle.type = edit.type = "button";
        toggle.textContent = u.ativo ? "Inativar" : "Ativar";
        toggle.onclick = async () => {
          try {
            await api.alternarAtivoUsuario(u.id, !u.ativo);
            msg.textContent = "Acesso atualizado.";
            await render();
          } catch (e) {
            msg.textContent = e.message;
          }
        };
        edit.textContent = "Editar / redefinir senha";
        edit.onclick = async () => {
          const nome = prompt("Nome", u.nome),
            email = prompt("E-mail", u.email),
            perfil = prompt("Perfil (ADMIN ou OPERADOR)", u.perfil),
            senha = prompt("Nova senha; deixe em branco para manter");
          if (
            nome === null ||
            email === null ||
            perfil === null ||
            senha === null
          )
            return;
          try {
            await api.atualizarUsuarioEmpresa(u.id, {
              nome,
              email,
              perfil: perfil.toUpperCase(),
              ...(senha ? { senhaHash: senha } : {}),
            });
            msg.textContent = "Usuário atualizado.";
            await render();
          } catch (e) {
            msg.textContent = e.message;
          }
        };
        td.append(toggle, edit);
        tr.appendChild(td);
        rows.appendChild(tr);
      });
    } catch (e) {
      showFeedback(e.message, true);
      form.hidden = true;
      setTimeout(() => (location.href = "../painel/index.html"), 1500);
    }
  };

  [$("phone"), $("editUserPhone")].forEach((input) => {
    input?.addEventListener("input", () => {
      input.value = mascaraTelefone(input.value);
    });
  });

  document.querySelectorAll("[data-pass-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = $(btn.dataset.passTarget);
      if (!target) return;
      const show = target.type === "password";
      target.type = show ? "text" : "password";
      btn.textContent = show ? "Ocultar" : "Exibir";
    });
  });

  roleSelect?.addEventListener("change", () => {
    if (roleGuideBox) {
      roleGuideBox.innerHTML =
        ROLE_GUIDES[roleSelect.value] || ROLE_GUIDES.REGISTRADOR;
    }
  });

  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderTable();
  });

  document.querySelectorAll("[data-role-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelectorAll("[data-role-filter]")
        .forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeRoleFilter = pill.dataset.roleFilter;
      renderTable();
    });
  });

  $("btnFocusNewUser")?.addEventListener("click", () => {
    $("name")?.scrollIntoView({ behavior: "smooth", block: "center" });
    $("name")?.focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("name").value.trim();
    const email = $("email").value.trim();
    const telefone = onlyDigits($("phone").value);
    const perfil = $("role").value;
    const senha = $("password").value;

    if (!nome || !email) {
      showFeedback("Preencha o nome e o e-mail corporativo.", true);
      return;
    }
    if (senha.length < 8) {
      showFeedback("A senha inicial deve ter pelo menos 8 caracteres.", true);
      $("password").focus();
      return;
    }

    try {
      await runWithDynamicLoading({
        button: $("userSubmitBtn") || form.querySelector('button[type="submit"]'),
        container: form.closest(".team-card"),
        title: "Cadastrando membro da equipe",
        steps: [
          `Configurando permissões de ${formatRoleLabel(perfil)}…`,
          "Ativando credenciais corporativas…",
        ],
        buttonLabel: "Cadastrando…",
        successText: "Membro cadastrado!",
        minDuration: 760,
        task: () =>
          api.salvarUsuarioEmpresa({
            nome,
            email,
            telefone,
            perfil,
            senha,
          }),
      });
      form.reset();
      if (roleGuideBox) roleGuideBox.innerHTML = ROLE_GUIDES.REGISTRADOR;
      showFeedback(`${nome} (${formatRoleLabel(perfil)}) adicionado(a) à equipe!`);
      await loadUsers();
    } catch (err) {
      showFeedback(err.message, true);
    }
  });

  const closeEditDialog = () => editDialog?.close();
  $("editDialogClose")?.addEventListener("click", closeEditDialog);
  $("editDialogCancel")?.addEventListener("click", closeEditDialog);
  editDialog?.addEventListener("click", (e) => {
    if (e.target === editDialog) closeEditDialog();
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("editUserId").value;
    const targetUser = allUsers.find((u) => u.id === id);
    const nome = $("editUserName").value.trim();
    const email = $("editUserEmail").value.trim();
    const telefone = onlyDigits($("editUserPhone").value);
    const perfil =
      targetUser?.perfil === "DIRETOR" ? "DIRETOR" : $("editUserRole").value;
    const novaSenha = $("editUserPassword").value;

    if (!nome || !email) {
      showFeedback("Nome e e-mail são obrigatórios.", true);
      return;
    }
    if (novaSenha && novaSenha.length < 8) {
      showFeedback("A nova senha deve ter pelo menos 8 caracteres.", true);
      return;
    }

    try {
      await api.atualizarUsuarioEmpresa(id, {
        nome,
        email,
        telefone,
        perfil,
        ...(novaSenha ? { senhaHash: novaSenha } : {}),
      });
      closeEditDialog();
      showFeedback("Dados do membro atualizados com sucesso!");
      await loadUsers();
    } catch (err) {
      showFeedback(err.message, true);
    }
  });

  await loadUsers();
});
