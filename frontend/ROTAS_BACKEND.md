# Contratos de API do CONTINUUM

## O que foi preparado

O arquivo js/shared/routes.js centraliza verbos HTTP, caminhos e JSONs de 
envio. js/shared/api.js mantém a interface já usada pelas páginas, mas
encaminha as operações pela camada de rotas.

- USem CONTINUM_API_URL, o adaptador local executa as operações sobre o store
  compartilhado e mantém a demonstração funcional.
- Com CONTINUUM_API_URL, as chamadas usam fetch real.
- O último método, URL e corpo ficam em window.**CONTINUUM_LAST_REQUEST** para
  inspeção durante a integração; campos de senha/CVV são ocultados nesse registro.

Defina a URL antes de carregar os módulos JavaScript:

```html
<script>
  window.CONTINUUM_API_URL = "http://localhost:3000/api";
</script>
<script type="module" src="caminho/da/pagina.js"></script>
```

O prefixo /api deve corresponder à configuração do servidor. As requisições
enviam Accept: application/json e, quando têm corpo, Content-Type:
application/json. Respostas podem ser o objeto diretamente ou dentro de
{ "data": ... }. Erros HTTP usam o campo message quando disponível; HTTP 204
retorna null.

## Rotas

Parâmetros entre chaves são substituídos por valores codificados na URL.
Requisições GET não enviam corpo.

| Método da API front-end                          | HTTP   | Caminho                           |
| ------------------------------------------------ | ------ | --------------------------------- |
| registrarDoador                                  | POST   | /doadores                         |
| atualizarPerfilDoador                            | PATCH  | /doadores/{cpf}                   |
| getPerfilDoador                                  | GET    | /doadores/me                      |
| registrarConfeccionista                          | POST   | /designers                        |
| atualizarPerfilConfeccionista                    | PATCH  | /designers/{id}                   |
| login                                            | POST   | /auth/login                       |
| redefinirSenha                                   | PATCH  | /auth/senha                       |
| finalizarProjetoDesigner                         | PATCH  | /projetos/{id}/finalizacao        |
| guardarEmpresaPendente                           | POST   | /empresas/rascunhos               |
| registrarEmpresaComAssinatura                    | POST   | /empresas                         |
| atualizarPerfilEmpresa                           | PATCH  | /empresas/{id}                    |
| listarLotesVitrineSP                             | GET    | /lotes/vitrine?uf=SP              |
| obterLotePorCodigo                               | GET    | /lotes/{codigo}                   |
| criarLote                                        | POST   | /lotes                            |
| atualizarLote                                    | PATCH  | /lotes/{id}                       |
| excluirLote                                      | DELETE | /lotes/{id}                       |
| validarSenhaAdmin                                | POST   | /empresas/sessao/validar-admin    |
| reservarLote                                     | POST   | /lotes/{codigo}/reservas          |
| listarMeusLotesDesigner                          | GET    | /designers/{id}/lotes             |
| listarLotesEmpresa                               | GET    | /empresas/{id}/lotes              |
| confirmarRecebimentoDesigner                     | PATCH  | /lotes/{id}/recebimento           |
| listarProjetosEmpresa                            | GET    | /empresas/projetos                |
| alterarStatusProjeto                             | PATCH  | /projetos/{id}/status             |
| buscarCep                                        | GET    | /enderecos/cep/{cep}              |
| consultarCNPJ                                    | GET    | /empresas/consulta-cnpj/{cnpj}    |
| getMeusProjetos                                  | GET    | /designers/{id}/projetos          |
| getProjeto                                       | GET    | /projetos/{id}                    |
| getDashboardStats                                | GET    | /designers/{id}/dashboard         |
| getEmpresa                                       | GET    | /empresas/me                      |
| getDoadorStats                                   | GET    | /doadores/me/estatisticas         |
| listarEmpresas                                   | GET    | /empresas                         |
| getDesigner                                      | GET    | /designers/me                     |
| alternarFavorito                                 | PUT    | /designers/me/favoritos/{loteId}  |
| getEmpresaDashboardStats                         | GET    | /empresas/me/dashboard            |
| listarUsuariosEmpresa                            | GET    | /empresas/me/usuarios             |
| salvarUsuarioEmpresa                             | POST   | /empresas/me/usuarios             |
| alternarAtivoUsuario                             | PATCH  | /empresas/me/usuarios/{id}/status |
| atualizarUsuarioEmpresa                          | PATCH  | /empresas/me/usuarios/{id}        |

logout, getSessaoAtual, podeExecutar e verificarPermissaoEmpresa são operações
síncronas locais e não enviam HTTP.

## JSONs de referência para envio

Os exemplos mostram a estrutura esperada. Campos não preenchidos podem ser
omitidos.

### POST /doadores

```json
{
  "nome": "Maria Silva",
  "cpf": "52998224725",
  "email": "maria@example.com",
  "telefone": "11987654321",
  "cep": "01310930",
  "uf": "SP",
  "cidade": "São Paulo",
  "bairro": "Bela Vista",
  "logradouro": "Avenida Paulista",
  "numero": "1000",
  "complemento": "Sala 2",
  "faixaEtaria": "35-44",
  "comoConheceu": "Redes sociais",
  "senha": "senha digitada no formulário"
}
```

### POST /designers

```json
{
  "tipoPessoa": "PF",
  "documento": "52998224725",
  "nomeProfissional": "Ana Souza",
  "nome": "Ana Souza",
  "email": "ana@example.com",
  "telefone": "11987654321",
  "cep": "01310930",
  "logradouro": "Avenida Paulista",
  "numero": "1000",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "uf": "SP",
  "senha": "senha digitada no formulário",
  "maioridadeConfirmada": true,
  "consentimentoPerfilPublico": false,
  "consentimentoUsoImagem": false,
  "especialidades": [],
  "faixaExperiencia": "",
  "portfolio": ""
}
```

Para pessoa jurídica, tipoPessoa é PJ, documento tem CNPJ sem máscara e
razaoSocial é obrigatório. A máscara é somente de apresentação; o servidor
deve validar novamente CPF/CNPJ, maioridade e consentimentos.

### POST /empresas/rascunhos

```json
{
  "empresa": {
    "cnpj": "12345678000195",
    "razaoSocial": "Confecções Exemplo Ltda.",
    "nomeFantasia": "Loja Exemplo",
    "cep": "01310930",
    "logradouro": "Avenida Paulista",
    "numero": "1000",
    "bairro": "Bela Vista",
    "cidade": "São Paulo",
    "uf": "SP",
    "aceitaRetirada": true
  },
  "administrador": {
    "nome": "João Silva",
    "email": "joao@loja.example",
    "telefone": "11987654321",
    "senha": "senha digitada no formulário"
  }
}
```

### POST /empresas

```json
{
  "empresa": {
    "cnpj": "12345678000195",
    "razaoSocial": "Confecções Exemplo Ltda.",
    "nomeFantasia": "Loja Exemplo",
    "cep": "01310930",
    "uf": "SP"
  },
  "administrador": {
    "nome": "João Silva",
    "email": "joao@loja.example",
    "telefone": "11987654321",
    "senha": "senha digitada no formulário"
  },
  "pagamento": {
    "bandeiraCartao": "VISA",
    "ultimos4Digitos": "4242"
  }
}
```

Número completo, validade e CVV do cartão não são enviados por essa rota.
Integre um provedor de pagamento no backend.

### Login e redefinição de senha

POST /auth/login:

```json
{ "perfil": "designer", "identificador": "52998224725", "senha": "senha" }
```

PATCH /auth/senha:

```json
{
  "identificador": "maria@example.com",
  "novaSenha": "nova senha",
  "confirmacaoSenha": "nova senha"
}
```

### Lotes

POST /lotes:

```json
{
  "empresaId": "EMP-123",
  "titulo": "Novo lote têxtil",
  "descricao": "Retalhos de algodão",
  "pesoKg": 12.5,
  "quantidadePecas": 0,
  "briefing": {
    "ideiaMarca": "",
    "expectativa": "",
    "liberdadeCriativa": "",
    "prazoProducaoDias": 30
  }
}
```

PATCH /lotes/{id} recebe apenas campos alterados, por exemplo:
{ "descricao": "Retalhos separados por cor" }. Reserva:

```json
{ "codigo": "LOT-2026-001", "designerId": "DSG-123", "tipoLogistica": "ENVIO" }
```

### Outras mutações

- PATCH /doadores/{cpf}, /designers/{id}, /empresas/{id}: campos atualizados e
  identificador correspondente.
- PATCH /projetos/{id}/status: { "id": "PRJ-123", "status": "EM PRODUÇÃO" }.
- PATCH /projetos/{id}/finalizacao: { "id": "PRJ-123" }.
- PATCH /lotes/{id}/recebimento: { "id": "LT-123" }.
- POST /empresas/sessao/validar-admin: { "senha": "senha digitada" }.
- POST /empresas/me/usuarios: dados do novo usuário, perfil, e-mail e senha.
- PATCH /empresas/me/usuarios/{id}: campos alterados.
- PATCH /empresas/me/usuarios/{id}/status: { "id": "UE-123", "ativo": false }.
- PUT /designers/me/favoritos/{loteId}: { "loteId": "LT-123" }.

## Formato de resposta e implantação

Listagens respondem arrays JSON; detalhes e mutações retornam o registro
criado/atualizado; login retorna a sessão; estatísticas retornam os campos
consumidos pelas páginas. Validações podem responder { "valido": true }.
Remoções podem retornar HTTP 204. Use status HTTP apropriados e, nos erros,
JSON como { "message": "descrição para o usuário" }.

1. Implemente cada caminho da tabela e valide os dados também no servidor.
2. Defina window.CONTINUUM_API_URL antes dos scripts ES modules.
3. Faça os retornos seguirem os formatos acima e habilite CORS caso front e API
   estejam em origens diferentes.
4. A camada central requestRoute() é o ponto para adicionar token ou credenciais
   quando o mecanismo de autenticação do backend estiver definido.
5. Remova CONTINUUM_API_URL para retornar ao adaptador de demonstração local.

O backend deve hashear senhas, autorizar operações e jamais persistir dados
completos de cartão. O store do navegador é somente para demonstração.
