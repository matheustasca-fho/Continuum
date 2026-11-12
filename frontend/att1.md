**Fluxo da tarefa FE-01:**

1. **Empresa cadastra um lote** no sistema.
2. O lote é **salvo no mock compartilhado** (`js/shared/store.js`).
3. O lote passa a aparecer automaticamente para os **confeccionistas** disponíveis.
4. O **confeccionista seleciona e aceita o lote**.
5. O status do lote é **atualizado no mesmo mock**.
6. A **empresa visualiza a atualização**, sabendo que o lote foi aceito.
7. O lote deixa de estar disponível para outros confeccionistas e passa a ser tratado como **projeto do confeccionista responsável**.
8. As próximas alterações do projeto devem continuar sendo **compartilhadas entre os atores**, mantendo o fluxo sincronizado.
9. Todas as telas devem acessar esses dados através de **`js/shared/api.js`**, permitindo futuramente substituir o mock por uma API real sem precisar alterar as telas.

### Tarefa: FE-03 — Ajustes nos cadastros de Doador e Confeccionista

Implemente as alterações abaixo nos formulários de cadastro, mantendo o padrão visual e estrutural já existente no projeto.

#### 1. Cadastro de Doador

Adicionar e ajustar os seguintes campos:

- **Nome:** ampliar o campo para permitir nomes maiores, sem limitar indevidamente o tamanho.
- **E-mail:** adicionar um campo obrigatório para e-mail, com validação de formato.
- **Senha:** adicionar/ajustar o campo de senha para exigir uma quantidade mínima de caracteres.
- **Confirmar senha:** adicionar um segundo campo para confirmação da senha e validar se as duas senhas são iguais.
- **Aceite dos termos:** adicionar um checkbox obrigatório para o usuário confirmar que leu e aceita os termos de uso antes de concluir o cadastro.

O formulário deve impedir o envio caso algum campo obrigatório esteja inválido.

#### 2. Cadastro de Confeccionista

Adicionar e ajustar os seguintes campos:

- **E-mail:** adicionar campo obrigatório com validação de formato.
- **Telefone:** adicionar campo para telefone, com máscara/formatação adequada.
- **Logradouro:** adicionar campo para endereço.
- **Complemento:** adicionar campo opcional para complemento do endereço.
- **CPF/CNPJ:** implementar validação real dos dígitos do documento, verificando se o CPF ou CNPJ informado é matematicamente válido, e não apenas se possui a quantidade correta de caracteres.

As validações devem apresentar mensagens de erro claras para o usuário e impedir o envio do formulário enquanto houver dados inválidos.

### Regras gerais

- Não remover funcionalidades existentes.
- Não alterar outras partes do sistema sem necessidade.
- Reutilizar os componentes, estilos e padrões de validação já utilizados no projeto.
- Garantir que as validações funcionem tanto para preenchimento manual quanto para submissão do formulário.
- Manter o layout responsivo.
- Verificar também se os novos campos precisam ser adicionados ao modelo de dados, API ou banco de dados para que as informações sejam realmente armazenadas.
- Ao finalizar, testar os fluxos de cadastro de **Doador** e **Confeccionista**, incluindo casos válidos e inválidos.