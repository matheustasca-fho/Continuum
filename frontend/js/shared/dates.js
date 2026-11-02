/**
 * CONTINUUM — dates.js
 * Regras de negócio de tempo, cálculo de dias úteis e formatação pt-BR.
 */

export const dates = {
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
   * Formata data ISO em formato curto: "04 set. 2026"
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
   * Adiciona N dias úteis a uma data (ignora Sáb e Dom).
   */
  addBusinessDays(startISO, daysToAdd) {
    const date = new Date(startISO);
    let added = 0;
    while (added < daysToAdd) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
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
