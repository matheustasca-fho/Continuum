# AGENTS.md — Contexto Geral e Regras de Negócio do CONTINUUM

> **Propósito deste documento:** Fonte única de verdade (Single Source of Truth) para agentes de IA e desenvolvedores que atuam no repositório **CONTINUUM**. Descreve o propósito do produto, os atores do ecossistema, as regras de negócio extraídas da implementação atual, o modelo de domínio e as diretrizes arquiteturais de Front-End e Back-End.

---

## 1. Visão Geral do Projeto

O **CONTINUUM** é uma plataforma de **economia circular, upcycling e moda sustentável** sediada em São Paulo, SP. O sistema conecta três pontas da cadeia têxtil para impedir que resíduos, retalhos e peças sem uso acabem em aterros sanitários, transformando o excedente de um ator na matéria-prima de outro:

1. **Doação (`Doador`):** Pessoas físicas ou confecções doam tecidos, retalhos ou peças sem uso e acumulam benefícios (pontos/progresso para cupons de desconto em marcas parceiras).
2. **Curadoria e Gestão (`Empresa`):** Empresas têxteis, lojas e ateliês parceiros recebem os materiais, organizam e cadastram **Lotes** classificados por tipo, peso e diretrizes criativas (*briefing*), acompanham **Projetos de Upcycling**, realizam inspeção física das peças prontas e emitem **Tags com QR Code** de rastreabilidade.
3. **Transformação Criativa (`Designer` / Confeccionista):** Designers independentes (PF ou PJ) exploram a vitrine de lotes disponíveis, reservam matéria-prima mediante termo de responsabilidade, confeccionam novas peças autorais dentro do prazo (SLA) e documentam o processo criativo.
4. **Rastreabilidade Pública (`Consumidor Final`):** Ao escanear o QR Code impresso na Tag da peça finalizada, qualquer pessoa acessa a página pública da peça contando sua origem, o designer responsável, o processo criativo e a linha do tempo da transformação.

---

## 2. Guard-Rails Técnicos Globais

| Camada | Tecnologias Permitidas | Restrições Estritas |
| :--- | :--- | :--- |
| **Front-End** (`/frontend`) | **HTML5 Vanilla**, **CSS3 Puro** (metodologia BEM + tokens CSS) e **JavaScript Vanilla (ES6+)**. | **PROIBIDO** qualquer framework/biblioteca JS ou CSS (React, Vue, Angular, jQuery, Tailwind, Bootstrap, Sass) e Web Components customizados. |
| **Back-End** (`/backend`) | **PHP 8.x Puro (Vanilla)** com extensão nativa **PDO** para banco de dados, servindo uma **API REST JSON**. | **PROIBIDO** o uso de frameworks PHP (Laravel, Symfony, Slim, Lumen, CodeIgniter, etc.). Arquitetura limpa e nativa. |
| **Infraestrutura** | **Oracle Cloud Infrastructure (OCI) Free Tier** (Compute VM + Banco de Dados com porta interna na VCN e porta HTTP/HTTPS pública para a API). | O banco de dados **nunca** deve ter sua porta exposta diretamente para a internet pública (apenas rede interna/local). |

---

## 3. Atores do Sistema e Perfis de Acesso

O sistema possui **3 perfis autenticados** (`doador`, `designer`, `empresa`) e **1 visão pública** (consumidor via QR Code):

### 3.1. Doador (`perfil: "doador"`)
* **Identificador de Login:** Nome de usuário ou CPF (`usuario` / `cpf`).
* **Cadastro (`pages/auth/cadastro/doador`):**
  * Campos obrigatórios: `CPF` (11 dígitos numéricos com validação de dígitos verificadores, sem pontuação), `CEP` (8 dígitos numéricos, sem hífen), `SENHA_DOADOR` (máximo de 10 caracteres no front-end atual), `NM_DOADOR` (Nome completo, até 60 caracteres), `TELEFONE` (com DDD entre parênteses, 10 a 11 dígitos numéricos).
* **Funcionalidades e Regras:**
  * **Painel do Doador (`pages/doador/painel`):**
    * Exibe progresso de gamificação/fidelidade: **a cada 5 doações** realizadas (cada doação equivale a 20% da barra de progresso), o doador libera **1 novo cupom de desconto** em lojas parceiras (ex.: C&A, Lacoste, Renner).
    * Lista tabela de cupons com `Código`, `Status` (Ativo/Disponível, Em processamento, Indefinido) e `Validade`.
    * Exibe métricas operacionais e de impacto ambiental: `Lotes Doados`, `KG Reaproveitados / Resíduos Salvos`, `Designers Apoiados` e `Litros de Água Poupada Estimada`.
  * **Perfil do Doador (`pages/doador/perfil`):**
    * Permite gerenciar dados de coleta/confecção, endereço (`CEP`, `Cidade/UF`, `Logradouro/Doca`), frequência de disponibilidade (`diaria`, `semanal`, `quinzenal`, `mensal`, `sobDemanda`), volume mensal estimado (KG) e upload de foto/avatar (JPG/PNG, máx. 2MB). O documento (CPF/CNPJ) é imutável após o cadastro.

### 3.2. Designer / Confeccionista (`perfil: "designer"`)
* **Identificador de Login:** CPF ou CNPJ (`cpfCnpj`).
* **Cadastro (`pages/auth/cadastro/designer`):**
  * Suporta chaveamento entre **Pessoa Física (`CPF` - 11 dígitos)** e **Pessoa Jurídica (`CNPJ` - 14 dígitos)**.
  * Campos obrigatórios: Documento (`CPF` ou `CNPJ`, apenas dígitos), `SENHA_CONFECCIONISTA` (máx. 10 caracteres), `NM_CONFECCIONISTA` (Nome completo / Razão Social, até 150 caracteres), `CEP` (8 dígitos) e `NR_ENDERECO` (até 6 dígitos).
* **Funcionalidades e Regras:**
  * **Painel do Designer (`pages/designer/painel`):**
    * Exibe métricas de impacto circular (`KG Resíduos Salvos`, `Peças Ressignificadas`, `% Confiabilidade SLA`), contadores operacionais (`Lotes Reservados`, `Em Andamento`, `Finalizados`), "Matches Perfeitos" (lotes próximos ou urgentes) e lista de **Pendências** (lotes aguardando confirmação de recebimento ou projetos com prazo próximo/excedido).
  * **Vitrine de Lotes Disponíveis (`pages/designer/lotes-disponiveis`):**
    * Filtra lotes com status `DISPONIVEL` por loja/empresa, material (`algodão`, `jeans`, `malha`, `metal`), busca textual ou aba de **Favoritos (`Salvos`)**.
    * **Badge "Novo":** Exibido automaticamente para lotes publicados há menos de 48 horas.
    * Permite visualizar detalhes do lote (*briefing*, direção criativa, peso/quantidade, logística aceita) e abrir o drawer com o perfil e horário de funcionamento da loja de origem.
  * **Meus Lotes (`pages/designer/meus-lotes`):**
    * Acompanha lotes reservados nos status: `aguardando` (Aguardando retirada), `recebido` (Recebido) e `nao` (Não retirado / Expirado).
    * Exibe código identificador (`CNT-[id]`), barra de prazo de retirada e botão **"Sinalizar recebido"**.
  * **Meus Projetos e Status (`pages/designer/meus-projetos` e `status-projetos`):**
    * Lista projetos derivados dos lotes recebidos (`Em andamento`, `Finalizados`, `Atrasados` / `Prazo próximo`).
    * Permite consultar a linha do tempo de rastreio do lote (`Lote reservado` → `Lote recebido` → `Em produção` → `Finalizado`) e acionar **"Finalizar projeto"** mediante confirmação de consentimento e envio de comentário sobre o processo criativo.
  * **Meu Perfil e Vitrine Criativa (`pages/designer/perfil`):**
    * **Aba 1 (Meus Dados - Privado):** Apelido/Nome do Ateliê, Nome Completo, CPF/CNPJ (imutável), Telefone/WhatsApp, E-mail, Data de Nascimento/Fundação, Gênero, Endereço completo, Tempo de Experiência (`iniciante`, `1a3anos`, `3a5anos`, `5a10anos`, `mais10anos`) e Capacidade de Produção (peças/mês).
    * **Aba 2 (Minha Vitrine - Público na Tag):** Manifesto do Ateliê (até 500 caracteres), Instagram/TikTok, Site/Portfólio e Especialidades Têxteis (`patchwork`, `bordado`, `alfaiataria`, `tingimento`, `couro`, `croche`, `upcycling`).

### 3.3. Empresa Parceira (`perfil: "empresa"`)
* **Identificador de Login:** ID de Acesso ou CNPJ corporativo (`idAcesso`).
* **Regra de Cadastro (`pages/auth/cadastro`):**
  * Empresas **não possuem auto-cadastro aberto** no formulário comum. Ao selecionar o perfil "Empresa", o sistema abre um modal de contato comercial (`empresas@continuum.example`) para onboarding assistido (B2B).
* **Funcionalidades e Regras:**
  * **Painel Corporativo ESG (`pages/empresa/painel`):**
    * Métricas ESG: `Lotes em Processamento`, `Projetos Apoiados`, `KG de Resíduo Desviado`, `Certificados de Sustentabilidade (Pts)`, além de relatórios de impacto (`Toneladas redirecionadas`, `Litros de água economizados`, `KG CO₂ evitados`, `Marcas independentes fomentadas`).
  * **Gestão de Lotes Têxteis (`pages/empresa/lotes`):**
    * CRUD completo de lotes da empresa com upload de imagem, busca e filtro por status (`DISPONÍVEL`, `RESERVADO`, `EM PRODUÇÃO`, `ENVIADO`, `FINALIZADO`).
    * **Geração Automática de Código do Lote:** Formato `L` + sequencial de 3 dígitos + data `DDMMYYYY` (ex.: `L00128092026`).
    * **Cadastro em Lote (Batch):** Permite criar de 1 até 100 lotes idênticos de uma só vez.
    * **Dupla Confirmação e Senha de Autorização:** Para criar novos lotes, exige modal de confirmação + modal de autorização administrativa com senha corporativa (`AdminEmpresa`) e checkbox de responsabilidade. Alterações manuais de status também exigem modal de confirmação.
  * **Gestão de Projetos de Upcycling (`pages/empresa/projetos` e `projeto-detalhe`):**
    * Visualiza todos os projetos vinculados aos lotes da empresa, filtrando por status (`DISPONIVEL`, `RESERVADO`, `EM_PRODUCAO`, `ENVIADO`, `FINALIZADO`, `EXCEDIDO`).
    * Permite alterar status, acessar histórico/timeline completo do projeto, dados do confeccionista e **Liberar Prazo** caso o projeto esteja `EXCEDIDO`.
  * **Revisão e Inspeção Física (`pages/empresa/projeto-revisao`):**
    * Compara lado a lado **"O que foi pedido (Briefing)"** vs. **"O que foi entregue (Processo Criativo do Designer)"**.
    * **Regra de Inspeção Obrigatória:** O botão `"Aprovar e Finalizar"` permanece bloqueado (`disabled`) até que todos os **4 itens do checklist físico** sejam marcados:
      1. *Peça recebida fisicamente na loja*;
      2. *Costura e acabamentos conferidos*;
      3. *Peça condiz com as expectativas do briefing*;
      4. *História / Processo criativo revisado para a Tag*.
  * **Geração e Impressão de Tags (`pages/empresa/projeto-tag`):**
    * Configura e renderiza etiquetas físicas para impressão (`window.print()`) nos tamanhos `40x80 mm` (Pequena), `60x100 mm` (Média) ou `70x120 mm` (Grande), de 1 a 50 cópias, com opção de exibir/ocultar o nome do Designer e QR Code apontando para a página pública da peça.
  * **Perfil da Empresa (`pages/empresa/perfil`):**
    * Dados corporativos: Razão Social, Nome Fantasia, CNPJ (imutável), Segmento/Setor, Inscrição Estadual, E-mail Corporativo, Telefone Comercial, CEP, Cidade/UF e Endereço Completo.

---

## 4. Regras de Negócio Críticas (Core Domain Rules)

1. **R1 — Compromisso Único de Reserva (1 Lote Ativo por Designer):**
   * Um designer só pode ter **uma reserva ativa por vez** (`designer.reservaAtiva`). Se tentar reservar outro lote enquanto possui uma reserva pendente, o sistema bloqueia a ação e exibe o modal de bloqueio (`M5: Reserva bloqueada`).
2. **R2 — Fluxo de Reserva em 3 Etapas (`M1 → M2 → M3`):**
   * **Passo 1 (Termo de Responsabilidade - `M1`):** O designer deve aceitar o termo comprometendo-se com o prazo e com o briefing da loja.
   * **Passo 2 (Escolha de Logística - `M2`):** O designer escolhe entre `retirada` (retirar presencialmente na loja dentro do horário de funcionamento) ou `envio` (receber em casa com frete por conta da loja, habilitado somente se `logistica_aceita` do lote incluir `"envio"`). O designer também pode optar por `"Escolher depois"`.
   * **Passo 3 (Confirmação e Criação Automática de Projeto - `M3`):** Ao confirmar a reserva, o lote muda para `RESERVADO`, é vinculado ao `designer_id`, registra-se o timestamp `reservado_em` e cria-se automaticamente um registro de **Projeto** associado e um evento inicial no **Rastreamento** (`"Lote reservado pelo designer. Termo de responsabilidade assinado."`).
3. **R3 — Prazos (SLA de Produção e Expiração de Retirada):**
   * **SLA de Projeto (10 dias úteis):** Calculado a partir de `reservado_em` adicionando **10 dias úteis** (ignorando sábados e domingos, conforme `dates.js`).
     * `no_prazo`: mais de 3 dias restantes.
     * `proximo`: 3 dias ou menos restantes (gera alerta nas pendências do painel).
     * `excedido`: prazo vencido (`diffDias < 0`, gera alerta crítico e permite à empresa "Liberar Prazo").
   * **Expiração de Retirada do Lote (7 dias):** Na gestão de retirada (`meus-lotes`), lotes com status `aguardando` que não forem retirados/confirmados dentro de **7 dias corridos** expiram (`status: "nao"`) e voltam automaticamente para a vitrine de lotes disponíveis.
4. **R4 — Transição de Recebimento (`RESERVADO → EM_PRODUCAO`):**
   * Quando o designer confirma o recebimento físico do material (`sinalizarRecebido`), o status do lote e do projeto avançam para `EM_PRODUCAO`, registra-se `recebido_em` e adiciona-se um item na timeline de rastreamento. A empresa doadora é notificada.
5. **R5 — Finalização, Revisão Física e Rastreabilidade (`EM_PRODUCAO → FINALIZADO → TAG`):**
   * O designer finaliza o projeto informando o relato do processo criativo (`ds_processo_criativo`).
   * A empresa realiza a inspeção física de 4 etapas na tela de revisão e aprova a peça, liberando a emissão da Tag com QR Code que alimenta a página `peca-publica`.

---

## 5. Estrutura do Repositório

```text
Continuum/
├── AGENTS.md                 # Este documento (Regras de Negócio e Contexto Geral)
├── README.md                 # Apresentação do repositório
├── frontend/                 # Aplicação Web Front-End (HTML5, CSS3 BEM, JS Vanilla)
│   ├── lp.html               # Landing Page institucional interativa
│   ├── css/                  # Design System Continuum Craft (global.css, responsive.css)
│   ├── js/shared/            # Módulos compartilhados (api.js, store.js, dates.js, ui.js, motion.js)
│   ├── components/header/    # Sidebar unificada dinâmica por perfil (doador, designer, empresa)
│   ├── pages/                # Telas modulares por perfil (auth, doador, designer, empresa)
│   └── md-files/             # Guia de desenvolvimento Front-End
└── backend/                  # API REST em PHP Puro (sem frameworks) + Banco Oracle Cloud
    └── guia_de_desenvolvimento_backend.md
```

