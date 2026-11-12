import { api } from "./api.js";
export async function buscarCep(cep) {
  return api.buscarCep(cep);
}
export function conectarBuscaCep(input, campos, { aoEncontrar } = {}) {
  if (!input) return;
  let ultimo = "";
  const buscar = async () => {
    const d = String(input.value).replace(/\D/g, "");
    if (d.length !== 8 || d === ultimo) return;
    ultimo = d;
    const dados = await buscarCep(d);
    if (!dados) return;
    for (const [chave, valor] of Object.entries({
      uf: dados.uf,
      cidade: dados.localidade,
      bairro: dados.bairro,
      logradouro: dados.logradouro,
    })) {
      const campo = campos[chave];
      if (campo && valor) campo.value = valor;
    }
    aoEncontrar?.(dados);
  };
  input.addEventListener("blur", buscar);
  input.addEventListener("input", () => {
    if (input.value.replace(/\D/g, "").length === 8) buscar();
  });
}
