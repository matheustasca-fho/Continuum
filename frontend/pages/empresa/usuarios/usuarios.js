import {
  api,
  ROLE_LABELS_EMPRESA,
  getPerfilEmpresaAtual,
} from "../../../js/shared/api.js";
import { onlyDigits, mascaraTelefone } from "../../../js/shared/validators.js";
import { runWithDynamicLoading } from "../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const msg = $("message");
  const form = $("userForm");
  const rows = $("rows");
  const searchInput = $("searchUsers");
  const roleSelect = $("role");
  const roleGuideBox = $("roleGuideBox");
  const editDialog = $("editUserDialog");
  const editForm = $("editUserForm");
  const toast = $("teamToast");
  const toastMsg = $("teamToastMsg");

  let allUsers = [];
  let activeRoleFilter = "ALL";
  let searchQuery = "";
  let toastTimer = null;

  const callerRole = getPerfilEmpresaAtual();
  const isDiretor = callerRole === "DIRETOR";

  const ROLE_GUIDES = {
    REGISTRADOR:
      "<strong>REGISTRADOR:</strong> registra doações recebidas com vínculo de CPF ao cupom e consulta lotes e projetos (sem criar lotes nem alterar fotos).",
    GERENCIADOR:
      "<strong>GERENCIADOR:</strong> cria/edita lotes e fotos, aprova peças e tags QR, atualiza perfil/cartilha e cadastra apenas Registradores (não pode cadastrar novos Gerenciadores).",
  };

  // Se quem está logado for Gerenciador, bloqueia a criação de novos Gerenciadores
  if (!isDiretor) {
    const optGer = $("optRoleGerenciador");
    if (optGer) optGer.remove();
    if ($("newMemberSubtitle")) {
      $("newMemberSubtitle").textContent =
        "Como Gerenciador, você pode cadastrar contas de Registrador.";
    }
  }

  const formatRoleLabel = (role) => ROLE_LABELS_EMPRESA[role] || role;

  const getInitials = (name) => {
    const parts = String(name || "U")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showFeedback = (text, isError = false) => {
    if (msg) {
      msg.textContent = text;
      msg.classList.toggle("is-error", isError);
      window.setTimeout(() => {
        if (msg.textContent === text) msg.textContent = "";
      }, 4500);
    }
    if (!isError && toast && toastMsg) {
      toastMsg.textContent = text;
      toast.classList.add("toast--visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove("toast--visible");
      }, 3000);
    }
  };

  const updateKpis = (users) => {
    if ($("kpiTotalUsers")) $("kpiTotalUsers").textContent = String(users.length);
    if ($("kpiManagers")) {
      $("kpiManagers").textContent = String(
        users.filter(
          (u) =>
            ["DIRETOR", "GERENCIADOR"].includes(u.perfil) && u.ativo,
        ).length,
      );
    }
    if ($("kpiRegistradores")) {
      $("kpiRegistradores").textContent = String(
        users.filter((u) => u.perfil === "REGISTRADOR" && u.ativo).length,
      );
    }
  };

  const openEditDialog = (user) => {
    $("editUserId").value = user.id;
    $("editUserName").value = user.nome || "";
    $("editUserEmail").value = user.email || "";
    $("editUserPhone").value = mascaraTelefone(user.telefone || "");

    const editRoleSelect = $("editUserRole");
    const editRoleField = $("editUserRoleField");

    if (user.perfil === "DIRETOR") {
      editRoleField.hidden = true;
    } else {
      editRoleField.hidden = false;
      editRoleSelect.innerHTML = isDiretor
        ? '<option value="REGISTRADOR">Registrador — Balcão & Doações</option><option value="GERENCIADOR">Gerenciador — Lotes, Projetos & Perfil</option>'
        : '<option value="REGISTRADOR">Registrador — Balcão & Doações</option>';
      editRoleSelect.value = user.perfil;
    }

    $("editUserPassword").value = "";
    editDialog.showModal();
  };

  const renderTable = () => {
    rows.replaceChildren();
    const q = searchQuery.trim().toLowerCase();
    const filtered = allUsers.filter((u) => {
      if (activeRoleFilter !== "ALL" && u.perfil !== activeRoleFilter)
        return false;
      if (
        q &&
        !String(u.nome || "").toLowerCase().includes(q) &&
        !String(u.email || "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "team-empty";
      td.textContent = "Nenhum membro encontrado para os filtros selecionados.";
      tr.appendChild(td);
      rows.appendChild(tr);
      return;
    }

    filtered.forEach((u) => {
      const tr = document.createElement("tr");
      if (!u.ativo) tr.classList.add("is-inactive");

      const tdMember = document.createElement("td");
      const memberCell = document.createElement("div");
      memberCell.className = "member-cell";
      const avatar = document.createElement("div");
      avatar.className = `member-avatar ${u.perfil !== "REGISTRADOR" ? "member-avatar--admin" : ""}`;
      avatar.textContent = getInitials(u.nome);
      const info = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.className = "member-info__name";
      nameEl.textContent = u.nome;
      const emailEl = document.createElement("div");
      emailEl.className = "member-info__email";
      emailEl.textContent = u.email;
      info.append(nameEl, emailEl);
      memberCell.append(avatar, info);
      tdMember.appendChild(memberCell);

      const tdPhone = document.createElement("td");
      tdPhone.className = "member-phone";
      tdPhone.textContent = mascaraTelefone(u.telefone) || "—";

      const tdRole = document.createElement("td");
      const roleBadge = document.createElement("span");
      const roleClass =
        u.perfil === "DIRETOR"
          ? "role-badge--diretor"
          : u.perfil === "GERENCIADOR"
            ? "role-badge--gerenciador"
            : "role-badge--registrador";
      roleBadge.className = `role-badge ${roleClass}`;
      roleBadge.textContent = formatRoleLabel(u.perfil);
      tdRole.appendChild(roleBadge);

      const tdStatus = document.createElement("td");
      const statusPill = document.createElement("span");
      statusPill.className = `status-pill ${u.ativo ? "status-pill--active" : "status-pill--inactive"}`;
      statusPill.textContent = u.ativo ? "Ativo" : "Inativo";
      tdStatus.appendChild(statusPill);

      const tdActions = document.createElement("td");
      const actionsWrap = document.createElement("div");
      actionsWrap.className = "row-actions";

      const canManageRow =
        isDiretor || u.perfil === "REGISTRADOR";

      if (!canManageRow) {
        const lockNote = document.createElement("span");
        lockNote.className = "row-lock-note";
        lockNote.textContent = "Exclusivo Diretor";
        actionsWrap.appendChild(lockNote);
      } else {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "action-btn";
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", () => openEditDialog(u));
        actionsWrap.appendChild(editBtn);

        if (u.perfil !== "DIRETOR") {
          const toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.className = `action-btn ${u.ativo ? "action-btn--warn" : "action-btn--activate"}`;
          toggleBtn.textContent = u.ativo ? "Inativar" : "Ativar";
          toggleBtn.addEventListener("click", async () => {
            try {
              await api.alternarAtivoUsuario(u.id, !u.ativo);
              showFeedback(
                u.ativo
                  ? `Acesso de ${u.nome} inativado.`
                  : `Acesso de ${u.nome} reativado!`,
              );
              await loadUsers();
            } catch (err) {
              showFeedback(err.message, true);
            }
          });
          actionsWrap.appendChild(toggleBtn);
        } else {
          const ownerNote = document.createElement("span");
          ownerNote.className = "row-lock-note";
          ownerNote.textContent = "Titular";
          actionsWrap.appendChild(ownerNote);
        }
      }

      tdActions.appendChild(actionsWrap);
      tr.append(tdMember, tdPhone, tdRole, tdStatus, tdActions);
      rows.appendChild(tr);
    });
  };

  const loadUsers = async () => {
    try {
      allUsers = await api.listarUsuariosEmpresa();
      updateKpis(allUsers);
      renderTable();
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
