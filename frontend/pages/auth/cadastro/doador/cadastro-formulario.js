/** CONTINUUM — formulário de criação de conta (JavaScript Vanilla). */
'use strict';

function validarCPF(cpf) {
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11 || /^([0-9])\1{10}$/.test(digits)) return false;

  const calculateDigit = (length, initialWeight) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (initialWeight - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9, 10) === Number(digits[9])
    && calculateDigit(10, 11) === Number(digits[10]);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCadastroConta');
  const title = document.getElementById('signup-card-title');
  const description = document.querySelector('.signup-card__description');
  const password = document.getElementById('senhaUsuario');
  const passwordToggle = document.querySelector('.signup-form__password-toggle');
  const status = document.getElementById('cadastroStatus');
  const cpfInput = document.getElementById('cpfDoador');
  const cpfHint = document.getElementById('cpfAjuda');
  const cpfHintDefault = cpfHint.textContent;
  const profileData = {
    title: 'Cadastro Doador',
    description: 'Crie sua conta e dê um novo destino aos materiais.'  
  };

  title.textContent = profileData.title;
  description.textContent = profileData.description;
  document.title = `Cadastro Doador| CONTINUUM`;

  const eyeOpenIcon = passwordToggle.querySelector('.icon-eye-open');
  const eyeClosedIcon = passwordToggle.querySelector('.icon-eye-closed');

  passwordToggle.addEventListener('click', () => {
    const isVisible = password.type === 'text';
    password.type = isVisible ? 'password' : 'text';
    passwordToggle.setAttribute('aria-pressed', String(!isVisible));
    if (eyeOpenIcon && eyeClosedIcon) {
      eyeOpenIcon.style.display = isVisible ? 'block' : 'none';
      eyeClosedIcon.style.display = isVisible ? 'none' : 'block';
    }
  });

  const cepInput = document.getElementById('cepDoador');
  const cepHint = document.getElementById('cepAjuda');
  const senhaHint = document.getElementById('senhaAjuda');
  const telefoneInput = document.getElementById('telefoneDoador');
  const telefoneHint = document.getElementById('telefoneAjuda');
  const nomeInput = document.getElementById('nomeDoador');

  // Máscaras de entrada úteis e seguras
  cpfInput.addEventListener('input', () => {
    cpfInput.value = cpfInput.value.replace(/\D/g, '').slice(0, 11);
    validateCpfField();
  });

  cepInput.addEventListener('input', () => {
    cepInput.value = cepInput.value.replace(/\D/g, '').slice(0, 8);
    validateCepField();
  });

  password.addEventListener('input', () => {
    validateSenhaField();
  });

  telefoneInput.addEventListener('input', () => {
    let raw = telefoneInput.value;
    // Permite digitação com formato (XX) XXXXX-XXXX
    validateTelefoneField();
  });

  const showFieldFeedback = (input, hintElement, message, isValid) => {
    input.setCustomValidity(isValid ? '' : message);
    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
      if (hintElement) {
        hintElement.textContent = message;
        hintElement.dataset.state = 'error';
        hintElement.style.display = 'block';
      }
    } else {
      input.setAttribute('aria-invalid', 'false');
      if (hintElement) {
        if (hintElement === telefoneHint) {
          hintElement.textContent = 'Informe o DDD entre parênteses, com até 11 dígitos. Ex: (11) 98765-4321';
          hintElement.dataset.state = 'valid';
          hintElement.style.display = 'block';
        } else {
          hintElement.textContent = '';
          hintElement.dataset.state = 'valid';
          hintElement.style.display = 'none';
        }
      }
    }
  };

  const validateCpfField = (report = false) => {
    const val = cpfInput.value.trim();
    if (!val) {
      if (report) showFieldFeedback(cpfInput, cpfHint, 'O CPF é obrigatório.', false);
      return false;
    }
    if (/[.\-]/.test(val)) {
      showFieldFeedback(cpfInput, cpfHint, 'O CPF não pode conter pontos ou traços.', false);
      return false;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length < 11) {
      showFieldFeedback(cpfInput, cpfHint, 'O CPF deve ter no mínimo 11 dígitos.', false);
      return false;
    }
    if (!validarCPF(digits)) {
      showFieldFeedback(cpfInput, cpfHint, 'CPF inválido. Confira os números digitados.', false);
      return false;
    }
    showFieldFeedback(cpfInput, cpfHint, '', true);
    return true;
  };

  const validateCepField = (report = false) => {
    const val = cepInput.value.trim();
    if (!val) {
      if (report) showFieldFeedback(cepInput, cepHint, 'O CEP é obrigatório.', false);
      return false;
    }
    if (val.includes('-')) {
      showFieldFeedback(cepInput, cepHint, 'O CEP não pode conter hífen.', false);
      return false;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length < 8) {
      showFieldFeedback(cepInput, cepHint, 'O CEP deve ter 8 dígitos.', false);
      return false;
    }
    showFieldFeedback(cepInput, cepHint, '', true);
    return true;
  };

  const validateSenhaField = (report = false) => {
    const val = password.value;
    if (!val) {
      if (report) showFieldFeedback(password, senhaHint, 'A senha é obrigatória.', false);
      return false;
    }
    if (val.length > 10) {
      showFieldFeedback(password, senhaHint, 'A senha não pode ter mais que 10 caracteres.', false);
      return false;
    }
    showFieldFeedback(password, senhaHint, '', true);
    return true;
  };

  const validateTelefoneField = (report = false) => {
    const val = telefoneInput.value.trim();
    if (!val) {
      if (report) showFieldFeedback(telefoneInput, telefoneHint, 'O telefone é obrigatório.', false);
      return false;
    }
    if (!/\(\d{2}\)/.test(val)) {
      showFieldFeedback(telefoneInput, telefoneHint, 'Informe o DDD entre parênteses. Ex: (11) 98765-4321', false);
      return false;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length > 11) {
      showFieldFeedback(telefoneInput, telefoneHint, 'O telefone não pode ter mais que 11 dígitos.', false);
      return false;
    }
    if (digits.length < 10) {
      showFieldFeedback(telefoneInput, telefoneHint, 'O telefone deve conter o DDD e pelo menos 8 ou 9 dígitos.', false);
      return false;
    }
    showFieldFeedback(telefoneInput, telefoneHint, '', true);
    return true;
  };

  cpfInput.addEventListener('blur', () => validateCpfField(true));
  cepInput.addEventListener('blur', () => validateCepField(true));
  password.addEventListener('blur', () => validateSenhaField(true));
  telefoneInput.addEventListener('blur', () => validateTelefoneField(true));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isCpfValid = validateCpfField(true);
    const isCepValid = validateCepField(true);
    const isSenhaValid = validateSenhaField(true);
    const isTelValid = validateTelefoneField(true);
    const isNomeValid = nomeInput.value.trim().length > 0;

    if (!isNomeValid) {
      nomeInput.setAttribute('aria-invalid', 'true');
    } else {
      nomeInput.setAttribute('aria-invalid', 'false');
    }

    if (!isCpfValid || !isCepValid || !isSenhaValid || !isTelValid || !isNomeValid) {
      status.textContent = 'Por favor, corrija os erros nos campos antes de continuar.';
      return;
    }

    status.textContent = 'Cadastro demonstrativo realizado com sucesso!';
  });
});
