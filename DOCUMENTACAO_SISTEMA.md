# Documentação de Arquitetura e Integração Full-Stack — CONTINUUM

> **Propósito:** Este documento consolida a arquitetura final do sistema **CONTINUUM**, detalhando a integração entre o **Front-End Vanilla (HTML5/CSS3/ES6+)** e a **API REST em PHP 8.2 Puro (OCI8)** conectada ao banco de dados **Oracle Cloud Autonomous Database (Schema `DEV`)**.

---

## 1. Visão Geral da Arquitetura

O sistema foi reestruturado para operar **100% conectado à API PHP e ao banco Oracle Cloud**, eliminando o banco simulado em `localStorage` (`mockApi` / `seed()`).

```mermaid
flowchart LR
    subgraph FrontEnd["Front-End (HTML5 + CSS3 BEM + JS ES6+)"]
        UI["Páginas por Perfil (Auth, Doador, Designer, Empresa)"]
        APIJS["Camada de Domínio (js/shared/api.js)"]
        ROUTESJS["Cliente HTTP Central (js/shared/routes.js)"]
        STOREJS["Sessão Autenticada (js/shared/store.js)"]
    end

    subgraph BackEnd["Back-End Container (Docker php:8.2-apache :8000)"]
        INDEX["Front Controller (public/index.php)"]
        ROUTER["Roteador Dinâmico (routes/Router.php)"]
        CTRL["Controllers REST (controllers/*Controller.php)"]
        MDL["Models de Domínio (models/*.php)"]
        DB["Singleton OCI8 (config/Database.php)"]
    end

    subgraph Cloud["Oracle Cloud & Serviços Externos"]
        ORACLE[("Oracle Autonomous DB (Schema DEV - 24 Tabelas)")]
        VIACEP["ViaCEP API (Consulta de CEP)"]
        BRASILAPI["BrasilAPI (Consulta de CNPJ)"]
    end

    UI --> APIJS
    APIJS --> STOREJS
    APIJS --> ROUTESJS
    ROUTESJS -- "HTTP REST JSON (/api/*)" --> INDEX
    INDEX --> ROUTER
    ROUTER --> CTRL
    CTRL --> MDL
    MDL --> DB
    DB -- "Oracle Wallet (mTLS / OCI8)" --> ORACLE
    MDL -- "Fallback / Cache em CEP" --> VIACEP
    MDL -- "Consulta Cadastral" --> BRASILAPI
```

### Estrutura de Diretórios

* **Back-End (`/backend/src`)**
  * `config/Database.php`: Conexão Singleton via `oci_connect` com suporte a Oracle Wallet (`TNS_ADMIN`) e definição automática do schema (`ALTER SESSION SET CURRENT_SCHEMA = DEV`).
  * `routes/Router.php`: Roteador HTTP com suporte aos verbos `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, precedência de rotas estáticas sobre rotas parametrizadas (`{id}` ou `:id`) e unificação de parâmetros de URL, query string e corpo JSON.
  * `public/index.php`: Ponto único de entrada da API, configuração de cabeçalhos CORS e registro das 44 rotas da aplicação.
  * `controllers/`: `AuthController.php`, `DoadoresController.php`, `DesignersController.php`, `EmpresasController.php`, `LotesController.php`, `ProjetosController.php`, `EnderecosController.php`, `SchemaController.php`.
  * `models/`: `Auth.php`, `Enderecos.php`, `Doadores.php`, `Designers.php`, `Empresas.php`, `Lotes.php`, `Projetos.php`, `Schema.php`.

* **Front-End (`/frontend`)**
  * `js/shared/routes.js`: Centraliza todas as definições de verbo HTTP, template de URL, serialização de payload, ocultação de segredos em `window.__CONTINUUM_LAST_REQUEST__` e execução de `fetch` contra `http://localhost:8000/api` (ou `window.CONTINUUM_API_URL`).
  * `js/shared/api.js`: Interface consumida pelas páginas, delegando 100% das chamadas assíncronas para `requestRoute()` e mantendo os helpers síncronos de sessão e permissão (`getSessaoAtual`, `logout`, `podeExecutar`, `verificarPermissaoEmpresa`).
  * `js/shared/store.js`: Contém apenas constantes de status e persistência da sessão autenticada em `sessionStorage` (`continuum_sessao`).

---

## 2. Diagramas dos Fluxos do Sistema

### 2.1. Fluxo Completo da Cadeia Circular (Doação → Lote → Reserva → Upcycling → Tag QR Code)

```mermaid
sequenceDiagram
    autonumber
    actor Doador
    actor Empresa
    actor Designer
    actor Consumidor
    participant Front as "Front-End (api.js / routes.js)"
    participant API as "API PHP (/api/*)"
    participant DB as "Oracle DB (Schema DEV)"

    rect rgb(245, 242, 235)
        Note over Doador,DB: 1. Doação e Curadoria na Loja Parceira
        Doador->>Empresa: Entrega peças/retalhos na loja e informa CPF
        Empresa->>Front: Registra doação recebida
        Front->>API: POST /api/empresas/me/doacoes
        API->>DB: INSERT INTO DOACAO + UPDATE DOADOR (NR_DOACOES + 1)
        Doador->>Front: Acessa Painel do Doador
        Front->>API: GET /api/doadores/me/estatisticas
        API->>DB: SELECT DOADOR, DOACAO, DOADOR_DESCONTO, DESCONTO
    end

    rect rgb(238, 246, 238)
        Note over Empresa,DB: 2. Criação de Lote Têxtil e Briefing
        Empresa->>Front: Cria lote vinculando doações e valida senha Admin
        Front->>API: POST /api/empresas/sessao/validar-admin
        API->>DB: Verifica SENHA_HASH em USUARIO_EMPRESA
        Front->>API: POST /api/lotes
        API->>DB: INSERT INTO LOTES (STATUS=3) + UPDATE DOACAO (ST_CURADORIA='EM_LOTE')
    end

    rect rgb(235, 243, 250)
        Note over Designer,DB: 3. Vitrine, Reserva (M1 -> M2 -> M3) e Produção
        Designer->>Front: Explora vitrine de lotes disponíveis em SP
        Front->>API: GET /api/lotes/vitrine?uf=SP
        Designer->>Front: Aceita termo (M1), escolhe logística (M2) e reserva
        Front->>API: POST /api/lotes/{codigo}/reservas
        API->>DB: Valida Regra R1 (1 reserva ativa) -> UPDATE LOTES (STATUS=2) + INSERT RESERVA + INSERT RASTREAMENTO
        Designer->>Front: Confirma recebimento físico do material
        Front->>API: PATCH /api/lotes/{id}/recebimento
        API->>DB: UPDATE LOTES (STATUS=4) + INSERT PROJETOS + INSERT HISTORICO_PROJETOS (STATUS=3)
        Designer->>Front: Finaliza confecção da peça
        Front->>API: PATCH /api/projetos/{id}/finalizacao
        API->>DB: INSERT HISTORICO_PROJETOS (STATUS=5) + UPDATE LOTES (STATUS=5)
    end

    rect rgb(252, 240, 242)
        Note over Empresa,Consumidor: 4. Inspeção Física, Tag e Rastreabilidade Pública
        Empresa->>Front: Realiza checklist físico de 4 etapas e aprova peça
        Front->>API: PATCH /api/projetos/{id}/status
        Empresa->>Front: Gera e imprime Tag física com QR Code
        Front->>API: GET /api/projetos/{id}
        Consumidor->>Front: Escaneia QR Code (Página Pública da Peça)
        Front->>API: GET /api/projetos/{id}
    end
```

---

### 2.2. Máquina de Estados de Lotes e Projetos

```mermaid
stateDiagram-v2
    [*] --> AguardandoCuradoria: "POST /api/empresas/me/doacoes (DOACAO)"
    AguardandoCuradoria --> Disponivel: "POST /api/lotes (LOTES.STATUS_LOTE = 3)"
    Disponivel --> Reservado: "POST /api/lotes/{codigo}/reservas (STATUS_LOTE = 2)"
    Reservado --> EmProducao: "PATCH /api/lotes/{id}/recebimento (STATUS_LOTE = 4)"
    Reservado --> Interrompido: "POST /api/lotes/{id}/cancelamento (Pré-recebimento)"
    EmProducao --> Interrompido: "POST /api/lotes/{id}/cancelamento (Pós-recebimento + Restrição)"
    EmProducao --> Finalizado: "PATCH /api/projetos/{id}/finalizacao (STATUS_LOTE = 5)"
    Finalizado --> TagEmitida: "Inspeção Física 4/4 + Impressão de Tag QR"
    TagEmitida --> [*]
```

---

### 2.3. Fluxo de Cadastro, Endereçamento (FK Segura) e Autenticação

```mermaid
flowchart TD
    A["Formulário de Cadastro (Doador / Designer / Empresa)"] --> B["Consulta CEP: GET /api/enderecos/cep/{cep}"]
    B --> C{"CEP existe na tabela CEP do Oracle?"}
    C -- "Sim" --> D["Retorna Logradouro, Bairro, Cidade e UF do Oracle"]
    C -- "Não" --> E["Consulta ViaCEP / Fallback e persiste ESTADO -> CIDADE -> BAIRRO -> CEP"]
    D --> F["Envio do Cadastro (POST /doadores, /designers ou /empresas)"]
    E --> F
    F --> G{"Validação no Servidor (Auth.php)"}
    G -- "CPF/CNPJ inválido ou E-mail duplicado" --> H["HTTP 400 / 409 com mensagem de erro"]
    G -- "Dados válidos" --> I["Enderecos::garantirCep() + Hash de Senha (bcrypt) + INSERT no Oracle"]
    I --> J["Login: POST /api/auth/login"]
    J --> K["Valida perfil + verificarSenha() + Salva sessão em sessionStorage"]
```

---

## 3. Como Testar o Sistema

### 3.1. Subindo o Back-End (Docker)

```powershell
docker compose up -d
```

A API responderá em `http://localhost:8000/api`.

### 3.2. Servindo o Front-End

```powershell
cd frontend
python -m http.server 5500
```

Acesse `http://localhost:5500/lp.html` ou `http://localhost:5500/pages/auth/login/index.html`.

### 3.3. Contas de Teste no Banco Oracle (`DEV`)

| Perfil | Identificador (CPF / CNPJ / E-mail) | Senha | Nome no Banco Oracle |
| :--- | :--- | :--- | :--- |
| **Doador** | `11122233344` | `doador123` | Carlos Eduardo Silva (3 doações, 2 cupons) |
| **Doador** | `33344455566` | `pass789` | Roberto Alves (12 doações) |
| **Designer** | `12345678901` | `senha123` | Maria da Silva |
| **Designer** | `98765432100` | `pass456` | João Santos |
| **Empresa** | `12345678000190` ou `admin@loja.com` | `empresa123` | Têxtil Brasil (Assinatura Ativa) |
| **Empresa** | `98765432000110` | `empresa123` | Confecções Silva (Assinatura Ativa) |
