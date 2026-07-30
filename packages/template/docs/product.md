# Produto — template

> Substitua este documento pela visão do produto real. A estrutura abaixo é o que
> um agente de IA e uma pessoa nova no projeto precisam ler antes de tocar em
> qualquer cenário.

## Visão

Fluxo de solicitação e aprovação de compras. Existe aqui como domínio de exemplo:
tem valor monetário, tem regra condicional, tem permissão e tem estado de exceção
— os quatro ingredientes que fazem um Design Space valer a pena.

## Vocabulário

O vocabulário é a interface com PO, negócio e cliente. Um nome errado aqui
aparece na navegação e na busca, e o time passa a traduzir mentalmente.

| Termo | Significado |
| --- | --- |
| Solicitação | Pedido de compra registrado por alguém do time. |
| Fila | Conjunto de solicitações aguardando decisão. |
| Decisão | Aprovar ou recusar, sempre com registro. |
| Documento | Anexo que comprova valor ou necessidade. |

## Módulos

### Solicitações

Registro, análise e decisão. Um único módulo de propósito: o template mostra a
estrutura, não a extensão.

## Personas

| Persona | Objetivo | Permissões |
| --- | --- | --- |
| Solicitante | Registrar uma solicitação e acompanhar o andamento. | `requests.read`, `requests.create` |
| Aprovador | Decidir sobre solicitações pendentes sem abrir o sistema financeiro. | `requests.read`, `requests.approve`, `requests.reject` |

## Regras

| Id | Regra |
| --- | --- |
| `approval-requires-attachment` | Solicitação acima de R$ 5.000,00 só pode ser aprovada com documento anexado. |
| `rejection-requires-reason` | Recusa exige justificativa. |

A implementação de cada regra vive em `src/rules/`, testada em
`tests/product.test.ts`. Regra sem teste é regra que a engenharia vai
reinterpretar.

## Cobertura de cenários

O fluxo crítico precisa de cenário de sucesso, vazio, erro, permissão e exceção.
O que existe hoje:

| Situação | Cenário | Cobre |
| --- | --- | --- |
| Fila com cinco solicitações | `requests.queue` | sucesso |
| Fila vazia | `requests.queue-empty` | vazio |
| Aprovação permitida | `requests.approve-allowed` | sucesso, anúncio |
| Aprovação bloqueada por falta de documento | `requests.approve-blocked-by-rule` | exceção, regra |
| Sem permissão para decidir | `requests.approve-no-permission` | permissão |

O estado de erro e o de carregamento não têm cenário próprio: são alcançáveis
pelo controle de rede em qualquer cenário. Um cenário dedicado só se justifica
quando a tela de erro tiver conteúdo específico daquela situação.
