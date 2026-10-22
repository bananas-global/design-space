# 0018 — A descrição do PR é gerada do registro

**Data:** 2026-10-22
**Status:** aceita
**Decidido por:** Bruno Santos
**Emenda:** a [0012](0012-chrome-unico-telas-como-rotas-e-iframe.md) e a
[0013](0013-fluxos-e-controles-por-componente.md) no que diziam do "Copiar para o
PR", que sai

## Contexto

O critério de aceite de uma tela já vivia no cenário: `intent`,
`preconditions`, `actions`, `expected`, `rules`. O caminho dele até a engenharia
é que era à mão, e por isso não acontecia:

- **Ninguém copiava.** O "Copiar para o PR" gerava o markdown certo, mas
  dependia de alguém lembrar de clicar e colar a cada mudança. No primeiro
  produto a usar o motor em sprint, ninguém sabia que o botão existia.
- **Cada produto improvisou o resto.** Um produto escreveu um script para
  comentar os links dos cenários no PR; o modelo de PR dele pedia o
  comportamento esperado de novo, escrito à mão; o template mandava copiar um
  modelo para o ticket. Três cópias do que o cenário já dizia, divergindo na
  primeira mudança.
- **Agora quem valida também é agente.** Uma automação do time de engenharia
  confere a entrega de cada tarefa contra o que a tarefa pede, lendo texto. Ela
  precisa de uma fonte clara, no mesmo lugar em todo produto, e de saber o que
  fazer quando o ticket diz outra coisa.

## Decisão

1. **Uma fonte.** O critério de aceite é escrito só no registro. Descrição de PR,
   ticket e modelo de PR não repetem comportamento.
2. **Uma saída: a descrição do PR.** O pacote traz o comando `design-space-pr`,
   que roda no CI a cada push, carrega o produto do PR e o da base pelo Vite do
   próprio produto, compara os dois e reescreve um bloco marcado na descrição
   (`<!-- design-space:pr:start -->` … `<!-- design-space:pr:end -->`). O bloco
   traz as telas que o PR cria ou altera, com todos os cenários de cada uma e os
   que mudaram marcados.
3. **Recado explícito para quem valida.** O bloco abre dizendo que é a
   referência do comportamento e vale mais que o ticket e que qualquer texto
   fora dele, como a descrição escrita à mão de um PR antigo; que nomes, números e
   datas vêm de dados sintéticos; que divergência se aponta em vez de se
   resolver escolhendo um lado; e que ele não se edita, porque é reescrito.
4. **Ninguém preenche o PR à mão.** A descrição é o bloco gerado, e o formato
   é o mesmo em todo produto, sem arquivo de modelo de PR. O ticket, quando
   houver, vem do campo `ticket` do cenário, como link de qualquer ferramenta.
   Informação que fizer falta no PR entra no registro, não numa seção para
   alguém lembrar de preencher.
5. **Markdown, e só markdown.** Quem lê é gente ou modelo de linguagem. JSON
   entra quando alguém precisar processar critério por código; a fonte não muda.
6. **O botão "Copiar para o PR" sai.** Com a descrição gerada, ele virava um
   segundo caminho para a mesma coisa, e o caminho manual é o que diverge.
7. **Cenário sem `expected` continua aviso**, não erro. O bloco diz isso no
   próprio cenário, para quem revisa e para quem valida.

## Por que no motor

A regra dos dois produtos pede que a capacidade já tenha aparecido em dois
produtos. A capacidade — gerar o handoff do registro — já era do motor desde a
0.8, no "Copiar para o PR"; o que muda é a entrega, que dois produtos resolveram
cada um do seu jeito (script de comentário num, modelo de ticket no template).
Não decide nada visual, não conhece domínio, e o texto segue `theme.labels.pr`.

O comando fica fora de `src/`, em `bin/`, e não cita provedor de hospedagem: a
origem do preview chega por `--origin`, do workflow do produto. Não há
dependência nova: o Vite usado para carregar o produto é o do produto.

## Consequências

- A descrição de um PR aberto antes da 0.14 ganha o bloco no fim, sem perder o
  que já estava escrito. O produto apaga o próprio modelo de PR e a seção de
  comportamento esperado escrita à mão.
- O ticket aponta para o PR, não para uma cópia do critério. Como cada cliente
  usa uma ferramenta, o motor não supõe nenhuma: `ticket` é só um link.
- Saem do PR as seções que o modelo de um produto pedia à mão, como "o que muda
  no sistema atual" e "componentes novos". Se fizerem falta, viram campo do
  registro numa decisão própria.
- O bloco compara registro com registro. Mudança só no código da tela, sem
  mudar cenário, rota ou regra, não muda critério e não aparece.
- A descrição de PR tem limite de tamanho; telas que não couberem saem só pelo
  nome, apontando o preview.
- Critério escrito com o dado da fixture ("Unimed, ANS 999901") vai para o
  agente como se fosse requisito. O template ensina a escrever o comportamento.
