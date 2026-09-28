# 0011 — Acessibilidade e ciclo de vida saem do contrato de cenário

**Data:** 2026-09-28
**Status:** aceita
**Revoga:** [0002](0002-a11y-obrigatorio-no-contrato.md) e
[0008](0008-portados-fora-do-trabalho-ativo.md)

## Contexto

O produto que mais usa o motor passou a ser trabalhado por um time interno, que
precisa de velocidade. Na prática, o `a11y` obrigatório e o `status` de cenário
viraram custo fixo: cada cenário novo exigia preencher um contrato que ninguém
consultava, e a separação entre trabalho ativo e referências portadas fazia a
navegação esconder metade do que existia. O produto também está mudando de
forma: vai ser sobretudo uma biblioteca de componentes e layouts, com telas de
feature entrando só temporariamente, em pull request.

O motor existe para servir ao time. Um contrato que o time contorna não protege
nada.

## Decisão

Na 0.7.0 (incompatível):

- Sai todo o ciclo de vida: `status`, `approvedAt`, a visão de referências
  portadas, legendas e contagens por status. Todo cenário registrado é
  simplesmente exibido.
- Sai toda a acessibilidade do motor: `a11y`, pares de contraste, modo teclado,
  ordem de tabulação, redução de movimento, ampliação de texto, a aba do
  Inspector e os utilitários de `src/a11y/` e de `/testing`.
- `persona` passa a ser opcional. Cenário sem persona tem permissões vazias, a
  menos que declare `permissions`.
- Um produto só de componentes, sem cenários nem rotas, é válido.

Continua: navegação, rotas, fixtures e adapters, estado de rede, viewport,
tema e idioma, deep links, handoff focado, catálogo de componentes, regras,
`util/date` e rótulos sobrescrevíveis.

## Consequências

- Acessibilidade deixa de ser garantida pelo motor. Se um produto quiser
  verificá-la, faz isso no próprio repositório, com as ferramentas que escolher.
- Aprovação deixa de ter registro no cenário. Quem precisar citar uma versão
  exata usa `commitUrl`, que continua existindo.
- Produtos em `^0.6.0` não são afetados: em 0.x o caret não sobe minor. Migrar é
  apagar campos; o guia está no `CHANGELOG.md` do motor.

## Alternativa descartada

Tornar `a11y` e `status` opcionais, mantendo as ferramentas. Manteria a
superfície da API, o código e as telas de algo que o time decidiu não usar, e
deixaria no motor uma promessa que ninguém cumpre.
