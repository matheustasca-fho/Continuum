/**
 * CONTINUUM — api.js
 * Camada de serviço. Simula chamadas assíncronas com latência e validações.
 * Todas as regras de negócio passam por aqui antes de tocar no store.
 */

import { store } from "./store.js";
import { dates } from "./dates.js";

/** Simula latência de rede. */
const delay = (ms = 350 + Math.random() * 200) =>
  new Promise((res) => setTimeout(res, ms));

export const api = {
  /* -----------------------------------------------------------------------
     LOTES
  ----------------------------------------------------------------------- */

  async getLotesDisponiveis() {
    await delay();
    return store.get("lotes").filter((l) => l.status_lote === "DISPONIVEL");
  },

  async getMeusLotes(designer_id) {
    await delay();
    const lotes = store.get("lotes");
    const projetos = store.get("projetos");

    return lotes
      .filter((l) => l.designer_id === designer_id)
      .map((lote) => {
        const projeto =
          projetos.find((p) => p.cd_lote === lote.cd_lote) || null;
        const prazoInfo = lote.reservado_em
          ? dates.getPrazoStatus(lote.reservado_em)
          : null;

        return { ...lote, _projeto: projeto, _prazoInfo: prazoInfo };
      });
  },

  /**
   * Reserva um lote disponível para um designer.
   * Regra: Lote deve estar DISPONIVEL.
   */
  async reservarLote(cd_lote, designer_id) {
    await delay(600);
    const lotes = store.get("lotes");
    const lote = lotes.find((l) => l.cd_lote === cd_lote);

    if (!lote) throw new Error("Lote não encontrado.");
    if (lote.status_lote !== "DISPONIVEL")
      throw new Error("Este lote não está mais disponível.");

    const updated = store.update("lotes", "cd_lote", cd_lote, {
      status_lote: "RESERVADO",
      designer_id,
      reservado_em: new Date().toISOString(),
    });

    // Cria o projeto associado
    const projetos = store.get("projetos");
    const novoProjeto = {
      cd_projeto: Date.now(),
      cd_lote: updated.cd_lote,
      lote_nome: updated.desc_itens,
      status_projeto: "RESERVADO",
      nm_projeto: `Projeto #${updated.nr_lote}`,
      ds_descricao: "",
      prazo_iso: dates.addBusinessDays(updated.reservado_em, 10).toISOString(),
      empresa_id: updated.empresa_id,
      empresa_nome: updated.empresa_nome,
      designer_id,
      reservado_em: updated.reservado_em,
      recebido_em: null,
      finalizado_em: null,
    };
    projetos.push(novoProjeto);
    store.set("projetos", projetos);
    store.addRastreamento(
      novoProjeto.cd_projeto,
      "RESERVADO",
      "Lote reservado pelo designer. Termo de responsabilidade assinado.",
    );

    return updated;
  },

  /**
   * Designer sinaliza que recebeu o lote físico.
   */
  async sinalizarRecebido(cd_lote, cd_projeto) {
    await delay(500);
    store.update("lotes", "cd_lote", cd_lote, {
      status_lote: "EM_PRODUCAO",
    });
    const proj = store.update("projetos", "cd_projeto", cd_projeto, {
      status_projeto: "EM_PRODUCAO",
      recebido_em: new Date().toISOString(),
    });
    store.addRastreamento(
      cd_projeto,
      "EM_PRODUCAO",
      "Designer confirmou o recebimento do lote.",
    );
    return proj;
  },

  /* -----------------------------------------------------------------------
     PROJETOS
  ----------------------------------------------------------------------- */

  async getMeusProjetos(designer_id) {
    await delay();
    const projetos = store
      .get("projetos")
      .filter((p) => p.designer_id === designer_id);

    return projetos.map((projeto) => {
      const prazoInfo = projeto.prazo_iso
        ? dates.getPrazoStatus(projeto.reservado_em)
        : null;
      return { ...projeto, _prazoInfo: prazoInfo };
    });
  },

  async getProjeto(cd_projeto) {
    await delay(200);
    const projeto = store
      .get("projetos")
      .find((p) => p.cd_projeto === cd_projeto);
    if (!projeto) throw new Error("Projeto não encontrado.");

    const rastreamento = store
      .get("rastreamento")
      .filter((r) => r.cd_projeto === cd_projeto);
    return { ...projeto, _rastreamento: rastreamento };
  },

  /**
   * Designer finaliza o projeto e envia processo criativo.
   */
  async finalizarProjeto(cd_projeto, cd_lote, comentario) {
    await delay(700);
    store.update("lotes", "cd_lote", cd_lote, {
      status_lote: "FINALIZADO",
    });
    const proj = store.update("projetos", "cd_projeto", cd_projeto, {
      status_projeto: "FINALIZADO",
      finalizado_em: new Date().toISOString(),
      ds_processo_criativo: comentario,
    });
    store.addRastreamento(
      cd_projeto,
      "FINALIZADO",
      `Projeto finalizado. Comentário: "${comentario || "nenhum"}".`,
    );
    return proj;
  },

  /* -----------------------------------------------------------------------
     PAINEL (Dashboard Stats)
  ----------------------------------------------------------------------- */

  async getDashboardStats(designer_id) {
    await delay(300);
    const projetos = store
      .get("projetos")
      .filter((p) => p.designer_id === designer_id);

    const stats = {
      reservados: projetos.filter((p) => p.status_projeto === "RESERVADO")
        .length,
      em_andamento: projetos.filter((p) => p.status_projeto === "EM_PRODUCAO")
        .length,
      finalizados: projetos.filter((p) => p.status_projeto === "FINALIZADO")
        .length,
    };

    const pendencias = [];

    projetos
      .filter((p) => p.status_projeto === "RESERVADO")
      .forEach((p) => {
        pendencias.push({
          tipo: "lote_aguardando",
          texto: `Lote "${p.lote_nome}" aguardando confirmação de recebimento`,
          cd_ref: p.cd_projeto,
          link: "meus-lotes",
        });
      });

    projetos
      .filter((p) => p.status_projeto === "EM_PRODUCAO" && p.prazo_iso)
      .forEach((p) => {
        const info = dates.getPrazoStatus(p.reservado_em);
        if (info.status === "proximo") {
          pendencias.push({
            tipo: "prazo_proximo",
            texto: `Projeto "${p.nm_projeto}" com prazo em ${info.dias} dias`,
            cd_ref: p.cd_projeto,
            link: "meus-projetos",
          });
        }
        if (info.status === "excedido") {
          pendencias.push({
            tipo: "prazo_excedido",
            texto: `Projeto "${p.nm_projeto}" com prazo EXCEDIDO`,
            cd_ref: p.cd_projeto,
            link: "meus-projetos",
          });
        }
      });

    return { stats, pendencias };
  },
};
