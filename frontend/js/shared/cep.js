import { api } from "./api.js";

export async function buscarCep(cep) {
  return api.buscarCep(cep);
}

export function conectarBuscaCep(
  input,
  campos,
  { aoEncontrar, aoNaoEncontrar } = {},
) {
  if (!input) return;
  let ultimo = "";
  const wrap = input.closest?.(".input-lookup-wrap") || null;

  const buscar = async () => {
    const d = String(input.value || "").replace(/\D/g, "");
    if (d.length !== 8 || d === ultimo) return;
    ultimo = d;
    wrap?.classList.add("is-loading");
    try {
      const dados = await buscarCep(d);
      if (!dados) {
        ultimo = "";
        aoNaoEncontrar?.(d);
        return;
      }
      for (const [chave, valor] of Object.entries({
        uf: dados.uf,
        cidade: dados.localidade,
        bairro: dados.bairro,
        logradouro: dados.logradouro,
      })) {
        const campo = campos[chave];
        if (campo && valor) {
          campo.value = valor;
          campo.classList?.add("is-autofilled");
          campo.setAttribute?.("aria-invalid", "false");
          campo.setCustomValidity?.("");
        }
      }
      aoEncontrar?.(dados);
    } finally {
      wrap?.classList.remove("is-loading");
    }
  };

  input.addEventListener("blur", buscar);
  input.addEventListener("input", () => {
    const d = String(input.value || "").replace(/\D/g, "");
    if (d.length < 8) ultimo = "";
    if (d.length === 8) buscar();
  });
}
