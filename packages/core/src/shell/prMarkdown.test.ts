import { describe, expect, it } from "vitest";

import { getDeployContext } from "../deploy/index.js";
import { createRegistry } from "../registry/index.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";
import { DEFAULT_LABELS } from "./labels.js";
import { buildPrMarkdown } from "./prMarkdown.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const preview = () => null;

const product: ProductDefinition = {
  id: "acme",
  name: "Acme",
  personas: [{ id: "analyst", name: "Analista", permissions: [] }],
  fixtures: [{ id: "orders", label: "Pedidos", data: {} }],
  routes: [
    { path: "/orders/:id", screen, name: "Detalhe do pedido", description: "Decisão do pedido." },
    { path: "/help", screen, name: "Ajuda" },
  ],
  scenarios: [
    {
      id: "orders.blocked",
      title: "Pedido bloqueado",
      route: "/orders/1042",
      persona: "analyst",
      fixture: "orders",
      expected: ["O motivo aparece junto da ação.", "A ação fica desabilitada."],
      components: ["actions.button", "feedback.notice"],
    },
    {
      id: "orders.allowed",
      title: "Pedido liberado",
      route: "/orders/1043",
      fixture: "orders",
      network: "slow",
      components: ["actions.button"],
    },
  ],
  components: [
    { id: "actions.button", name: "Botão", source: "core_components.ex → button/1", preview },
    { id: "feedback.notice", name: "Aviso | faixa", preview },
  ],
};

const registry = createRegistry(product);
const detail = registry.screen("/orders/:id")!;

describe("Copiar para o PR", () => {
  it("monta nome, links absolutos, tabela de componentes e comportamento esperado", () => {
    const markdown = buildPrMarkdown({
      screen: detail,
      variations: detail.variations,
      components: registry.componentsOfScreen(detail),
      deploy: getDeployContext({ env: "preview", branchUrl: "acme-git-feature.review.test" }),
      labels: DEFAULT_LABELS,
    });

    expect(markdown).toBe(`## Detalhe do pedido

Decisão do pedido.

\`/orders/:id\`

### Variações

- [Pedido bloqueado](https://acme-git-feature.review.test/orders/1042?scenario=orders.blocked&persona=analyst&fixture=orders)
- [Pedido liberado](https://acme-git-feature.review.test/orders/1043?scenario=orders.allowed&fixture=orders&network=slow)

### Componentes

| Componente | Origem |
| --- | --- |
| Botão (\`actions.button\`) | \`core_components.ex → button/1\` |
| Aviso \\| faixa (\`feedback.notice\`) | — |

### Comportamento esperado

**Pedido bloqueado**

- O motivo aparece junto da ação.
- A ação fica desabilitada.

**Pedido liberado**

Sem comportamento esperado declarado.
`);
  });

  it("acrescenta o link imutável do deployment com o commit", () => {
    const markdown = buildPrMarkdown({
      screen: detail,
      variations: detail.variations.slice(0, 1),
      components: [],
      deploy: getDeployContext({
        env: "preview",
        branchUrl: "acme-git-feature.review.test",
        deploymentUrl: "acme-abc1234.review.test",
        commit: "abc1234def5678",
      }),
      labels: DEFAULT_LABELS,
    });

    expect(markdown).toContain(
      "- [Pedido bloqueado](https://acme-git-feature.review.test/orders/1042?scenario=orders.blocked&persona=analyst&fixture=orders) · [Commit `abc1234`](https://acme-abc1234.review.test/orders/1042?scenario=orders.blocked&persona=analyst&fixture=orders)",
    );
    expect(markdown).not.toContain("### Componentes");
  });

  it("sem domínio de deployment, cita o commit como texto", () => {
    const markdown = buildPrMarkdown({
      screen: detail,
      variations: detail.variations.slice(0, 1),
      components: [],
      deploy: getDeployContext({ commit: "abc1234def5678" }),
      labels: DEFAULT_LABELS,
    });
    expect(markdown).toMatch(/\) · Commit `abc1234`\n/);
  });

  it("tela sem cenário vira uma variação Padrão com o link da rota", () => {
    const help = registry.screen("/help")!;
    const markdown = buildPrMarkdown({
      screen: help,
      variations: help.variations,
      components: [],
      deploy: getDeployContext({ branchUrl: "acme.review.test" }),
      labels: DEFAULT_LABELS,
      overrides: { handoff: { routes: ["/help"] } },
    });
    expect(markdown).toContain(
      "- [Padrão](https://acme.review.test/help?handoff=1&allowRoute=%2Fhelp)",
    );
  });
});
