# Instruções para a IA: integrar o front-end à API PHP

## Objetivo

Conectar as páginas do CONTINUUM às rotas implementadas no backend PHP. Use
este documento como plano de trabalho e use ROTAS_BACKEND.md como contrato de
referência dos caminhos, métodos, payloads e respostas.

O front-end já possui uma camada central em js/shared/routes.js. A interface
de métodos chamada pelas páginas está em js/shared/api.js; atualmente ela usa
o store local quando CONTINUUM_API_URL não está configurada.

## Arquivos que devem ser lidos antes de alterar

1. ROTAS_BACKEND.md — contrato atual da API e exemplos de JSON.
2. js/shared/routes.js — mapeamento de método, caminho e serializer do corpo.
3. js/shared/api.js — operações de demonstração e formatos que as páginas
   consomem.
4. js/shared/store.js — estrutura de dados local usada na demonstração.
5. Formulários que iniciam chamadas, especialmente:
   - pages/auth/login/login.js
   - pages/auth/cadastro/designer/cadastro-pessoa.js
   - pages/auth/cadastro/doador/cadastro-formulario.js
   - pages/empresa/jornada/jornada.js
   - pages/empresa/lotes/index.js
6. README, configuração, roteador e convenções do projeto PHP, caso estejam
   disponíveis no workspace do backend.

## Procedimento de integração

### 1. Localize a API PHP e suas convenções

Inspecione o backend antes de criar arquivos. Identifique versão do PHP,
framework, roteador, configuração de ambiente, conexão com banco, formato de
resposta e tratamento de autenticação. Respeite a estrutura e convenções
existentes; não crie um segundo roteador ou outra conexão com o banco sem
necessidade.

Se o backend não estiver acessível no workspace, prepare apenas os ajustes do
front-end que forem independentes disso e informe claramente quais rotas PHP
precisam ser implementadas. Não invente schemas de banco, nomes de tabelas ou
regras de negócio que não estejam definidos.

### 2. Configure a URL central da API

Defina window.CONTINUUM_API_URL antes de qualquer módulo ES carregado pelas
páginas. Exemplo local:

~~~html
<script>
  window.CONTINUUM_API_URL = "http://localhost:8000/api";
</script>
<script type="module" src="caminho/da/pagina.js"></script>
~~~

Use a configuração apropriada para cada ambiente e não grave segredos no
front-end. Se houver um mecanismo de configuração compartilhado já adotado
pelo projeto, prefira-o. Não espalhe URLs de endpoint nos arquivos de página:
js/shared/routes.js deve permanecer como ponto central dos caminhos.

### 3. Implemente os contratos PHP

Implemente cada rota listada em ROTAS_BACKEND.md com o método HTTP e estrutura
JSON documentados. Trate identificadores de caminho como valores não
confiáveis, valide os campos no servidor e responda com JSON consistente:

- Listagens: array JSON.
- Busca de um recurso: registro JSON ou 404.
- Criação: registro criado, preferencialmente com HTTP 201.
- Atualização: registro atualizado.
- Exclusão: HTTP 204 ou JSON de confirmação.
- Falha: status HTTP apropriado e JSON com message legível.

As páginas consomem os dados já normalizados pelo adaptador demonstrativo.
Compare o shape esperado nas funções correspondentes de js/shared/api.js. Se
os nomes do backend forem diferentes, normalize a resposta em um único ponto
da camada de API, sem espalhar traduções pelas páginas.

### 4. Complete autenticação e sessão com segurança

Escolha um mecanismo de autenticação compatível com a arquitetura e conecte-o
centralmente em requestRoute() dentro de js/shared/routes.js. Para sessão por
cookie, use cookie HttpOnly, Secure em produção e SameSite apropriado; inclua
credentials: "include" no fetch e configure CORS para aceitar credenciais. Para
Bearer token, guarde-o de acordo com a política de segurança do projeto e
adicione Authorization no ponto central. Não duplique lógica de sessão em
cada página.

O contrato atual de redefinir senha envia identificador, novaSenha e
confirmacaoSenha juntos. Não implemente uma redefinição de produção que permita
trocar a senha usando apenas CPF, CNPJ ou e-mail. Use fluxo seguro de solicitação
de código/token, verificação do token e troca de senha; ajuste login.js,
routes.js e ROTAS_BACKEND.md para esse fluxo se ele ainda não existir no backend.
Não revele se determinado e-mail/documento está cadastrado ao solicitar
recuperação.

A rota validarSenhaAdmin só pode confirmar credenciais verificadas no servidor.
Não autorize operações administrativas com base apenas na resposta do
JavaScript ou em uma senha comparada localmente.

### 5. Proteja dados e operações

- Faça hash de senha no backend com algoritmo apropriado do runtime PHP. O
  campo senha enviado pelo front-end é texto de entrada, não hash confiável.
- Nunca registre senhas, tokens, CVV ou números completos de cartão em logs.
- O fluxo demonstrativo de pagamento envia somente bandeira e últimos quatro
  dígitos. Não aceite esses campos como prova de pagamento; integre um provedor
  de pagamento no servidor.
- Revalide CPF/CNPJ, permissões, estado do lote/projeto, consentimentos,
  duplicidade de cadastro e regras de assinatura no servidor.
- Aplique autorização por usuário e empresa em todas as rotas privadas. Não
  confie em empresaId, perfil ou IDs enviados pelo navegador sem conferir a
  sessão autenticada.
- Use HTTPS fora do ambiente local e mantenha credenciais de banco somente no
  backend.

### 6. Preserve o modo demonstrativo sem mascarar falhas do servidor

Sem CONTINUUM_API_URL, requestRoute() chama a implementação local de api.js e
os dados continuam sendo compartilhados pelo store. Com a URL configurada, a
chamada deve ir ao servidor. Falhas HTTP ou de rede devem chegar à interface
como erros visíveis; não as transforme silenciosamente em sucesso local.

Depois de integrar uma operação, confira que o serializer dessa operação em
routes.js envia os campos do contrato e que a resposta do backend chega à
página no formato esperado. As credenciais são ocultadas em
window.__CONTINUUM_LAST_REQUEST__, mas o corpo real da requisição continua
contendo os dados que o endpoint precisa receber.

## Checklist de conclusão

- [ ] Todos os caminhos de ROTAS_BACKEND.md existem no backend e usam o verbo
      correto.
- [ ] URLs de caminho e query strings foram verificadas com valores reais.
- [ ] JSONs de cadastro, perfil, lote, reserva, projeto e usuários foram
      comparados com os serializers de routes.js.
- [ ] Respostas, status de erro e mensagens seguem o contrato consumido pelo
      front-end.
- [ ] CORS, sessão/token e autorização foram configurados de forma coerente.
- [ ] Redefinição de senha usa token/código validado pelo servidor.
- [ ] Senhas são hasheadas e dados de cartão não são armazenados pelo CONTINUUM.
- [ ] O backend foi exercitado no ambiente local e o fluxo correspondente foi
      conferido na página.
- [ ] A documentação foi atualizada para refletir divergências necessárias
      entre o contrato previsto e a implementação final.

## Relato esperado ao terminar

Ao concluir, informe:

1. Rotas implementadas e arquivos alterados em cada repositório.
2. Como configurar a URL da API e a autenticação no ambiente local.
3. Quais operações foram exercitadas e os resultados observados.
4. Pendências que dependem de configuração externa, como domínio, CORS,
   provedor de e-mail ou provedor de pagamento.
