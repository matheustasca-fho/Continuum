<!-- FE-01 · Mock compartilhado e camada de serviço -->

Todas as telas leem e gravam no mesmo mock (js/shared/store.js) com os dados de AN-14, através de uma camada de serviço única (corrigir js/shared/api.js), para depois trocar o mock pela API sem mexer nas telas.

<!-- Critérios de Aceite FE-01 -->

1. Reserva feita na vitrine aparece em Meus lotes e na lista da empresa
2. Mesmo lote com mesmo código e peso em todas as telas

<!-- FE-02 · Login -->

Identificador por aba (Doador: CPF ou e-mail; Designer: CPF/CNPJ; Empresa: CNPJ) com máscara; recusar conta de outro perfil; recuperação de senha (P2).

Recuperação de senha: Só adicionar nova senha 2 vezes que muda.

<!-- Critérios de Aceite FE-02 -->

1. Doador cadastrado entra com CPF ou e-mail

<!-- FE-03 · Cadastros -->

Doador: incluir e-mail, ampliar nome, senha com mínimo e confirmação, aceite de termos, canal de aquisição, faixa etária. Adicionar API dos Correios que, ao preencher o CEP, preenche estado, rua e bairro. Adicionar numero de endereço e complemento

Confeccionista:

(Obrigatório) incluir e-mail, telefone, logradouro/complemento, validação de dígito de CPF/CNPJ. Adicionar API dos Correios que, ao preencher o CEP, preenche estado, rua e bairro. Adicionar complemento. Consentimento perfil público e canal de aquisição

(Não obrigatório, preencher no perfil) Sobre mim, faixa experiência, manifesto, portifolio, instagram, site url.

<!-- Critérios de Aceite FE-03 -->

1. Campos iguais aos definidos em AN-10 (Ler documentação)

<!-- FE-04 · Textos, papéis e status padronizados -->

Aplicar o glossário (AN-13): painel da empresa como ponto de coleta, "empresa parceira" em Meus lotes, "doações" no painel do doador; usar só os status oficiais em filtros, selos e contadores.

<!-- Critérios de Aceite FE-04 -->

1. Nenhuma tela com status fora da lista oficial

<!-- FE-05 · Perfil do doador refeito -->

Trocar o formulário de empresa (CNPJ, razão social) pelos dados do cadastro do doador: nome, CPF (somente leitura), e-mail, telefone, CEP.

<!-- Critérios de Aceite FE-05 -->

1. Perfil exibe exatamente os dados do cadastro

<!-- FE-26 · Campos no cadastro e perfil da empresa -->

Cadastro com consulta automática do CNPJ (preenche razão social e nome fantasia), responsável, endereço, horários e logística. No perfil: segmento, porte, perfil da loja, logo, cartilha padrão, política padrão de cupom e definição da senha de admin.

<!-- Critérios de Aceite FE-26 -->

Sem critérios

<!-- FE-27 · Jornada de entrada da empresa -->

Fluxo único: (1) tela de valores e benefícios; (2) botão de contato via WhatsApp ou "seguir para cadastro"; (3) cadastro dos dados da empresa; (4) pagamento mockado, validando apenas o formato do cartão de crédito; (5) acesso ao sistema.

<!-- Critérios de Aceite FE-27 -->

1. Fluxo completo leva a empresa até o painel
2. Cartão com formato inválido é recusado
