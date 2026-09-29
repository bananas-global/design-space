# 0013 — Fluxos agrupam telas, e as variações são controles por componente

**Data:** 2026-09-29
**Status:** aceita
**Decidido por:** Bruno Santos
**Complementa:** [0012](0012-chrome-unico-telas-como-rotas-e-iframe.md)

## Contexto

Na primeira feature real depois da 0.8, duas coisas não funcionaram:

1. **Um fluxo de cinco telas virou uma tela com 27 variações.** Como cada
   variação era um cenário inteiro, toda combinação de estado — tabela vazia,
   modal aberto, filtro aplicado — precisava de um cenário próprio, e a lista
   ficou longa demais para ler. As combinações crescem multiplicando; a lista,
   somando.
2. **Persona e estado de rede ficavam no fim do painel**, embaixo da lista de
   variações, e quem revisava não os encontrava.

Um laboratório irmão resolveu com variações **por componente**: cada componente
da tela declara as dimensões em que varia, e elas se combinam.

## Decisão

Na 0.9.0 (compatível — tudo é opcional):

- **Fluxos agrupam telas.** `RouteDefinition.group` põe a tela num fluxo, e a aba
  Telas se organiza por fluxo, como Componentes se organiza por `group`. É uma
  camada **acima** da rota, só de navegação: a tela continua sendo a rota, e não
  existe nada entre rota e cenário (0012 continua valendo).
- **Variações são controles por componente que se combinam.** Uma rota declara
  `controls: ControlGroup[]`; cada grupo é de um componente e tem seus `Control`s
  com opções. A tela lê `context.controls` e monta os próprios dados sintéticos;
  pode mudar um controle com `context.setControl`. Na URL, `c.<id>` só quando
  difere do padrão — a URL continua sendo o estado.
- **Cenário vira atalho** para uma combinação (`Scenario.controls`) e continua
  sendo o lugar de persona, fixture, regra e comportamento esperado próprios.
  Mudar um controle não troca de cenário; o atalho só deixa de aparecer
  destacado.
- **Contexto no topo do painel:** persona, rede, tema, idioma e fonte de dados
  vêm antes dos controles, e os atalhos por último.

## Consequências

- Uma tela com N componentes variáveis cabe num painel de N blocos, em vez de
  uma lista com o produto das combinações.
- Tela sem cenário passa a ser o caso normal, então o estado de rede do contexto
  vale também sem cenário.
- "Copiar para o PR" de uma tela com fluxo gera o fluxo inteiro, que é a unidade
  que chega num PR de feature.
- A validação cobre o que o tipo não pega: id de controle duplicado, `default`
  fora das opções, cenário fixando controle ou valor que a tela não tem.
- Os previews do catálogo de componentes não mudam nesta versão.
