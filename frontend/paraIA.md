<!-- FE-06 · Perfil da empresa e cartilha -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Incluir sobre a loja, horário de retirada, logísticas aceitas, frete e a seção de cartilha padrão; salvar.

Depende de: FE-01, AN-09

Resolve: D-04, D-05

Fonte: CONTINUUM - Documentação consolidada e backlog de tasks (13/10/2026)

<!-- Critérios de aceite -->

Drawer "Perfil da loja" da vitrine mostra os dados salvos aqui

<!-- FE-07 · Lotes da empresa -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Formulário com título, tipo, material, peso/quantidade, logísticas, imagem e briefing; lista com confeccionista, modalidade e data-limite dos reservados; ações "Confirmar retirada"/"Registrar envio"; remover seletor livre de status, criação em massa e exclusão sem confirmação.

Depende de: FE-06

Resolve: D-03, S-04, FX-06, EM-07

Fonte: CONTINUUM - Documentação consolidada e backlog de tasks (13/10/2026)

<!-- Critérios de Aceite -->

Todo campo exibido na vitrine é preenchido aqui

<!-- FE-08 · Vitrine e reserva -->

Descrição: Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Chips de loja filtrando, busca e filtro por material; detalhe com imagem, briefing e cartilha; termo exibindo briefing e data-limite; reserva grava data, data-limite e modalidade.

Depende de: FE-07

Resolve: R-08, P-01, P-02, D-03

Fonte: CONTINUUM - Documentação consolidada e backlog de tasks (13/10/2026)

<!-- Critérios de Aceite -->

Filtro por loja funciona
Data do termo = data em Meus lotes

<!-- FE-09 · Meus lotes -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Ler reservas do usuário; 10 dias úteis (remover os 7 dias); mostrar modalidade e endereço corretos; acesso ao briefing; "Definir forma de recebimento" para reservas sem logística; "Sinalizar recebido" → EM PRODUÇÃO e projeto criado.

Depende de: FE-08

Resolve: R-01, S-03, S-06, S-08

Fonte: CONTINUUM - Documentação consolidada e backlog de tasks (13/10/2026)

<!-- Critérios de Aceite -->

Após sinalizar recebido, o projeto aparece em Meus projetos

<!-- FE-23 · Cadastro de lote com briefing -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Na tela de cadastro de lote da empresa, incluir a seção de briefing (ideia da marca, expectativa, liberdade criativa e prazo de produção). A cartilha padrão é exibida como referência, sem precisar ser preenchida de novo.

Relaciona-se com: FE-07

Origem: v2 · decisão AN-09

Fonte: CONTINUUM - Documentação Técnica v3 (20/10/2026), seção 11

<!-- Critérios de Aceite -->

Briefing salvo aparece para o designer no detalhe do lote e no termo

<!-- FE-28 · Tela de registro de doação -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Nova tela na área da empresa para registrar a doação no momento da entrega: CPF do doador (opcional, com aviso de que sem CPF a doação não conta para cupom), tipo e quantidade de peças, peso estimado e observações; data automática. Lista das doações registradas com filtro por situação (Aguardando curadoria / Em lote).

Relaciona-se com: FE-13, BE-15

Origem: v2 · decisão AN-01 (atualização)

Fonte: CONTINUUM - Documentação Técnica v3 (20/10/2026), seção 11

<!-- Critérios de Aceite -->

Doação com CPF aparece no painel do doador e conta para o cupom

Doação sem CPF é registrada sem vínculo com doador

Toda doação nova entra como "Aguardando curadoria"

<!-- FE-29 · Curadoria: vincular doações ao lote -->

Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
No cadastro (ou edição) do lote, uma etapa de curadoria em que a empresa vê as doações "Aguardando curadoria", filtra por tipo de peça e data, e seleciona as que compõem o lote. Ao salvar, as doações passam para "Em lote". O peso do lote pode ser sugerido pela soma das doações selecionadas.

Relaciona-se com: FE-07, FE-23

Origem: v2 · decisão AN-01 (atualização)

Fonte: CONTINUUM - Documentação Técnica v3 (20/10/2026), seção 11

<!-- Critérios de Aceite -->

Só aparecem doações da própria empresa ainda não vinculadas

Doação vinculada some da lista de pendentes

Detalhe do lote mostra as doações que o compõem

<!-- FE-31 · Cancelamento pelo designer e reputação vista pela loja -->

Descrição
Editar
Equipe: Front-end  ·  Prioridade: P1  ·  Onda: 2

Descrição
Designer: botão "Cancelar" em Meus lotes e em Meus projetos, com modal de motivo (lista + explicação) e aviso das consequências (nota; restrição se já estiver em produção). Loja: nota e marca de restrição do designer exibidas no detalhe da reserva/projeto e no perfil do designer; métrica mensal de cancelamentos no painel.

Relaciona-se com: FE-09, FE-10, FE-15

Origem: v3 · decisão Resposta 3

Fonte: CONTINUUM - Documentação Técnica v3 (20/10/2026), seção 11

<!-- Critérios de Aceite -->

Modal informa a consequência antes de confirmar

Selo de restrição aparece só nas telas da empresa