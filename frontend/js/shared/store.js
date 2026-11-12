export const STORE_KEY = "CONTINUUM_STORE_V3";
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

const seed = () => {
  const empresa = {
    id: "EMP-01",
    cnpj: "12345678000195",
    razaoSocial: "Ateliê Boreal LTDA",
    nomeFantasia: "Ateliê Boreal",
    cep: "01310000",
    logradouro: "Avenida Paulista",
    numero: "1000",
    complemento: "",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    uf: "SP",
    horariosFuncionamento: [
      { diaSemana: "Segunda a sexta", abertura: "10:00", fechamento: "18:00" },
    ],
    horarioRetirada: "Seg a Sex das 10h às 18h",
    aceitaRetirada: true,
    segmento: "Moda Feminina",
    porte: "Microempresa (ME)",
    perfilLoja: "Marca focada em moda consciente.",
    logo: "",
    cartilhaPadrao: {
      versao: "v1.0",
      conteudo: "Acabamento limpo e higienização adequada.",
      atualizadoEm: "",
    },
    politicaCupom: { percentual: 15, validadeDias: 30 },
    assinatura: {
      plano: "Parceiro Circular",
      valorFicticio: 299.9,
      status: "ATIVA",
      bandeiraCartao: "VISA",
      ultimos4Digitos: "4242",
    },
  };
  const lotes = [
    {
      id: "LT-01",
      codigo: "LOT-2026-001",
      titulo: "Retalhos de algodão cru",
      descricao: "Retalhos médios e grandes para upcycling.",
      pesoKg: 12.5,
      quantidadePecas: 24,
      composicao: "100% algodão",
      empresaId: empresa.id,
      criadoPorUsuarioId: "UE-01",
      status: STATUS_LOTE.DISPONIVEL,
      briefing: {
        ideiaMarca: "Camisetas oversized e acessórios",
        expectativa: "Peças funcionais",
        liberdadeCriativa: "Cores e recortes livres",
        prazoProducaoDias: 30,
      },
      doacoesVinculadas: ["DOA-01"],
      criadoEm: new Date().toISOString(),
      lojaId: "LJ-01",
      peso: "12,5 kg",
      material: "algodão",
      tipo: "tecido",
      publicado_em: new Date().toISOString(),
      distancia: "3,2 km",
      logistica_aceita: ["retirada", "envio"],
      status_lote: STATUS_LOTE.DISPONIVEL,
      perfil_loja: empresa.perfilLoja,
      direcao: "Criar camisetas ou acessórios.",
    },
    {
      id: "LT-02",
      codigo: "LOT-2026-002",
      titulo: "Peças de malha",
      descricao: "Peças de malha selecionadas.",
      pesoKg: 2.8,
      quantidadePecas: 12,
      composicao: "Malha mista",
      empresaId: empresa.id,
      criadoPorUsuarioId: "UE-01",
      status: STATUS_LOTE.DISPONIVEL,
      briefing: {
        ideiaMarca: "Vestidos ou tops",
        expectativa: "Reaproveitamento",
        liberdadeCriativa: "Livre",
        prazoProducaoDias: 30,
      },
      doacoesVinculadas: [],
      criadoEm: new Date().toISOString(),
      lojaId: "LJ-01",
      peso: "2,8 kg",
      material: "malha",
      tipo: "tecido",
      publicado_em: new Date().toISOString(),
      distancia: "3,2 km",
      logistica_aceita: ["retirada", "envio"],
      status_lote: STATUS_LOTE.DISPONIVEL,
      perfil_loja: empresa.perfilLoja,
      direcao: "Reaproveitamento para novas peças.",
    },
  ];
  return {
    doadores: [
      {
        id: "DOR-01",
        usuario: "doador",
        nome: "Doador(a) teste",
        cpf: "11144477735",
        email: "doador@continuum.com",
        telefone: "11987654321",
        cep: "01310000",
        senhaHash: "doador123",
        faixaEtaria: "",
        comoConheceu: "",
        aceitouTermosEm: new Date().toISOString(),
        criadoEm: new Date().toISOString(),
      },
      {
        id: "DOR-02",
        nome: "Marina Demo",
        cpf: "98765432100",
        email: "marina@continuum.com",
        telefone: "11977776666",
        cep: "01001000",
        senhaHash: "marina123",
        faixaEtaria: "25 a 34 anos",
        comoConheceu: "Instagram / Redes Sociais",
        aceitouTermosEm: new Date().toISOString(),
        criadoEm: new Date().toISOString(),
      },
    ],
    confeccionistas: [
      {
        id: "DSG-01",
        usuario: "designer",
        tipoPessoa: "PF",
        documento: "52998224725",
        razaoSocial: "",
        nomeProfissional: "Designer Demonstração",
        nome: "Designer Demonstração",
        email: "designer@continuum.com",
        telefone: "11987654321",
        cep: "01310000",
        logradouro: "Avenida Paulista",
        numero: "100",
        complemento: "",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
        senhaHash: "designer123",
        maioridadeConfirmada: true,
        aceitouTermosEm: new Date().toISOString(),
        especialidades: [],
        faixaExperiencia: "",
        portfolio: "",
        manifesto: "",
        instagram: "",
        site: "",
        consentimentoPerfilPublico: false,
        nota: 5,
        restricaoAtiva: false,
      },
    ],
    empresas: [empresa],
    usuariosEmpresa: [
      {
        id: "UE-01",
        usuario: "empresa",
        empresaId: empresa.id,
        nome: "Admin Loja",
        email: "admin@loja.com",
        telefone: "11999999999",
        senhaHash: "empresa123",
        perfil: "ADMIN",
        ativo: true,
        criadoEm: new Date().toISOString(),
      },
      {
        id: "UE-02",
        empresaId: empresa.id,
        nome: "Operador Loja",
        email: "operador@loja.com",
        telefone: "11988888888",
        senhaHash: "operador123",
        perfil: "OPERADOR",
        ativo: true,
        criadoEm: new Date().toISOString(),
      },
    ],
    doacoes: [1, 2, 3].map((n) => ({
      id: `DOA-0${n}`,
      empresaId: empresa.id,
      cpfInformado: "11144477735",
      doadorId: "DOR-01",
      pecas: 1,
      pesoKg: 1,
      statusCuradoria: STATUS_CURADORIA.EM_LOTE,
      statusContagem: "CONTANDO",
      criadoEm: new Date().toISOString(),
    })),
    lotes,
    reservas: [],
    projetos: [],
    acompanhamentos: [],
    cupons: [],
    favoritos: [],
    consentimentos: [],
    historicoStatus: [],
    sessaoAtual: null,
    lojas: [
      {
        id: "LJ-01",
        nome: empresa.nomeFantasia,
        endereco: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
        horario_retirada: empresa.horarioRetirada,
      },
    ],
    designer: {
      id: "DSG-01",
      nome: "Designer Demonstração",
      reservaAtiva: null,
      favoritos: [],
    },
    rastreamento: [],
  };
};
export function initDB() {
  if (!localStorage.getItem(STORE_KEY)) {
    localStorage.setItem(STORE_KEY, JSON.stringify(seed()));
  } else {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    const base = seed();
    for (const [k, v] of Object.entries(base)) if (!(k in d)) d[k] = v;
    const donor = d.doadores.find((x) => x.id === "DOR-01");
    if (donor && !donor.usuario) donor.usuario = "doador";
    const designer = d.confeccionistas.find((x) => x.id === "DSG-01");
    if (designer && !designer.usuario) designer.usuario = "designer";
    const companyAdmin = d.usuariosEmpresa.find((x) => x.id === "UE-01");
    if (companyAdmin && !companyAdmin.usuario) companyAdmin.usuario = "empresa";
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  }
}
function getDB() {
  initDB();
  return JSON.parse(localStorage.getItem(STORE_KEY));
}
function saveDB(d) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
  window.dispatchEvent(new CustomEvent("continuum:store-updated"));
}
export const store = {
  get(k) {
    return getDB()[k] || [];
  },
  set(k, v) {
    const d = getDB();
    d[k] = v;
    saveDB(d);
    return v;
  },
  update(k, key, val, changes) {
    const d = getDB(),
      item = (d[k] || []).find((x) => x[key] === val);
    if (!item) return null;
    Object.assign(item, changes);
    saveDB(d);
    return item;
  },
  read() {
    return getDB();
  },
  write(d) {
    saveDB(d);
    return d;
  },
};
export function getProjetos() {
  return store.get("projetos");
}
export function updateProjeto(id, status) {
  return store.update("projetos", "cd_projeto", id, { status });
}
export function getLotes() {
  return store.get("lotes");
}
export function getLojas() {
  return store.get("lojas");
}
export function getDesigner() {
  return store.get("designer");
}
export function toggleFavorito(id) {
  const d = store.get("designer"),
    i = d.favoritos.indexOf(id);
  i >= 0 ? d.favoritos.splice(i, 1) : d.favoritos.push(id);
  store.set("designer", d);
  return d.favoritos;
}
export function setReservaAtiva(id) {
  const d = store.get("designer");
  d.reservaAtiva = id;
  store.set("designer", d);
  if (id) {
    const l = store.get("lotes").find((x) => x.id === id);
    if (l) {
      l.status = STATUS_LOTE.RESERVADO;
      l.status_lote = STATUS_LOTE.RESERVADO;
      store.set("lotes", store.get("lotes"));
    }
  }
}
