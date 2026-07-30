# 0001 — Roteamento próprio em vez de router externo

**Data:** 2026-07-30
**Status:** aceita

## Contexto

O Design Space precisa de rotas declarativas com URL estável por tela, fluxo e
cenário. A escolha óbvia seria `react-router`.

## Decisão

O motor implementa seu próprio casamento de rotas: segmentos literais, `:param` e
`*` final, com ordenação por especificidade.

## Raciocínio

O que o Design Space exige de roteamento é pequeno e fechado: casar um path
contra uma lista declarada e extrair parâmetros. Não há loaders, não há rotas
aninhadas com layouts, não há data fetching acoplado à rota — os dados vêm do
adapter do cenário, não da rota.

Adotar um router traria três custos desproporcionais a esse ganho:

1. **Versionamento acoplado.** Cada produto herdaria a major do router. Uma
   mudança de API do router viraria uma migração em todos os Design Spaces, por
   um recurso que nenhum deles usa.
2. **Convenção imposta.** O produto passaria a escrever rotas na sintaxe do
   router, e a fronteira "o produto só entrega uma `ProductDefinition`" ficaria
   furada.
3. **Superfície.** O motor tem `react` e `react-dom` como únicos peers. Manter
   zero dependência de runtime é o que permite dizer que ele é pequeno e neutro
   sem qualificação.

## Consequências

- O casamento de rotas é ~70 linhas testadas, e a especificidade é explícita:
  entre `/patients/new` e `/patients/:id`, a literal ganha independente da ordem
  de declaração.
- Não há `<Link>`: a navegação vem de `context.navigate`, e o produto continua
  usando `<a href>` real no markup — o que é melhor para leitor de tela e para
  abrir em nova aba.
- Se um produto precisar de rotas aninhadas com layouts de verdade, esta decisão
  precisa ser revisitada. Até hoje nenhum precisou.

## Alternativa descartada

`react-router` em modo declarativo. Descartada pelos três custos acima. A
reversão é barata: `resolveRoute` é uma função pura com uma superfície pequena,
então trocá-la por um router externo não toca no contrato do produto.
