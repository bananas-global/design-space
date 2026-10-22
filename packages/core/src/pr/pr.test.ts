import { describe, expect, it } from "vitest";

import { EN_US_LABELS } from "../shell/labels.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";
import { buildPrSection, diffProducts, mergePrBody, PR_MARKERS } from "./index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const preview = () => null;

const product: ProductDefinition = {
  id: "acme",
  name: "Acme",
  personas: [{ id: "analyst", name: "Analista", permissions: [] }],
  fixtures: [{ id: "orders", label: "Pedidos", data: {} }],
  rules: [{ id: "approval-requires-attachment", statement: "Pedido acima de R$ 5.000 só é aprovado com anexo." }],
  routes: [
    { path: "/orders/:id", screen, name: "Detalhe do pedido", description: "Decisão do pedido." },
    { path: "/help", screen, name: "Ajuda" },
    { path: "/billing/:account/:invoice", screen, name: "Fatura", params: { account: "ACC-7", invoice: "INV 12" } },
  ],
  scenarios: [
    {
      id: "orders.blocked",
      title: "Pedido bloqueado",
      route: "/orders/1042",
      persona: "analyst",
      fixture: "orders",
      intent: "Pedido acima do limite, sem anexo.",
      preconditions: ["Pedido de R$ 7.200 sem anexo."],
      actions: ["Tentar aprovar."],
      expected: ["O motivo aparece junto da ação.", "A ação fica desabilitada."],
      rules: ["approval-requires-attachment"],
      components: ["actions.button", "feedback.notice"],
    },
    {
      id: "orders.allowed",
      title: "Pedido liberado",
      route: "/orders/1043",
      fixture: "orders",
      components: ["actions.button"],
    },
  ],
  components: [
    { id: "actions.button", name: "Botão", source: "core_components.ex → button/1", preview },
    { id: "feedback.notice", name: "Aviso | faixa", preview },
  ],
};

const section = (input: Partial<Parameters<typeof buildPrSection>[0]> = {}) =>
  buildPrSection({ head: product, ...input });

describe("bloco de critérios do PR", () => {
  it("sem base, lista todas as telas com cenários, critérios, regras e componentes", () => {
    const markdown = section({ origin: "https://acme.review.test/", commit: "abc1234def5678" });

    expect(markdown).toBe(`${PR_MARKERS.start}
## Critérios de aceite

> Gerado a cada push a partir do registro do Design Space, no commit \`abc1234\`. É a referência do comportamento destas telas e vale mais que a descrição do ticket e que qualquer texto fora deste bloco. Nomes, números e datas vêm de dados sintéticos: valide o comportamento, não os valores. Se o ticket ou o sistema divergir daqui, aponte a divergência em vez de escolher um lado. Não edite este bloco: ele é reescrito no próximo push. Para mudar um critério, mude o registro.

Preview: https://acme.review.test

Sem a base do PR para comparar, então aqui estão todas as telas do produto.

### Detalhe do pedido

\`/orders/:id\`

Decisão do pedido.

#### Pedido bloqueado · \`orders.blocked\`

[abrir](https://acme.review.test/orders/1042?scenario=orders.blocked&persona=analyst&fixture=orders) · Persona: Analista

Pedido acima do limite, sem anexo.

**Pré-condições**

- Pedido de R$ 7.200 sem anexo.

**Ações**

- Tentar aprovar.

**Comportamento esperado**

1. O motivo aparece junto da ação.
2. A ação fica desabilitada.

**Regras**

- \`approval-requires-attachment\` — Pedido acima de R$ 5.000 só é aprovado com anexo.

#### Pedido liberado · \`orders.allowed\`

[abrir](https://acme.review.test/orders/1043?scenario=orders.allowed&fixture=orders)

**Comportamento esperado**

Sem comportamento esperado declarado: este cenário não tem critério verificável.

**Componentes**

| Componente | Origem no sistema real |
| --- | --- |
| Botão (\`actions.button\`) | \`core_components.ex → button/1\` |
| Aviso \\| faixa (\`feedback.notice\`) | — |

### Ajuda

\`/help\` · [abrir](https://acme.review.test/help)

### Fatura

\`/billing/:account/:invoice\` · [abrir](https://acme.review.test/billing/ACC-7/INV%2012)

${PR_MARKERS.end}
`);
  });

  it("o ticket do cenário entra no bloco, como link de qualquer ferramenta", () => {
    const head: ProductDefinition = {
      ...product,
      scenarios: [{ ...product.scenarios[0]!, ticket: "https://tracker.example.test/T-130" }, product.scenarios[1]!],
    };
    expect(section({ head })).toContain("Persona: Analista · Ticket: https://tracker.example.test/T-130");
  });

  it("sem origem e sem commit, sai sem links e sem linha de preview", () => {
    const markdown = section();
    expect(markdown).not.toContain("](http");
    expect(markdown).not.toContain("Preview:");
    expect(markdown).toContain("Gerado a cada push a partir do registro do Design Space. É a referência");
  });

  it("com a base igual, diz que o PR não muda critério", () => {
    const markdown = section({ base: product });
    expect(markdown).toContain("Este PR não altera telas, cenários nem regras do registro.");
    expect(markdown).not.toContain("###");
  });

  it("com a base, traz só as telas tocadas e marca o que é novo ou alterado", () => {
    const head: ProductDefinition = {
      ...product,
      scenarios: [
        { ...product.scenarios[0]!, expected: ["O motivo aparece junto da ação."] },
        product.scenarios[1]!,
        { id: "orders.empty", title: "Sem pedidos", route: "/orders/1", fixture: "orders", expected: ["Mostra o vazio."] },
      ],
    };
    const markdown = section({ head, base: product });

    expect(markdown).toContain("Telas novas ou alteradas neste PR");
    expect(markdown).toContain("#### Pedido bloqueado · `orders.blocked` · alterado");
    expect(markdown).toContain("#### Pedido liberado · `orders.allowed`\n");
    expect(markdown).toContain("#### Sem pedidos · `orders.empty` · novo");
    expect(markdown).not.toContain("### Ajuda");
    expect(markdown).not.toContain("### Fatura");
  });

  it("mudar o enunciado de uma regra altera os cenários que a citam", () => {
    const head: ProductDefinition = {
      ...product,
      rules: [{ id: "approval-requires-attachment", statement: "Acima de R$ 3.000 exige anexo." }],
    };
    const markdown = section({ head, base: product });
    expect(markdown).toContain("`orders.blocked` · alterado");
    expect(markdown).toContain("Acima de R$ 3.000 exige anexo.");
  });

  it("lista cenários e telas removidos", () => {
    const head: ProductDefinition = {
      ...product,
      routes: product.routes.filter((route) => route.path !== "/help"),
      scenarios: product.scenarios.slice(0, 1),
    };
    const markdown = section({ head, base: product });
    expect(markdown).toContain("**Cenários removidos:** Pedido liberado (`orders.allowed`)");
    expect(markdown).toContain("**Telas removidas:** Ajuda (`/help`)");
  });

  it("mudança na rota, sem cenário novo, traz a tela", () => {
    const head: ProductDefinition = {
      ...product,
      routes: product.routes.map((route) =>
        route.path === "/help" ? { ...route, expected: ["A ajuda abre na seção do erro."] } : route,
      ),
    };
    const markdown = section({ head, base: product });
    expect(markdown).toContain("### Ajuda");
    expect(markdown).toContain("**Comportamento esperado da tela**\n\n1. A ajuda abre na seção do erro.");
    expect(markdown).not.toContain("### Detalhe do pedido");
  });

  it("usa os rótulos do produto", () => {
    const markdown = section({ head: { ...product, theme: { labels: { pr: EN_US_LABELS.pr } } } });
    expect(markdown).toContain("## Acceptance criteria");
    expect(markdown).toContain("**Expected behavior**");
  });

  it("diffProducts sem base marca a comparação como ausente", () => {
    expect(diffProducts(product).compared).toBe(false);
    expect(diffProducts(product, product)).toEqual({ compared: true, screens: [], removedScreens: [] });
  });
});

describe("descrição do PR", () => {
  const block = section({ commit: "abc1234" });

  it("em branco, a descrição é só o bloco", () => {
    expect(mergePrBody("", block)).toBe(block);
    expect(mergePrBody(null, block)).toBe(block);
  });

  it("com texto e sem marcas, acrescenta o bloco no fim", () => {
    const body = mergePrBody("Ajusta a fila.\r\n", block);
    expect(body).toBe(`Ajusta a fila.\n\n${block}`);
  });

  it("com as marcas, troca só o que está entre elas", () => {
    const first = mergePrBody("Antes.", block);
    const edited = `${first}\nDepois.\n`;
    const next = mergePrBody(edited, section({ commit: "def5678" }));
    expect(next.startsWith("Antes.\n\n")).toBe(true);
    expect(next.endsWith("\nDepois.\n")).toBe(true);
    expect(next).toContain("`def5678`");
    expect(next).not.toContain("`abc1234`");
  });

  it("é idempotente", () => {
    const once = mergePrBody("", block);
    expect(mergePrBody(once, block)).toBe(once);
  });

  it("sem a marca de fim, o bloco vai até o fim da descrição", () => {
    const broken = `Antes.\n\n${PR_MARKERS.start}\nlixo editado à mão`;
    expect(mergePrBody(broken, block)).toBe(`Antes.\n\n${block.trim()}`);
  });
});

describe("limite de tamanho", () => {
  it("as telas que não cabem saem só pelo nome", () => {
    const full = buildPrSection({ head: product });
    const cut = buildPrSection({ head: product, maxLength: 2600 });
    expect(cut.length).toBeLessThan(full.length);
    expect(cut).toContain("**Fora deste bloco por tamanho (veja no preview):**");
    expect(cut).toContain("Fatura (`/billing/:account/:invoice`)");
    expect(cut.trimEnd().endsWith(PR_MARKERS.end)).toBe(true);
  });
});
