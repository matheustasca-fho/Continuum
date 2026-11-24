/*
 * Camada HTTP do front-end. Configure window.CONTINUUM_API_URL para enviar
 * requisições ao servidor; sem essa configuração, os handlers de demonstração
 * mantêm a UI ligada ao store local compartilhado.
 */
const route = (method, path, payload = (args) => ({ args })) => ({
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
  atualizarPerfilDoador: route("PATCH", "/doadores/:cpf", ([cpf, dados]) => ({
    cpf,
    ...dados,
  })),
  getPerfilDoador: route("GET", "/doadores/me", () => undefined),
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
    ([id]) => ({ id }),
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
  listarLotesVitrineSP: route("GET", "/lotes/vitrine?uf=SP", () => undefined),
  obterLotePorCodigo: route("GET", "/lotes/:codigo", ([codigo]) => ({
    codigo,
  })),
  criarLote: route("POST", "/lotes", ([dados]) => dados),
  atualizarLote: route("PATCH", "/lotes/:id", ([id, dados]) => ({
    id,
    ...dados,
  })),
  excluirLote: route("DELETE", "/lotes/:id", ([id]) => ({ id })),
  validarSenhaAdmin: route(
    "POST",
    "/empresas/sessao/validar-admin",
    ([senha]) => ({ senha }),
  ),
  reservarLote: route(
    "POST",
    "/lotes/:codigo/reservas",
    ([codigo, designerId, tipoLogistica]) => ({
      codigo,
      designerId,
      tipoLogistica,
    }),
  ),
  listarMeusLotesDesigner: route("GET", "/designers/:id/lotes", ([id]) => ({
    id,
  })),
  listarLotesEmpresa: route("GET", "/empresas/:id/lotes", ([id]) => ({ id })),
  confirmarRecebimentoDesigner: route(
    "PATCH",
    "/lotes/:id/recebimento",
    ([id]) => ({ id }),
  ),
  listarProjetosEmpresa: route("GET", "/empresas/projetos", () => undefined),
  alterarStatusProjeto: route(
    "PATCH",
    "/projetos/:id/status",
    ([id, status]) => ({ id, status }),
  ),
  buscarCep: route("GET", "/enderecos/cep/:cep", ([cep]) => ({ cep })),
  consultarCNPJ: route("GET", "/empresas/consulta-cnpj/:cnpj", ([cnpj]) => ({
    cnpj,
  })),
  getMeusProjetos: route("GET", "/designers/:id/projetos", ([id]) => ({ id })),
  getProjeto: route("GET", "/projetos/:id", ([id]) => ({ id })),
  getDashboardStats: route("GET", "/designers/:id/dashboard", ([id]) => ({
    id,
  })),
  getEmpresa: route("GET", "/empresas/me", () => undefined),
  getDoadorStats: route("GET", "/doadores/me/estatisticas", () => undefined),
  listarEmpresas: route("GET", "/empresas", () => undefined),
  getDesigner: route("GET", "/designers/me", () => undefined),
  alternarFavorito: route(
    "PUT",
    "/designers/me/favoritos/:loteId",
    ([loteId]) => ({ loteId }),
  ),
  getEmpresaDashboardStats: route(
    "GET",
    "/empresas/me/dashboard",
    () => undefined,
  ),
  listarUsuariosEmpresa: route("GET", "/empresas/me/usuarios", () => undefined),
  salvarUsuarioEmpresa: route(
    "POST",
    "/empresas/me/usuarios",
    ([dados]) => dados,
  ),
  alternarAtivoUsuario: route(
    "PATCH",
    "/empresas/me/usuarios/:id/status",
    ([id, ativo]) => ({ id, ativo }),
  ),
  atualizarUsuarioEmpresa: route(
    "PATCH",
    "/empresas/me/usuarios/:id",
    ([id, dados]) => ({ id, ...dados }),
  ),
};

const endpointFor = (definition, args) => {
  let path = definition.path;
  const values = Array.isArray(args) ? args : [];
  // Troca cada segmento nomeado pelo ID correspondente aos argumentos.
  // Substitui parâmetros na mesma ordem em que aparecem no payload documentado.
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

export async function requestRoute(name, args, mockHandler) {
  const definition = ROUTES[name];
  if (!definition) return mockHandler(...args);
  const base = String(globalThis.CONTINUUM_API_URL || "").replace(/\/$/, "");
  const body = definition.payload(args);
  const path = endpointFor(definition, args);
  // Permite inspeção dos exemplos JSON durante integração e desenvolvimento.
  globalThis.__CONTINUUM_LAST_REQUEST__ = {
    method: definition.method,
    url: `${base}${path}`,
    body: body === undefined ? null : hideSecrets(body),
  };
  // Sem URL de backend, executa o adaptador local da demonstração.
  if (!base) return mockHandler(...args);
  const response = await fetch(`${base}${path}`, {
    method: definition.method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(result?.message || `Falha HTTP ${response.status}`);
  const data = result?.data ?? result;
  if (name === "validarSenhaAdmin" && typeof data?.valido === "boolean")
    return data.valido;
  return data;
}

export function createRoutedApi(mockApi) {
  const syncMethods = new Set([
    "logout",
    "getSessaoAtual",
    "getPerfilEmpresaAtual",
    "consultarProgressoCupomCpf",
    "podeExecutar",
    "verificarPermissaoEmpresa",
  ]);
  // Mantém os métodos usados pelas páginas e centraliza HTTP/fallback local.
  return new Proxy(mockApi, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function" || syncMethods.has(property))
        return value;
      return (...args) =>
        requestRoute(property, args, (...mockArgs) =>
          value.apply(target, mockArgs),
        );
    },
  });
}
