import { api } from "../../../js/shared/api.js";
import {
  onlyDigits,
  mascaraCPF,
  mascaraCNPJ,
} from "../../../js/shared/validators.js";
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formLogin"),
    status = document.getElementById("loginStatus"),
    identifier = document.getElementById("loginIdentificador"),
    label = document.getElementById("loginIdentificadorLabel"),
    password = document.getElementById("loginSenha"),
    tabs = [...document.querySelectorAll(".login-switch__option")];
  const settings = {
    doador: {
      label: "CPF ou E-mail",
      placeholder: "CPF ou e-mail",
      name: "cpfEmail",
    },
    designer: {
      label: "CPF ou CNPJ",
      placeholder: "CPF ou CNPJ",
      name: "cpfCnpj",
    },
    empresa: {
      label: "CNPJ ou E-mail Corporativo",
      placeholder: "CNPJ ou e-mail corporativo",
      name: "cnpjEmail",
    },
  };
  let perfil = new URLSearchParams(location.search).get("perfil") || "doador";
  const setProfile = (p) => {
    perfil = settings[p] ? p : "doador";
    tabs.forEach((x) =>
      x.setAttribute("aria-pressed", String(x.value === perfil)),
    );
    label.textContent = settings[perfil].label;
    identifier.placeholder = settings[perfil].placeholder;
    identifier.name = settings[perfil].name;
    identifier.value = "";
    status.textContent = "";
  };
  setProfile(perfil);
  tabs.forEach((t) => t.addEventListener("click", () => setProfile(t.value)));
  identifier.addEventListener("input", () => {
    const raw = identifier.value;
    if (/[a-z@]/i.test(raw)) return;
    const d = onlyDigits(raw);
    identifier.value =
      perfil === "doador"
        ? mascaraCPF(d)
        : perfil === "designer" && d.length <= 11
          ? mascaraCPF(d)
          : mascaraCNPJ(d);
  });
  document
    .querySelector(".login-form__password-toggle")
    ?.addEventListener("click", (e) => {
      password.type = password.type === "password" ? "text" : "password";
      e.currentTarget.setAttribute(
        "aria-pressed",
        String(password.type === "text"),
      );
    });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const session = await api.login(perfil, identifier.value, password.value);
      try {
        sessionStorage.setItem(
          "continuum_sessao",
          JSON.stringify({
            perfil,
            nome: session.usuario?.nome || session.usuarioEmpresa?.nome,
            perfilEmpresa: session.usuarioEmpresa?.perfil,
          }),
        );
      } catch {}
      status.textContent = "Acesso liberado. Redirecionando…";
      const dest = {
        doador: "../../doador/painel/index.html",
        designer: "../../designer/painel/index.html",
        empresa: "../../empresa/painel/index.html",
      };
      setTimeout(() => (location.href = dest[perfil]), 250);
    } catch (err) {
      status.textContent = err.message;
      password.value = "";
      password.focus();
    }
  });
  const forgot = document.getElementById("forgotPassword");
  forgot?.addEventListener("click", () => {
    status.textContent = "";
    form.hidden = true;
    const panel = document.getElementById("recoveryPanel");
    if (panel) {
      panel.hidden = false;
      return;
    }
    const box = document.createElement("section");
    box.id = "recoveryPanel";
    box.innerHTML =
      '<h2>Redefinir senha</h2><label>CPF, CNPJ ou e-mail<input id="recoveryId" class="form-input" required></label><label>Nova senha<input id="recoveryPass" class="form-input" type="password" minlength="8" required></label><label>Confirmar nova senha<input id="recoveryConfirm" class="form-input" type="password" minlength="8" required></label><button class="btn btn--primary btn--full" id="recoverySubmit">Salvar nova senha</button><button class="btn btn--full" id="recoveryBack" type="button">Voltar ao login</button><p id="recoveryStatus" role="status"></p>';
    form.after(box);
    box.querySelector("#recoveryBack").onclick = () => {
      box.hidden = true;
      form.hidden = false;
    };
    box.querySelector("#recoverySubmit").onclick = async () => {
      const msg = box.querySelector("#recoveryStatus");
      try {
        await api.redefinirSenha(
          box.querySelector("#recoveryId").value,
          box.querySelector("#recoveryPass").value,
          box.querySelector("#recoveryConfirm").value,
        );
        msg.textContent = "Senha alterada com sucesso!";
        setTimeout(() => {
          box.hidden = true;
          form.hidden = false;
        }, 900);
      } catch (err) {
        msg.textContent = err.message;
      }
    };
  });
  const hb = document.getElementById("loginHelp"),
    hm = document.getElementById("loginHelpMessage");
  hb?.addEventListener("click", () => {
    hm.hidden = !hm.hidden;
    hb.setAttribute("aria-expanded", String(!hm.hidden));
  });
  document.getElementById("loginHelpClose")?.addEventListener("click", () => {
    hm.hidden = true;
  });
});
