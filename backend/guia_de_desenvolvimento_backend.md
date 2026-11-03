# Guia de Desenvolvimento Back-End (PHP Puro + Oracle Cloud) — CONTINUUM

> **Instrução Primária:** Este documento define a arquitetura, os padrões de código, a modelagem de banco de dados baseada em `backend/Querys - Continuum.md`, o fluxo de autenticação simples e o passo a passo de infraestrutura na **Oracle Cloud Infrastructure (OCI) Free Tier** para a API do sistema **CONTINUUM** utilizando **exclusivamente PHP puro (sem frameworks)**.

---

## 1. GUARD-RAILS TÉCNICOS & ARQUITETURA

### 1.1 Tecnologias e Restrições
* **Linguagem:** PHP 8.2+ puro (Vanilla PHP), com tipagem estrita (`declare(strict_types=1);`).
* **PROIBIDO** o uso de frameworks (Laravel, Symfony, Slim, Lumen, CakePHP, etc.) ou ORMs (Doctrine, Eloquent).
* **Banco de Dados:** Acesso via extensão nativa **PDO (`PHP Data Objects`)** com *Prepared Statements* obrigatórios para evitar SQL Injection. O banco é hospedado no Oracle Cloud Free Tier seguindo a modelagem DDL de `backend/Querys - Continuum.md`.
* **Formato de Comunicação:** API RESTful trafegando dados em **JSON (`application/json; charset=utf-8`)**.
* **Autenticação Simples (Sem JWT):** 
  - Não utilizaremos JWT nem tokens complexos.
  - A rota de login recebe as credenciais (`login`/documento/email, `senha` e `perfil`).
  - O backend pesquisa na tabela correspondente ao perfil (`Doador`, `CONFECCIONISTA` ou `Empresa`) e valida a senha diretamente no banco (verificando a senha cadastrada com `password_verify` caso use hash ou comparação direta de acordo com a política de dados da base).
  - Retorna os dados do usuário autenticado e status de sucesso para o front-end armazenar em `sessionStorage` (`continuum_sessao`), exatamente como o front já espera.
* **Segurança de Rede:** O banco de dados fica restrito à rede interna da VM / VCN privada (porta não exposta publicamente). Apenas a porta HTTP/HTTPS da API será pública.

---

## 2. ESTRUTURA DE PASTAS DO BACK-END (`/backend`)

```text
backend/
├── guia_de_desenvolvimento_backend.md  # Este guia de arquitetura e deploy
├── Querys - Continuum.md               # Script DDL oficial das tabelas
├── .env.example                        # Exemplo de variáveis de ambiente
├── .env                                # Credenciais da Oracle Cloud (fora do Git)
├── public/
│   └── index.php                       # Ponto de entrada único da API (Front Controller)
└── src/
    ├── Config/
    │   ├── Database.php                # Conexão PDO (Singleton) com o banco Oracle/MySQL na OCI
    │   └── Cors.php                    # Headers CORS para permitir requisições do front-end
    ├── Http/
    │   ├── Request.php                 # Leitura simplificada de método, URI e JSON body
    │   ├── Response.php                # Helpers para retorno de JSON e HTTP status codes
    │   └── Router.php                  # Roteador simples por método e endpoint
    ├── Repositories/
    │   ├── DoadorRepository.php        # Queries PDO na tabela Doador, CEP, Desconto
    │   ├── ConfeccionistaRepository.php# Queries PDO na tabela CONFECCIONISTA
    │   ├── EmpresaRepository.php       # Queries PDO na tabela Empresa
    │   ├── LoteRepository.php          # Queries PDO na tabela Lotes e Status_Lote
    │   └── ProjetoRepository.php       # Queries PDO nas tabelas Projetos, Rastreamento e Historico_Projetos
    └── Controllers/
        ├── AuthController.php          # POST /api/auth/login (Validação simples por tabela/perfil)
        ├── DoadorController.php        # Operações do doador e descontos
        ├── ConfeccionistaController.php# Operações de lotes e projetos para o designer
        └── EmpresaController.php       # Operações de lotes, inspeção e projetos para empresa
```

---

## 3. PADRÃO DE RESPOSTAS JSON

As respostas da API seguirão formato simples e consistente:

### Sucesso (`200 OK`, `201 Created`)
```json
{
  "sucesso": true,
  "mensagem": "Autenticado com sucesso.",
  "dados": {
    "id": "12345678900",
    "login": "doador",
    "nome": "Juliana Silva",
    "perfil": "doador"
  }
}
```

### Erro (`400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Error`)
```json
{
  "sucesso": false,
  "mensagem": "Usuário ou senha inválidos."
}
```

---

## 4. SCHEMA OFICIAL DO BANCO DE DADOS (Baseado em `Querys - Continuum.md`)

O modelo relacional do projeto é composto pelas seguintes tabelas:

1. **`Doador`**
   - `CPF VARCHAR2 PRIMARY KEY`
   - `NM_DOADOR VARCHAR2`
   - `CEP VARCHAR2` (FK -> `CEP.CEP`)
   - `NR_ENDERECO VARCHAR2`
   - `COMPLEMENTO VARCHAR2`
   - `DT_ACEITE_TERMOS TIMESTAMP`
   - `EMAIL_DOADOR VARCHAR2(150) UNIQUE`
   - `SENHA_DOADOR VARCHAR2`
   - `TELEFONE VARCHAR2`

2. **`Empresa`**
   - `CNPJ VARCHAR2 PRIMARY KEY` (ou `CNPJ_EMPRESA`)
   - `ID_EMPRESA NUMERIC`
   - `NM_FANTASIA VARCHAR2`
   - `RAZÃO_SOCIAL VARCHAR2`
   - `EMAIL_EMPRESA VARCHAR2`
   - `SENHA_EMPRESA VARCHAR2`
   - `SITUACAO_CADASTRAL NUMERIC`
   - `NR_ENDERECO VARCHAR2`
   - `CEP VARCHAR2` (FK -> `CEP.CEP`)
   - `TEL_EMPRESA NUMERIC`
   - `SOBRE_EMPRESA VARCHAR2`
   - `HR_RETIRADA TIMESTAMP`
   - `LOGISTICAS_ACEITAS VARCHAR2`
   - `FRETE NUMERIC`

3. **`CONFECCIONISTA`** (Perfil Designer)
   - `ID_CONFECCIONISTA NUMERIC PRIMARY KEY`
   - `NM_CONFECCIONISTA VARCHAR2`
   - `TP_PESSOA VARCHAR2(4)` (PF ou PJ)
   - `NR_DOCUMENTO VARCHAR2(25) UNIQUE` (CPF ou CNPJ)
   - `EMAIL_CONFECCIONISTA VARCHAR2(150) UNIQUE`
   - `TEL_CONFECCIONISTA NUMERIC UNIQUE`
   - `SENHA_CONFECCIONISTA VARCHAR2`
   - `CEP VARCHAR2` (FK -> `CEP.CEP`)
   - `NR_ENDERECO VARCHAR2`
   - `VITRINE VARCHAR2`

4. **Localização / Endereçamento (`Estado`, `Cidade`, `Bairro`, `CEP`)**
   - `Estado`: `ID_ESTADO NUMERIC PRIMARY KEY`, `NM_ESTADO`, `SG_ESTADO`
   - `Cidade`: `ID_CIDADE NUMERIC PRIMARY KEY`, `NM_CIDADE`, `ID_ESTADO` (FK)
   - `Bairro`: `ID_BAIRRO NUMERIC PRIMARY KEY`, `NM_BAIRRO`, `CD_CIDADE` (FK)
   - `CEP`: `CEP VARCHAR2 PRIMARY KEY`, `LOGRADOURO`, `ID_BAIRRO` (FK)

5. **`Status_Lote` e `Lotes`**
   - `Status_Lote`: `ID_STATUS_LOTE NUMERIC PRIMARY KEY`, `DS_STATUS_LOTE VARCHAR2`
   - `Lotes`:
     - `ID_LOTE NUMERIC PRIMARY KEY`
     - `CD_LOTE NUMERIC`
     - `ID_STATUS_LOTE NUMERIC` (FK -> `Status_Lote`)
     - `ID_EMPRESA NUMERIC` / `CNPJ_EMPRESA` (FK -> `Empresa`)
     - `DS_ITENS VARCHAR2`
     - `PESO_LOTE DOUBLE`
     - `CD_CORREIOS VARCHAR2`

6. **`Status_Projeto` e `Projetos`**
   - `Status_Projeto`: `ID_STATUS NUMERIC PRIMARY KEY`, `DS_STATUS_PROJETO VARCHAR2`
   - `Projetos`:
     - `ID_PROJETO NUMERIC PRIMARY KEY`
     - `ID_EMPRESA NUMERIC`
     - `ID_LOTE NUMERIC` / `CD_LOTE` (FK -> `Lotes`)
     - `ID_STATUS` / `STATUS_PROJETO NUMERIC` (FK -> `Status_Projeto`)
     - `DATA_PROJETO TIMESTAMP`
     - `DS_PROCESSO_CRIATIVO VARCHAR2`

7. **`Rastreamento` e `Historico_Projetos`**
   - `Rastreamento`: `ID_RASTREAMENTO VARCHAR2 PRIMARY KEY`, `CNPJ_EMPRESA`, `ID_STATUS_LOTE`, `DESC VARCHAR2`, `DATA_HORA TIMESTAMP`, `ID_LOTE`
   - `Historico_Projetos`: `ID_HISTORICO_PROJETO NUMERIC PRIMARY KEY`, `ID_PROJETO`, `ID_STATUS`

8. **`Desconto`, `Doador_Empresa`, `Doador_Desconto` e `Imagens`**
   - `Desconto`: `ID_Desconto NUMERIC PRIMARY KEY`, `CPF_DOADOR`, `CD_DESCONTO`, `PORCENTAGEM DOUBLE`, `VALIDADE_CUPOM TIMESTAMP`
   - `Doador_Empresa`: `ID_DOADOR_EMP NUMERIC PRIMARY KEY`, `CPF`, `CNPJ_EMPRESA`
   - `Doador_Desconto`: `ID_DESCONTO NUMERIC PRIMARY KEY`, `CPF` (FK Doador), `ID_DESCONTO` (FK Desconto)
   - `Imagens`: `ID_IMG NUMERIC PRIMARY KEY`, `NM_ARQUIVO VARCHAR2(255)`, `TIPO_IMG VARCHAR2(100)`, `IMG BLOB`

---

## 5. ROTA INICIAL DE LOGIN (`POST /api/auth/login`)

### Como funcionará o Login simples:
1. O Front-End envia via `POST`:
   ```json
   {
     "perfil": "doador",
     "login": "12345678900",
     "senha": "senhaDoador123"
   }
   ```
2. O `AuthController`:
   - Se `perfil === 'doador'`:
     - Executa query em `Doador` por `CPF = :login` ou `EMAIL_DOADOR = :login`.
     - Confere `SENHA_DOADOR`.
   - Se `perfil === 'designer'`:
     - Executa query em `CONFECCIONISTA` por `NR_DOCUMENTO = :login` ou `EMAIL_CONFECCIONISTA = :login`.
     - Confere `SENHA_CONFECCIONISTA`.
   - Se `perfil === 'empresa'`:
     - Executa query em `Empresa` por `CNPJ = :login` ou `EMAIL_EMPRESA = :login` ou `ID_EMPRESA = :login`.
     - Confere `SENHA_EMPRESA`.
3. Se a senha conferir, retorna HTTP 200 com os dados do usuário (`id`, `nome`, `perfil`). Se incorreta ou não encontrado, retorna HTTP 401 com mensagem de erro.
4. O Front-End recebe o JSON e salva na sessão (`sessionStorage.setItem("continuum_sessao", ...)`), redirecionando para o painel correspondente.

---

## 6. TOPOLOGIA DE REDE NA ORACLE CLOUD (OCI FREE TIER)

1. **Porta Interna do Banco de Dados (Fechada para a Internet):**
   - O banco de dados (Oracle DB ou MySQL com o schema DDL) roda escutando apenas em `127.0.0.1` ou no IP Privado da VCN (`10.0.x.x`).
   - A Security List da Oracle Cloud **NÃO** terá regra de Ingress pública para a porta do banco.
2. **Porta Pública da API (Aberta para o Front-End / Web):**
   - Porta `80` (HTTP), `443` (HTTPS) ou porta alternativa como `8080`.
   - Liberada na Security List da VCN (`0.0.0.0/0` -> porta da API).
   - Liberada no firewall do SO da VM da Oracle Cloud (`iptables` / `ufw`).
