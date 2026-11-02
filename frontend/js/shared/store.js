// ==========================================================================
// STORE: Mock do Banco de Dados Central
// ==========================================================================
const STORE_KEY = "continuum:db:v3"; // Mudando versão para forçar re-seed com lotes

const SEED_DATA = {
  projetos: [
    {
      cd_projeto: 1,
      designer_nome: "Caio Ribeiro",
      ds_descricao: "Descrição detalhada do projeto de upcycling e modelagem.",
      status: "FINALIZADO",
    },
    {
      cd_projeto: 2,
      designer_nome: "Richard Cobalt",
      ds_descricao: "Descrição detalhada do projeto de upcycling e modelagem.",
      status: "EM_PRODUCAO",
    },
    {
      cd_projeto: 3,
      designer_nome: "Rafael Mendonça",
      ds_descricao: "Descrição detalhada do projeto de upcycling e modelagem.",
      status: "EXCEDIDO",
    },
  ],
  lojas: [
    {
      id: "LJ-01",
      nome: "Ateliê Boreal",
      lotes_finalizados: 12,
      logistica: "ambos",
      sobre: "Marca focada em streetwear consciente para público jovem adulto.",
      endereco: "Rua Augusta, 1000 - Bela Vista, São Paulo - SP",
      horario_retirada: "Seg a Sex das 10h às 18h",
    },
    {
      id: "LJ-02",
      nome: "Denim Norte",
      lotes_finalizados: 4,
      logistica: "retirada",
      sobre: "Reaproveitamento de denim com foco em durabilidade e workwear.",
      endereco: "Av. Cruzeiro do Sul, 500 - Santana, São Paulo - SP",
      horario_retirada: "Ter a Sab das 09h às 15h",
    },
    {
      id: "LJ-03",
      nome: "Confecção Aurora",
      lotes_finalizados: 8,
      logistica: "envio",
      sobre: "Moda feminina atemporal focada em conforto.",
      endereco: "Centro, São Paulo - SP (Apenas envio)",
      horario_retirada: "Não aplicável",
    },
  ],
  lotes: [
    {
      id: "LT-01",
      titulo: "Retalhos de algodão cru",
      peso: "4,3 kg",
      lojaId: "LJ-01",
      material: "algodão",
      tipo: "tecido",
      publicado_em: new Date(Date.now() - 86400000).toISOString(),
      distancia: "3,2 km",
      logistica_aceita: ["retirada", "envio"],
      status: "DISPONIVEL",
      perfil_loja: "Streetwear consciente para público jovem adulto.",
      direcao:
        "Criar camisetas oversized ou acessórios úteis aproveitando retalhos médios e grandes.",
      liberdade: "Cores de linha e recortes geométricos são 100% livres.",
    },
    {
      id: "LT-02",
      titulo: "Peças de malha",
      peso: "2,8 kg",
      lojaId: "LJ-03",
      material: "malha",
      tipo: "tecido",
      publicado_em: new Date(Date.now() - 172800000).toISOString(),
      distancia: "12 km",
      logistica_aceita: ["envio"],
      status: "DISPONIVEL",
      perfil_loja: "Moda feminina atemporal e confortável.",
      direcao: "Reaproveitamento para criação de vestidos ou tops leves.",
      liberdade: "", // Testar cenário sem liberdade preenchida
    },
    {
      id: "LT-03",
      titulo: "Acessórios metálicos",
      peso: "120 unidades",
      lojaId: "LJ-01",
      material: "metal",
      tipo: "acessorio",
      publicado_em: new Date(Date.now() - 345600000).toISOString(),
      distancia: "3,2 km",
      logistica_aceita: ["retirada", "envio"],
      status: "DISPONIVEL",
      perfil_loja: "Streetwear consciente.",
      direcao: "Aplicações em jaquetas ou customização de peças já prontas.",
    },
    {
      id: "LT-04",
      titulo: "Jeans lavado",
      peso: "6,5 kg",
      lojaId: "LJ-02",
      material: "jeans",
      tipo: "tecido",
      publicado_em: new Date(Date.now() - 400000000).toISOString(),
      distancia: "5,1 km",
      logistica_aceita: ["retirada"],
      status: "DISPONIVEL",
      perfil_loja: "Workwear resistente.",
      direcao:
        "Transformar retalhos de jeans em uma jaqueta unissex estilo oversized com recortes visíveis.",
    },
    {
      id: "LT-05",
      titulo: "Zíperes e aviamentos premium",
      peso: "500g",
      lojaId: "LJ-03",
      material: "metal",
      tipo: "acessorio",
      publicado_em: new Date(Date.now() - 10000000).toISOString(),
      distancia: "12 km",
      logistica_aceita: ["envio"],
      status: "DISPONIVEL",
      perfil_loja: "Moda feminina atemporal e confortável.",
      direcao: "Ideal para finalizar jaquetas e saias estruturadas.",
      liberdade: "Sinta-se livre para usar sua criatividade!",
    },
  ],
  designer: {
    id: "DSG-01",
    nome: "Usuário teste",
    reservaAtiva: null,
    favoritos: [],
  },
};

export function initDB() {
  if (!localStorage.getItem(STORE_KEY)) {
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_DATA));
  }
}

function getDB() {
  initDB();
  return JSON.parse(localStorage.getItem(STORE_KEY));
}

function saveDB(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

// EMPRESA API
export function getProjetos() {
  return getDB().projetos;
}
export function updateProjeto(id, novoStatus) {
  const data = getDB();
  const p = data.projetos.find((x) => x.cd_projeto === id);
  if (p) p.status = novoStatus;
  saveDB(data);
}

// DESIGNER API
export function getLotes() {
  return getDB().lotes;
}
export function getLojas() {
  return getDB().lojas;
}
export function getDesigner() {
  return getDB().designer;
}

export function toggleFavorito(idLote) {
  const data = getDB();
  const dsg = data.designer;
  const idx = dsg.favoritos.indexOf(idLote);
  if (idx > -1) dsg.favoritos.splice(idx, 1);
  else dsg.favoritos.push(idLote);
  saveDB(data);
  return dsg.favoritos;
}

export function setReservaAtiva(idLote) {
  const data = getDB();
  data.designer.reservaAtiva = idLote;
  // Muda status do lote para RESERVADO
  if (idLote) {
    const lote = data.lotes.find((l) => l.id === idLote);
    if (lote) lote.status = "RESERVADO";
  }
  saveDB(data);
}
