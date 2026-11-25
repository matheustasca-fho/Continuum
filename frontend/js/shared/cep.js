import { api } from "./api.js";

/**
 * Injeta o estilo do spinner de loading e dos campos bloqueados (Cidade/UF) uma única vez no documento.
 */
function garantirEstilosCep() {
  if (typeof document === "undefined") return;
  if (document.getElementById("continuum-cep-styles")) return;
  const style = document.createElement("style");
  style.id = "continuum-cep-styles";
  style.textContent = `
    @keyframes continuum-cep-spin {
      to { transform: rotate(360deg); }
    }
    .cep-loading-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      margin-top: 0.25rem;
      color: var(--color-primary, #782736);
      font-size: 0.72rem;
      font-weight: 600;
    }
    .cep-loading-indicator[hidden] {
      display: none !important;
    }
    .cep-loading-spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(120, 39, 54, 0.25);
      border-top-color: var(--color-primary, #782736);
      border-radius: 50%;
      animation: continuum-cep-spin 0.65s linear infinite;
    }
    .form-input.is-cep-locked,
    input[readonly].is-cep-locked {
      background-color: rgba(226, 228, 221, 0.75) !important;
      color: #4a5048 !important;
      cursor: not-allowed !important;
      pointer-events: none;
      border-color: rgba(195, 200, 190, 0.9) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Consulta o CEP na API do Back-End e, caso não encontre (ex: container sem saída externa),
 * consulta diretamente a API pública do ViaCEP pelo navegador.
 */
export async function buscarCep(cep) {
  const d = String(cep || "").replace(/\D/g, "");
  if (d.length !== 8) return null;

  // 1. Tenta via Back-End (Oracle DB + ViaCEP server-side)
  try {
    const dadosApi = await api.buscarCep(d);
    if (dadosApi && (dadosApi.cidade || dadosApi.localidade || dadosApi.uf)) {
      return {
        cep: d,
        uf: dadosApi.uf || "",
        cidade: dadosApi.cidade || dadosApi.localidade || "",
        localidade: dadosApi.localidade || dadosApi.cidade || "",
        bairro: dadosApi.bairro || "",
        logradouro: dadosApi.logradouro || "",
      };
    }
  } catch {
    /* fallback direto para ViaCEP no navegador */
  }

  // 2. Fallback direto no navegador para a API ViaCEP (Correios)
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${d}/json/`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || json.erro) return null;
    return {
      cep: d,
      uf: json.uf || "",
      cidade: json.localidade || "",
      localidade: json.localidade || "",
      bairro: json.bairro || "",
      logradouro: json.logradouro || "",
    };
  } catch {
    return null;
  }
}

function bloquearCampoEndereco(campo, bloquear) {
  if (!campo) return;
  if (bloquear) {
    campo.readOnly = true;
    campo.setAttribute("readonly", "readonly");
    campo.setAttribute("aria-readonly", "true");
    campo.tabIndex = -1;
    campo.classList.add("is-cep-locked");
  } else {
    campo.readOnly = false;
    campo.removeAttribute("readonly");
    campo.removeAttribute("aria-readonly");
    campo.removeAttribute("tabindex");
    campo.classList.remove("is-cep-locked");
  }
}

function limparErroCampo(campo) {
  if (!campo) return;
  campo.setCustomValidity?.("");
  campo.setAttribute("aria-invalid", "false");
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  campo.dispatchEvent(new Event("blur", { bubbles: true }));
}

/**
 * Conecta a busca automática de CEP ao sair do campo (evento blur/change).
 * Exibe um pequeno loading durante a consulta, preenche cidade, estado, bairro (e logradouro)
 * e bloqueia os campos de cidade e estado após o preenchimento.
 */
export function conectarBuscaCep(input, campos, { aoEncontrar, aoErro } = {}) {
  if (!input) return;
  garantirEstilosCep();

  // Cria o elemento visual de loading logo abaixo do input de CEP
  let loadingEl = input.parentElement?.querySelector(".cep-loading-indicator");
  if (!loadingEl && typeof document !== "undefined" && input.parentElement) {
    loadingEl = document.createElement("div");
    loadingEl.className = "cep-loading-indicator";
    loadingEl.hidden = true;
    loadingEl.setAttribute("role", "status");
    loadingEl.setAttribute("aria-live", "polite");
    loadingEl.innerHTML = `<span class="cep-loading-spinner" aria-hidden="true"></span><span class="cep-loading-text">Buscando endereço pelo CEP...</span>`;
    input.after(loadingEl);
  }

  let ultimoBuscado = "";
  let emAndamento = false;

  // Se o usuário alterar o CEP para um valor menor que 8 dígitos, destrava cidade/estado
  input.addEventListener("input", () => {
    const d = String(input.value).replace(/\D/g, "");
    if (d.length < 8 && ultimoBuscado !== "") {
      ultimoBuscado = "";
      bloquearCampoEndereco(campos.uf, false);
      bloquearCampoEndereco(campos.cidade, false);
    }
  });

  const executarBuscaAoSairDoCampo = async () => {
    const d = String(input.value).replace(/\D/g, "");
    if (d.length !== 8) {
      if (loadingEl) loadingEl.hidden = true;
      bloquearCampoEndereco(campos.uf, false);
      bloquearCampoEndereco(campos.cidade, false);
      return;
    }

    // Se já preencheu este mesmo CEP e cidade/estado já estão preenchidos, mantém bloqueado
    if (
      d === ultimoBuscado &&
      campos.cidade?.value.trim() &&
      campos.uf?.value.trim()
    ) {
      bloquearCampoEndereco(campos.uf, true);
      bloquearCampoEndereco(campos.cidade, true);
      return;
    }

    if (emAndamento) return;
    emAndamento = true;

    if (loadingEl) {
      loadingEl.hidden = false;
    }
    input.setAttribute("aria-busy", "true");

    try {
      // Pequeno delay visual mínimo para garantir que o loading seja perceptível na transição de campo
      const [dados] = await Promise.all([
        buscarCep(d),
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);

      if (!dados) {
        ultimoBuscado = "";
        bloquearCampoEndereco(campos.uf, false);
        bloquearCampoEndereco(campos.cidade, false);
        aoErro?.("CEP não encontrado.");
        return;
      }

      ultimoBuscado = d;

      const valores = {
        uf: dados.uf,
        cidade: dados.cidade || dados.localidade,
        bairro: dados.bairro,
        logradouro: dados.logradouro,
      };

      for (const [chave, valor] of Object.entries(valores)) {
        const campo = campos[chave];
        if (campo && valor) {
          campo.value = valor;
          limparErroCampo(campo);
        }
      }

      // Bloqueia os campos de Cidade e Estado (UF) após preencher
      if (campos.uf && valores.uf) {
        bloquearCampoEndereco(campos.uf, true);
      }
      if (campos.cidade && valores.cidade) {
        bloquearCampoEndereco(campos.cidade, true);
      }

      aoEncontrar?.(dados);
    } finally {
      emAndamento = false;
      if (loadingEl) {
        loadingEl.hidden = true;
      }
      input.removeAttribute("aria-busy");
    }
  };

  // Dispara ao mudar de campo (blur e change)
  input.addEventListener("blur", executarBuscaAoSairDoCampo);
  input.addEventListener("change", executarBuscaAoSairDoCampo);
}
