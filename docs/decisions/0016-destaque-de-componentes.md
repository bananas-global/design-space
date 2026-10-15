# 0016 — Destaque de componentes marcado pelo produto

**Data:** 2026-10-09
**Status:** aceita, emendada pela [0017](0017-destaque-automatico-pela-arvore-do-react.md) — a marcação manual virou complemento do destaque automático pela árvore do React
**Decidido por:** Bruno Santos

## Contexto

A avaliação de design de uma tela começa por uma pergunta: o que ali já é
componente do sistema e o que é marcação solta, feita só para aquela tela. O
painel Informações lista os componentes que a tela **declara** usar
(`components`), mas não mostra onde eles estão nem o que ficou de fora.

Para contornar componentes na tela, o motor precisa saber o que é componente, e
hoje não sabe: `ComponentPreview.preview` é uma composição de demonstração, não
o componente que a tela renderiza, e a UI roda num `<iframe>`.

## Decisão

O produto marca a raiz de cada componente com
`data-ds-component="<id do catálogo>"`. Um botão no centro da barra
("Destacar componentes", `?highlight=1`) contorna, dentro do quadro, cada
elemento marcado, com o nome do componente no catálogo. Id fora do catálogo
aparece tracejado.

Os contornos são uma camada fixa por cima da UI, montada no `body` do quadro,
sem receber ponteiro e no mesmo preto e branco do chrome. Nenhum elemento do
produto é alterado.

## Raciocínio

- **Convenção explícita em vez de inferência.** O motor não adivinha. Funciona
  igual no build minificado, não depende de API interna do React e casa com os
  ids que o catálogo e o "Copiar para o PR" já usam.
- **Ausência de contorno é resultado.** Componente que o produto ainda não
  marcou aparece como "não componente" — e isso é exatamente o que a avaliação
  quer achar.
- **Passa nos três critérios.** O mecanismo não decide aparência do produto,
  não conhece domínio e o atributo é o mesmo para qualquer produto; o nome e a
  forma de cada componente continuam no repositório dele.

## Alternativas descartadas

- **Referência ao componente no catálogo, casada pela árvore do React.** Sem
  tocar no JSX, mas depende de `__reactFiber$`, que não é contrato do React e
  pode quebrar entre versões, e exigiria desembrulhar `memo` e `forwardRef`.
- **Toda função React que renderiza DOM.** Sem configuração, mas mistura tela,
  provider e wrapper com componente de sistema, e no build minificado os nomes
  viram letras.
