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
- `persona` é opcional. Cenário sem persona tem permissões vazias, a menos que
  declare `permissions`.
- `components` lista os ids de `ComponentPreview` usados na tela. Alimenta
  "Componentes usados", o "Usado em" de cada componente e o "Copiar para o PR".

## O chrome

| Região | Conteúdo |
| --- | --- |
| Barra superior | Nome do produto; viewport (Celular 375, Tablet 768, Desktop 1280, Ajustar), girar, zoom 25–150%, copiar link, revisão limpa, tema, painel e — quando a validação tem algo a dizer — o indicador de diagnóstico. |
| Esquerda | **Telas** e **Componentes**, com contagem e busca sem acento nem caixa (nome, descrição, grupo, id e `source`). Componentes agrupados por `group`. Aba vazia some. Redimensionável. |
| Centro | O quadro do produto no tamanho do viewport, com zoom só de visualização. |
| Direita | **Variações** (cenários da tela ou fixtures do componente, mais persona e rede) e **Informações** (rota, intenção, pré-condições, ações, comportamento esperado, regras, componentes usados e **Copiar para o PR**). Redimensionável. |

Sem Home: a raiz abre a primeira tela na primeira variação ou, sem telas, o
primeiro componente. O tema segue o sistema, e a troca é lembrada.

### Copiar para o PR

Gera markdown com o nome da tela, um link absoluto por variação (com o link do
deployment e o commit quando o produto informa), a tabela componente → origem e
o comportamento esperado de cada variação.

### O quadro

O chrome renderiza `<iframe data-ds-frame>` apontando para o mesmo endereço com
`ds-frame=1`. Nesse modo, `<DesignSpace>` renderiza **só** o wrapper do produto e
a tela ou o preview. Trocar variação, persona ou rede vai por `postMessage`, sem
recarregar; trocar de tela ou de componente troca o endereço do quadro sem criar
entrada no histórico. Navegação feita pela UI do produto (`context.navigate`,
`openScenario` ou um link comum) volta para a URL do chrome. Os dois lados só
aceitam mensagem da mesma origem e da janela esperada.

## A URL é o estado

Todo controle é serializado na query string, então a mesma URL sempre produz a
mesma situação. `?scenario=<id>` sozinho já herda persona, fixture e estado de
rede declarados no cenário.

| Parâmetro | Efeito |
| --- | --- |
| `scenario` | Cenário ativo. Define os padrões dos demais. |
| `component` | Referência ativa no catálogo visual do produto. |
| `persona` | Troca o papel e as permissões. |
| `fixture` | Troca a fixture global do cenário ou a fixture local do componente ativo. |
| `network` | `success`, `loading`, `empty`, `error`, `slow`. |
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
  (`ScreenNode`) e suas variações.
- `screensFor({ handoff })`, `activeScenarios()`, `search()`,
  `searchScreens()`, `searchComponents()`, `componentsFor(handoff)` — aplicam o
  recorte; a busca não diferencia acento nem caixa (`normalizeSearch`).
- `componentsOfScreen(screen)`, `usagesOf(componentId)` — componentes de uma
  tela e telas de um componente, a partir de `Scenario.components`.
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
