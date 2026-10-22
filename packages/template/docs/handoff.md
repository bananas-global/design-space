# Handoff

Como uma tela desenhada aqui chega à engenharia. Nada se copia à mão: o
critério é escrito uma vez, no cenário, e a descrição do PR é gerada dele a
cada push.

## O que este handoff é

Uma **especificação executável**, não código de produção. Quando o stack real for
diferente de React — Phoenix, Flutter, o que for — a engenharia traduz o
comportamento descrito aqui. O código React deste repositório serve como
referência precisa de estado, conteúdo e interação, não como fonte a ser copiada.

Declarar isso no próprio handoff evita o risco mais caro do processo: alguém
assumir que deve portar o React para o stack real linha por linha.

## Onde o critério vive

No registro, e só nele. Cada cenário declara:

| Campo | O que é |
| --- | --- |
| `intent` | O que a situação mostra ou quer verificar. |
| `preconditions` | O que precisa ser verdade antes, em linguagem de negócio. |
| `actions` | O que a persona pode fazer ali. |
| `expected` | O comportamento esperado: o critério de aceite, uma linha por comportamento verificável. |
| `rules` | Os ids das regras que governam a situação. |
| `components` | Os ids do catálogo que a tela usa; o catálogo dá a origem no sistema real (`source`). |

A rota pode ter o seu próprio `expected`, para o comportamento da tela que não
depende de variação.

Escreva o comportamento, não o dado da fixture. "O cabeçalho mostra o nome da
operadora e o registro ANS" serve para conferir o sistema real; "Unimed, ANS
999901" só vale na fixture, e quem valida a entrega vai procurar esses valores
onde eles não existem.

## A descrição do PR

O `design-space-pr` roda no CI a cada push de um PR, compara o registro do PR com
o da base e reescreve a descrição:

- **Nada se preenche à mão.** Numa descrição em branco, ela é só o bloco gerado.
  O que já estiver escrito fora do bloco fica como está.
- **Dentro do bloco**, entre `<!-- design-space:pr:start -->` e
  `<!-- design-space:pr:end -->`, os critérios de aceite das telas que o PR cria
  ou altera: link de cada cenário (quando o preview informa a origem), `intent`,
  pré-condições, ações, comportamento esperado numerado, regras com o enunciado,
  o `ticket` do cenário (link de qualquer ferramenta) e a tabela de componentes.
  Os cenários que mudaram no PR vêm marcados como novo ou alterado, e os
  removidos aparecem pelo nome.

O bloco abre com um recado para quem implementa ou valida, inclusive agentes: ele
é a referência do comportamento e vale mais que a descrição do ticket; nomes,
números e datas são sintéticos; divergência se aponta, não se resolve escolhendo
um lado; e o bloco não se edita, porque é reescrito no próximo push.

Para mudar um critério, mude o cenário e faça push. Para conferir o resultado
sem abrir PR:

```bash
pnpm exec design-space-pr --body <arquivo com a descrição atual> --base <checkout da main>
```

### No CI

O passo no workflow do PR precisa de `pull-requests: write`:

```yaml
permissions:
  contents: read
  pull-requests: write

# …depois de instalar as dependências:
- name: Critérios de aceite na descrição do PR
  if: github.event_name == 'pull_request'
  run: pnpm exec design-space-pr --origin "<origem do preview deste PR>"
  env:
    GH_TOKEN: ${{ github.token }}
```

Sem `--origin`, o bloco sai sem links. O produto que publica um preview por PR
passa a origem dele.

## URL focada no trabalho autorizado

Monte o endereço entregue à engenharia com um `HandoffScope`. Cenários listados
aparecem como variações das suas telas, na busca e na navegação, e autorizam as
próprias rotas. Rotas
sem cenário e componentes isolados entram nas listas correspondentes.

```ts
import { scenarioUrl, type HandoffScope } from "@brucesantos/design-space";

const handoff = {
  scenarios: [
    "requests.approve-blocked-by-rule",
    "requests.approve-allowed",
  ],
  routes: ["/requests/:id/history"],
  components: ["actions.primary-button"],
} satisfies HandoffScope;

const implementationUrl = scenarioUrl(blockedScenario, {
  origin: commitOrigin,
  overrides: { handoff },
});
```

O link continua reproduzindo viewport, tema, idioma e controles quando eles forem
incluídos nos overrides. Telas, variações, busca e catálogo visual mostram
somente a allowlist. Abrir algo fora dela produz uma mensagem
explícita em vez de montar a tela solicitada.

Esse recorte reduz ambiguidade e distração; **não é segurança**. O catálogo e o
bundle completo ainda chegam ao navegador. Se o preview público precisar ocultar
o restante do produto, publique um build separado contendo somente o handoff ou
proteja o ambiente com autenticação e autorização próprias.

## Depois do release

QA e design comparam o implementado com o cenário entregue. Diferença
intencional atualiza o Design Space **ou** é registrada como decisão em
`docs/decisions/`. Quando o comportamento chega em produção, o sistema real passa
a ser a fonte de verdade do comportamento entregue: o cenário que só existia para
o handoff pode sair do repositório.
