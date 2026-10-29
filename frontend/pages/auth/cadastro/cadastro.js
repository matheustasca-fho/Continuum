document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formCadastro");
  const radioInputs = document.querySelectorAll('input[name="perfil"]');
  const optionCards = document.querySelectorAll(".auth-card__option");
  const profilePanel = document.querySelector(".profile-panel");
  const companyContact = document.getElementById("companyContact");
  const closeCompanyContact = document.getElementById("closeCompanyContact");
  const companyContactDone = document.getElementById("companyContactDone");
  const doadorProfile = "doador";
  const designerProfile = "designer";

  let selectionInProgress = false;

  const openCompanyContact = () => {
    if (companyContact && !companyContact.open) companyContact.showModal();
  };

  /**
   * @param {string} perfil - 'doador' | 'designer' | 'empresa'
   */
  const handleProfileSelection = (perfil) => {
    if (!perfil || selectionInProgress) return;

    try {
      sessionStorage.setItem("continuum_perfil", perfil);
    } catch (e) {
      console.warn("Armazenamento em sessionStorage não disponível:", e);
    }

    if (perfil === "empresa") {
      openCompanyContact();
      return;
    }

    selectionInProgress = true;

    const selectedCard = document
      .querySelector(`.auth-card__option input[value="${perfil}"]`)
      ?.closest(".auth-card__option");
    selectedCard?.classList.add("auth-card__option--confirming");
    profilePanel?.classList.add("profile-panel--confirming");

    let targetUrl;

    switch (perfil) {
      case doadorProfile:
        targetUrl = "doador/index.html";
        break;
      case designerProfile:
        targetUrl = "designer/index.html";
        break;
    }

    setTimeout(() => {
      window.location.href = targetUrl;
    }, 200);
  };

  // Escuta mudanças nos inputs de rádio
  radioInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      if (event.target.checked) {
        handleProfileSelection(event.target.value);
      }
    });
  });

  optionCards.forEach((card) => {
    card.addEventListener("click", () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio?.checked && radio.value === "empresa") openCompanyContact();
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const radio = card.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          // Dispara manualmente o evento change
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  });

  closeCompanyContact?.addEventListener("click", () => companyContact.close());
  companyContactDone?.addEventListener("click", () => companyContact.close());
  companyContact?.addEventListener("click", (event) => {
    if (event.target === companyContact) companyContact.close();
  });

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selectedRadio = form.querySelector('input[name="perfil"]:checked');
      if (selectedRadio) {
        handleProfileSelection(selectedRadio.value);
      }
    });
  }
});
