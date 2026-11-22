# Roteiro de testes do Back-end (cards BE-00 a BE-22)

Origem: quadro Trello "PI" (CONTINUUM), cards com etiqueta Back-end e título "BE-xx".
Documentação de referência: "CONTINUUM - Documentação consolidada e backlog de tasks (13/10/2026)" e "Documentação Técnica v3 (20/10/2026), seção 11".

## Instruções para o agente de teste

Você é um agente de QA. Execute os testes abaixo contra o back-end do projeto, na ordem das ondas (0 a 5), porque as features dependem umas das outras.

Regras:
1. Execute cada teste de verdade (chamadas HTTP, consultas ao banco, execução do job, comandos git). Não presuma resultado.
2. Para cada teste, registre: status (PASS, FAIL ou BLOCKED), evidência (requisição e resposta, query e resultado, saída de comando) e, se falhou, o comportamento observado versus o esperado.
3. Se um teste depende de um card que falhou, marque BLOCKED e diga qual dependência falhou.
4. Quando o resultado esperado depender de uma regra ou fórmula que não está neste arquivo (AN-02, AN-04, AN-05, AN-06, AN-15, AN-17, AN-18), consulte a documentação técnica. Se não conseguir, marque o teste como NEEDS-INFO e descreva o que faltou. Não invente a regra.
5. Não altere o código. Apenas teste e reporte.
6. Ao final, gere o relatório no formato descrito na seção "Formato do relatório".

## Pré-requisitos (massa de dados)

Crie antes de começar:
- Empresa A com endereço em SP, ativa. Empresa B com endereço fora de SP, ativa. Empresa C com endereço em SP, inativa.
- Na Empresa A: 1 usuário ADMIN e 1 usuário OPERADOR.
- Designer 1 (confeccionista) com CEP em SP. Designer 2 com CEP fora de SP.
- Doador 1 com conta. Doador 2 apenas como CPF sem conta.
- Um CEP que ainda não exista no banco, para o teste do ViaCEP.

---

## ONDA 0

### BE-00 · Revogar a chave SSH exposta no repositório (P0)
Critérios do card: chave antiga revogada; histórico sem o arquivo.

- BE-00.1 Rode `git log --all -- <caminho da chave>` e procure o commit a0d4edf. Esperado: o arquivo da chave não aparece em nenhum commit do histórico.
- BE-00.2 Procure a chave no histórico com `git log -p --all -S "BEGIN OPENSSH PRIVATE KEY"`. Esperado: nenhum resultado.
- BE-00.3 Confira o `.gitignore`. Esperado: tem padrões de chave (por exemplo `*.pem`, `id_rsa*`, `*.key`).
- BE-00.4 Se possível, tente usar a chave antiga no serviço onde estava cadastrada. Esperado: acesso negado. Se não houver como testar, marque NEEDS-INFO.

---

## ONDA 1 · Fundação

### BE-01 · Autenticação por perfil e proteção de rotas
Critérios do card: credenciais de empresa na aba Doador são recusadas; doador não acessa endpoints da empresa.

- BE-01.1 Login do doador por CPF. Esperado: sucesso, com sessão/token.
- BE-01.2 Login do doador por e-mail. Esperado: sucesso.
- BE-01.3 Login do confeccionista por CPF e por CNPJ. Esperado: ambos funcionam.
- BE-01.4 Login da empresa por CNPJ. Esperado: sucesso.
- BE-01.5 Login com credenciais de empresa na aba/perfil Doador. Esperado: recusado.
- BE-01.6 Repita 01.5 trocando as combinações (doador na aba Empresa, confeccionista na aba Doador etc.). Esperado: todas recusadas.
- BE-01.7 Com token de doador, chame um endpoint exclusivo da empresa. Esperado: 401 ou 403.
- BE-01.8 Com o token do usuário A, solicite um dado que pertence ao usuário B. Esperado: bloqueado (403 ou 404).
- BE-01.9 Chame uma rota protegida sem token. Esperado: 401.
- BE-01.10 Consulte a tabela de usuários. Esperado: senha armazenada com hash, nunca em texto puro.

### BE-02 · Cadastros de doador e confeccionista
Critérios do card: conta criada consegue logar; CEP novo é cadastrado automaticamente.

- BE-02.1 Cadastre com CPF de dígito verificador inválido. Esperado: recusado.
- BE-02.2 Cadastre com CNPJ de dígito verificador inválido (confeccionista). Esperado: recusado.
- BE-02.3 Cadastre com e-mail já existente. Esperado: recusado.
- BE-02.4 Cadastre com documento já existente. Esperado: recusado.
- BE-02.5 Cadastre sem aceitar os termos. Esperado: recusado.
- BE-02.6 Cadastre com um CEP inexistente no banco. Esperado: o sistema consulta o CEP (ViaCEP), grava CEP, bairro e cidade antes do usuário, e cria a conta sem erro de chave estrangeira.
- BE-02.7 Faça login com a conta criada. Esperado: loga.

### BE-03 · Serviço único de transição de status
Critérios do card: transição inválida retorna erro; cada transição gera linha no histórico.
Obs.: a tabela de transições está no guia (AN-03, AN-05). Use-a como referência.

- BE-03.1 Tente uma transição inválida (exemplo: DISPONÍVEL direto para FINALIZADO). Esperado: erro.
- BE-03.2 Tente uma transição válida com um ator que não pode executá-la. Esperado: erro.
- BE-03.3 Tente alterar o status direto por qualquer endpoint de edição (PUT/PATCH do lote ou projeto). Esperado: bloqueado ou status ignorado.
- BE-03.4 Execute uma transição válida pelo ator correto. Esperado: status muda e surge uma linha nova no histórico (RASTREAMENTO) com data e autor.

### BE-04 · Perfis (doador, confeccionista, empresa)
Critério do card: dados editados aparecem nas telas que os usam.

- BE-04.1 Leia e edite os dados do perfil do doador. Esperado: persiste.
- BE-04.2 Leia e edite os dados do perfil do confeccionista. Esperado: persiste.
- BE-04.3 Leia e edite os dados da empresa, incluindo sobre, horário, logística e frete. Esperado: persiste.
- BE-04.4 Consulte os endpoints que usam esses dados (vitrine, detalhe do lote). Esperado: retornam os valores editados.
- BE-04.5 Tente editar o perfil de outro usuário. Esperado: bloqueado.

### BE-18 · Autenticação e permissões dos usuários da empresa
Critérios do card: endpoint restrito a admin retorna erro para operador; usuário inativo não consegue entrar.

- BE-18.1 Login por e-mail como ADMIN. Esperado: sessão com perfil ADMIN.
- BE-18.2 Login por e-mail como OPERADOR. Esperado: sessão com perfil OPERADOR.
- BE-18.3 Com OPERADOR, chame um endpoint restrito a admin. Esperado: erro de permissão (403).
- BE-18.4 Com ADMIN, chame o mesmo endpoint. Esperado: sucesso.
- BE-18.5 Inative um usuário e tente logar com ele. Esperado: não entra.
- BE-18.6 Tente inativar ou remover o único admin ativo da empresa. Esperado: bloqueado.

---

## ONDA 2 · Ciclo do lote

### BE-05 · Cartilha padrão
Critério do card: nova versão não altera lotes já publicados.

- BE-05.1 Crie a cartilha da empresa e consulte. Esperado: retorna a versão vigente.
- BE-05.2 Publique um lote, depois crie uma nova versão da cartilha. Esperado: o lote publicado continua apontando para a versão antiga.
- BE-05.3 Crie um lote novo. Esperado: herda a nova versão.

### BE-06 · Lotes da empresa
Critérios do card: lote cadastrado aparece na vitrine; lote reservado não pode ser excluído.

- BE-06.1 Cadastre um lote com todos os campos e o briefing. Esperado: criado com código único.
- BE-06.2 Cadastre um segundo lote. Esperado: código diferente do primeiro.
- BE-06.3 Edite um lote DISPONÍVEL. Esperado: permitido.
- BE-06.4 Edite um lote RESERVADO. Esperado: bloqueado.
- BE-06.5 Exclua um lote DISPONÍVEL. Esperado: permitido.
- BE-06.6 Exclua um lote RESERVADO. Esperado: bloqueado.
- BE-06.7 Cancele um lote com motivo. Esperado: cancela. Sem motivo (se exigido por AN-05), esperado: recusa.
- BE-06.8 Liste os lotes da empresa. Esperado: mostra confeccionista, modalidade e data-limite das reservas.
- BE-06.9 Abra a vitrine. Esperado: o lote cadastrado aparece.

### BE-07 · Vitrine do confeccionista
Critério do card: filtro por empresa retorna só os lotes dela.

- BE-07.1 Filtre por empresa. Esperado: apenas lotes dessa empresa.
- BE-07.2 Filtre por material. Esperado: apenas lotes com esse material.
- BE-07.3 Filtre por logística. Esperado: apenas lotes com essa logística.
- BE-07.4 Abra o detalhe de um lote. Esperado: mostra briefing, cartilha e dados da loja.
- BE-07.5 (P2) Favorite um lote e liste os favoritos. Esperado: fica salvo.

### BE-21 · Vitrine só com lojas de SP e envio só para SP
Critérios do card: empresa fora de SP não aparece na vitrine; designer com CEP fora de SP não vê a opção de envio.

- BE-21.1 Abra a vitrine com a Empresa B (fora de SP) ativa. Esperado: seus lotes não aparecem.
- BE-21.2 Verifique a Empresa C (SP, inativa). Esperado: seus lotes não aparecem.
- BE-21.3 Verifique a Empresa A (SP, ativa). Esperado: seus lotes aparecem.
- BE-21.4 Cadastre o Designer 2 (fora de SP) e reserve um lote da Empresa A. Esperado: consegue reservar.
- BE-21.5 Com o Designer 2, consulte as opções de entrega. Esperado: apenas retirada, sem envio.
- BE-21.6 Com o Designer 1 (SP), consulte as opções de entrega. Esperado: envio e retirada.
- BE-21.7 Tente forçar o envio para o Designer 2 direto pela API. Esperado: recusado.
- Ponto em aberto no card: o comportamento fora de SP (só retirada) pode não estar fechado. Se a documentação divergir, registre NEEDS-INFO.

### BE-08 · Reserva com termo e prazo
Critérios do card: data-limite gravada igual à exibida no termo; dois usuários não reservam o mesmo lote.

- BE-08.1 Aceite o termo para reservar um lote. Esperado: cria a reserva e o lote vira RESERVADO na mesma transação.
- BE-08.2 Compare a data-limite gravada com a exibida no termo. Esperado: iguais.
- BE-08.3 Teste a data-limite em um período que cruza fim de semana e feriado (regra AN-04, dias úteis). Esperado: ignora sábados, domingos e feriados.
- BE-08.4 Dispare duas reservas simultâneas do mesmo lote por usuários diferentes. Esperado: apenas uma é criada, a outra é recusada, sem estado inconsistente.
- BE-08.5 Reserve acima do limite de reservas (AN-06). Esperado: recusado.
- BE-08.6 Registre a logística na hora da reserva. Esperado: grava.
- BE-08.7 Registre a logística depois da reserva. Esperado: grava.
- BE-08.8 Simule falha após criar a reserva (se possível). Esperado: o lote não fica RESERVADO sem reserva, nem o contrário.

### BE-09 · Entrega/envio e recebimento
Critério do card: recebimento cria o projeto e muda o status para EM PRODUÇÃO.

- BE-09.1 Como empresa, confirme a retirada. Esperado: grava.
- BE-09.2 Como empresa, registre o envio com data e código de rastreio. Esperado: grava.
- BE-09.3 Como confeccionista, confirme o recebimento. Esperado: lote vira EM PRODUÇÃO e o projeto é criado com prazo de produção.
- BE-09.4 Tente confirmar o recebimento sem entrega ou envio registrado. Esperado: bloqueado.
- BE-09.5 Tente confirmar o recebimento como outro confeccionista. Esperado: bloqueado.

### BE-10 · Rotina de prazo vencido
Critério do card: reserva vencida some de "Meus lotes" e o lote volta à vitrine.
Regra: AN-05.

- BE-10.1 Crie uma reserva com prazo já vencido e execute o job diário manualmente. Esperado: a reserva expira, o lote volta a DISPONÍVEL e o histórico registra.
- BE-10.2 Consulte "Meus lotes" do designer. Esperado: a reserva vencida não aparece.
- BE-10.3 Consulte a vitrine. Esperado: o lote voltou a aparecer.
- BE-10.4 Execute o job de novo. Esperado: não reprocessa nem duplica histórico.
- BE-10.5 Rode o job com uma reserva ainda dentro do prazo. Esperado: não é alterada.

### BE-19 · Regras de cancelamento e nota do designer
Critérios do card: cancelar sem motivo é recusado; designer não acessa a própria marca de restrição pela API pública das lojas; métrica mensal de cancelamentos por motivo disponível para a loja.
Regra da nota: AN-18.

- BE-19.1 Cancele antes do recebimento sem motivo. Esperado: recusado.
- BE-19.2 Cancele antes do recebimento com motivo. Esperado: reserva cancelada, lote volta a DISPONÍVEL, loja notificada e nota recalculada.
- BE-19.3 Cancele durante a produção sem motivo. Esperado: recusado.
- BE-19.4 Cancele durante a produção com motivo. Esperado: lote vai para INTERROMPIDO, restrição criada, loja notificada.
- BE-19.5 Confira o cálculo da nota após o cancelamento, conforme AN-18. Esperado: valor igual ao da fórmula.
- BE-19.6 Com token de designer, consulte a própria nota e restrição. Esperado: não vê.
- BE-19.7 Com usuário de empresa, consulte nota e restrição do designer. Esperado: vê.
- BE-19.8 Consulte a métrica mensal de cancelamentos por motivo na loja. Esperado: disponível e coerente com os cancelamentos feitos.

---

## ONDA 3 · Fim do ciclo e QR Code

### BE-11 · Conclusão do projeto pelo confeccionista
Critério do card: sem processo criativo a conclusão é recusada.

- BE-11.1 Conclua sem preencher o processo criativo. Esperado: recusado.
- BE-11.2 Conclua com nome da peça, descrição, processo criativo, quantidade, materiais e fotos. Esperado: aceito e o status vira ENVIADO PARA A LOJA.
- BE-11.3 Confira o status após a conclusão. Esperado: nunca FINALIZADO nesta etapa.
- BE-11.4 Envie foto com formato inválido ou arquivo muito grande. Esperado: erro tratado, sem quebrar.
- BE-11.5 Conclua um projeto que não está EM PRODUÇÃO. Esperado: recusado.

### BE-12 · Revisão e finalização pela empresa
Critério do card: projeto EM PRODUÇÃO não pode ser finalizado.

- BE-12.1 Aprove um projeto ENVIADO PARA A LOJA. Esperado: FINALIZADO, com data e checklist gravados.
- BE-12.2 Tente aprovar um projeto EM PRODUÇÃO. Esperado: recusado.
- BE-12.3 Solicite ajuste com motivo. Esperado: status EM AJUSTE.
- BE-12.4 Solicite ajuste sem motivo (AN-05). Esperado: recusado.
- BE-12.5 Aprove como usuário de outra empresa. Esperado: bloqueado.

### BE-13 · QR Code e página pública da peça
Critérios do card: QR escaneado abre a página da peça certa; projeto não finalizado retorna 404.

- BE-13.1 Acesse o endpoint público por CD_PUBLICO de um projeto FINALIZADO. Esperado: retorna peça, confeccionista, material e código do lote.
- BE-13.2 Inspecione a resposta. Esperado: sem dados pessoais (CPF, e-mail, telefone, endereço).
- BE-13.3 Acesse com CD_PUBLICO de um projeto não finalizado. Esperado: 404.
- BE-13.4 Acesse com CD_PUBLICO inexistente. Esperado: 404.
- BE-13.5 Gere a imagem do QR e decodifique-a. Esperado: contém a URL correta da peça certa.
- BE-13.6 Acesse o endpoint sem login. Esperado: funciona, por ser público.

### BE-14 · Projetos e linha do tempo
Critério do card: linha do tempo mostra datas e autores reais.

- BE-14.1 Liste os projetos como empresa. Esperado: apenas os da empresa, com status oficial.
- BE-14.2 Liste os projetos como confeccionista. Esperado: apenas os dele.
- BE-14.3 Deixe um projeto com prazo vencido. Esperado: atraso calculado corretamente.
- BE-14.4 Abra o detalhe. Esperado: briefing, contato do confeccionista, histórico, processo criativo e fotos.
- BE-14.5 Confira a linha do tempo. Esperado: datas e autores reais, batendo com o histórico do banco.

---

## ONDA 4 · Ciclo do doador e integração

### BE-15 · Doação e cupom
Critérios do card: doação registrada aparece no painel do doador; cupom usado não pode ser usado de novo.
Regras: AN-01, AN-02.

- BE-15.1 Como empresa, busque o doador por CPF. Esperado: encontra.
- BE-15.2 Busque o doador por e-mail. Esperado: encontra.
- BE-15.3 Registre uma doação. Esperado: aparece no painel do doador.
- BE-15.4 Gere um cupom conforme AN-02. Esperado: gerado com os dados corretos.
- BE-15.5 Valide o cupom pelo código e marque como utilizado. Esperado: funciona.
- BE-15.6 Tente usar o mesmo cupom novamente. Esperado: recusado.
- BE-15.7 Como doador, liste doações e cupons. Esperado: mostra apenas os dele.

### BE-20 · Regras do ciclo de cupom e vínculo de doações por CPF
Critérios do card: 5 entregas em 6 meses na mesma loja geram 1 cupom; 5 entregas em lojas diferentes não geram cupom; ciclo vencido zera a contagem.
Regra de retenção: AN-17.

- BE-20.1 Registre 5 entregas em 6 meses na mesma loja. Esperado: gera 1 cupom e as 5 doações ficam EM_CUPOM.
- BE-20.2 Registre 5 entregas em lojas diferentes. Esperado: nenhum cupom.
- BE-20.3 Registre menos de 5 e deixe o ciclo de 6 meses vencer (ajuste datas no banco). Esperado: as doações viram EXPIRADA e a contagem recomeça.
- BE-20.4 Registre uma entrega com várias peças. Esperado: conta como 1 doação.
- BE-20.5 Confira o início do ciclo. Esperado: começa na primeira doação contada.
- BE-20.6 Registre 5 doações para um CPF sem conta (Doador 2) e depois cadastre esse CPF. Esperado: as doações ficam visíveis para ele automaticamente e o cupom é gerado no cadastro.
- BE-20.7 Verifique a exclusão de CPFs não vinculados após o prazo de retenção (AN-17). Esperado: são removidos.

---

## ONDA 5 · Complementares

### BE-16 · Endpoints dos painéis (P2)
Critério do card: números batem com as views do BD.
Fórmulas: AN-15.

- BE-16.1 Consulte os indicadores do doador e compare com a view do banco. Esperado: valores iguais.
- BE-16.2 Consulte os indicadores do confeccionista e compare com a view do banco. Esperado: valores iguais.
- BE-16.3 Consulte os indicadores da empresa e compare com a view do banco. Esperado: valores iguais.

### BE-17 · Notificações (P2)
Critério do card: eventos principais geram aviso.

Dispare cada evento e confira o e-mail ou aviso no painel, e se o destinatário está certo:
- BE-17.1 Reserva criada.
- BE-17.2 Prazo próximo.
- BE-17.3 Prazo vencido.
- BE-17.4 Envio registrado.
- BE-17.5 Recebimento confirmado.
- BE-17.6 Peça enviada para a loja.
- BE-17.7 Ajuste solicitado.
- BE-17.8 Projeto finalizado.
- BE-17.9 Cupom gerado.
- BE-17.10 Cupom expirando.

Esperado em todos: um aviso gerado, enviado ao destinatário correto (loja ou designer), sem duplicidade.

### BE-22 · Indicadores e certificado de sustentabilidade
Critério do card: números batem com as views do banco.
Indicadores e critérios: AN-15.

- BE-22.1 Consulte os KPIs da empresa em períodos diferentes. Esperado: os números mudam conforme o período e batem com as views do banco.
- BE-22.2 Gere o certificado de sustentabilidade. Esperado: sai em PDF ou imagem.
- BE-22.3 Confira o conteúdo do certificado. Esperado: indicadores corretos e coerentes com o período.

---

## Formato do relatório

Ao terminar, entregue um relatório com:

1. Resumo: total de testes, quantos PASS, FAIL, BLOCKED e NEEDS-INFO.
2. Resultado por card, no formato:
   - Card: BE-xx · título
   - Status geral: PASS, FAIL ou parcial
   - Para cada teste que falhou: ID do teste, passos executados, esperado, observado e evidência.
3. Lista de bugs encontrados, ordenada por prioridade do card (P0, P1, P2), com severidade sugerida.
4. Lista de pontos NEEDS-INFO, com a pergunta exata que precisa ser respondida.
5. Riscos observados que não estavam nos critérios (segurança, concorrência, dados pessoais expostos).

Atenção especial: BE-00 (segurança, P0), BE-08.4 (concorrência), BE-10 (job), BE-13.2 (dados pessoais na rota pública), BE-19.6 (vazamento de restrição) e BE-20 (regra de ciclo do cupom).
