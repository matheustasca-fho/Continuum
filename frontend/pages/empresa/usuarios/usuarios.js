import { api } from "../../../js/shared/api.js";
import { onlyDigits, mascaraTelefone } from "../../../js/shared/validators.js";

const ROLE_LABELS = { ADMIN: "Administrador", OPERADOR: "Operador" };
const ROLE_GUIDES = {
  ADMIN:
    "<strong>ADMINISTRADOR:</strong> acesso total — lotes, projetos, perfil da loja, cartilha e equipe.",
  OPERADOR:
    "<strong>OPERADOR:</strong> registra doações e cadastra lotes; não edita nem exclui lotes, não finaliza peças, não altera o perfil da loja e não gerencia a equipe.",
};

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);
  const form = $("userForm");
  const rows = $("rows");
  const msg = $("message");
  const editDialog = $("editUserDialog");
  const editForm = $("editUserForm");
  const roleSelect = $("role");
  const roleGuideBox = $("roleGuideBox");
  const searchInput = $("searchUsers");
  let allUsers = [];
  let searchQuery = "";
  let activeRole = "ALL";
  let toastTimer = null;

  const showFeedback = (text, isError = false) => {
    if (isError) {
      msg.textContent = text;
      return;
    }
    msg.textContent = "";
    $("teamToastMsg").textContent = text;
    $("teamToast").classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("teamToast").classList.remove("toast--visible"), 3200);
  };

  const initials = (name) =>
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");

  const cell = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const renderTable = () => {
    const q = searchQuery.trim().toLowerCase();
    const list = allUsers.filter(
      (u) =>
        (activeRole === "ALL" || u.perfil === activeRole) &&
        (!q || `${u.nome} ${u.email}`.toLowerCase().includes(q)),
    );
    rows.replaceChildren();
    $("kpiTotalUsers").textContent = String(allUsers.length);
    $("kpiManagers").textContent = String(allUsers.filter((u) => u.ativo && u.perfil === "ADMIN").length);
    $("kpiRegistradores").textContent = String(allUsers.filter((u) => u.ativo && u.perfil === "OPERADOR").length);

    if (!list.length) {
      const tr = document.createElement("tr");
      const td = cell("td", "team-empty", "Nenhum membro encontrado.");
      td.colSpan = 5;
      tr.appendChild(td);
      rows.appendChild(tr);
      return;
    }

    list.forEach((u) => {
      const tr = document.createElement("tr");

      const member = cell("td", "member-cell");
      member.appendChild(cell("span", `member-avatar ${u.perfil === "ADMIN" ? "member-avatar--admin" : ""}`, initials(u.nome)));
      const info = cell("div");
      info.appendChild(cell("div", "member-info__name", u.nome));
      info.appendChild(cell("div", "member-info__email", u.email));
      member.appendChild(info);

      const role = cell("td");
      role.appendChild(cell("span", `role-badge role-badge--${u.perfil.toLowerCase()}`, ROLE_LABELS[u.perfil] || u.perfil));

      const status = cell("td");
      status.appendChild(cell("span", `status-pill ${u.ativo ? "status-pill--active" : "status-pill--inactive"}`, u.ativo ? "Ativo" : "Inativo"));

      const actions = cell("td", "row-actions");
      const edit = cell("button", "action-btn", "Editar");
      edit.type = "button";
      edit.onclick = () => openEdit(u);
      const toggle = cell("button", `action-btn ${u.ativo ? "action-btn--warn" : "action-btn--activate"}`, u.ativo ? "Inativar" : "Ativar");
      toggle.type = "button";
      toggle.onclick = async () => {
        try {
          await api.alternarAtivoUsuario(u.id, !u.ativo);
          showFeedback(u.ativo ? "Acesso inativado." : "Acesso reativado.");
          await loadUsers();
        } catch (err) {
          showFeedback(err.message, true);
        }
      };
      actions.append(edit, toggle);

      tr.append(member, cell("td", "member-phone", u.telefone || ""), role, status, actions);
      rows.appendChild(tr);
    });
  };

  const loadUsers = async () => {
    try {
      api.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
      allUsers = (await api.listarUsuariosEmpresa()) || [];
      renderTable();
    } catch (err) {
      showFeedback(err.message, true);
      form.hidden = true;
      setTimeout(() => (location.href = "../painel/index.html"), 1500);
    }
  };

  const openEdit = (u) => {
    $("editUserId").value = u.id;
    $("editUserName").value = u.nome || "";
    $("editUserEmail").value = u.email || "";
    $("editUserPhone").value = u.telefone ? mascaraTelefone(u.telefone) : "";
    $("editUserRole").value = u.perfil;
    $("editUserPassword").value = "";
    editDialog.showModal();
  };
  const closeEditDialog = () => editDialog?.close();

  [$("phone"), $("editUserPhone")].forEach((input) =>
    input?.addEventListener("input", () => (input.value = mascaraTelefone(input.value))),
  );

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
    roleGuideBox.innerHTML = ROLE_GUIDES[roleSelect.value] || ROLE_GUIDES.OPERADOR;
  });

  searchInput?.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderTable();
  });

  document.querySelectorAll("[data-role-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll("[data-role-filter]").forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeRole = pill.dataset.roleFilter;
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

    if (!nome || !email) return showFeedback("Preencha o nome e o e-mail corporativo.", true);
    if (senha.length < 8) {
      $("password").focus();
      return showFeedback("A senha inicial deve ter pelo menos 8 caracteres.", true);
    }
    try {
      await api.salvarUsuarioEmpresa({ nome, email, telefone, perfil, senha });
      form.reset();
      roleGuideBox.innerHTML = ROLE_GUIDES.OPERADOR;
      showFeedback(`${nome} (${ROLE_LABELS[perfil]}) adicionado(a) à equipe!`);
      await loadUsers();
    } catch (err) {
      showFeedback(err.message, true);
    }
  });

  $("editDialogClose")?.addEventListener("click", closeEditDialog);
  $("editDialogCancel")?.addEventListener("click", closeEditDialog);
  editDialog?.addEventListener("click", (e) => {
    if (e.target === editDialog) closeEditDialog();
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("editUserId").value;
    const nome = $("editUserName").value.trim();
    const email = $("editUserEmail").value.trim();
    const telefone = onlyDigits($("editUserPhone").value);
    const perfil = $("editUserRole").value;
    const novaSenha = $("editUserPassword").value;

    if (!nome || !email) return showFeedback("Nome e e-mail são obrigatórios.", true);
    if (novaSenha && novaSenha.length < 8) return showFeedback("A nova senha deve ter pelo menos 8 caracteres.", true);
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
