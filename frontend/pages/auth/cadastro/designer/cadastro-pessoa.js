/** CONTINUUM — cadastro demonstrativo PF/PJ, sem integração com outras telas. */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCadastroPessoa');
  const typeOptions = document.querySelectorAll('.person-switch__option');
  const documentTypeLabel = document.getElementById('documentoTipo');
  const documentInput = document.getElementById('documentoPessoa');
  const postalInput = document.getElementById('cepPessoa');
  const addressNumberInput = document.getElementById('numeroEndereco');
  const status = document.getElementById('personFormStatus');

  let personType = 'fisica';

  const onlyDigits = (value) => value.replace(/\D/g, '');

  const formatDocument = (value) => {
    const digits = onlyDigits(value).slice(0, personType === 'fisica' ? 11 : 14);
    if (personType === 'fisica') {
      if (digits.length > 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      if (digits.length > 6) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      if (digits.length > 3) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      return digits;
    }
    if (digits.length > 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
    if (digits.length > 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    if (digits.length > 5) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return digits;
  };

  const validateDigitCount = (input, count, label, reportPartial = false) => {
    const digits = onlyDigits(input.value);
    input.setCustomValidity('');
    input.removeAttribute('aria-invalid');
    if (!digits) return false;
    if (digits.length !== count) {
      if (reportPartial) {
        input.setCustomValidity(`${label} deve conter ${count} dígitos.`);
        input.setAttribute('aria-invalid', 'true');
      }
      return false;
    }
    input.setAttribute('aria-invalid', 'false');
    return true;
  };

  const currentDocumentLength = () => personType === 'fisica' ? 11 : 14;
  const currentDocumentLabel = () => personType === 'fisica' ? 'CPF' : 'CNPJ';

  const validateDocument = (reportPartial = false) => validateDigitCount(
    documentInput,
    currentDocumentLength(),
    currentDocumentLabel(),
    reportPartial
  );

  typeOptions.forEach((option) => {
    option.addEventListener('click', () => {
      personType = option.value;
      typeOptions.forEach((item) => item.setAttribute('aria-pressed', String(item === option)));

      documentTypeLabel.textContent = currentDocumentLabel();
      documentInput.name = personType === 'fisica' ? 'CPF' : 'CNPJ';
      documentInput.placeholder = personType === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00';
      documentInput.maxLength = personType === 'fisica' ? 14 : 18;
      documentInput.value = formatDocument(documentInput.value);
      validateDocument();
      status.textContent = '';
    });
  });

  documentInput.addEventListener('input', () => {
    documentInput.value = formatDocument(documentInput.value);
    validateDocument();
  });
  documentInput.addEventListener('blur', () => validateDocument(true));

  postalInput.addEventListener('input', () => {
    const digits = onlyDigits(postalInput.value).slice(0, 8);
    postalInput.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    validateDigitCount(postalInput, 8, 'CEP');
  });
  postalInput.addEventListener('blur', () => validateDigitCount(postalInput, 8, 'CEP', true));

  addressNumberInput.addEventListener('input', () => {
    addressNumberInput.value = onlyDigits(addressNumberInput.value).slice(0, 4);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validateDocument(true);
    validateDigitCount(postalInput, 8, 'CEP', true);

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    status.textContent = 'Esta tela demonstrativa não envia dados.';
  });
});
