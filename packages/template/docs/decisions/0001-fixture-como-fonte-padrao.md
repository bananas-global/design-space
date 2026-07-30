# 0001 — Fixture como fonte padrão de dados

**Data:** 2026-07-30
**Status:** aceita

## Contexto

O Design Space precisa reproduzir situações específicas do produto — solicitação
de alto valor sem documento, fila vazia, perfil sem permissão. Duas formas de
conseguir isso: ligar em uma API real (staging) ou modelar dados sintéticos
locais.

## Decisão

Fixture sintética e determinística é a fonte padrão. API real entra apenas como
adapter opcional, por branch, com justificativa registrada.

## Consequências

- A mesma URL produz sempre a mesma situação. Sem isso, regressão visual e
  aprovação por link não funcionam.
- O ambiente roda sem credencial, banco ou pipeline de produção.
- Como não há dado real, o preview pode ser público sem risco de exposição de
  dado pessoal.
- Em troca, uma divergência entre a fixture e o que a API real devolve não é
  detectada aqui. Isso é aceito: o Design Space especifica experiência pretendida,
  e a validação contra o sistema real acontece no QA depois da implementação.

## Alternativa descartada

Espelhar staging por padrão. Descartada porque tornaria o ambiente dependente de
disponibilidade externa, quebraria o determinismo e reintroduziria a necessidade
de proteger o preview.
