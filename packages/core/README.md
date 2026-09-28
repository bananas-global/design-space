# @brucesantos/design-space

Motor neutro do Bananas Design Space. Fornece o ambiente — catálogo de
componentes e layouts, navegação por cenário, deep links, controles de
persona/dados/viewport/rede e painel de contexto — sem impor nenhum componente
visual, token ou identidade ao produto.

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

## O contrato de cenário

Um cenário combina intenção, persona, permissões, pré-condições, dados, ações,
regras e resultado esperado. É a unidade central: não é uma tela com dados
diferentes.

```ts
import type { Scenario } from "@brucesantos/design-space";

export const approveBlocked: Scenario = {
  id: "requests.approve-blocked",
  title: "Aprovação bloqueada por falta de documento",
  route: "/requests/REQ-2043",
  persona: "approver",
  permissions: ["requests.read", "requests.approve"],
  fixture: "request-without-document",
  rules: ["approval-needs-document"],
  expected: ["O motivo do bloqueio aparece junto da ação indisponível."],
};
```

O vocabulário do exemplo é genérico de propósito: o domínio é do produto, nunca do
motor.

`persona` é opcional. Cenário sem persona tem permissões vazias, a menos que
declare `permissions`. Todo cenário registrado aparece na navegação: não há
estado de ciclo de vida nem coleção separada (decisão 0011).

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
| `viewport` | `fit`, `mobile`, `tablet`, `desktop`, `custom`. |
| `w` | Largura, quando `viewport=custom`. |
| `theme`, `locale`, `source` | Variações declaradas pelo produto. |
| `appearance` | Aparência do chrome: omitido para dark, `light` para modo claro. |
| `chrome=0` | Revisão limpa: oculta o chrome do ambiente. |
| `panel=0` | Oculta o painel de contexto. |
| `handoff=1` | Ativa um recorte explícito de revisão/handoff. |
| `allowScenario` | Cenário permitido; pode ser repetido e autoriza também a rota do cenário. |
| `allowRoute` | Padrão de rota permitido, como `/requests/:id`; pode ser repetido. |
| `allowComponent` | Componente permitido; pode ser repetido. |

## Handoff focado por URL

O handoff é uma allowlist transportada junto dos demais controles. Ela filtra
Home, navegação, busca, flows e componentes. A raiz abre a
Home já filtrada; uma tentativa de abrir cenário, rota ou componente fora da
lista mostra um bloqueio claro sem montar a tela solicitada.

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

### Escopo no Inspector

Na aba Cenário, **Dados desta tarefa** reúne situação, reprodução, regras e
critérios; **Contexto herdado do produto e da persona** reúne objetivo e
permissões efetivas. Diagnóstico continua deliberadamente geral e identifica que
avalia o catálogo inteiro, inclusive fora do handoff.

## API

### Shell

- `DesignSpace` — o ambiente completo.
- `Home` — mapa de situações, usado na raiz. Em produto sem cenários, lista o
  catálogo de componentes.
- `Stage`, `StageEmpty` — partes do palco, expostas para casos fora do padrão.

### Rótulos do chrome

O chrome vem em português por padrão e é traduzível pelo produto, por grupo. O que
não for declarado fica no padrão.

```ts
theme: {
  labels: {
    network: { success: "Success", error: "Error" },
    topbar: { copyLink: "Copy link" },
    home: { lead: (total) => `${total} scenarios, each one a link.` },
  },
}
```

- `DEFAULT_LABELS` — o dicionário completo, em português.
- `EN_US_LABELS` — o dicionário completo em inglês dos Estados Unidos.
- `resolveLabels(override)` — mescla por grupo. Útil fora de React.
- `useLabels()` — os rótulos resolvidos, dentro do chrome.
- `Labels`, `LabelsOverride` — os tipos.

Rótulo de **produto** continua vindo do produto: nome de módulo, título de cenário,
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

O seletor na topbar alterna entre dark e light sem alterar tokens ou tema da UI
do produto. A escolha é serializada como `?appearance=light`, então links copiados
e a revisão limpa preservam a aparência escolhida.

### Registry e validação

- `createRegistry(product)` — índice consultável: busca por vocabulário de
  negócio, árvore de módulos, permissões efetivas.
- `activeScenarios()`, `treeFor()`, `orphansFor()` e `search()` — devolvem todo
  cenário registrado e aceitam `{ handoff }` para aplicar o recorte;
  `componentsFor(handoff)` aplica o mesmo recorte ao catálogo visual. `tree` e
  `issues` continuam completos.
- `validateProduct(product)` / `validateScenario(scenario)` — validação em runtime
  do contrato. Pega fixture, persona, regra ou rota inexistente, que o TypeScript
  não alcança. `persona` é opcional; `routes` vazio só é erro quando há
  cenários, então um produto que é só catálogo de componentes é válido.

### Catálogo de componentes

O motor fornece navegação, busca e deep link; cada preview continua sendo UI do
produto. Um produto pode ser só catálogo: com `modules`, `scenarios`, `fixtures` e
`routes` vazios, a Home lista os componentes por `group` e a navegação abre
direto neles.

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
`?component=actions.primary-button&fixture=disabled`. O seletor só aparece quando
o componente declara fixtures. Se a URL pedir uma fixture inexistente, o preview
usa `defaultFixture` (ou a primeira fixture) e o painel nomeia o fallback; a URL
inválida não é descartada silenciosamente.

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

## Atalhos

| Atalho | Efeito |
| --- | --- |
| `Command/Ctrl` + `K` ou `F` | Foco na busca da lateral |
| `↑` / `↓` | Percorrer resultados filtrados |
| `Shift` + `P` | Painel de contexto |

## Créditos

Os ícones dos presets de viewport são derivados do
[Lucide](https://lucide.dev/), disponibilizado sob licença MIT. Obrigado às
pessoas mantenedoras e contribuidoras do projeto. Os SVGs necessários são
incorporados ao motor, portanto não existe dependência de runtime do Lucide.

## Fronteira

O motor **não** contém e não deve conter: componente visual, token, tipografia,
cor, ícone, persona de domínio, fixture, regra de negócio ou conteúdo de cliente.
Isso é exclusivo de cada produto — e é o que permite que dois produtos sobre o
mesmo motor continuem parecendo produtos distintos.

Três coisas que também não pertencem ao motor, cada uma travada por teste:
provedor de hospedagem, texto visível fixo em componente do chrome e nome de
cliente em exemplo.

## Licença

MIT.
