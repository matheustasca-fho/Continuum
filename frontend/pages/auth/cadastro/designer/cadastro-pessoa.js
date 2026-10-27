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
  const form = document.getElementById('formCadastroPessoa');
  const typeOptions = document.querySelectorAll('.person-switch__option');
  const documentTypeLabel = document.getElementById('documentoTipo');
  const documentInput = document.getElementById('documentoPessoa');
  const docHint = document.getElementById('docAjuda');
  const postalInput = document.getElementById('cepPessoa');
  const postalHint = document.getElementById('cepPessoaAjuda');
  const passwordInput = document.getElementById('senhaPessoa');
  const passwordHint = document.getElementById('senhaPessoaAjuda');
  const passwordToggle = document.querySelector('.person-form__password-toggle');
  const nameInput = document.getElementById('nomeConfeccionista');
  const addressNumberInput = document.getElementById('numeroEndereco');
  const status = document.getElementById('personFormStatus');

  let personType = 'fisica';

  const eyeOpenIcon = passwordToggle ? passwordToggle.querySelector('.icon-eye-open') : null;
  const eyeClosedIcon = passwordToggle ? passwordToggle.querySelector('.icon-eye-closed') : null;

  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';
      passwordToggle.setAttribute('aria-pressed', String(!isVisible));
      if (eyeOpenIcon && eyeClosedIcon) {
        eyeOpenIcon.style.display = isVisible ? 'block' : 'none';
        eyeClosedIcon.style.display = isVisible ? 'none' : 'block';
      }
    });
  }

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
        hintElement.textContent = '';
        hintElement.dataset.state = 'valid';
        hintElement.style.display = 'none';
      }
    }
  };

  const validateDocument = (report = false) => {
    const val = documentInput.value.trim();
    const isPf = personType === 'fisica';
    if (!val) {
      if (report) showFieldFeedback(documentInput, docHint, `${isPf ? 'O CPF' : 'O CNPJ'} é obrigatório.`, false);
      return false;
    }
    if (isPf) {
      if (/[.\-]/.test(val)) {
        showFieldFeedback(documentInput, docHint, 'O CPF não pode conter pontos ou traços.', false);
        return false;
      }
      const digits = val.replace(/\D/g, '');
      if (digits.length < 11) {
        showFieldFeedback(documentInput, docHint, 'O CPF deve ter no mínimo 11 dígitos.', false);
        return false;
      }
      if (!validarCPF(digits)) {
        showFieldFeedback(documentInput, docHint, 'CPF inválido. Confira os números digitados.', false);
        return false;
      }
    } else {
      const digits = val.replace(/\D/g, '');
      if (digits.length < 14) {
        showFieldFeedback(documentInput, docHint, 'O CNPJ deve ter no mínimo 14 dígitos.', false);
        return false;
      }
    }
    showFieldFeedback(documentInput, docHint, '', true);
    return true;
  };

  const validatePostal = (report = false) => {
    const val = postalInput.value.trim();
    if (!val) {
      if (report) showFieldFeedback(postalInput, postalHint, 'O CEP é obrigatório.', false);
      return false;
    }
    if (val.includes('-')) {
      showFieldFeedback(postalInput, postalHint, 'O CEP não pode conter hífen.', false);
      return false;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length < 8) {
      showFieldFeedback(postalInput, postalHint, 'O CEP deve ter 8 dígitos.', false);
      return false;
    }
    showFieldFeedback(postalInput, postalHint, '', true);
    return true;
  };

  const validatePassword = (report = false) => {
    const val = passwordInput.value;
    if (!val) {
      if (report) showFieldFeedback(passwordInput, passwordHint, 'A senha é obrigatória.', false);
      return false;
    }
    if (val.length > 10) {
      showFieldFeedback(passwordInput, passwordHint, 'A senha não pode ter mais que 10 caracteres.', false);
      return false;
    }
    showFieldFeedback(passwordInput, passwordHint, '', true);
    return true;
  };

  typeOptions.forEach((option) => {
    option.addEventListener('click', () => {
      personType = option.value;
      typeOptions.forEach((item) => item.setAttribute('aria-pressed', String(item === option)));

      documentTypeLabel.textContent = personType === 'fisica' ? 'CPF' : 'CNPJ';
      documentInput.name = personType === 'fisica' ? 'CPF' : 'CNPJ';
      documentInput.placeholder = personType === 'fisica' ? 'CPF' : 'CNPJ';
      documentInput.maxLength = personType === 'fisica' ? 11 : 14;
      documentInput.value = documentInput.value.replace(/\D/g, '').slice(0, documentInput.maxLength);
      validateDocument();
      status.textContent = '';
    });
  });

  documentInput.addEventListener('input', () => {
    const max = personType === 'fisica' ? 11 : 14;
    documentInput.value = documentInput.value.replace(/\D/g, '').slice(0, max);
    validateDocument();
  });
  documentInput.addEventListener('blur', () => validateDocument(true));

  postalInput.addEventListener('input', () => {
    postalInput.value = postalInput.value.replace(/\D/g, '').slice(0, 8);
    validatePostal();
  });
  postalInput.addEventListener('blur', () => validatePostal(true));

  passwordInput.addEventListener('input', () => validatePassword());
  passwordInput.addEventListener('blur', () => validatePassword(true));

  addressNumberInput.addEventListener('input', () => {
    addressNumberInput.value = addressNumberInput.value.replace(/\D/g, '').slice(0, 6);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isDocValid = validateDocument(true);
    const isPostalValid = validatePostal(true);
    const isPassValid = validatePassword(true);
    const isNameValid = nameInput.value.trim().length > 0;
    const isNumValid = addressNumberInput.value.trim().length > 0;

    if (!isNameValid) nameInput.setAttribute('aria-invalid', 'true');
    else nameInput.setAttribute('aria-invalid', 'false');

    if (!isNumValid) addressNumberInput.setAttribute('aria-invalid', 'true');
    else addressNumberInput.setAttribute('aria-invalid', 'false');

    if (!isDocValid || !isPostalValid || !isPassValid || !isNameValid || !isNumValid) {
      status.textContent = 'Por favor, corrija os erros nos campos antes de continuar.';
      return;
    }

    status.textContent = 'Cadastro demonstrativo realizado com sucesso!';
  });
});
