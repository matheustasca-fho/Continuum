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

  passwordToggle.addEventListener('click', () => {
    const isVisible = password.type === 'text';
    password.type = isVisible ? 'password' : 'text';
    passwordToggle.textContent = isVisible ? 'Mostrar' : 'Ocultar';
    passwordToggle.setAttribute('aria-pressed', String(!isVisible));
  });

  form.querySelectorAll('input[inputmode="numeric"]').forEach((input) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, input.maxLength);
    });
  });

  const validateCpfField = (showIncompleteMessage = false) => {
    const cpf = cpfInput.value;
    cpfInput.setCustomValidity('');
    cpfInput.removeAttribute('aria-invalid');
    cpfHint.textContent = cpfHintDefault;
    cpfHint.dataset.state = '';

    if (!cpf) return false;

    if (cpf.length !== 11) {
      if (showIncompleteMessage) {
        cpfInput.setCustomValidity('O CPF deve conter 11 dígitos.');
        cpfInput.setAttribute('aria-invalid', 'true');
        cpfHint.textContent = 'O CPF deve conter 11 dígitos.';
        cpfHint.dataset.state = 'error';
      }
      return false;
    }

    if (!validarCPF(cpf)) {
      cpfInput.setCustomValidity('CPF inválido. Confira os números digitados.');
      cpfInput.setAttribute('aria-invalid', 'true');
      cpfHint.textContent = 'CPF inválido. Confira os números digitados.';
      cpfHint.dataset.state = 'error';
      return false;
    }

    cpfInput.setAttribute('aria-invalid', 'false');
    cpfHint.dataset.state = 'valid';
    return true;
  };

  cpfInput.addEventListener('input', () => validateCpfField());
  cpfInput.addEventListener('blur', () => validateCpfField(true));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = 'Esta tela ainda não está conectada ao serviço de cadastro. Seus dados não foram enviados.';
  });
});
