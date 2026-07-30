# 0003 — Ação bloqueada explica o motivo, em vez de desaparecer

**Data:** 2026-07-30
**Status:** aceita

## Contexto

Quando uma regra de negócio ou uma permissão impede uma ação, existem duas
respostas comuns de interface: esconder o controle, ou mantê-lo visível e
desabilitado com explicação.

Esconder é mais limpo visualmente e é o padrão que a maioria dos sistemas adota.

## Decisão

O controle permanece visível e desabilitado, com o motivo do bloqueio na tela e
associado ao botão por `aria-describedby`.

## Raciocínio

Ação que desaparece sem explicação é a forma mais comum de tornar uma regra de
negócio invisível. O efeito prático, observado repetidamente em suporte: o
usuário conclui que o sistema está quebrado, ou pede a alguém com outro perfil
para "tentar aí". A regra existe, mas ninguém a aprende pela interface.

Há também um efeito no handoff. Quando o protótipo esconde a ação, a engenharia
não tem como saber se ela deveria estar oculta, desabilitada ou ausente do
backend — e escolhe por conta. Manter visível com motivo torna a regra parte da
especificação em vez de parte da suposição.

## Consequências

- Toda ação condicional precisa de um motivo redigido em linguagem de negócio.
  Isso é trabalho extra de conteúdo, e é deliberado.
- O componente `Button` recebe `unavailableReason` em vez de o chamador decidir
  esconder. A prop torna o caminho correto o mais fácil.
- O motivo é anunciado por leitor de tela junto do botão, então a informação não
  é exclusiva de quem vê a tela.

## Exceção

Ação que a persona **nunca** terá acesso, em nenhuma circunstância, pode ser
omitida: manter visível um controle permanentemente indisponível é ruído, não
informação. A diferença é entre "você não pode agora" e "isto não é para você".
