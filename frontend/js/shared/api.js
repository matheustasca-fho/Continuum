import {
  store,
  STATUS_LOTE,
  STATUS_RESERVA,
  STATUS_CURADORIA,
  STATUS_CUPOM,
} from "./store.js";
export { STATUS_LOTE, STATUS_RESERVA, STATUS_CURADORIA, STATUS_CUPOM };
const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const digits = (x) => String(x || "").replace(/\D/g, "");
const cpfValido = (x) => {
  const d = digits(x);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const c = (n) =>
    (([...d.slice(0, n)].reduce((s, v, i) => s + Number(v) * (n + 1 - i), 0) *
      10) %
      11) %
    10;
  return c(9) === +d[9] && c(10) === +d[10];
};
const cnpjValido = (x) => {
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
const norm = (x) =>
  String(x || "")
    .trim()
    .toLowerCase();
const consent = (tipo, id, detalhes = {}) => {
  const a = store.get("consentimentos");
  a.push({
    id: `CONS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tipo,
    referenciaId: id,
    versao: "1.0",
    criadoEm: new Date().toISOString(),
    ...detalhes,
  });
  store.set("consentimentos", a);
};
function vincularDoacoesECriarCupons(doador) {
  const doacoes = store.get("doacoes"),
    now = Date.now(),
    sixMonths = 183 * 24 * 60 * 60 * 1000;
  doacoes.forEach((d) => {
    if (digits(d.cpfInformado) === digits(doador.cpf) && !d.doadorId)
      d.doadorId = doador.id;
  });
  let changed = false;
  const companies = [
    ...new Set(
      doacoes
        .filter(
          (d) =>
            d.doadorId === doador.id &&
            d.statusContagem === "CONTANDO" &&
            now - new Date(d.criadoEm || now).getTime() <= sixMonths,
        )
        .map((d) => d.empresaId),
    ),
  ];
  const coupons = store.get("cupons");
  companies.forEach((empresaId) => {
    const cycle = doacoes.filter(
      (d) =>
        d.doadorId === doador.id &&
        d.empresaId === empresaId &&
        d.statusContagem === "CONTANDO" &&
        now - new Date(d.criadoEm || now).getTime() <= sixMonths,
    );
    if (cycle.length < 5) return;
    const empresa = store.get("empresas").find((e) => e.id === empresaId),
      expires = new Date(
        now + (empresa?.politicaCupom?.validadeDias || 30) * 86400000,
      ).toISOString();
    coupons.push({
      id: `CUP-${Date.now()}-${empresaId}`,
      codigo: `CONT-${String(Date.now()).slice(-6)}`,
      empresaId,
      cpfDoador: digits(doador.cpf),
      doadorId: doador.id,
      percentual: empresa?.politicaCupom?.percentual || 15,
      validade: expires,
      status: STATUS_CUPOM.ATIVO,
    });
    cycle.forEach((d) => {
      d.statusContagem = "EM_CUPOM";
      changed = true;
    });
  });
  store.set("doacoes", doacoes);
  if (coupons.length) store.set("cupons", coupons);
  return changed;
}
function findAccount(identifier) {
  const key = norm(identifier),
    d = digits(identifier),
    db = store.read();
  let a = db.doadores.find(
    (x) =>
      norm(x.email) === key || norm(x.usuario) === key || digits(x.cpf) === d,
  );
  if (a) return { perfil: "doador", record: a };
  a = db.confeccionistas.find(
    (x) =>
      norm(x.email) === key ||
      norm(x.usuario) === key ||
      digits(x.documento) === d,
  );
  if (a) return { perfil: "designer", record: a };
  a = db.usuariosEmpresa.find(
    (x) => norm(x.email) === key || norm(x.usuario) === key,
  );
  if (a) return { perfil: "empresa", record: a };
  const emp = db.empresas.find((x) => digits(x.cnpj) === d);
  if (emp) {
    a = db.usuariosEmpresa.find(
      (x) => x.empresaId === emp.id && x.perfil === "ADMIN" && x.ativo,
    );
    if (a) return { perfil: "empresa", record: a };
  }
  return null;
}
const api = {
  async registrarDoador(dados) {
    await delay();
    const all = store.get("doadores"),
      cpf = digits(dados.cpf);
    if (!cpfValido(cpf)) throw Error("Informe um CPF válido.");
    if (
      all.some(
        (x) => digits(x.cpf) === cpf || norm(x.email) === norm(dados.email),
      ) ||
      store
        .get("confeccionistas")
        .some(
          (x) =>
            digits(x.documento) === cpf || norm(x.email) === norm(dados.email),
        ) ||
      store
        .get("usuariosEmpresa")
        .some((x) => norm(x.email) === norm(dados.email))
    )
      throw Error(
        "Já existe um cadastro com este e-mail ou CPF em outro perfil.",
      );
    const novo = {
      id: `DOR-${Date.now()}`,
      ...dados,
      cpf,
      senhaHash: dados.senhaHash || dados.senha,
      aceitouTermosEm: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
    };
    delete novo.senha;
    store.set("doadores", [...all, novo]);
    consent("TERMOS_DOADOR", novo.id);
    vincularDoacoesECriarCupons(novo);
    return novo;
  },
  async cadastrarDoador(d) {
    return this.registrarDoador(d);
  },
  async atualizarPerfilDoador(cpf, dados) {
    await delay();
    const all = store.get("doadores"),
      u =
        all.find((x) => digits(x.cpf) === digits(cpf)) ||
        all.find((x) => x.id === store.get("sessaoAtual")?.usuario?.id);
    if (!u) throw Error("Doador não encontrado.");
    Object.assign(u, dados);
    store.set("doadores", all);
    return u;
  },
  async getPerfilDoador() {
    const s = store.get("sessaoAtual"),
      all = store.get("doadores");
    return all.find((x) => x.id === s?.usuario?.id) || all[0] || null;
  },
  async registrarConfeccionista(dados) {
    await delay();
    const doc = digits(dados.documento),
      isPF = (dados.tipoPessoa || "PF").toUpperCase() === "PF";
    if (!(isPF ? cpfValido(doc) : cnpjValido(doc)))
      throw Error("CPF ou CNPJ inválido.");
    const all = store.get("confeccionistas");
    if (
      all.some(
        (x) =>
          digits(x.documento) === doc || norm(x.email) === norm(dados.email),
      ) ||
      store
        .get("doadores")
        .some(
          (x) => digits(x.cpf) === doc || norm(x.email) === norm(dados.email),
        ) ||
      store
        .get("usuariosEmpresa")
        .some((x) => norm(x.email) === norm(dados.email))
    )
      throw Error("Já existe cadastro com este e-mail ou documento.");
    const n = {
      id: `DSG-${Date.now()}`,
      tipoPessoa: isPF ? "PF" : "PJ",
      ...dados,
      documento: doc,
      senhaHash: dados.senhaHash || dados.senha,
      maioridadeConfirmada: true,
      aceitouTermosEm: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      nota: 5,
      restricaoAtiva: false,
    };
    delete n.senha;
    all.push(n);
    store.set("confeccionistas", all);
    consent("TERMOS_DESIGNER", n.id);
    consent("PERFIL_PUBLICO", n.id, { aceito: !!n.consentimentoPerfilPublico });
    return n;
  },
  async cadastrarConfeccionista(d) {
    return this.registrarConfeccionista(d);
  },
  async atualizarPerfilConfeccionista(id, dados) {
    await delay();
    const all = store.get("confeccionistas"),
      u =
        all.find((x) => x.id === id) ||
        all.find((x) => x.id === store.get("sessaoAtual")?.usuario?.id);
    if (!u) throw Error("Designer não encontrado.");
    Object.assign(u, dados);
    store.set("confeccionistas", all);
    if ("consentimentoPerfilPublico" in dados)
      consent("PERFIL_PUBLICO", u.id, {
        aceito: !!dados.consentimentoPerfilPublico,
      });
    return u;
  },
  async login(perfil, identificador, senha) {
    await delay();
    const found = findAccount(identificador);
    if (found && found.perfil !== perfil) {
      const label = {
        doador: "Doador",
        designer: "Designer",
        empresa: "Empresa",
      }[found.perfil];
      throw Error(
        `Esta conta pertence ao perfil ${label}. Por favor, selecione a aba correspondente para entrar.`,
      );
    }
    if (!found || found.record.senhaHash !== senha)
      throw Error("Usuário ou senha inválidos.");
    if (perfil === "empresa") {
      const u = found.record,
        emp = store.get("empresas").find((x) => x.id === u.empresaId);
      if (!u.ativo)
        throw Error("Usuário inativo. Contate o administrador da empresa.");
      if (emp?.assinatura?.status !== "ATIVA")
        throw Error("Assinatura aguardando pagamento.");
      store.set("sessaoAtual", {
        perfil,
        empresaId: emp.id,
        usuarioEmpresa: u,
        usuario: u,
      });
    } else store.set("sessaoAtual", { perfil, usuario: found.record });
    return store.get("sessaoAtual");
  },
  async redefinirSenha(identificador, novaSenha, confirmacaoSenha) {
    await delay();
    if (novaSenha.length < 8)
      throw Error("A senha deve ter pelo menos 8 caracteres.");
    if (novaSenha !== confirmacaoSenha) throw Error("As senhas não coincidem.");
    const f = findAccount(identificador);
    if (!f) throw Error("Não encontramos uma conta com esse identificador.");
    const key =
        f.perfil === "doador"
          ? "doadores"
          : f.perfil === "designer"
            ? "confeccionistas"
            : "usuariosEmpresa",
      all = store.get(key),
      u = all.find((x) => x.id === f.record.id);
    u.senhaHash = novaSenha;
    store.set(key, all);
    return true;
  },
  logout() {
    store.set("sessaoAtual", null);
  },
  getSessaoAtual() {
    return store.get("sessaoAtual");
  },
  async finalizarProjetoDesigner(id) {
    await delay();
    const all = store.get("projetos"),
      p = all.find((x) => x.id === id || x.cd_projeto === id);
    if (!p) throw Error("Projeto não encontrado.");
    p.status = STATUS_LOTE.FINALIZADO;
    store.set("projetos", all);
    const lots = store.get("lotes"),
      l = lots.find((x) => x.id === p.idLote);
    if (l) {
      l.status = STATUS_LOTE.FINALIZADO;
      l.status_lote = STATUS_LOTE.FINALIZADO;
      store.set("lotes", lots);
    }
    return p;
  },
  podeExecutar(acao) {
    const s = store.get("sessaoAtual"),
      p = s?.usuarioEmpresa?.perfil;
    if (s?.perfil !== "empresa" || !p) return false;
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
    if (!this.podeExecutar(acao))
      throw Error("Acesso restrito ao administrador da loja.");
    return true;
  },
  async guardarEmpresaPendente(de, da) {
    await delay();
    const emps = store.get("empresas"),
      users = store.get("usuariosEmpresa"),
      cnpj = digits(de.cnpj);
    if (!cnpjValido(cnpj)) throw Error("CNPJ inválido.");
    if (
      emps.some((x) => digits(x.cnpj) === cnpj) ||
      users.some((x) => norm(x.email) === norm(da.email)) ||
      store.get("doadores").some((x) => norm(x.email) === norm(da.email)) ||
      store.get("confeccionistas").some((x) => norm(x.email) === norm(da.email))
    )
      throw Error("Empresa ou e-mail já cadastrado.");
    const emp = {
        id: `EMP-${Date.now()}`,
        uf: "SP",
        aceitaRetirada: true,
        cartilhaPadrao: { versao: "v1.0", conteudo: "", atualizadoEm: "" },
        politicaCupom: { percentual: 15, validadeDias: 30 },
        assinatura: {
          plano: "Parceiro Circular",
          valorFicticio: 299.9,
          status: "AGUARDANDO PAGAMENTO",
        },
        ...de,
        cnpj,
      },
      user = {
        id: `UE-${Date.now()}`,
        empresaId: emp.id,
        ...da,
        perfil: "ADMIN",
        ativo: true,
        senhaHash: da.senhaHash || da.senha,
        criadoEm: new Date().toISOString(),
      };
    delete user.senha;
    emps.push(emp);
    users.push(user);
    store.set("empresas", emps);
    store.set("usuariosEmpresa", users);
    consent("TERMOS_EMPRESA", emp.id, { usuarioId: user.id });
    return emp;
  },
  async registrarEmpresaComAssinatura(de, da, pag) {
    await delay();
    const emps = store.get("empresas"),
      users = store.get("usuariosEmpresa"),
      cnpj = digits(de.cnpj);
    if (!cnpjValido(cnpj)) throw Error("CNPJ inválido.");
    let emp = emps.find((x) => digits(x.cnpj) === cnpj),
      user = users.find(
        (x) => x.empresaId === emp?.id && norm(x.email) === norm(da.email),
      );
    if (emp && user && emp.assinatura?.status === "AGUARDANDO PAGAMENTO") {
      Object.assign(emp, {
        ...de,
        assinatura: {
          plano: "Parceiro Circular",
          valorFicticio: 299.9,
          status: "ATIVA",
          bandeiraCartao: pag.bandeiraCartao,
          ultimos4Digitos: pag.ultimos4Digitos,
        },
      });
      store.set("empresas", emps);
      store.set("sessaoAtual", {
        perfil: "empresa",
        empresaId: emp.id,
        usuarioEmpresa: user,
        usuario: user,
      });
      return emp;
    }
    if (
      emp ||
      users.some((x) => norm(x.email) === norm(da.email)) ||
      store.get("doadores").some((x) => norm(x.email) === norm(da.email)) ||
      store.get("confeccionistas").some((x) => norm(x.email) === norm(da.email))
    )
      throw Error("Empresa ou e-mail já cadastrado.");
    emp = {
      id: `EMP-${Date.now()}`,
      uf: "SP",
      aceitaRetirada: true,
      cartilhaPadrao: { versao: "v1.0", conteudo: "", atualizadoEm: "" },
      politicaCupom: { percentual: 15, validadeDias: 30 },
      assinatura: {
        plano: "Parceiro Circular",
        valorFicticio: 299.9,
        status: "ATIVA",
        bandeiraCartao: pag.bandeiraCartao,
        ultimos4Digitos: pag.ultimos4Digitos,
      },
      ...de,
      cnpj,
    };
    user = {
      id: `UE-${Date.now()}`,
      empresaId: emp.id,
      ...da,
      perfil: "ADMIN",
      ativo: true,
      senhaHash: da.senhaHash || da.senha,
      criadoEm: new Date().toISOString(),
    };
    delete user.senha;
    emps.push(emp);
    users.push(user);
    store.set("empresas", emps);
    store.set("usuariosEmpresa", users);
    consent("TERMOS_EMPRESA", emp.id, { usuarioId: user.id });
    store.set("sessaoAtual", {
      perfil: "empresa",
      empresaId: emp.id,
      usuarioEmpresa: user,
      usuario: user,
    });
    return emp;
  },
  async atualizarPerfilEmpresa(id, dados) {
    await delay();
    this.verificarPermissaoEmpresa("EDITAR_PERFIL_POLITICA_CARTILHA");
    const all = store.get("empresas"),
      u = all.find((x) => x.id === id);
    if (!u) throw Error("Empresa não encontrada.");
    if (dados.cartilhaPadrao) {
      const [, major = "1", minor = "0"] =
        /^v?(\d+)\.(\d+)$/.exec(String(u.cartilhaPadrao?.versao || "v1.0")) ||
        [];
      dados.cartilhaPadrao.versao = `v${major}.${Number(minor) + 1}`;
      dados.cartilhaPadrao.atualizadoEm = new Date().toISOString();
    }
    Object.assign(u, dados);
    store.set("empresas", all);
    return u;
  },
  async listarLotesVitrineSP() {
    await delay();
    const emps = store.get("empresas");
    return store
      .get("lotes")
      .filter(
        (l) =>
          l.status === STATUS_LOTE.DISPONIVEL &&
          emps.some(
            (e) =>
              e.id === l.empresaId &&
              e.uf === "SP" &&
              e.assinatura?.status === "ATIVA",
          ),
      )
      .map((l) => {
        const e = emps.find((x) => x.id === l.empresaId);
        return {
          ...l,
          lojaId: e.id,
          empresaParceira: e,
          nomeEmpresa: e.nomeFantasia,
          peso: `${String(l.pesoKg).replace(".", ",")} kg`,
          direcao: l.briefing?.ideiaMarca || l.descricao,
          logistica_aceita: e.aceitaRetirada
            ? ["retirada", "envio"]
            : ["envio"],
          status_lote: l.status,
        };
      });
  },
  async listarLotesVitrine() {
    return this.listarLotesVitrineSP();
  },
  async obterLotePorCodigo(c) {
    await delay();
    return store.get("lotes").find((x) => x.codigo === c || x.id === c) || null;
  },
  async criarLote(d) {
    await delay();
    this.verificarPermissaoEmpresa("CADASTRAR_LOTE");
    const all = store.get("lotes"),
      id = `LT-${Date.now()}`,
      n = {
        id,
        codigo: `LOT-${new Date().getFullYear()}-${String(all.length + 1).padStart(3, "0")}`,
        status: STATUS_LOTE.DISPONIVEL,
        doacoesVinculadas: [],
        criadoEm: new Date().toISOString(),
        ...d,
      };
    all.push(n);
    store.set("lotes", all);
    return n;
  },
  async atualizarLote(id, dados) {
    await delay();
    this.verificarPermissaoEmpresa("EDITAR_EXCLUIR_LOTE");
    const all = store.get("lotes"),
      l = all.find((x) => x.id === id);
    if (!l) throw Error("Lote não encontrado.");
    Object.assign(l, dados);
    store.set("lotes", all);
    return l;
  },
  async excluirLote(id) {
    this.verificarPermissaoEmpresa("EDITAR_EXCLUIR_LOTE");
    store.set(
      "lotes",
      store.get("lotes").filter((x) => x.id !== id),
    );
  },
  async validarSenhaAdmin(senha) {
    const s = store.get("sessaoAtual");
    return (
      s?.usuarioEmpresa?.perfil === "ADMIN" &&
      s.usuarioEmpresa.senhaHash === senha
    );
  },
  async reservarLote(codigo, idDesigner, tipoLogistica = "ENVIO") {
    await delay();
    const all = store.get("lotes"),
      l = all.find((x) => x.codigo === codigo || x.id === codigo);
    if (!l) throw Error("Lote não encontrado.");
    if (l.status !== STATUS_LOTE.DISPONIVEL)
      throw Error("Este lote não está mais disponível.");
    const rs = store.get("reservas");
    if (
      rs.some(
        (x) => x.idDesigner === idDesigner && x.status === STATUS_RESERVA.ATIVA,
      )
    )
      throw Error("Você já possui uma reserva ativa.");
    l.status = STATUS_LOTE.RESERVADO;
    l.status_lote = STATUS_LOTE.RESERVADO;
    store.set("lotes", all);
    const r = {
      id: `RES-${Date.now()}`,
      idLote: l.id,
      loteId: l.id,
      idDesigner,
      confeccionistaId: idDesigner,
      status: STATUS_RESERVA.ATIVA,
      tipoLogistica,
      termoAceitoEm: new Date().toISOString(),
      prazoRetirada: null,
      confirmacaoEmpresa: null,
      confirmacaoDesigner: null,
      codigoRastreio: null,
      criadoEm: new Date().toISOString(),
    };
    rs.push(r);
    store.set("reservas", rs);
    const h = store.get("historicoStatus");
    h.push({
      id: `H-${Date.now()}`,
      loteId: l.id,
      status: l.status,
      criadoEm: new Date().toISOString(),
    });
    store.set("historicoStatus", h);
    const legacy = store.get("designer");
    legacy.reservaAtiva = l.id;
    store.set("designer", legacy);
    return l;
  },
  async listarMeusLotesDesigner(id) {
    await delay();
    const db = store.read();
    return db.reservas
      .filter((r) => r.idDesigner === id || r.confeccionistaId === id)
      .map((r) => {
        const l = db.lotes.find((x) => x.id === r.idLote || x.id === r.loteId),
          e = db.empresas.find((x) => x.id === l?.empresaId);
        return l
          ? {
              ...l,
              peso: `${String(l.pesoKg).replace(".", ",")} kg`,
              empresaParceira: e?.nomeFantasia || "Empresa Parceira",
              reserva: r,
            }
          : null;
      })
      .filter(Boolean);
  },
  async listarLotesEmpresa(id) {
    await delay();
    const db = store.read();
    return db.lotes
      .filter((l) => l.empresaId === id)
      .map((l) => ({
        ...l,
        reserva:
          db.reservas.find((r) => (r.idLote || r.loteId) === l.id) || null,
      }));
  },
  async confirmarRecebimentoDesigner(loteId) {
    await delay();
    const all = store.get("lotes"),
      l = all.find((x) => x.id === loteId);
    if (!l) throw Error("Lote não encontrado.");
    l.status = STATUS_LOTE.EM_PRODUCAO;
    l.status_lote = STATUS_LOTE.EM_PRODUCAO;
    store.set("lotes", all);
    const ps = store.get("projetos");
    if (!ps.some((p) => p.idLote === l.id)) {
      ps.push({
        id: `PRJ-${Date.now()}`,
        idLote: l.id,
        idDesigner: store.get("sessaoAtual")?.usuario?.id || "DSG-01",
        status: STATUS_LOTE.EM_PRODUCAO,
        tituloPeca: "Projeto em criação",
        processoCriativo: "",
        quantidadePecas: 0,
        codigoPublicoQr: "",
        acompanhamentos: [],
      });
      store.set("projetos", ps);
    }
    return l;
  },
  async listarProjetosEmpresa() {
    await delay();
    const db = store.read(),
      s = db.sessaoAtual,
      empresa =
        db.empresas.find((e) => e.id === s?.empresaId) || db.empresas[0];
    return db.projetos
      .filter((p) =>
        db.lotes.some((l) => l.id === p.idLote && l.empresaId === empresa.id),
      )
      .map((p) => {
        const l = db.lotes.find((x) => x.id === p.idLote),
          d = db.confeccionistas.find((x) => x.id === p.idDesigner);
        return {
          ...p,
          cd_projeto: p.id,
          designer_nome: d?.nomeProfissional || d?.nome || "Designer",
          ds_descricao:
            p.processoCriativo || p.tituloPeca || l?.descricao || "",
          lote_nome: l?.titulo,
          codigoLote: l?.codigo,
          pesoKg: l?.pesoKg,
        };
      });
  },
  async alterarStatusProjeto(id, status) {
    this.verificarPermissaoEmpresa("FINALIZAR_PECA_QR");
    const ps = store.get("projetos"),
      p = ps.find((x) => x.id === id || x.cd_projeto === id);
    if (!p) throw Error("Projeto não encontrado.");
    p.status = status;
    store.set("projetos", ps);
    const ls = store.get("lotes"),
      l = ls.find((x) => x.id === p.idLote);
    if (l) l.status = status;
    store.set("lotes", ls);
    return p;
  },
  async buscarCep(cep) {
    const n = digits(cep),
      fallback = {
        "01310000": {
          logradouro: "Avenida Paulista",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
        },
        "01001000": {
          logradouro: "Praça da Sé",
          bairro: "Sé",
          localidade: "São Paulo",
          uf: "SP",
        },
        20040002: {
          logradouro: "Rua da Assembleia",
          bairro: "Centro",
          localidade: "Rio de Janeiro",
          uf: "RJ",
        },
      };
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${n}/json/`);
      if (resp.ok) {
        const d = await resp.json();
        if (!d.erro) return d;
      }
    } catch {}
    return fallback[n] || null;
  },
  async consultarCNPJ(cnpj) {
    const n = digits(cnpj);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${n}`);
      if (r.ok) {
        const d = await r.json();
        return { razaoSocial: d.razao_social, nomeFantasia: d.nome_fantasia };
      }
    } catch {}
    return {
      razaoSocial: "Empresa Demonstrativa LTDA",
      nomeFantasia: "Empresa Parceira",
    };
  },
  async getLotesDisponiveis() {
    return this.listarLotesVitrineSP();
  },
  async getMeusLotes(id) {
    return this.listarMeusLotesDesigner(id);
  },
  async getMeusProjetos(id) {
    await delay();
    const db = store.read();
    return db.projetos
      .filter((p) => p.idDesigner === id || p.designer_id === id)
      .map((p) => {
        const l = db.lotes.find((x) => x.id === p.idLote);
        return {
          ...p,
          cd_projeto: p.id,
          cd_lote: l?.id,
          lote_nome: l?.titulo,
          codigoLote: l?.codigo,
          pesoKg: l?.pesoKg,
        };
      });
  },
  async getProjeto(id) {
    await delay();
    const db = store.read(),
      p = db.projetos.find(
        (x) => String(x.cd_projeto) === String(id) || x.id === id,
      );
    if (!p) return null;
    const lote = db.lotes.find((x) => x.id === p.idLote);
    return {
      ...p,
      lote: lote || null,
      codigoLote: lote?.codigo,
      pesoKg: lote?.pesoKg,
    };
  },
  async getDashboardStats(id) {
    const ps = store
      .get("projetos")
      .filter((p) => p.idDesigner === id || p.designer_id === id);
    return {
      stats: {
        reservados: ps.filter((p) => p.status === STATUS_LOTE.RESERVADO).length,
        em_andamento: ps.filter((p) => p.status === STATUS_LOTE.EM_PRODUCAO)
          .length,
        finalizados: ps.filter((p) => p.status === STATUS_LOTE.FINALIZADO)
          .length,
      },
      pendencias: [],
    };
  },
  async sinalizarRecebido(lote, proj) {
    return lote;
  },
  async finalizarProjeto() {
    return null;
  },
  async getEmpresa() {
    const s = store.get("sessaoAtual");
    return (
      store.get("empresas").find((x) => x.id === s?.empresaId) ||
      store.get("empresas")[0]
    );
  },
  async getDoadorStats() {
    await delay();
    const db = store.read(),
      s = db.sessaoAtual,
      doador =
        db.doadores.find((x) => x.id === s?.usuario?.id) || db.doadores[0],
      doacoes = db.doacoes.filter(
        (x) =>
          x.doadorId === doador?.id ||
          digits(x.cpfInformado) === digits(doador?.cpf),
      ),
      cupons = db.cupons
        .filter(
          (x) =>
            x.doadorId === doador?.id ||
            digits(x.cpfDoador) === digits(doador?.cpf),
        )
        .map((c) => ({
          ...c,
          empresaNome:
            db.empresas.find((e) => e.id === c.empresaId)?.nomeFantasia ||
            "Empresa Parceira",
        }));
    return { doador, doacoes, cupons };
  },
  async listarEmpresas() {
    await delay();
    return store.get("empresas");
  },
  async getDesigner() {
    await delay();
    const s = store.get("sessaoAtual"),
      u =
        store.get("confeccionistas").find((x) => x.id === s?.usuario?.id) ||
        store.get("confeccionistas")[0],
      r = store
        .get("reservas")
        .find(
          (x) => x.idDesigner === u?.id && x.status === STATUS_RESERVA.ATIVA,
        );
    return {
      ...u,
      id: u?.id || "DSG-01",
      nome: u?.nomeProfissional || u?.nome,
      reservaAtiva: r?.idLote || r?.loteId || null,
      favoritos: store
        .get("favoritos")
        .filter((x) => x.designerId === u?.id)
        .map((x) => x.loteId),
    };
  },
  async alternarFavorito(loteId) {
    const d = await this.getDesigner(),
      all = store.get("favoritos"),
      i = all.findIndex((x) => x.designerId === d.id && x.loteId === loteId);
    if (i >= 0) all.splice(i, 1);
    else all.push({ designerId: d.id, loteId });
    store.set("favoritos", all);
    return (await this.getDesigner()).favoritos;
  },
  async getEmpresaDashboardStats() {
    await delay();
    const db = store.read(),
      s = db.sessaoAtual,
      e = db.empresas.find((x) => x.id === s?.empresaId) || db.empresas[0],
      lotes = db.lotes.filter((x) => x.empresaId === e?.id),
      projetos = db.projetos.filter((p) =>
        lotes.some((l) => l.id === p.idLote),
      ),
      doacoes = db.doacoes.filter((d) => d.empresaId === e?.id);
    return {
      empresa: e,
      lotes,
      projetos,
      doacoes,
      kg: lotes
        .filter((l) => l.status === STATUS_LOTE.FINALIZADO)
        .reduce((sum, l) => sum + (Number(l.pesoKg) || 0), 0),
      designers: new Set(projetos.map((p) => p.idDesigner)).size,
      pecas: projetos
        .filter((p) => p.status === STATUS_LOTE.FINALIZADO)
        .reduce((sum, p) => sum + (Number(p.quantidadePecas) || 0), 0),
      cupons: db.cupons.filter(
        (c) => c.empresaId === e?.id && c.status === STATUS_CUPOM.UTILIZADO,
      ).length,
    };
  },
  async listarUsuariosEmpresa() {
    const s = store.get("sessaoAtual");
    this.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
    return store
      .get("usuariosEmpresa")
      .filter((x) => x.empresaId === s.empresaId);
  },
  async salvarUsuarioEmpresa(d) {
    this.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
    const s = store.get("sessaoAtual"),
      all = store.get("usuariosEmpresa");
    if (all.some((x) => norm(x.email) === norm(d.email)))
      throw Error("Este e-mail já está cadastrado.");
    const n = {
      id: `UE-${Date.now()}`,
      empresaId: s.empresaId,
      ativo: true,
      criadoEm: new Date().toISOString(),
      senhaHash: d.senha,
      ...d,
    };
    delete n.senha;
    all.push(n);
    store.set("usuariosEmpresa", all);
    return n;
  },
  async alternarAtivoUsuario(id, ativo) {
    this.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
    const all = store.get("usuariosEmpresa"),
      u = all.find((x) => x.id === id);
    if (!u) throw Error("Usuário não encontrado.");
    if (
      !ativo &&
      u.perfil === "ADMIN" &&
      u.ativo &&
      all.filter(
        (x) => x.empresaId === u.empresaId && x.perfil === "ADMIN" && x.ativo,
      ).length <= 1
    )
      throw Error(
        "Não é possível inativar o último administrador ativo da empresa.",
      );
    u.ativo = ativo;
    store.set("usuariosEmpresa", all);
    return u;
  },
  async atualizarUsuarioEmpresa(id, dados) {
    this.verificarPermissaoEmpresa("GERENCIAR_USUARIOS_ASSINATURA");
    const all = store.get("usuariosEmpresa"),
      u = all.find((x) => x.id === id);
    if (!u) throw Error("Usuário não encontrado.");
    if (
      u.perfil === "ADMIN" &&
      dados.perfil === "OPERADOR" &&
      u.ativo &&
      all.filter(
        (x) => x.empresaId === u.empresaId && x.perfil === "ADMIN" && x.ativo,
      ).length <= 1
    )
      throw Error(
        "Não é possível inativar o último administrador ativo da empresa.",
      );
    if (
      dados.email &&
      all.some((x) => x.id !== id && norm(x.email) === norm(dados.email))
    )
      throw Error("Este e-mail já está em uso.");
    Object.assign(u, dados);
    store.set("usuariosEmpresa", all);
    return u;
  },
};
export { api, cpfValido, cnpjValido };
export const getLotes = () => store.get("lotes"),
  getLojas = () => store.get("lojas"),
  getProjetos = () => store.get("projetos"),
  getDesigner = () => store.get("designer"),
  toggleFavorito = (id) => {
    const d = store.get("designer");
    d.favoritos.includes(id)
      ? d.favoritos.splice(d.favoritos.indexOf(id), 1)
      : d.favoritos.push(id);
    store.set("designer", d);
    return d.favoritos;
  },
  setReservaAtiva = (id) => {
    const ls = store.get("lotes"),
      l = ls.find((x) => x.id === id);
    if (l) l.status = l.status_lote = STATUS_LOTE.RESERVADO;
    store.set("lotes", ls);
  };
