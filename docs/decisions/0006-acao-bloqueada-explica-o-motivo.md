# 0006 — Ação bloqueada explica o motivo, em vez de desaparecer

**Data:** 2026-07-30
**Status:** aceita
**Alcance:** convenção de todos os Design Spaces

## Contexto

Quando uma regra de negócio ou uma permissão impede uma ação, existem duas
respostas comuns de interface: esconder o controle, ou mantê-lo visível e
desabilitado com explicação.

Esconder é mais limpo visualmente e é o que a maioria dos sistemas faz.

## Decisão

O controle permanece visível e desabilitado, com o motivo na tela e associado ao
botão por `aria-describedby`.

O motivo é redigido em linguagem de operação, não de sistema:

- ✅ "Seu perfil não cancela atendimentos. Peça à recepção líder."
- ✅ "A tolerância é de 15 minutos. Faltam 7 para poder registrar ausência."
- ✅ "Falta anexar: Relatório clínico assinado, Laudo do exame anterior."
- ❌ "Permissão insuficiente."
- ❌ "Ação indisponível."

## Raciocínio

Ação que desaparece sem explicação torna a regra de negócio invisível. O efeito
prático, observável em suporte: a pessoa conclui que o sistema está quebrado, ou
pede a alguém com outro perfil para "tentar aí". A regra existe e ninguém a aprende
pela interface.

Há também um efeito no handoff. Quando o protótipo esconde a ação, a engenharia
não tem como saber se ela deveria estar oculta, desabilitada ou ausente do backend
— e escolhe por conta. Manter visível com motivo torna a regra parte da
especificação em vez de parte da suposição.

O terceiro motivo é o mais concreto: dizer **quantos minutos faltam** ou **quais
documentos faltam** transforma um bloqueio em uma instrução.

## Como isto é compartilhado

**O padrão é compartilhado; o componente, não.** Cada produto implementa seu
próprio `Button` com uma prop de motivo — `unavailableReason` no Bloomy e na
Finaya. Um botão compartilhado no motor faria o raio de canto de um cliente mexer
no outro.

Ver [`AGENTS.md`](../../AGENTS.md) para os critérios de extração.

## Exceção

Ação que a persona **nunca** terá acesso, em nenhuma circunstância, pode ser
omitida — é o caso do drawer do Bloomy, que esconde módulos que o perfil não
alcança. A diferença é entre "você não pode agora" e "isto não é para você".
