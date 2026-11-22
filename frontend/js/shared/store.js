export const SESSION_STORAGE_KEY = "continuum_sessao";

export const STATUS_LOTE = Object.freeze({
  DISPONIVEL: "DISPONÍVEL",
  RESERVADO: "RESERVADO",
  EM_TRANSPORTE: "EM TRANSPORTE PARA O DESIGNER",
  EM_PRODUCAO: "EM PRODUÇÃO",
  ENVIADO_LOJA: "ENVIADO PARA A LOJA",
  FINALIZADO: "FINALIZADO",
  FINALIZADO_NAO_APROVEITADO: "FINALIZADO — NÃO APROVEITADO",
  INTERROMPIDO: "INTERROMPIDO",
});

export const STATUS_RESERVA = Object.freeze({
  ATIVA: "ATIVA",
  CONCLUIDA: "CONCLUÍDA",
  EXPIRADA: "EXPIRADA",
  CANCELADA: "CANCELADA",
});

export const STATUS_CURADORIA = Object.freeze({
  AGUARDANDO: "Aguardando curadoria",
  EM_LOTE: "Em lote",
  NAO_APROVEITADA: "Não aproveitada",
});

export const STATUS_CUPOM = Object.freeze({
  ATIVO: "Ativo",
  UTILIZADO: "Utilizado",
  EXPIRADO: "Expirado",
});

export function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    if (!session) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    /* ignore storage errors */
  }
  return session;
}
