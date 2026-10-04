# @brucesantos/design-space

Motor neutro do Bananas Design Space. Fornece o ambiente de revisão — telas e
componentes à esquerda, variações e informações à direita, deep links, controles
de persona/rede/viewport/zoom e o texto pronto para o PR — sem impor nenhum
componente visual, token ou identidade ao produto.

O chrome é o mesmo para todos os produtos: preto e branco, claro e escuro, sem
cor de cliente. A UI do produto roda num `<iframe>` da mesma origem e do mesmo
bundle, com a largura do viewport escolhido: CSS isolado nos dois sentidos, e
media queries respondendo como em produção.

```bash
pnpm add @brucesantos/design-space
```

## Uso

O produto entrega uma `ProductDefinition` e monta um único componente.

```tsx
import { DesignSpace } from "@brucesantos/design-space";
import "@brucesantos/design-space/styles.css";
import { productDefinition } from "./product";

export function App() {
  return <DesignSpace product={productDefinition} />;
}
```

## Telas e variações

**Uma tela é uma rota.** As **variações** de uma tela são os cenários cuja
`route` casa com o `path` dela — pelo mesmo casamento do roteador, então
`/requests/REQ-2043` é variação de `/requests/:id`, e `/requests/new` fica com a
rota literal. A ordem das telas é a de `routes`; a das variações, a de
`scenarios`. Rota sem cenário também é tela, aberta numa variação "Padrão".

```ts
routes: [
  { path: "/requests", screen: RequestList, name: "Fila de solicitações" },
  {
    path: "/requests/:id",
    screen: RequestDetail,
    name: "Detalhe da solicitação",
    description: "Análise e decisão de uma solicitação.",
  },
],
```

Sem `name`, a tela usa o título do primeiro cenário da rota e, na falta dele, o
`path`. Não existe módulo nem jornada (decisão 0012).

**Rota com parâmetro** (desde a 0.9.1): `params` dá um valor de exemplo para cada
`:param` (e para `*`, se houver). O motor usa o exemplo sempre que abre a tela
sem cenário — na lateral, na variação padrão, no "Usado em" de Informações e
no "Copiar para o PR":

```ts
{ path: "/orders/:id", screen: OrderDetail, name: "Detalhe do pedido", params: { id: "1042" } }
// abre em /orders/1042, não em /orders/:id
```

Sem `params`, o caminho continua literal, e a validação avisa quando nenhum
cenário cobre a rota. Exemplo que a rota não tem, ou que monta um caminho de
outra rota (`/orders/new`), também é aviso.

## Fluxos e controles (0.9)

Uma feature raramente é uma tela: é um **fluxo** de algumas telas, e cada tela
tem **componentes** que variam de forma independente. Desde a 0.9 as duas coisas
são declaradas na rota, e nada disso é obrigatório
([decisão 0013](../../docs/decisions/0013-fluxos-e-controles-por-componente.md)).

```ts
routes: [
  {
    path: "/orders",
    screen: OrderList,
    name: "Lista de pedidos",
    group: "Pedidos", // o fluxo: agrupa as telas na aba Telas
    expected: ["A lista mostra os pedidos do período."],
    components: ["data.table"],
    controls: [
      {
        id: "table",
        title: "Tabela de pedidos · table",
        component: "data.table", // link para o catálogo no painel
        note: "Linhas e ordenação.",
        controls: [
          {
            id: "rows",
            label: "Linhas",
            options: [
              { value: "many", label: "Muitas" },
              { value: "one", label: "Uma" },
              { value: "none", label: "Nenhuma" },
            ],
          },
        ],
      },
      {
        id: "overlay",
        title: "Sobreposição",
        controls: [
          {
            id: "overlay",
            label: "Aberta",
            options: [
              { value: "none", label: "Nenhuma" },
              { value: "cancel", label: "Cancelar pedido" },
            ],
          },
        ],
      },
    ],
  },
  { path: "/orders/:id", screen: OrderDetail, name: "Detalhe do pedido", group: "Pedidos" },
],
```

- **Aba Telas:** agrupada por `group`, em seções recolhíveis com contagem, como
  os componentes. Tela sem `group` fica no topo, sem título. A busca casa também
  o nome do fluxo.
- **Painel Variações:** uma pilha de **cartões**, sem acordeão nem contagem.
  Primeiro o cartão **Contexto** (persona, rede, e tema, idioma e fonte de dados
  quando o produto declara), depois um cartão por `ControlGroup` e, por fim, o
  cartão **Atalhos** com os cenários da tela (só quando existem). O título do
  cartão fica numa linha só; com `component`, uma seta ↗ ao lado abre o
  componente no catálogo, e a `note` do grupo aparece só como dica (`title`) do
  cabeçalho. **Todo controle é um select**, sem rótulo visível — as opções dizem
  o que são; o `label` fica para o leitor de tela e o filtro, e a `description`
  vira dica. Num componente, o cartão tem o nome dele e um select das fixtures.
  O filtro (`Cmd`/`Ctrl` + `F`) alcança grupos, controles e opções.
- **Na URL:** cada controle fora do padrão vai como `c.<id>=<value>`. Valor
  inválido cai no padrão e aparece como aviso no diagnóstico. Os `c.*` chegam ao
  quadro, e mudar um controle atualiza o quadro por mensagem, sem recarregar.
- **Na tela:** `context.controls` traz o valor de cada controle, com os padrões
  aplicados; `context.setControl(id, value)` muda um deles a partir da UI do
  produto (fechar um modal volta a sobreposição para "nenhuma") e atualiza a URL,
  e `context.setControls({ … })` muda vários numa única atualização. Desde a
  0.9.1, chamadas seguidas no mesmo handler se acumulam — cada uma parte do
  endereço mais recente, não do valor da última renderização —, inclusive dentro
  do quadro.
  Sem cenário, a tela monta os próprios dados sintéticos a partir dos controles —
  é o caso normal agora —, e o estado de rede do contexto continua valendo.
- **Navegando com controles:** `context.navigate("/orders", { controls: { rows:
  "one" } })` abre a tela de destino com esses controles (valor igual ao padrão
  da tela de destino não entra na URL). Ver [Navegação](#navegação).
- **Cenário como atalho:** `Scenario.controls` fixa uma combinação. Abrir o
  cenário aplica esses valores sobre os padrões; mudar um controle depois não
  troca de cenário, mas o atalho deixa de aparecer destacado quando a combinação
  deixa de ser a dele.

```ts
{ id: "orders.cancel", title: "Cancelando um pedido", route: "/orders",
  fixture: "orders", controls: { overlay: "cancel" }, expected: ["O modal pede confirmação."] }
```

```tsx
function OrderList({ context }: ScreenProps) {
  const rows = buildRows(context.controls.rows); // dado sintético do produto
  return (
    <>
      <Table rows={rows} />
      {context.controls.overlay === "cancel" && (
        <CancelModal onClose={() => context.setControl("overlay", "none")} />
      )}
      <button onClick={() => context.setControls({ rows: "many", overlay: "none" })}>Limpar</button>
    </>
  );
}
```

Informações mostra rota, fluxo, descrição, os controles com o valor atual, o
comportamento esperado (o do cenário ativo, senão `route.expected`) e os
componentes (`route.components` mais os do cenário). **Copiar para o PR**, numa
tela com fluxo, gera o markdown do fluxo inteiro: para cada tela, nome, rota,
link absoluto (com os controles atuais na tela aberta), controles disponíveis,
atalhos, comportamento esperado e a tabela componente → origem.

A validação checa ids de grupo e de controle únicos por tela, `default` entre as
opções e `Scenario.controls` usando controles e valores da tela do cenário; id de
componente inexistente em `route.components` ou `group.component` é aviso.

## O contrato de cenário

Um cenário combina intenção, persona, permissões, pré-condições, dados, ações,
regras e resultado esperado. O `title` é o nome da variação na lista.

```ts
import type { Scenario } from "@brucesantos/design-space";

export const approveBlocked: Scenario = {
  id: "requests.approve-blocked",
  title: "Aprovação bloqueada por falta de documento",
  intent: "Verificar se a regra fica legível na tela.",
  route: "/requests/REQ-2043",
  persona: "approver",
  permissions: ["requests.read", "requests.approve"],
  fixture: "request-without-document",
  rules: ["approval-needs-document"],
  expected: ["O motivo do bloqueio aparece junto da ação indisponível."],
  components: ["actions.primary-button", "feedback.notice"],
};
```

O vocabulário do exemplo é genérico de propósito: o domínio é do produto, nunca do
motor.

- `id` é qualquer id estável, minúsculo, em kebab-case com pontos opcionais.
  Precisa ser único; não precisa de prefixo.
- `persona` é opcional. Cenário sem persona usa a persona padrão do produto
  (`ProductDefinition.defaultPersona`, desde a 0.9.1) e, sem ela, tem permissões
  vazias, a menos que declare `permissions`.

### Persona padrão

`defaultPersona: "<id>"` na `ProductDefinition` é a persona efetiva de toda tela
e todo cenário sem persona própria: `context.persona`, `context.permissions` e
`context.can` refletem ela, também dentro do quadro. O seletor de persona do
painel deixa de oferecer "—" e mostra o padrão selecionado, e `persona=` só vai
para a URL quando difere do padrão efetivo. Persona do cenário e a escolhida no
painel continuam vencendo. Id inexistente é erro de validação. Sem
`defaultPersona`, nada muda.
- `components` lista os ids de `ComponentPreview` usados na tela. Alimenta
  "Componentes usados", o "Usado em" de cada componente e o "Copiar para o PR".

## O chrome

| Região | Conteúdo |
| --- | --- |
| Barra superior | Nome do produto; viewport (Celular 375, Tablet 768, Desktop 1280, Ajustar), girar, zoom 25–150%, copiar link, revisão limpa, tema, painel e — quando a validação tem algo a dizer — o indicador de diagnóstico. |
| Esquerda | **Telas** e **Componentes**, com contagem e busca sem acento nem caixa (nome, descrição, fluxo ou grupo, id e `source`). Telas agrupadas por fluxo (`route.group`), componentes por `group`. Redimensionável. |
| Centro | O quadro do produto no tamanho do viewport, com zoom só de visualização. |
| Direita | **Variações** (contexto no topo, controles da tela por componente e os cenários como atalhos; ou as fixtures do componente) e **Informações** (rota, fluxo, controles, intenção, pré-condições, ações, comportamento esperado, regras, componentes usados e **Copiar para o PR**). Redimensionável. |

Sem Home: a raiz abre a primeira tela na primeira variação ou, sem telas, o
primeiro componente. O tema segue o sistema, e a troca é lembrada.

### Copiar para o PR

Gera markdown com o nome da tela, um link absoluto por variação (com o link do
deployment e o commit quando o produto informa), a tabela componente → origem e
o comportamento esperado de cada variação. Tela com fluxo gera o fluxo inteiro
(ver [Fluxos e controles](#fluxos-e-controles-09)).

### O quadro

O chrome renderiza `<iframe data-ds-frame>` apontando para o mesmo endereço com
`ds-frame=1`. Nesse modo, `<DesignSpace>` renderiza **só** o wrapper do produto e
a tela ou o preview. Trocar variação, persona ou rede vai por `postMessage`, sem
recarregar; trocar de tela ou de componente troca o endereço do quadro sem criar
entrada no histórico. Navegação feita pela UI do produto (`context.navigate`,
`openScenario` ou um link comum) volta para a URL do chrome. Os dois lados só
aceitam mensagem da mesma origem e da janela esperada.

### Navegação

`context.navigate(to, options?)` — e um link comum dentro do quadro — segue duas
regras, conforme o destino:

- **Sem query e sem `controls`** (`navigate("/orders/1042")`): a query atual
  segue inteira; numa tela diferente, os `c.*` e a [query da
  tela](#query-da-tela) anterior ficam para trás.
- **Com query própria ou com `controls`** (`navigate("/orders?c.rows=one")`,
  `navigate("/orders", { controls: { rows: "one" } })`): o destino manda. Desde a
  0.9.1, o contexto do motor — tudo que não é `scenario`, `fixture`, `component`
  nem `c.*`: persona, rede, viewport, tema, idioma, fonte de dados, handoff e os
  parâmetros do chrome — é preservado, a menos que o destino traga o mesmo
  parâmetro. A query da tela segue da mesma forma, mas só na mesma tela; numa
  tela diferente, só entra a que o destino traz. Os `c.*` da tela anterior são
  descartados. A persona que vinha do
  cenário deixado para trás vira `persona=` explícito (quando difere da persona
  padrão), para quem está olhando não mudar; a rede e a fixture do cenário ficam
  com ele. `controls` vira `c.*` do destino, sem os valores que já são o padrão
  da tela de destino (ou o que o cenário de destino fixa).

`options.replace` substitui a entrada do histórico em vez de criar outra. O
recorte de handoff atual é sempre reaplicado.

"Mesma tela" é a mesma rota (`/orders/1` e `/orders/2` são a mesma tela) ou,
sem rota, o mesmo caminho. Ver
[0015](../../docs/decisions/0015-query-da-tela-e-da-tela.md).

## A URL é o estado

Todo controle é serializado na query string, então a mesma URL sempre produz a
mesma situação. `?scenario=<id>` sozinho já herda persona, fixture e estado de
rede declarados no cenário.

| Parâmetro | Efeito |
| --- | --- |
| `scenario` | Cenário ativo. Define os padrões dos demais. |
| `component` | Referência ativa no catálogo visual do produto. |
| `persona` | Troca o papel e as permissões. Omitido quando é o do cenário ou a persona padrão do produto. |
| `fixture` | Troca a fixture global do cenário ou a fixture local do componente ativo. Omitido quando é a do cenário. |
| `network` | `success`, `loading`, `empty`, `error`, `slow`. |
| `c.<id>` | Valor de um controle da tela. Omitido quando é o padrão (ou o que o cenário fixa). |
| `viewport` | `fit`, `mobile`, `tablet`, `desktop`; `custom` para links antigos. |
| `w` | Largura, quando `viewport=custom`. |
| `rotate=1` | Troca largura e altura do viewport. |
| `zoom` | Zoom da visualização, 25–150. Omitido em 100. |
| `theme`, `locale`, `source` | Variações declaradas pelo produto. |
| `appearance` | Tema do chrome, `light` ou `dark`. Omitido: última escolha ou o sistema. |
| `chrome=0` | Revisão limpa: oculta o chrome do ambiente. |
| `panel=0` | Oculta o painel direito. |
| `tab=info` | Abre o painel direito em Informações. |
| `handoff=1` | Ativa um recorte explícito de revisão/handoff. |
| `allowScenario` | Cenário permitido; pode ser repetido e autoriza também a rota do cenário. |
| `allowRoute` | Padrão de rota permitido, como `/requests/:id`; pode ser repetido. |
| `allowComponent` | Componente permitido; pode ser repetido. |

### Query da tela

Qualquer parâmetro fora da tabela acima é da tela do produto: aba, passo de um
fluxo, filtro, página. O motor não o lê, só o carrega, e a regra é a mesma dos
`c.*`: **vale enquanto a tela é a mesma.**

| O que acontece | Query da tela |
| --- | --- |
| Mudar persona, rede, viewport, zoom, tema, o painel ou um controle — pelo painel ou por `context.setControl`/`setControls` | Fica (desde a 0.9.3). |
| `context.navigate` ou link comum para a mesma tela | Fica; o que o destino traz manda na mesma chave. |
| `context.navigate` ou link comum para outra tela | Sai; só entra a que o destino traz (desde a 0.10.0). |
| Abrir tela, cenário ou componente pela lateral ou pelos atalhos do chrome | Sai. |
| "Copiar link" e "Copiar para o PR" | Vai junto. |

A tela pode escrever a própria query de duas formas: por `context.navigate`
(`navigate("/orders?aba=historico", { replace: true })`) ou direto pela History
API, como uma aba que se lembra de onde estava
(`history.replaceState(null, "", "?aba=historico")`). Desde a 0.10.0, o quadro
adota o que a tela escreve pela History API: guarda a query nova, avisa o
chrome — a URL do chrome e o link copiado passam a levá-la — e o próximo
controle a preserva. Só a query da tela é adotada: se a escrita mexer num
parâmetro do motor ou tirar o `ds-frame=1`, o quadro restaura o dele. O quadro
nunca cria entrada no histórico, então `pushState` vira uma entrada no histórico
do chrome. Escrita que troca o caminho continua fora do motor; para isso existe
`context.navigate`.

A tela lê essa query em `window.location.search`. É garantido que a URL do
quadro já está em dia quando a tela renderiza: o motor troca o endereço do
quadro com `replaceState` antes de atualizar o estado.

## Handoff focado por URL

O handoff é uma allowlist transportada junto dos demais controles. Ela filtra
telas, variações, busca e componentes. A raiz abre o primeiro item permitido;
uma tentativa de abrir cenário, rota ou componente fora da lista mostra um
bloqueio claro no quadro, sem montar a tela solicitada. Links internos da UI do
produto carregam o recorte.

```ts
import {
  scenarioUrl,
  type HandoffScope,
} from "@brucesantos/design-space";

const handoff = {
  scenarios: ["requests.approve-blocked", "requests.approve-allowed"],
  routes: ["/help/:topic"],
  components: ["actions.primary-button"],
} satisfies HandoffScope;

const url = scenarioUrl(approveBlocked, {
  origin: "https://review.example.test",
  overrides: { handoff },
});
```

O endereço resultante usa parâmetros repetíveis e legíveis:

```text
?scenario=requests.approve-blocked&persona=approver&fixture=request-without-document&handoff=1&allowScenario=requests.approve-allowed&allowScenario=requests.approve-blocked&allowRoute=%2Fhelp%2F%3Atopic&allowComponent=actions.primary-button
```

As listas são uma união: cenários tornam suas próprias rotas acessíveis, rotas
explícitas cobrem páginas sem cenário e componentes precisam ser listados
separadamente. `applyHandoffScope()` e `parseHandoffScope()` constroem ou leem o
mesmo contrato em URLs próprias.

Este recorte é um bloqueio de foco/UX, **não segurança**. O bundle e o catálogo
continuam no navegador. Preview público que precisa ocultar de fato o restante do
produto exige build separado para o recorte ou autenticação/autorização no
produto que publica o preview.

O indicador de diagnóstico continua deliberadamente geral: avalia o catálogo
inteiro, inclusive fora do handoff.

## API

### Shell

- `DesignSpace` — o ambiente completo: chrome no documento de cima, UI do
  produto no quadro.
- `StageEmpty` — estado vazio neutro, para `notFound` e casos fora do padrão.
- `FRAME_PARAM`, `FRAME_ATTRIBUTE` — o parâmetro do modo quadro e o atributo do
  `<iframe>`.

### Rótulos do chrome

O chrome vem em português por padrão e é traduzível pelo produto, por grupo. O que
não for declarado fica no padrão.

```ts
theme: {
  labels: {
    network: { success: "Success", error: "Error" },
    topbar: { copyLink: "Copy link" },
    info: { copyForPr: "Copy for PR" },
  },
}
```

- `DEFAULT_LABELS` — o dicionário completo, em português.
- `EN_US_LABELS` — o dicionário completo em inglês dos Estados Unidos.
- `resolveLabels(override)` — mescla por grupo. Útil fora de React.
- `useLabels()` — os rótulos resolvidos, dentro do chrome.
- `Labels`, `LabelsOverride` — os tipos.

Rótulo de **produto** continua vindo do produto: nome de tela, título de cenário,
nome de persona, rótulo de fixture.

Para usar o chrome integralmente em en-US:

```ts
import { EN_US_LABELS } from "@brucesantos/design-space";

const product = {
  // ...
  theme: {
    locales: ["en-US"],
    labels: EN_US_LABELS,
  },
};
```

### Aparência do chrome

Preto e branco, igual em todo produto. O botão de tema alterna claro e escuro sem
tocar na UI do produto; a escolha vai para `?appearance=` e fica lembrada no
navegador. Sem escolha, vale o `prefers-color-scheme` do sistema. Não existe
tema, cor ou logo por produto.

### Registry e validação

- `createRegistry(product)` — índice consultável.
- `screens`, `screen(id)`, `screenForPath(path)`, `screenOf(scenario)` — telas
  (`ScreenNode`) e suas variações. `ScreenNode.href` é o caminho da tela sem
  cenário, com os exemplos de `route.params`.
- `defaultPersona` — a persona padrão do produto, quando registrada; entra em
  `permissionsOf(scenario)` para cenário sem persona.
- `screensFor({ handoff })`, `activeScenarios()`, `search()`,
  `searchScreens()`, `searchComponents()`, `componentsFor(handoff)` — aplicam o
  recorte; a busca não diferencia acento nem caixa (`normalizeSearch`).
- `componentsOfScreen(screen, scenario?)`, `usagesOf(componentId)` — componentes
  de uma tela e telas de um componente, a partir de `route.components` e
  `Scenario.components`.
- `flows(options)`, `flowOf(screen)` — telas agrupadas por fluxo (`FlowNode`).
  `controlsOf(screen)` e `resolveControls(screen, { scenario, requested })` —
  controles da tela e seus valores (padrão → cenário → URL), com os pedidos
  inválidos em `invalid` (`ControlResolution`).
- `validateProduct(product)` / `validateScenario(scenario)` — validação em runtime
  do contrato. Pega fixture, persona, regra ou rota inexistente, rota duplicada,
  id duplicado e componente citado sem registro — o que o TypeScript não
  alcança. `routes` vazio só é erro quando há cenários, então um produto que é
  só catálogo de componentes é válido.

### Catálogo de componentes

O motor fornece navegação, busca e deep link; cada preview continua sendo UI do
produto. Um produto pode ser só catálogo: com `scenarios`, `fixtures` e `routes`
vazios, a aba Telas some e a raiz abre o primeiro componente. As **variações** de
um componente são as `fixtures` dele; `source` diz de onde ele vem no sistema
real.

```tsx
type ButtonData = {
  label: string;
  disabled?: boolean;
};

function PrimaryButtonPreview({
  fixture,
  data,
  viewport,
  themeMode,
  locale,
}: ComponentPreviewProps<ButtonData>) {
  return (
    <button disabled={data?.disabled} data-viewport={viewport.id}>
      {data?.label ?? fixture?.label ?? "Botão"}
    </button>
  );
}

const product: ProductDefinition = {
  // ...
  components: [
    {
      id: "actions.primary-button",
      name: "Botão primário",
      group: "Ações",
      description: "Ação principal da página",
      source: "components/button.ex → button/1",
      preview: PrimaryButtonPreview,
      defaultFixture: "default",
      fixtures: [
        {
          id: "default",
          label: "Padrão",
          description: "Ação pronta para uso.",
          data: { label: "Continuar" },
        },
        {
          id: "disabled",
          label: "Desabilitado",
          data: () => ({ label: "Continuar", disabled: true }),
        },
        {
          id: "long-content",
          label: "Conteúdo longo",
          data: { label: "Continuar para a próxima etapa do processo" },
        },
      ],
    },
  ],
};
```

Abrir o exemplo produz
`?component=actions.primary-button&fixture=default`; trocar os dados para o
estado desabilitado produz
`?component=actions.primary-button&fixture=disabled`. Se a URL pedir uma fixture
inexistente, o preview usa `defaultFixture` (ou a primeira fixture) e o painel
nomeia o fallback; a URL inválida não é descartada silenciosamente.

`ComponentPreview`, `ComponentPreviewFixture` e `ComponentPreviewProps` são os
tipos públicos. Um preview 0.3.0 sem props continua compatível:

```tsx
function StatusPreview() {
  return <StatusBadge status="approved" />;
}
```

### Três tipos de estado

- **Fixture de cenário:** vive em `ProductDefinition.fixtures` e materializa uma
  situação completa, com persona, permissões, regras e intenção.
- **Fixture de componente:** vive em `ComponentPreview.fixtures`, tem escopo
  somente naquele componente e representa dados como padrão, preenchido, vazio,
  carregando, erro, desabilitado ou conteúdo longo. Não recebe nem simula
  `ScenarioContext`.
- **Estado interativo local:** modal aberto, checkbox marcado, hover ou foco
  continuam no próprio preview. Não precisam de uma segunda abstração de
  variants.

### Deploy e deep links

O motor não conhece provedor de hospedagem, e um Design Space que roda só local é
caso suportado: sem contexto, o ambiente é `development` e o cabeçalho da revisão
omite branch e commit.

- `getDeployContext(overrides)` — monta branch, commit, ambiente e origem absoluta
  a partir do que o produto informou em `ProductDefinition.deploy`. Não lê
  ambiente: o motor é biblioteca compilada e não alcança o build de quem o
  consome.
- `scenarioUrl(scenario, options)` — URL absoluta reproduzível.
- `componentUrl(component, options)` — URL absoluta do componente com sua fixture.
- `commitUrl(scenario, { template })` — URL imutável do cenário num commit. O
  template é do produto, com `{commit}` ou `{shortCommit}`.

### Dados

- `fixtureAdapter` — o padrão. Materializa os cinco estados de rede.
- `createHttpAdapter(options)` — adapter REST/GraphQL com fallback para fixture.
- `useScenarioData(...)` — resolução do cenário ativo pelo adapter selecionado.

### Testes

`@brucesantos/design-space/testing` — entrypoint separado, fora do bundle do
preview.

- `pathFor(scenario, overrides)` — caminho relativo para `page.goto`, deixando o
  `baseURL` do Playwright decidir entre preview e dev server.
- `testOrigin(fallback)` — lê `PREVIEW_URL` quando existe um ambiente publicado
  para testar; sem ela, o Playwright roda contra o dev server local.
- `assertValidProduct(product)` — falha o teste quando o contrato tem erro.
- `FRAME_SELECTOR` — o seletor do quadro. A UI do produto está num iframe:

```ts
await page.goto(pathFor(scenario));
const app = page.frameLocator(FRAME_SELECTOR);
await expect(app.getByRole("heading", { name: "Fila" })).toBeVisible();
await expect(page).toHaveURL(/scenario=/); // o chrome fica em `page`
```

## Atalhos

| Atalho | Efeito |
| --- | --- |
| `Command/Ctrl` + `K` | Foco na busca da lateral |
| `Shift` + `C` | Revisão limpa: esconde e mostra o chrome |
| `Command/Ctrl` + `F` | Foco no filtro do painel direito |

Os três funcionam também com o foco dentro do quadro; `Shift` + `C`, fora de
campos de texto.

## Créditos

Os ícones do chrome seguem o traço do [Lucide](https://lucide.dev/),
disponibilizado sob licença MIT. Obrigado às pessoas mantenedoras e
contribuidoras do projeto. Os SVGs são incorporados ao motor, portanto não existe
dependência de runtime do Lucide.

## Fronteira

O motor **não** contém e não deve conter: componente visual, token, tipografia,
cor, ícone, persona de domínio, fixture, regra de negócio ou conteúdo de cliente.
Isso é exclusivo de cada produto — e é o que permite que dois produtos sobre o
mesmo motor continuem parecendo produtos distintos. O chrome em preto e branco é
ferramenta, não identidade: a identidade do cliente fica inteira dentro do
quadro.

Três coisas que também não pertencem ao motor, cada uma travada por teste:
provedor de hospedagem, texto visível fixo em componente do chrome e nome de
cliente em exemplo.

## Licença

MIT.
