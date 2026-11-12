# DIRETRIZES DE IMPLEMENTAÇÃO FRONT-END — PROJETO CONTINUUM (MVP v3)

> **Instrução para o Agente (CODEX):**
> Você deve atuar como Engenheiro de Software Front-end Sênior. Leia atentamente todas as especificações abaixo, que consolidam o backlog prioritário (`questoes.md`) e a Documentação Técnica v3 (`CONTINUUM_Documentacao_Tecnica_v3_1`). Aplique as soluções diretamente nos arquivos correspondentes do projeto, garantindo que todas as telas consumam a mesma fonte de verdade, respeitem as máquinas de estado oficiais e atendam a todos os critérios de aceite.

---

## 1. Arquitetura de Dados: Mock Compartilhado e Camada de Serviço (`FE-01`)

### Contexto e Regra de Negócio

Atualmente, as telas possuem dados isolados ou inconsistentes. Todas as visualizações e mutações do sistema devem ler e gravar no mesmo armazenamento central (`js/shared/store.js`), persistido via `localStorage` com carga inicial (seed) baseada nos dados de demonstração (`AN-14`), e acessado **exclusivamente** através de uma camada de serviço única (`js/shared/api.js`). Isso garantirá que, na Onda 4 (`FE-18`), o mock seja substituído pela API REST/Oracle sem alterar os arquivos das telas.

### Ações no Código

#### 1.1. Refatorar `js/shared/store.js`

1. Implementar um gerenciador de estado reativo/persistente com chave única no `localStorage` (ex: `CONTINUUM_STORE_V3`).
2. Garantir que a estrutura do estado inicial (Seed Data) contenha as coleções normalizadas alinhadas ao modelo Oracle v3:
   - `doadores`: lista de pessoas físicas com CPF (PK), nome, e-mail, telefone, CEP, endereço completo, faixa etária, canal de aquisição e termos aceitos.
   - `confeccionistas`: lista de designers (PF/PJ), documento (CPF/CNPJ), razão social (se PJ), nome profissional, e-mail, telefone, endereço completo (CEP, UF, cidade, bairro, rua, número, complemento), maioridade confirmada, canal de aquisição, consentimento de perfil público e dados de perfil (sobre mim, especialidades, faixa de experiência, manifesto, portfólio, instagram, site).
   - `empresas`: lista de lojas participantes (foco em SP), contendo CNPJ, razão social, nome fantasia, endereço do ponto de coleta, horários de funcionamento (`HORARIO_FUNCIONAMENTO`), logística (`aceitaRetirada`: boolean; envio é sempre `true` por regra `AN-07`), perfil da loja, segmento, porte, logo, cartilha padrão versionada (`CARTILHA_PADRAO`), política de cupom (`percentual`, `validadeDias`) e dados de assinatura (`ASSINATURA` com bandeira e 4 últimos dígitos, sem número de cartão completo).
   - `usuariosEmpresa`: lista de contas vinculadas às empresas (`ID_EMPRESA`), com nome, e-mail único, telefone, senha, perfil (`ADMIN` ou `OPERADOR`) e flag `ativo`.
   - `doacoes`: registros de entregas (`ID_DOACAO`, `idEmpresa`, `cpfInformado`, `pecas`, `pesoKg`, `statusCuradoria`: `'AGUARDANDO' | 'EM_LOTE' | 'NAO_APROVEITADA'`, `statusContagem`: `'CONTANDO' | 'EM_CUPOM' | 'EXPIRADA'`).
   - `lotes`: lotes cadastrados na curadoria (`codigo`, `idEmpresa`, `titulo`, `descricao`, `pesoKg`, `status`, `briefing`: `{ ideiaMarca, expectativa, liberdadeCriativa, prazoProducaoDias }`, `doacoesVinculadas`: array de IDs).
   - `reservas`: vínculo entre lote e designer (`idLote`, `idDesigner`, `status`: `'ATIVA' | 'CONCLUIDA' | 'EXPIRADA' | 'CANCELADA'`, `tipoLogistica`: `'RETIRADA' | 'ENVIO'`, `prazoRetirada`, `confirmacaoEmpresa`, `confirmacaoDesigner`, `codigoRastreio`).
   - `projetos`: 1 por lote reservado/em produção (`idLote`, `idDesigner`, `tituloPeca`, `processoCriativo`, `quantidadePecas`, `codigoPublicoQr`, `acompanhamentos`: array de avanços e feedbacks).
   - `cupons`: descontos gerados (`codigo`, `idEmpresa`, `cpfDoador`, `percentual`, `validade`, `status`: `'ATIVO' | 'UTILIZADO' | 'EXPIRADO'`).
3. Garantir integridade nos dados de seed (`AN-14`): o código do lote (ex: `LOT-2026-001`) e seu peso em kg (ex: `12.5 kg`) devem ser propriedades imutáveis ou calculadas a partir da mesma referência, nunca hardcoded no HTML das páginas.

#### 1.2. Refatorar `js/shared/api.js`

1. Expor métodos assíncronos (retornando `Promise`) para todas as operações de leitura e escrita, simulando latência mínima:
   - **Autenticação:** `login(perfil, identificador, senha)`, `redefinirSenha(identificador, novaSenha, confirmacaoSenha)`.
   - **Cadastros e Perfis:** `registrarDoador(dados)`, `atualizarPerfilDoador(cpf, dados)`, `registrarConfeccionista(dados)`, `atualizarPerfilConfeccionista(id, dados)`, `registrarEmpresaComAssinatura(dadosEmpresa, dadosAdmin, dadosPagamento)`, `atualizarPerfilEmpresa(idEmpresa, dados)`.
   - **Lotes e Vitrine:** `listarLotesVitrineSP()` (filtrar apenas empresas ativas com `uf === 'SP'` e status `'DISPONÍVEL'`), `obterLotePorCodigo(codigo)`, `criarLote(dadosLote)`, `reservarLote(codigoLote, idDesigner, tipoLogistica)`.
   - **Consultas de Painel:** `listarMeusLotesDesigner(idDesigner)`, `listarLotesEmpresa(idEmpresa)`.
2. Ao executar `reservarLote(codigoLote, idDesigner, tipoLogistica)`:
   - Validar se o designer já possui uma reserva ativa (`AN-06`: máximo de 1 reserva ativa por vez).
   - Atualizar o status do lote no `store.js` de `'DISPONÍVEL'` para `'RESERVADO'`.
   - Criar o registro na coleção `reservas`.
   - Persistir imediatamente no `localStorage`.

### Critérios de Aceite (`FE-01`)

- [ ] Reserva feita na vitrine pelo designer altera o estado no `store.js` e aparece imediatamente em "Meus lotes" (visão do designer) e na lista de lotes da empresa (como `RESERVADO`).
- [ ] O mesmo lote exibe exatamente o mesmo código e peso em todas as telas do sistema (Vitrine, Detalhe, Meus Lotes e Painel da Empresa).

---

## 2. Padronização de Textos, Papéis e Máquinas de Estado (`FE-04`)

### Contexto e Regra de Negócio

O vocabulário das telas e os filtros/selos de status precisam refletir estritamente o glossário oficial (`AN-13`) e as máquinas de estado da versão 3 (`BD-04`, `BD-24`). Status antigos como `"EM AJUSTE"` ou `"CANCELADO"` (para lote) foram **removidos**.

### Ações no Código

#### 2.1. Constantes Oficiais de Status (Criar/Atualizar em `js/shared/store.js` ou `js/shared/constants.js`)

Substituir todos os textos de status hardcoded nas telas, filtros `<select>`, abas, badges e contadores pelas listas oficiais abaixo:

1. **Status de Lote / Projeto (`STATUS_LOTE`):**
   - `DISPONÍVEL`
   - `RESERVADO`
   - `EM TRANSPORTE PARA O DESIGNER`
   - `EM PRODUÇÃO`
   - `ENVIADO PARA A LOJA`
   - `FINALIZADO`
   - `FINALIZADO — NÃO APROVEITADO`
   - `INTERROMPIDO`
2. **Status de Curadoria da Doação (`STATUS_CURADORIA`):**
   - `Aguardando curadoria`
   - `Em lote`
   - `Não aproveitada`
3. **Status de Cupom (`STATUS_CUPOM`):**
   - `Ativo`
   - `Utilizado`
   - `Expirado`
4. **Status de Reserva (`STATUS_RESERVA`):**
   - `ATIVA`
   - `CONCLUÍDA`
   - `EXPIRADA`
   - `CANCELADA`

#### 2.2. Aplicação do Glossário nas Telas (`AN-13`)

1. **Painel da Empresa:** Nos títulos, cabeçalhos e referências logísticas de entrega de roupas, referenciar a unidade da empresa como **"Ponto de Coleta"** (ou "Loja / Ponto de Coleta").
2. **Tela "Meus Lotes" (Visão do Designer):** Onde exibe a origem do lote ou marca responsável, padronizar o rótulo para **"Empresa Parceira"**.
3. **Painel do Doador:** Padronizar os termos de histórico e contadores para **"Doações"** (nunca "lotes doados" ou "pedidos", pois tudo o que o doador entrega de uma vez conta como uma doação).

### Critérios de Aceite (`FE-04`)

- [ ] Nenhuma tela, filtro, badge ou contador exibe status fora da lista oficial da v3.
- [ ] Nomenclaturas "Ponto de Coleta", "Empresa Parceira" e "Doações" aplicadas nos respectivos contextos.

---

## 3. Autenticação, Máscaras por Aba e Recuperação de Senha (`FE-02`)

### Contexto e Regra de Negócio

A tela de Login é dividida por abas de perfil (Doador, Designer/Confeccionista e Empresa). Cada aba deve aceitar o identificador específico com máscara dinâmica, bloquear tentativas de login com credenciais de outro perfil e oferecer um fluxo simplificado de recuperação de senha.

> _Nota de compatibilidade (`questoes.md` vs `Doc v3`):_ No `questoes.md` é solicitado que a aba Empresa aceite CNPJ com máscara, enquanto a Doc v3 introduz login por e-mail de usuário (`ADMIN`/`OPERADOR`). Para atender estritamente ao critério da tarefa `FE-02` sem quebrar a evolução da v3, o campo da aba Empresa deve aplicar máscara automática de CNPJ quando o usuário digitar números (validando o CNPJ da empresa e logando seu usuário Admin padrão) ou permitir e-mail do usuário da empresa caso contenha `@` ou letras, recusando qualquer conta que pertença aos perfis Doador ou Designer.

### Ações no Código

#### 3.1. Identificador e Máscaras por Aba na Tela de Login

1. **Aba Doador:**
   - Rótulo do campo: `"CPF ou E-mail"`.
   - Comportamento da máscara: Se o valor digitado contiver apenas dígitos numéricos e começar a ser preenchido (até 11 dígitos), aplicar máscara de CPF (`000.000.000-00`). Se o usuário digitar letras ou `@`, remover a formatação de pontuação e tratar como e-mail.
2. **Aba Designer (Confeccionista):**
   - Rótulo do campo: `"CPF ou CNPJ"`.
   - Comportamento da máscara: Aceitar apenas números. Até 11 dígitos, aplicar máscara de CPF (`000.000.000-00`); de 12 a 14 dígitos, transicionar automaticamente para a máscara de CNPJ (`00.000.000/0000-00`).
3. **Aba Empresa:**
   - Rótulo do campo: `"CNPJ"` (ou `"CNPJ ou E-mail Corporativo"`).
   - Comportamento da máscara: Aplicar máscara de CNPJ (`00.000.000/0000-00`) para entradas numéricas de até 14 dígitos.

#### 3.2. Validação de Perfil Cruzado

1. Na função `api.login(abaSelecionada, identificador, senha)`:
   - Verificar primeiro se o identificador existe na base geral (`store.js`).
   - Se o identificador pertencer a um perfil diferente de `abaSelecionada` (ex: um Doador tentando logar na aba Designer ou Empresa), **recusar o acesso imediatamente** e exibir mensagem explícita: `"Esta conta pertence ao perfil [Nome do Perfil Correto]. Por favor, selecione a aba correspondente para entrar."`

#### 3.3. Recuperação de Senha Simplificada

1. Ao clicar em `"Esqueci minha senha"`, abrir modal ou alternar view de recuperação.
2. Solicitar o identificador da conta (CPF, CNPJ ou E-mail) e apenas **dois campos de senha**:
   - `Nova senha` (respeitando o mínimo de caracteres)
   - `Confirmar nova senha`
3. Validar se os dois campos são idênticos. Se forem, atualizar a senha diretamente no `store.js` para a conta localizada, exibir feedback de sucesso (`"Senha alterada com sucesso!"`) e retornar ao formulário de login.

### Critérios de Aceite (`FE-02`)

- [ ] Doador cadastrado consegue entrar tanto informando o CPF (com ou sem pontuação) quanto o e-mail.
- [ ] Máscaras dinâmicas funcionam conforme a aba selecionada.
- [ ] Tentativa de login na aba errada é recusada com aviso claro.
- [ ] Recuperação de senha altera a senha no mock apenas preenchendo a nova senha 2 vezes.

---

## 4. Cadastros de Doador e Confeccionista + Integração ViaCEP (`FE-03`, `FE-24`, `FE-25`)

### Contexto e Regra de Negócio

Os cadastros de Doador e Designer/Confeccionista devem refletir todos os campos obrigatórios e opcionais de `AN-10`, validar dígitos verificadores de documentos e preencher automaticamente endereço via API dos Correios (ViaCEP).

### Ações no Código

#### 4.1. Utilitários Compartilhados (`js/shared/validators.js` e `js/shared/cep.js`)

1. **Integração API de CEP (ViaCEP):**
   - Criar função `buscarCep(cep)` que consulta `https://viacep.com.br/ws/${cepLimpo}/json/`.
   - Ao sair do campo CEP (`blur`) ou completar 8 dígitos numéricos, buscar os dados e preencher automaticamente: **Estado (UF)**, **Cidade**, **Bairro** e **Rua (Logradouro)**.
   - Posicionar o foco no campo **Número**. Caso a API falhe ou esteja offline, permitir edição manual sem travar o formulário, mantendo fallback para CEPs de teste do mock.
2. **Validação Algorítmica de CPF e CNPJ:**
   - Implementar validação real de dígitos verificadores (módulo 11, rejeitando sequências repetidas como `111.111.111-11` ou `00.000.000/0000-00`) para CPF (11 dígitos) e CNPJ (14 dígitos).

#### 4.2. Formulário de Cadastro do Doador (`FE-03` / `FE-24`)

Atualizar o formulário de cadastro do doador para conter exatamente:

1. **Campos Obrigatórios (bloqueiam envio se vazios ou inválidos):**
   - `Nome completo` (ampliar `maxlength` para no mínimo 120 caracteres, exigindo nome e sobrenome).
   - `CPF` (com máscara e validação de dígito verificador; verificar unicidade no `store.js`).
   - `E-mail` (validação de formato e unicidade no `store.js`).
   - `Telefone / WhatsApp` (com máscara `(00) 00000-0000`).
   - `CEP` (com máscara `00000-000` e gatilho automático da API dos Correios).
   - `Estado (UF)`, `Rua (Logradouro)` e `Bairro` (preenchidos automaticamente pelo CEP).
   - `Número do endereço` (obrigatório).
   - `Complemento` (opcional na regra de endereço, mas presente no formulário).
   - `Senha` (mínimo de 8 caracteres) e `Confirmação de senha` (deve coincidir com a senha).
   - `Aceite dos Termos de Uso e Política de Privacidade` (checkbox obrigatório; grava registro em `CONSENTIMENTO` com versão e timestamp).
2. **Campos Opcionais (Listas fechadas `<select>` — podem ficar em branco):**
   - `Faixa etária`: `['18 a 24 anos', '25 a 34 anos', '35 a 44 anos', '45 a 54 anos', '55 anos ou mais', 'Prefiro não informar']`.
   - `Como conheceu o CONTINUUM?` (Canal de aquisição): `['Loja física participante', 'Instagram / Redes Sociais', 'Indicação de amigos', 'Pesquisa Google', 'Eventos de moda/sustentabilidade', 'Outros']`.
3. **Regra Pós-Cadastro (`BE-20` / `BD-23` no Mock):**
   - Ao concluir o cadastro do doador, verificar na coleção `doacoes` do `store.js` se já existem doações registradas anteriormente apenas com o `cpfInformado` dele. Se houver, vinculá-las automaticamente ao perfil recém-criado (e gerar cupom caso já tenha completado 5 doações válidas no ciclo de 6 meses na mesma loja).

#### 4.3. Formulário de Cadastro e Perfil do Confeccionista / Designer (`FE-03` / `FE-25`)

Dividir claramente o que é exigido no **Cadastro Inicial** (obrigatório) e o que fica disponível para preenchimento posterior no **Perfil do Designer** (não obrigatório na entrada):

1. **No Cadastro do Confeccionista:**
   - `Tipo de Pessoa`: Seletor `PF` ou `PJ`.
   - `CPF ou CNPJ`: Com máscara dinâmica e **validação real de dígito verificador** conforme o tipo selecionado.
   - `Razão Social`: Campo exibido e obrigatório **somente se `PJ`**.
   - `Nome ou Nome Profissional` (obrigatório).
   - `E-mail` (obrigatório, formato válido).
   - `Telefone / WhatsApp` (obrigatório, com máscara).
   - `CEP` (obrigatório, aciona API dos Correios e preenche automaticamente **Estado (UF)**, **Cidade**, **Bairro** e **Logradouro/Rua**).
   - `Número` (obrigatório) e `Complemento` (campo adicionado).
   - `Como conheceu o CONTINUUM?` (Canal de aquisição — lista fechada).
   - `Senha` (com mínimo de caracteres) e `Confirmação de Senha`.
   - **Checkboxes de Consentimento e Requisitos:**
     - `Confirmo que sou maior de 18 anos` (**obrigatório** — sem marcar, o cadastro é bloqueado).
     - `Aceito os Termos de Uso e Política de Privacidade` (**obrigatório** — inclui ciência sobre regras de nota e restrição da `AN-17`).
     - `Autorizo a exibição pública do meu perfil e portfólio na página do QR Code das peças` (checkbox de consentimento de perfil público — gravado no `store.js`).

2. **No Perfil do Confeccionista (Campos não obrigatórios no cadastro, editáveis no perfil — `FE-16` / `FE-25`):**
   - **IMPORTANTE (`AN-06`):** Remover qualquer campo de "Capacidade de produção mensal/semanal".
   - `Sobre mim` (textarea).
   - `Especialidades` (seleção múltipla em lista fechada: ex. `'Jeans / Denim'`, `'Alfaiataria'`, `'Malharia'`, `'Patchwork'`, `'Bordado / Aplicações'`, `'Acessórios'`, `'Tingimento Natural'`).
   - `Faixa de experiência` (select em faixas: `'Iniciante (até 1 ano)'`, `'Intermediário (1 a 3 anos)'`, `'Experiente (3 a 5 anos)'`, `'Especialista (mais de 5 anos)'`).
   - `Manifesto criativo` (textarea).
   - `Portfólio` (links ou upload simulado de imagens).
   - `Instagram` (ex: `@usuario`) e `Site / URL` (validação de URL).
   - Toggle para gerenciar o `Consentimento de exibição no QR Code público`.

### Critérios de Aceite (`FE-03`)

- [ ] Todos os campos de Doador e Confeccionista estão idênticos às definições de `AN-10` e `questoes.md`.
- [ ] Preencher o CEP consulta a API e popula Estado, Rua e Bairro automaticamente em ambos os cadastros.
- [ ] Validação de dígito verificador recusa CPF ou CNPJ inválido.
- [ ] Sem confirmar maioridade e termos, o cadastro do confeccionista não avança.

---

## 5. Perfil do Doador Refeito (`FE-05`)

### Contexto e Regra de Negócio

A tela de Perfil do Doador estava exibindo indevidamente um formulário com campos de empresa (CNPJ, Razão Social). Ela deve ser completamente refeita para exibir e editar apenas os dados reais do cadastro do doador logado.

### Ações no Código

1. Localizar a tela/componente de Perfil do Doador.
2. **Remover integralmente** os inputs de CNPJ, Razão Social, Nome Fantasia ou quaisquer metadados corporativos.
3. Renderizar o formulário carregando os dados do doador logado a partir do `api.js` / `store.js`:
   - `Nome completo` (editável)
   - `CPF` (**somente leitura** — `readonly` / `disabled`, com estilo visual indicando bloqueio de edição)
   - `E-mail` (editável)
   - `Telefone / WhatsApp` (editável, com máscara)
   - `CEP` (editável, com máscara e gatilho ViaCEP atualizando endereço: UF, Rua, Bairro, Número e Complemento)
   - `Faixa etária` e `Como conheceu` (editáveis)
4. Ao clicar em `"Salvar Alterações"`, atualizar o registro do doador no `store.js` via `api.atualizarPerfilDoador(cpf, novosDados)` e exibir confirmação visual.

### Critérios de Aceite (`FE-05`)

- [ ] O perfil do doador exibe exatamente os dados preenchidos no cadastro do doador logado.
- [ ] O campo CPF está bloqueado para edição (`readonly`).
- [ ] Nenhum campo de empresa (CNPJ/Razão Social) existe na tela.

---

## 6. Jornada de Entrada, Cadastro e Perfil da Empresa (`FE-26`, `FE-27`)

### Contexto e Regra de Negócio

Conforme `AN-10` e `AN-11`, a empresa entra no CONTINUUM por uma jornada comercial estruturada em 5 passos (stepper/wizard) com pagamento mockado, consulta automática de CNPJ e configuração de ponto de coleta, seguida pelo preenchimento completo do perfil da loja (incluindo cartilha padrão, política de cupom e senha de admin).

### Ações no Código

#### 6.1. Jornada de Entrada da Empresa em 5 Etapas (`FE-27`)

Implementar o fluxo único sequencial para novas empresas:

1. **Etapa 1 — Tela de Valores e Benefícios:**
   - Apresentar a proposta de valor do CONTINUUM para marcas e pontos de coleta: estatísticas de impacto ambiental, KPIs em tempo real (doações recebidas, kg têxteis reaproveitados, peças de upcycling finalizadas, designers apoiados), emissão de **Certificado de Sustentabilidade** para marketing sustentável (`FE-33`) e o **valor fictício do plano de assinatura** (ex: `R$ 299,90/mês — Plano Parceiro Circular`).
2. **Etapa 2 — Decisão de Contato ou Adesão:**
   - Exibir dois botões claros de ação:
     - `"Tirar dúvidas via WhatsApp"` (link externo `https://wa.me/5511999999999?text=...` abrindo em nova aba).
     - `"Seguir para Cadastro e Pagamento"` (avança para a Etapa 3 no fluxo).
3. **Etapa 3 — Cadastro dos Dados da Empresa (`FE-26`):**
   - `CNPJ`: Com máscara `00.000.000/0000-00` e **consulta automática** ao completar 14 dígitos válidos (consultar BrasilAPI `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` com fallback imediato em dicionário mock local para CNPJs de teste), preenchendo automaticamente:
     - `Razão Social`
     - `Nome Fantasia`
   - `Responsável pela Conta (Admin)`: Nome completo, E-mail corporativo e Telefone.
   - `Endereço do Ponto de Coleta`: CEP (com preenchimento automático via API de CEP — restrito ou validado prioritariamente para `SP` conforme escopo do MVP), Rua, Bairro, Número e Complemento.
   - `Horário de Funcionamento e de Retirada`: Seleção de dias da semana e horários de abertura/fechamento (usados como base para o cálculo dos 3 dias úteis de retirada — `AN-04`).
   - `Logística Aceita`:
     - Mostrar aviso fixo: _"O envio via Correios (dentro de SP) é sempre oferecido e custeado pelo CONTINUUM."_ (`AN-07` / Resposta 1).
     - Checkbox/Toggle: `"Aceita retirada presencial do lote pelo designer na loja?"` (`aceitaRetirada`: Sim/Não).
   - `Senha de Acesso / Admin` e confirmação de senha + Aceite dos Termos.
4. **Etapa 4 — Pagamento Mockado (`FE-27` / LGPD Seção 8):**
   - Exibir resumo do plano com valor fictício.
   - Formulário de cartão de crédito:
     - `Número do Cartão` (16 dígitos com máscara `0000 0000 0000 0000`).
     - `Nome impresso no cartão` (mínimo 3 caracteres).
     - `Validade (MM/AA)` (validar mês entre `01` e `12` e ano atual ou futuro).
     - `CVV` (3 ou 4 dígitos numéricos).
   - **Regra de Validação:** Validar rigorosamente o formato do cartão (16 dígitos numéricos / algoritmo de Luhn opcional ou regex estrita `^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$`, validade não expirada e CVV numérico). Se o formato for inválido, **recusar o avanço**, exibir mensagem de erro e manter a empresa sem acesso.
   - **Regra LGPD Crítica (`BD-25`):** **NUNCA** salvar o número completo do cartão nem o CVV no `store.js`/`localStorage`. Gravar no objeto `assinatura` apenas `status: 'ATIVA'`, `bandeira` detectada, `ultimos4Digitos: numero.slice(-4)` e `valorFicticio`.
5. **Etapa 5 — Liberação e Acesso ao Sistema:**
   - Concluir o registro no `store.js` (criando a `EMPRESA`, o `USUARIO_EMPRESA` com perfil `ADMIN` e a `ASSINATURA` ativa), autenticar a sessão automaticamente e redirecionar a empresa direto para o **Painel da Empresa**.

#### 6.2. Perfil Completo da Empresa (`FE-26` / `FE-06`)

Na tela de Perfil / Configurações da Empresa (acessível pelo Admin após entrar no painel), disponibilizar a edição de todos os atributos complementares de `AN-10`:

1. **Dados Cadastrais e Operacionais:** CNPJ (leitura), Razão Social, Nome Fantasia, Responsável, Endereço do Ponto de Coleta, Horários de Funcionamento e flag de Retirada Presencial.
2. **Classificação e Identidade:**
   - `Segmento`: Lista fechada (`'Moda Feminina'`, `'Moda Masculina'`, `'Streetwear / Jeans'`, `'Moda Infantil'`, `'Multimarcas / Departamento'`, `'Outros'`).
   - `Porte da Empresa`: Lista fechada (`'MEI / Microempresa'`, `'Pequeno Porte'`, `'Médio Porte'`, `'Grande Porte'`).
   - `Perfil da Loja / Público-alvo`: Textarea descrevendo estilo da marca e público.
   - `Logo da Empresa`: Upload simulado (DataURL / URL de imagem) exibido na vitrine.
3. **Cartilha Padrão de Qualidade (`AN-09`):**
   - Campos para definir as diretrizes gerais de acabamento, costura, higienização e padrão de qualidade da marca (versionada automaticamente a cada salvamento, ex: `v1.0`, `v1.1`), que servirá de referência fixa em todos os lotes.
4. **Política Padrão de Cupom (`AN-02`):**
   - `Percentual de Desconto (%)`: numérico (ex: `15%`).
   - `Prazo de Validade do Cupom (em dias)`: numérico (ex: `30` dias a partir da emissão na 5ª doação).
5. **Segurança e Senha de Admin (`AN-10` / `FE-26`):**
   - Seção para definição/alteração da **Senha de Admin** (que autoriza ações sensíveis como excluir ou atualizar lotes, aprovar/reprovar peças e editar políticas) e atalho para gerenciamento de operadores (`FE-30`).

### Critérios de Aceite (`FE-26` e `FE-27`)

- [ ] Ao digitar um CNPJ válido no cadastro da empresa, a Razão Social e o Nome Fantasia são preenchidos automaticamente.
- [ ] O fluxo completo das 5 etapas (Benefícios → Decisão/WhatsApp → Cadastro → Pagamento Mockado → Acesso) leva a empresa autenticada até o painel.
- [ ] Cartão de crédito com formato inválido (menos de 16 dígitos, validade vencida ou CVV inválido) é recusado na Etapa 4 e impede o acesso.
- [ ] O perfil da empresa permite configurar segmento, porte, perfil da loja, logo, cartilha padrão, política de cupom e senha de admin, persistindo tudo no `store.js`.

---

## 7. Checklist de Verificação Pós-Implementação (Para o CODEX)

Antes de finalizar sua execução, execute a seguinte verificação no código alterado:

1. **Busca por Status Antigos:** Execute uma busca global no código por `"Em ajuste"`, `"EM_AJUSTE"` ou `"Cancelado"` (aplicado a lotes) e substitua pelos status oficiais da seção 2.1.
2. **Consistência da Store:** Verifique se nenhuma tela está lendo mocks locais (arrays estáticos dentro de arquivos de página) em vez de chamar `js/shared/api.js`.
3. **Fluxo de Ponta a Ponta:**
   - Cadastre um Doador com CEP → Entre pelo Login usando CPF e depois E-mail → Verifique a tela de Perfil do Doador (`FE-05`).
   - Cadastre uma Empresa passando pelas 5 etapas (`FE-27`), testando um cartão inválido (deve bloquear) e um válido (deve liberar o painel) → Configure a Cartilha e Política de Cupom no Perfil (`FE-26`).
   - Cadastre um Designer com validação de CPF/CNPJ e CEP → Reserve um lote na Vitrine → Confirme que o lote mudou para `RESERVADO` tanto em "Meus Lotes" quanto no Painel da Empresa, mantendo o mesmo código e peso (`FE-01`).
