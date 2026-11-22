/*
 * Camada HTTP central do front-end.
 * Todas as operações são executadas diretamente contra a API PHP (sem fallback mock local).
 */
import { SESSION_STORAGE_KEY } from "./store.js";

export const DEFAULT_API_URL = "http://localhost:8000/api";

const route = (method, path, payload = () => undefined) => ({
  method,
  path,
  payload,
});

const credentialsForRequest = (value = {}) => {
  const { senhaHash, ...rest } = value;
  return { ...rest, ...(senhaHash ? { senha: senhaHash } : {}) };
};

const hideSecrets = (value) => {
  if (Array.isArray(value)) return value.map(hideSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /senha|password|cvv/i.test(key) ? "[redacted]" : hideSecrets(item),
    ]),
  );
};

export const ROUTES = {
  registrarDoador: route("POST", "/doadores", ([dados]) =>
    credentialsForRequest(dados),
  ),
  buscarDoador: route("GET", "/doadores/:cpf"),
  buscarDoadorPorEmail: route("GET", "/doadores?email=:email"),
  atualizarPerfilDoador: route("PATCH", "/doadores/:cpf", ([cpf, dados]) => ({
    cpf,
    ...dados,
  })),
  getPerfilDoador: route("GET", "/doadores/me"),
  validarCupom: route("GET", "/cupons/:codigo"),
  utilizarCupom: route(
    "POST",
    "/cupons/:codigo/utilizacao",
    ([codigo]) => ({ codigo }),
  ),
  registrarConfeccionista: route("POST", "/designers", ([dados]) =>
    credentialsForRequest(dados),
  ),
  atualizarPerfilConfeccionista: route(
    "PATCH",
    "/designers/:id",
    ([id, dados]) => ({ id, ...dados }),
  ),
  login: route("POST", "/auth/login", ([perfil, identificador, senha]) => ({
    perfil,
    identificador,
    senha,
  })),
  logoutSessao: route("DELETE", "/auth/logout"),
  redefinirSenha: route(
    "PATCH",
    "/auth/senha",
    ([identificador, novaSenha, confirmacaoSenha]) => ({
      identificador,
      novaSenha,
      confirmacaoSenha,
    }),
  ),
  finalizarProjetoDesigner: route(
    "PATCH",
    "/projetos/:id/finalizacao",
    ([id, dados = {}]) => ({ id, ...dados }),
  ),
  guardarEmpresaPendente: route(
    "POST",
    "/empresas/rascunhos",
    ([empresa, administrador]) => ({
      empresa,
      administrador: credentialsForRequest(administrador),
    }),
  ),
  registrarEmpresaComAssinatura: route(
    "POST",
    "/empresas",
    ([empresa, administrador, pagamento]) => ({
      empresa,
      administrador: credentialsForRequest(administrador),
      pagamento,
    }),
  ),
  atualizarPerfilEmpresa: route("PATCH", "/empresas/:id", ([id, dados]) => ({
    id,
    ...dados,
  })),
  listarLotesVitrineSP: route("GET", "/lotes/vitrine?uf=SP"),
  obterLotePorCodigo: route("GET", "/lotes/:codigo"),
  criarLote: route("POST", "/lotes", ([dados]) => dados),
  atualizarLote: route("PATCH", "/lotes/:id", ([id, dados]) => ({
    id,
    ...dados,
  })),
  excluirLote: route("DELETE", "/lotes/:id"),
  validarSenhaAdmin: route(
    "POST",
    "/empresas/sessao/validar-admin",
    ([senha]) => ({ senha }),
  ),
  reservarLote: route(
    "POST",
    "/lotes/:codigo/reservas",
    ([codigo, designerId, tipoLogistica, opcoes = {}]) => ({
      codigo,
      designerId,
      tipoLogistica,
      termoAceito: opcoes.termoAceito ?? true,
      ...opcoes,
    }),
  ),
  confirmarRetiradaLote: route(
    "PATCH",
    "/lotes/:id/retirada",
    ([id, dados = {}]) => ({ id, ...dados }),
  ),
  registrarEnvioLote: route(
    "PATCH",
    "/lotes/:id/envio",
    ([id, codigoRastreio, dataEnvio]) => ({ id, codigoRastreio, dataEnvio }),
  ),
  listarMeusLotesDesigner: route("GET", "/designers/:id/lotes"),
  listarLotesEmpresa: route("GET", "/empresas/:id/lotes"),
  confirmarRecebimentoDesigner: route(
    "PATCH",
    "/lotes/:id/recebimento",
    ([id]) => ({ id }),
  ),
  cancelarLoteDesigner: route(
    "POST",
    "/lotes/:id/cancelamento",
    ([id, dados]) => ({ id, ...dados }),
  ),
  listarProjetosEmpresa: route("GET", "/empresas/projetos"),
  alterarStatusProjeto: route(
    "PATCH",
    "/projetos/:id/status",
    ([id, status, dados = {}]) => ({ id, status, ...dados }),
  ),
  obterQrCodeProjeto: route("GET", "/projetos/:id/qrcode"),
  obterPecaPublica: route("GET", "/publico/pecas/:codigo"),
  buscarCep: route("GET", "/enderecos/cep/:cep"),
  consultarCNPJ: route("GET", "/empresas/consulta-cnpj/:cnpj"),
  getMeusProjetos: route("GET", "/designers/:id/projetos"),
  getProjeto: route("GET", "/projetos/:id"),
  getDashboardStats: route("GET", "/designers/:id/dashboard"),
  getEmpresa: route("GET", "/empresas/me"),
  getDoadorStats: route("GET", "/doadores/me/estatisticas"),
  listarEmpresas: route("GET", "/empresas"),
  getDesigner: route("GET", "/designers/me"),
  alternarFavorito: route(
    "PUT",
    "/designers/me/favoritos/:loteId",
    ([loteId]) => ({ loteId }),
  ),
  getEmpresaDashboardStats: route("GET", "/empresas/me/dashboard"),
  obterCertificadoEmpresa: route("GET", "/empresas/me/certificado"),
  listarNotificacoes: route("GET", "/notificacoes"),
  listarDoacoesEmpresa: route("GET", "/empresas/me/doacoes"),
  registrarDoacaoEmpresa: route(
    "POST",
    "/empresas/me/doacoes",
    ([dados]) => dados,
  ),
  listarUsuariosEmpresa: route("GET", "/empresas/me/usuarios"),
  salvarUsuarioEmpresa: route(
    "POST",
    "/empresas/me/usuarios",
    ([dados]) => credentialsForRequest(dados),
  ),
  alternarAtivoUsuario: route(
    "PATCH",
    "/empresas/me/usuarios/:id/status",
    ([id, ativo]) => ({ id, ativo }),
  ),
  atualizarUsuarioEmpresa: route(
    "PATCH",
    "/empresas/me/usuarios/:id",
    ([id, dados]) => ({ id, ...credentialsForRequest(dados) }),
  ),
};

const endpointFor = (definition, args) => {
  let path = definition.path;
  const values = Array.isArray(args) ? args : [];
  const candidates = values.flatMap((value) =>
    value && typeof value === "object"
      ? [value.id, value.codigo, value.cpf]
      : [value],
  );
  for (const value of candidates) {
    if (value == null) continue;
    path = path.replace(/:[\w]+/, encodeURIComponent(String(value)));
  }
  return path;
};

const readCurrentToken = () => {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
};

export async function requestRoute(name, args = []) {
  const definition = ROUTES[name];
  if (!definition) {
    throw new Error(`Rota não configurada na camada de API: ${name}`);
  }
  const base = String(globalThis.CONTINUUM_API_URL || DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );
  const body = definition.payload(args);
  const hasBody =
    body !== undefined &&
    !["GET", "HEAD", "DELETE"].includes(definition.method);
  const path = endpointFor(definition, args);
  const token = readCurrentToken();

  globalThis.__CONTINUUM_LAST_REQUEST__ = {
    method: definition.method,
    url: `${base}${path}`,
    body: hasBody ? hideSecrets(body) : null,
    hasAuthToken: Boolean(token),
  };

  const response = await fetch(`${base}${path}`, {
    method: definition.method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(
      result?.erro || result?.message || `Falha HTTP ${response.status}`,
    );
  }
  const data = result?.data ?? result;
  if (name === "validarSenhaAdmin" && typeof data?.valido === "boolean") {
    return data.valido;
  }
  return data;
}
