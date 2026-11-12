export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
export function validarCPF(value) {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n) =>
    (([...d.slice(0, n)].reduce((s, v, i) => s + Number(v) * (n + 1 - i), 0) *
      10) %
      11) %
    10;
  return calc(9) === +d[9] && calc(10) === +d[10];
}
export function validarCNPJ(value) {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n) => {
    let w = n - 7,
      sum = 0;
    for (let i = 0; i < n; i++) {
      if (w < 2) w = 9;
      sum += +d[i] * w--;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}
export const mascaraCPF = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
export const mascaraCNPJ = (v) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};
export const mascaraCEP = (v) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};
export const mascaraTelefone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length < 3) return d;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}${d.length > 7 ? `-${d.slice(7)}` : ""}`;
};
