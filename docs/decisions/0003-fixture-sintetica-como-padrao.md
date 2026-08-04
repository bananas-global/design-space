# 0003 — Fixture sintética como fonte padrão de dados

**Data:** 2026-07-30
**Status:** aceita
**Alcance:** todos os Design Spaces

## Contexto

Um Design Space precisa reproduzir situações específicas — solicitação recusada,
permissão faltando, cliente com verificação pendente. Duas formas de conseguir
isso: ligar em uma API real (staging) ou modelar dados sintéticos locais.

## Decisão

Fixture sintética e determinística é a fonte padrão. API real entra apenas como
adapter opcional, por branch, com justificativa registrada no produto.

## Consequências

- A mesma URL produz sempre a mesma situação. Sem isso, regressão visual e
  aprovação por link não funcionam.
- O ambiente roda sem credencial, banco ou pipeline de produção — que é a
  independência do stack real que justifica o projeto inteiro.
- Em troca, uma divergência entre a fixture e o que a API real devolve não é
  detectada aqui. Isso é aceito: o Design Space especifica a experiência
  pretendida, e a validação contra o sistema real acontece no QA depois da
  implementação.

## Alternativa descartada

Espelhar staging por padrão. Descartada porque tornaria o ambiente dependente de
disponibilidade externa e quebraria o determinismo.
