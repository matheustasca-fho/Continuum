/**
 * CONTINUUM — dates.js
 * Regras de negócio de tempo, cálculo de dias úteis (incluindo feriados de SP) e formatação pt-BR.
 */

const FERIADOS_FIXOS_SP = [
  "01-01", // Confraternização Universal
  "01-25", // Aniversário de São Paulo
  "04-21", // Tiradentes
  "05-01", // Dia do Trabalho
  "07-09", // Revolução Constitucionalista (SP)
  "09-07", // Independência do Brasil
  "10-12", // Nossa Senhora Aparecida
  "11-02", // Finados
  "11-15", // Proclamação da República
  "11-20", // Consciência Negra
  "12-25", // Natal
];

const FERIADOS_MOVEIS_SP = {
  2025: ["2025-03-03", "2025-03-04", "2025-04-18", "2025-06-19"],
  2026: ["2026-02-16", "2026-02-17", "2026-04-03", "2026-06-04"],
  2027: ["2027-02-08", "2027-02-09", "2027-03-26", "2027-05-27"],
};

export const dates = {
  /**
   * Verifica se uma data cai em feriado nacional ou de SP (AN-04 / BE-08.3).
   */
  isHoliday(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const mmdd = `${mm}-${dd}`;
    const ymd = `${yyyy}-${mm}-${dd}`;
    if (FERIADOS_FIXOS_SP.includes(mmdd)) return true;
    return (FERIADOS_MOVEIS_SP[yyyy] || []).includes(ymd);
  },

  /**
   * Formata uma data ISO em formato relativo (pt-BR).
   * Ex: "há 3 dias", "amanhã", "hoje"
   */
  formatRelative(isoDate) {
    const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
    const diffMs = new Date(isoDate) - new Date();
    const diffDays = Math.round(diffMs / 86400000);
    if (Math.abs(diffDays) < 1) return "Hoje";
    return rtf.format(diffDays, "day");
  },

  /**
   * Formata data ISO em formato curto: "04 set 2026"
   */
  formatShort(isoDate) {
    if (!isoDate) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(new Date(isoDate))
      .replace(".", "");
  },

  /**
   * Formata data ISO em formato longo: "quinta-feira, 4 de setembro"
   */
  formatLong(isoDate) {
    if (!isoDate) return "—";
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(isoDate));
  },

  /**
   * Adiciona N dias úteis a uma data (ignora Sáb, Dom e Feriados cadastrados).
   */
  addBusinessDays(startISO, daysToAdd) {
    const date = new Date(startISO);
    let added = 0;
    while (added < daysToAdd) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6 && !this.isHoliday(date)) {
        added++;
      }
    }
    return date;
  },

  /**
   * Calcula o status de prazo baseado na data de reserva e no SLA de 10 dias úteis.
   * @returns {{ status: 'excedido'|'proximo'|'no_prazo', dias: number, prazoISO: string }}
   */
  getPrazoStatus(reservadoEmISO) {
    const prazoFinal = this.addBusinessDays(reservadoEmISO, 10);
    const prazoISO = prazoFinal.toISOString();
    const diffMs = prazoFinal - new Date();
    const diffDias = Math.ceil(diffMs / 86400000);

    let status;
    if (diffDias < 0) status = "excedido";
    else if (diffDias <= 3) status = "proximo";
    else status = "no_prazo";

    return { status, dias: diffDias, prazoISO };
  },

  /**
   * Retorna hoje no formato longo para saudação do painel.
   */
  today() {
    return this.formatLong(new Date().toISOString());
  },
};
