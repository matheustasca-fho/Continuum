import {
  STATUS_LOTE,
  STATUS_RESERVA,
  STATUS_CURADORIA,
  STATUS_CUPOM,
  readSession,
  writeSession,
} from "./store.js";
import { ROUTES, requestRoute } from "./routes.js";

export { STATUS_LOTE, STATUS_RESERVA, STATUS_CURADORIA, STATUS_CUPOM };

const digits = (x) => String(x || "").replace(/\D/g, "");

export const cpfValido = (x) => {
  const d = digits(x);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const c = (n) =>
    (([...d.slice(0, n)].reduce((s, v, i) => s + Number(v) * (n + 1 - i), 0) *
      10) %
      11) %
    10;
  return c(9) === +d[9] && c(10) === +d[10];
};

export const cnpjValido = (x) => {
  const d = digits(x);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (s) => {
    let w = s - 7,
      sum = 0;
    for (let i = 0; i < s; i++) {
      if (w < 2) w = 9;
      sum += +d[i] * w--;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
};

/**
 * Motor de verificação de ciclo de 5 doações por loja em 6 meses (BE-20)
 */
export function vincularDoacoesECriarCupons(doador, doacoes = [], empresas = []) {
  const cpf = digits(doador?.cpf);
  const sixMonths = 183 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const validas = doacoes.filter((d) => {
    if (digits(d.cpfInformado || d.cpfDoador) !== cpf) return false;
    const diff = now - new Date(d.criadoEm || d.dataDoacao).getTime();
    if (diff > sixMonths && d.statusContagem === "CONTANDO") {
      d.statusContagem = "EXPIRADA";
    }
    return d.statusContagem === "CONTANDO" && diff <= sixMonths;
  });

  const porLoja = {};
  for (const d of validas) {
    (porLoja[d.empresaId] ||= []).push(d);
  }
  const novosCupons = [];
  for (const [empresaId, lista] of Object.entries(porLoja)) {
    while (lista.length >= 5) {
      const ciclo = lista.splice(0, 5);
      ciclo.forEach((d) => (d.statusContagem = "EM_CUPOM"));
      const emp = empresas.find((e) => e.id === empresaId);
      novosCupons.push({
        empresaId,
        empresaNome: emp?.nomeFantasia || "Empresa Parceira",
        cpfDoador: cpf,
        percentual: emp?.politicaCupom?.percentual ?? 15,
        status: STATUS_CUPOM.ATIVO,
      });
    }
  }
  return novosCupons;
}

const persistAuthenticatedSession = (perfil, sessionData) => {
  if (!sessionData) return null;
  const usuarioEmpresa = sessionData.usuarioEmpresa || null;
  const usuario = sessionData.usuario || usuarioEmpresa || null;
  const normalized = {
    ...sessionData,
    perfil: sessionData.perfil || perfil,
    nome:
      sessionData.nome ||
      usuario?.nome ||
      usuarioEmpresa?.nome ||
      sessionData.nomeFantasia ||
      "",
    perfilEmpresa:
      sessionData.perfilEmpresa || usuarioEmpresa?.perfil || "ADMIN",
  };
  writeSession(normalized);
  return normalized;
};

// Mapeia quais ações exigem permissão de ADMIN na empresa antes de disparar o fetch (BE-18)
const ROTAS_RESTRITAS_ADMIN = {
  atualizarLote: "EDITAR_EXCLUIR_LOTE",
  excluirLote: "EDITAR_EXCLUIR_LOTE",
  atualizarPerfilEmpresa: "EDITAR_PERFIL_POLITICA_CARTILHA",
  listarUsuariosEmpresa: "GERENCIAR_USUARIOS_ASSINATURA",
  salvarUsuarioEmpresa: "GERENCIAR_USUARIOS_ASSINATURA",
  alternarAtivoUsuario: "GERENCIAR_USUARIOS_ASSINATURA",
  atualizarUsuarioEmpresa: "GERENCIAR_USUARIOS_ASSINATURA",
};

const apiMethods = {
  async login(perfil, identificador, senha) {
    const session = await requestRoute("login", [perfil, identificador, senha]);
    return persistAuthenticatedSession(perfil, session);
  },

  async registrarEmpresaComAssinatura(empresa, administrador, pagamento) {
    const created = await requestRoute("registrarEmpresaComAssinatura", [
      empresa,
      administrador,
      pagamento,
    ]);
    persistAuthenticatedSession("empresa", {
      perfil: "empresa",
      empresaId: created?.id || created?.cnpj,
      nome: administrador?.nome || created?.nomeFantasia,
      perfilEmpresa: "ADMIN",
      usuarioEmpresa: {
        nome: administrador?.nome,
        email: administrador?.email,
        telefone: administrador?.telefone,
        perfil: "ADMIN",
        ativo: true,
      },
    });
    return created;
  },

  async logout() {
    try {
      await requestRoute("logoutSessao", []);
    } catch {
      /* ignore network error on logout */
    }
    writeSession(null);
  },


  getSessaoAtual() {
    return readSession();
  },

  podeExecutar(acao) {
    const s = this.getSessaoAtual();
    const p = s?.usuarioEmpresa?.perfil || s?.perfilEmpresa || "ADMIN";
    if (s && s.perfil && s.perfil !== "empresa") return false;
    if (p === "ADMIN") return true;
    return (
      p === "OPERADOR" &&
      ![
        "EDITAR_EXCLUIR_LOTE",
        "FINALIZAR_PECA_QR",
        "EDITAR_PERFIL_POLITICA_CARTILHA",
        "GERENCIAR_USUARIOS_ASSINATURA",
      ].includes(acao)
    );
  },


  verificarPermissaoEmpresa(acao) {
    if (!this.podeExecutar(acao)) {
      throw new Error("Acesso restrito ao administrador da loja.");
    }
    return true;
  },
};

export const api = new Proxy(apiMethods, {
  get(target, property, receiver) {
    if (Reflect.has(target, property)) {
      return Reflect.get(target, property, receiver);
    }
    if (typeof property === "string" && property in ROUTES) {
      return (...args) => {
        if (property === "atualizarLote" || property === "excluirLote") {
          target.verificarPermissaoEmpresa("EDITAR_EXCLUIR_LOTE");
        } else if (property === "atualizarPerfilEmpresa") {
          target.verificarPermissaoEmpresa("EDITAR_PERFIL_POLITICA_CARTILHA");
        } else if (property in ROTAS_RESTRITAS_ADMIN) {
          target.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
        }
        return requestRoute(property, args);
      };
    }
    return undefined;
  },
});
