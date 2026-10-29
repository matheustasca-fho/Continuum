/** CONTINUUM — tela de acesso demonstrativa (autenticação mockada no sessionStorage). */
"use strict";

/* ---------- Mock de autenticação (sessionStorage) ---------- */
const USERS_KEY = "continuum_usuarios";
const SESSION_KEY = "continuum_sessao";
const MOCK_USERS = [
  {
    login: "doador",
    senha: "doador123",
    perfil: "doador",
    nome: "Doador(a) teste",
  },
  {
    login: "empresa",
    senha: "empresa123",
    perfil: "empresa",
    nome: "Empresa teste",
  },
  {
    login: "designer",
    senha: "designer123",
    perfil: "designer",
    nome: "Designer teste",
  },
];
const DESTINATIONS = {
  doador: "../../doador/painel/index.html",
  empresa: "../../empresa/painel/index.html",
  designer: "../../designer/painel/index.html",
};

function seedMockUsers() {
  try {
    sessionStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
  } catch (error) {
    /* sessionStorage indisponível: loadMockUsers() usa o mock em memória */
  }
}

function loadMockUsers() {
  try {
    return JSON.parse(sessionStorage.getItem(USERS_KEY)) || MOCK_USERS;
  } catch (error) {
    return MOCK_USERS;
  }
}

seedMockUsers();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formLogin");
  const status = document.getElementById("loginStatus");
  const identifier = document.getElementById("loginIdentificador");
  const identifierLabel = document.getElementById("loginIdentificadorLabel");
  const password = document.getElementById("loginSenha");
  const passwordToggle = document.querySelector(".login-form__password-toggle");
  const profileOptions = document.querySelectorAll(".login-switch__option");
  const forgotPassword = document.getElementById("forgotPassword");
  const helpButton = document.getElementById("loginHelp");
  const helpMessage = document.getElementById("loginHelpMessage");

  const profileSettings = {
    doador: {
      label: "Nome de usuário",
      name: "usuario",
      placeholder: "Digite seu nome de usuário",
      autocomplete: "username",
      inputmode: "text",
    },
    designer: {
      label: "CPF / CNPJ",
      name: "cpfCnpj",
      placeholder: "000.000.000-00 ou 00.000.000/0001-00",
      autocomplete: "username",
      inputmode: "text",
    },
    empresa: {
      label: "ID de Acesso",
      name: "idAcesso",
      placeholder: "Digite o ID ou CNPJ corporativo",
      autocomplete: "username",
      inputmode: "text",
    },
  };

  const setProfile = (profile) => {
    const settings = profileSettings[profile] || profileSettings.doador;
    profileOptions.forEach((option) => {
      option.setAttribute("aria-pressed", String(option.value === profile));
    });
    identifierLabel.textContent = settings.label;
    identifier.name = settings.name;
    identifier.placeholder = settings.placeholder;
    identifier.autocomplete = settings.autocomplete;
    identifier.inputMode = settings.inputmode;
    status.textContent = "";
  };

  let initialProfile = new URLSearchParams(window.location.search).get(
    "perfil",
  );
  if (!profileSettings[initialProfile]) {
    try {
      initialProfile = sessionStorage.getItem("continuum_perfil");
    } catch (error) {
      initialProfile = "doador";
    }
  }
  setProfile(profileSettings[initialProfile] ? initialProfile : "doador");

  profileOptions.forEach((option) => {
    option.addEventListener("click", () => setProfile(option.value));
  });

  const eyeOpenIcon = passwordToggle.querySelector(".icon-eye-open");
  const eyeClosedIcon = passwordToggle.querySelector(".icon-eye-closed");
  const helpClose = document.getElementById("loginHelpClose");
  let helpTimeout = null;

  const closeHelp = () => {
    if (helpTimeout) {
      clearTimeout(helpTimeout);
      helpTimeout = null;
    }
    helpButton.setAttribute("aria-expanded", "false");
    helpMessage.hidden = true;
  };

  const openHelp = () => {
    helpButton.setAttribute("aria-expanded", "true");
    helpMessage.hidden = false;
    if (helpTimeout) clearTimeout(helpTimeout);
    helpTimeout = setTimeout(() => {
      closeHelp();
    }, 5000);
  };

  passwordToggle.addEventListener("click", () => {
    const showPassword = password.type === "password";
    password.type = showPassword ? "text" : "password";
    passwordToggle.setAttribute("aria-pressed", String(showPassword));
    if (eyeOpenIcon && eyeClosedIcon) {
      eyeOpenIcon.style.display = showPassword ? "none" : "block";
      eyeClosedIcon.style.display = showPassword ? "block" : "none";
    }
  });

  forgotPassword.addEventListener("click", () => {
    status.textContent =
      "A recuperação de senha ainda não está disponível nesta tela.";
  });

  helpButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = helpButton.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeHelp();
    } else {
      openHelp();
    }
  });

  if (helpClose) {
    helpClose.addEventListener("click", (e) => {
      e.stopPropagation();
      closeHelp();
    });
  }

  document.addEventListener("click", (e) => {
    if (!helpButton.contains(e.target) && !helpMessage.contains(e.target)) {
      closeHelp();
    }
  });

  helpButton.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHelp();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const typedLogin = identifier.value.trim().toLowerCase();
    const typedPassword = password.value;
    const user = loadMockUsers().find(
      (u) => u.login === typedLogin && u.senha === typedPassword,
    );

    if (!user) {
      status.textContent = "Usuário ou senha inválidos.";
      password.value = "";
      password.focus();
      return;
    }

    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          login: user.login,
          perfil: user.perfil,
          nome: user.nome,
        }),
      );
    } catch (error) {
      /* sessionStorage indisponível: segue sem persistir a sessão */
    }
    status.textContent = "Acesso liberado. Redirecionando…";
    window.location.href = DESTINATIONS[user.perfil];
  });
});
