# Handoff

Modelo de entrega para engenharia. Copie a seção "Modelo" para o ticket.

## O que este handoff é

Uma **especificação executável**, não código de produção. Quando o stack real for
diferente de React — Phoenix, Flutter, o que for — a engenharia traduz o
comportamento descrito aqui. O código React deste repositório serve como
referência precisa de estado, conteúdo e interação, não como fonte a ser copiada.

Declarar isso no próprio handoff evita o risco mais caro do processo: alguém
assumir que deve portar o React para o stack real linha por linha.

## O que precisa ir junto

1. **URL de commit** do cenário, não a de branch. A URL de branch muda de
   conteúdo a cada push, então uma aprovação registrada nela não é uma aprovação.
2. **Id do cenário**, para que a conversa aponte para a mesma situação.
3. **Regras** que governam a situação, com id.
4. **Critérios de aceite**, que vêm de `expected` no cenário.
5. **Estados alcançáveis** — sucesso, vazio, erro, carregamento, sem permissão —
   e como abrir cada um por URL.
6. **Contrato de acessibilidade**: cobertura de teclado, nível de contraste e os
   eventos que precisam ser anunciados.
7. **Assets** exclusivos, quando houver.

## Modelo

```markdown
## Cenário
`requests.approve-blocked-by-rule` — Aprovação bloqueada por falta de documento

## Referência aprovada
https://projeto-<hash>-<escopo>.vercel.app/requests/REQ-2043?scenario=requests.approve-blocked-by-rule

Commit: <sha completo>
Status do cenário: aprovado

## Persona e permissões
Aprovador · `requests.read`, `requests.approve`, `requests.reject`

## Pré-condições
- Solicitação acima de R$ 5.000,00 sem documento anexado.

## Regras
- `approval-requires-attachment` — solicitação acima de R$ 5.000,00 só pode ser
  aprovada com documento anexado.

## Comportamento esperado
- O botão Aprovar aparece desabilitado, não escondido.
- O motivo aparece na tela e é associado ao botão para leitor de tela.
- A ação de recusar continua disponível.

## Estados alcançáveis
| Estado | Como abrir |
| --- | --- |
| Sucesso | `?scenario=requests.approve-allowed` |
| Vazio | `?scenario=requests.queue-empty` |
| Erro | `?scenario=requests.queue&network=error` |
| Carregando | `?scenario=requests.queue&network=loading` |
| Sem permissão | `?scenario=requests.approve-no-permission` |

## Acessibilidade
- Jornada completável só por teclado.
- Contraste WCAG 2.2 AA nos tokens em uso.
- Anunciar: `request.decision`.

## Observação
Especificação executável. O stack real deste produto é <stack>; traduzir
comportamento, não portar componentes.
```

## Depois do release

QA e design comparam o implementado com o cenário aprovado. Diferença
intencional atualiza o Design Space **ou** é registrada como decisão em
`docs/decisions/`. Quando o comportamento chega em produção, o `status` do
cenário vira `implemented` — e a partir daí o sistema real é a fonte de verdade
do comportamento entregue, não este repositório.

É esse passo que evita que a referência envelheça em silêncio.
