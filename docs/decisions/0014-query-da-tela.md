# 0014 — Query da tela: o painel a preserva, a navegação ainda não a escopa

**Data:** 2026-09-29
**Status:** aceita em parte (item 1); proposta (item 2)
**Decidido por:** Bruno Santos
**Complementa:** [0012](0012-chrome-unico-telas-como-rotas-e-iframe.md)

## Contexto

Um produto integrado depois da 0.9.2 guarda estado da própria tela na query da
URL: a aba da página (`?aba=…`), o passo de um fluxo (`?etapa=revisao`), filtro
e paginação de lista (`?busca=…&pagina=2`) e dados de entrada vindos de outra
tela (`?contato=<id>`). O motor não conhecia esses parâmetros, e isso tinha dois
efeitos:

1. **O painel apagava a query.** `setControls` reconstruía a URL só com
   `serializeControls`, que só conhece os parâmetros do motor. Trocar a persona
   no meio de um fluxo tirava o `etapa`, e a tela voltava ao início; trocar a
   rede numa lista tirava filtro e página.
2. **A query vazava entre telas.** `navigationTarget` trata como contexto todo
   parâmetro que não é `scenario`, `fixture`, `component` nem `c.*`. Numa
   navegação sem query, a query inteira segue; com query própria, o parâmetro
   antigo só sai se o destino trouxer a mesma chave.

O produto contornou os dois: mandava vazio o parâmetro que devia sair (`aba=`)
e ignorava parâmetro vazio na leitura, e mudava controle por
`navigate(pathAtual + query, { controls, replace: true })` em vez de
`setControl`.

O vazamento não é só uma URL feia. No produto, a navegação pelo menu lateral
cai no ramo sem query, e sem o contorno:

| Parâmetro | Telas que leem | O que acontece |
| --- | --- | --- |
| `busca` | duas listas | Buscar numa lista e ir para a outra abre a outra filtrada, vazia. |
| `pagina`, `itens` | três listas | Estar na página 3 de uma e ir para outra abre a página 3, ou uma página vazia. |
| `periodo`, `de`, `ate` | três telas | O período de uma tela vira o filtro da outra. |
| `contato`, `conta` | dois fluxos | O dado de entrada vindo de uma tela preenche também outro fluxo. |
| `aba` | três telas com abas | Uma aba de uma tela chega a outra como aba inválida. |
| `etapa` | todos os fluxos | Sair do passo final de um fluxo e abrir outro entra no passo final, sem dados. |

## Evidência nos outros produtos

O [Princípio 10](../../README.md#princípios) pede dois produtos. O levantamento
em 2026-09-29 achou um só:

- o segundo produto, na 0.9.2, não guarda estado da tela na query; navega sem
  query;
- o terceiro ainda está na 0.6.0;
- um quarto repositório de Design Space tem laboratório próprio e não usa o motor.

## Decisão

1. **O painel preserva a query da tela (0.9.3, patch).** Mudar persona, rede,
   viewport, zoom, tema, painel ou controle — pelo chrome ou por
   `setControl`/`setControls` de dentro do quadro — mantém todo parâmetro que o
   motor não lê. Isso não cria conceito novo: `navigate("/x?y=1")` já aceitava
   query do produto e a levava ao quadro, e perdê-la numa troca de controle era
   incoerência de uma capacidade existente. Não depende do Princípio 10.

2. **O escopo por tela fica como proposta.** O caminho é declarar por rota,
   opt-in:

   ```ts
   { path: "/lista", screen: Lista, query: ["busca", "pagina"] }
   ```

   Chave declarada é da tela: sai quando a navegação troca de tela, como os
   `c.*`; numa navegação para a mesma tela, o destino manda
   (`navigate("/lista?busca=a")` a partir de `?busca=a&pagina=2` deixa só
   `busca=a`). Chave não declarada continua como contexto, então nada muda para
   quem não declara. Implementa-se quando um segundo produto precisar, comparando
   o caso dele com a tabela acima.

## Consequências

- O produto pode apagar o contorno do painel e voltar a usar `setControl`.
- O contorno do vazamento continua no produto até o item 2.
- A tela lê a própria query em `window.location.search`, e o motor garante que a
  URL do quadro está em dia quando a tela renderiza. Um `context.query` só passa
  a fazer sentido se essa garantia deixar de valer.

## Alternativas descartadas

- **Toda query que não é do motor passa a ser da tela.** Mais simples, mas muda
  o comportamento padrão (0.10.0) e exigiria uma saída como
  `ProductDefinition.contextParams` para o que deve continuar global. Nenhum
  produto depende hoje de parâmetro global atravessando telas, mas ausência de
  caso não é garantia.
- **`Scenario.query`,** para um atalho fixar query da tela. Nenhum cenário real
  precisa disso hoje.
- **`context.query: URLSearchParams`.** Duplica `window.location.search` e seria
  um export novo sem ganho.

## Pendência separada: veto de navegação

O produto tem um "Descartar as alterações?" que só bloqueia a navegação feita
dentro do app; a lateral do chrome troca de tela sem perguntar. Um mecanismo
mínimo seria o quadro avisar o pai que há alterações não salvas e o chrome
confirmar antes de trocar de tela. Fica fora deste ciclo: um produto só, e muda
o protocolo do quadro.
