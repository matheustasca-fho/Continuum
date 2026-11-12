import { api } from "../../../js/shared/api.js";
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id),
    msg = $("message"),
    form = $("userForm"),
    rows = $("rows");
  const render = async () => {
    try {
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
      msg.textContent = e.message;
      form.hidden = true;
      setTimeout(() => (location.href = "../painel/index.html"), 1500);
    }
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api.salvarUsuarioEmpresa({
        nome: $("name").value,
        email: $("email").value,
        telefone: $("phone").value,
        perfil: $("role").value,
        senha: $("password").value,
      });
      msg.textContent = "Usuário cadastrado.";
      form.reset();
      await render();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
  await render();
});
