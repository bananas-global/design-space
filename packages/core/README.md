# @brucesantos/design-space

Motor neutro do Bananas Design Space. Fornece o ambiente — navegação por cenário,
deep links, controles de persona/dados/viewport/rede, painel de contexto e
ferramentas de acessibilidade — sem impor nenhum componente visual, token ou
identidade ao produto.

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

export const insuranceDenied: Scenario = {
  id: "finance.insurance-denied",
  title: "Convênio recusado",
  route: "/finance/claims/CLM-1042",
  persona: "financial-analyst",
  permissions: ["claims.read", "claims.retry"],
  fixture: "claim-denied-unimed",
  rules: ["retry-after-document-review"],
  a11y: {
    keyboard: "full",
    contrast: "AA",
    announces: ["claim.status", "retry.result"],
  },
  status: "approved",
};
```

`a11y` é obrigatório. Acessibilidade é campo do contrato, não auditoria de fim de
projeto: um cenário de convênio recusado em que a recusa não é anunciada para
leitor de tela está incompleto, não está pronto para aprovação.

## A URL é o estado

Todo controle é serializado na query string, então a mesma URL sempre produz a
mesma situação. `?scenario=<id>` sozinho já herda persona, fixture e estado de
rede declarados no cenário.

| Parâmetro | Efeito |
| --- | --- |
| `scenario` | Cenário ativo. Define os padrões dos demais. |
| `persona` | Troca o papel e as permissões. |
| `fixture` | Troca o conjunto de dados. |
| `network` | `success`, `loading`, `empty`, `error`, `slow`. |
| `viewport` | `fit`, `mobile`, `tablet`, `desktop`, `custom`. |
| `w` | Largura, quando `viewport=custom`. |
| `theme`, `locale`, `source` | Variações declaradas pelo produto. |
| `chrome=0` | Revisão limpa: oculta o chrome do ambiente. |
| `kb=1` | Modo teclado, com ordem de tabulação evidenciada. |
| `motion=1` | Movimento reduzido no palco. |
| `scale` | Ampliação de texto: `1`, `1.25`, `1.5`, `2`. |
| `panel=0` | Oculta o painel de contexto. |

## API

### Shell

- `DesignSpace` — o ambiente completo.
- `Home` — mapa de situações, usado na raiz.
- `Stage`, `StageEmpty`, `TabOrderOverlay` — partes do palco, expostas para casos
  fora do padrão.

### Registry e validação

- `createRegistry(product)` — índice consultável: busca por vocabulário de
  negócio, árvore de módulos, cobertura por status.
- `validateProduct(product)` / `validateScenario(scenario)` — validação em runtime
  do contrato. Pega fixture, persona, regra ou rota inexistente, que o TypeScript
  não alcança.

### Deploy e deep links

O motor não conhece provedor de hospedagem, e um Design Space que roda só local é
caso suportado: sem contexto, o ambiente é `development` e o cabeçalho da revisão
omite branch e commit.

- `getDeployContext(overrides)` — monta branch, commit, ambiente e origem absoluta
  a partir do que o produto informou em `ProductDefinition.deploy`. Não lê
  ambiente: o motor é biblioteca compilada e não alcança o build de quem o
  consome.
- `scenarioUrl(scenario, options)` — URL absoluta reproduzível.
- `commitUrl(scenario, { template })` — URL imutável para registrar aprovação. O
  template é do produto, com `{commit}` ou `{shortCommit}`.

### Dados

- `fixtureAdapter` — o padrão. Materializa os cinco estados de rede.
- `createHttpAdapter(options)` — adapter REST/GraphQL com fallback para fixture.
- `useScenarioData(...)` — resolução do cenário ativo pelo adapter selecionado.

### Acessibilidade

- `contrastRatio(fg, bg)`, `checkContrastPairs(pairs)`, `assertContrastPairs(pairs)`
  — razão de contraste do WCAG 2.x, com composição de alfa sobre o fundo.
  `assertContrastPairs` falha o build a partir de um teste do produto.
- `describeElement(el)` — papel, nome acessível, origem do nome e estados.
- `tabbableElements(root)` — ordem de tabulação real.
- `useKeyboardMode(enabled, ref)` — foco observado e ordem de tabulação medida.

### Testes

`@brucesantos/design-space/testing` — entrypoint separado, fora do bundle do
preview.

- `pathFor(scenario, overrides)` — caminho relativo para `page.goto`, deixando o
  `baseURL` do Playwright decidir entre preview e dev server.
- `testOrigin(fallback)` — lê `PREVIEW_URL` quando existe um ambiente publicado
  para testar; sem ela, o Playwright roda contra o dev server local.
- `assertValidProduct(product)` — falha o teste quando o contrato tem erro.
- `scenariosUnderTest(product)`, `keyboardScenarios(product)` — recortes para
  parametrizar jornadas.

## Atalhos

| Atalho | Efeito |
| --- | --- |
| `Shift` + `C` | Chrome do ambiente |
| `Shift` + `K` | Modo teclado |
| `Shift` + `P` | Painel de contexto |

## Fronteira

O motor **não** contém e não deve conter: componente visual, token, tipografia,
cor, ícone, persona de domínio, fixture, regra de negócio ou conteúdo de cliente.
Isso é exclusivo de cada produto — e é o que permite que Bloomy e Finaya
continuem parecendo produtos distintos.

## Licença

MIT.
