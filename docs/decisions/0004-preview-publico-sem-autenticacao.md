# 0004 — Preview público, sem autenticação

**Data:** 2026-07-30
**Status:** aceita
**Alcance:** todos os Design Spaces
**Decidido por:** Bruno Santos

## Decisão

Vercel Authentication desligada para preview, em todos os projetos. Quem tem o
link abre, sem conta e sem login.

Não é decisão caso a caso: faz parte do modelo.

## Modelo de proteção

URL não adivinhável mais o header `X-Robots-Tag: noindex, nofollow`, que o
`vercel.json` do template já manda. É isso — o mesmo modelo de link compartilhado
que o Figma usa há anos e que o time já opera no dia a dia.

## Por quê

Porque é o ponto do ambiente: PO, negócio e cliente abrem uma situação e discutem
regra a partir de um link. Qualquer barreira cobra atrito exatamente de quem mais
precisa revisar sem esforço.

Fechar também custa mais do que parece. **Vercel Authentication exige que cada
pessoa que revisa seja membro do time na Vercel**, e no plano Pro seat é pago —
mandar um fluxo para um cliente deixaria de ser mandar um link e passaria a ser
adicionar pessoa e pagar por revisor.

> O documento de arquitetura no Notion (§10.5) descreve ligar a autenticação como
> "um toggle". Não é, pelo motivo acima. Vale corrigir na fonte.
