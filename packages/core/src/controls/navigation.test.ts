import { describe, expect, it } from "vitest";

import { createRegistry } from "../registry/index.js";
import { validateProduct } from "../registry/validate.js";
import { screenHref } from "../router/index.js";
import { buildPrMarkdown } from "../shell/prMarkdown.js";
import { DEFAULT_LABELS } from "../shell/labels.js";
import { getDeployContext } from "../deploy/index.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";
import { keepScreenQuery, navigationTarget, parseControls, serializeControls } from "./state.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

/** Pedidos: lista com controles, detalhe com parâmetro, e cobrança sem cenário. */
function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "acme",
    name: "Acme",
    personas: [
      { id: "analyst", name: "Analista", permissions: ["orders.read"] },
      { id: "manager", name: "Gestora", permissions: ["orders.read", "orders.approve"] },
    ],
    fixtures: [{ id: "orders", label: "Pedidos", data: {} }],
    theme: { modes: ["light", "dark"], locales: ["pt-BR", "en-US"] },
    routes: [
      {
        path: "/orders",
        screen,
        name: "Lista de pedidos",
        controls: [
          {
            id: "table",
            title: "Tabela",
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
              {
                id: "status",
                label: "Situação",
                options: [
                  { value: "all", label: "Todas" },
                  { value: "open", label: "Abertos" },
                ],
              },
            ],
          },
        ],
      },
      { path: "/orders/:id", screen, name: "Detalhe do pedido" },
      {
        path: "/billing/:account/:invoice",
        screen,
        name: "Fatura",
        params: { account: "ACC-7", invoice: "INV 12" },
      },
    ],
    scenarios: [
      {
        id: "orders.empty",
        title: "Lista vazia",
        route: "/orders",
        persona: "manager",
        fixture: "orders",
        network: "empty",
        controls: { rows: "none" },
        expected: ["A lista vazia explica o que fazer."],
      },
      {
        id: "orders.detail",
        title: "Pedido aberto",
        route: "/orders/1042",
        persona: "analyst",
        fixture: "orders",
        expected: ["O pedido abre."],
      },
    ],
    ...overrides,
  };
}

const registry = createRegistry(product());
const at = (path: string, search = "") => ({ path, search });
const query = (search: string) => Object.fromEntries(new URLSearchParams(search));

describe("navegação com query própria preserva o contexto do motor", () => {
  const current = at(
    "/orders/1042",
    "?scenario=orders.detail&persona=manager&network=slow&viewport=mobile&theme=dark&locale=en-US&source=api&appearance=dark&zoom=75",
  );

  it("persona, rede, viewport, tema, idioma, fonte e chrome seguem; cenário e fixture não", () => {
    const target = navigationTarget("/orders?c.status=open", current, registry);
    expect(target.path).toBe("/orders");
    expect(query(target.search)).toEqual({
      persona: "manager",
      network: "slow",
      viewport: "mobile",
      theme: "dark",
      locale: "en-US",
      source: "api",
      appearance: "dark",
      zoom: "75",
      "c.status": "open",
    });
  });

  it("o que o destino traz manda sobre o que viria da tela anterior", () => {
    const target = navigationTarget("/orders?viewport=desktop&persona=analyst", current, registry);
    const params = new URLSearchParams(target.search);
    expect(params.get("viewport")).toBe("desktop");
    expect(params.get("persona")).toBe("analyst");
    expect(params.getAll("viewport")).toHaveLength(1);
  });

  it("os `c.*` da tela anterior ficam para trás, e os do destino entram", () => {
    const target = navigationTarget(
      "/orders/7?scenario=orders.detail",
      at("/orders", "?c.rows=one&c.status=open&viewport=tablet"),
      registry,
    );
    expect(query(target.search)).toEqual({ viewport: "tablet", scenario: "orders.detail" });
  });

  it("a persona que vinha do cenário vira parâmetro explícito; a rede dele fica com ele", () => {
    const target = navigationTarget("/orders/1042?x=1", at("/orders", "?scenario=orders.empty"), registry);
    expect(query(target.search)).toEqual({ persona: "manager", x: "1" });
  });

  it("destino com cenário próprio não herda a persona implícita do anterior", () => {
    const target = navigationTarget(
      "/orders/1042?scenario=orders.detail",
      at("/orders", "?scenario=orders.empty"),
      registry,
    );
    expect(query(target.search)).toEqual({ scenario: "orders.detail" });
  });

  it("o recorte de handoff segue e não pode ser apagado pela query do destino", () => {
    const target = navigationTarget(
      "/orders/1042?allowScenario=other",
      at("/orders", "?handoff=1&allowScenario=orders.detail&allowRoute=%2Forders"),
      registry,
    );
    const params = new URLSearchParams(target.search);
    expect(params.get("handoff")).toBe("1");
    expect(params.getAll("allowScenario")).toEqual(["orders.detail"]);
    expect(params.getAll("allowRoute")).toEqual(["/orders"]);
  });

  it("sem query nem `controls`, a query atual segue inteira como antes", () => {
    expect(navigationTarget("/orders/9", current, registry)).toEqual({ path: "/orders/9", search: current.search });
    const same = navigationTarget("/orders", at("/orders", "?c.rows=one&persona=analyst"), registry);
    expect(same.search).toBe("?c.rows=one&persona=analyst");
    const other = navigationTarget("/orders/9", at("/orders", "?c.rows=one&persona=analyst"), registry);
    expect(other.search).toBe("?persona=analyst");
  });
});

describe("`navigate(to, { controls })`", () => {
  it("vira `c.*` do destino, sem os valores que já são o padrão da tela", () => {
    const target = navigationTarget("/orders", at("/orders/1042", "?viewport=mobile"), registry, {
      controls: { rows: "many", status: "open" },
    });
    expect(query(target.search)).toEqual({ viewport: "mobile", "c.status": "open" });
  });

  it("com cenário do destino, o padrão é o que o cenário fixa", () => {
    const target = navigationTarget("/orders?scenario=orders.empty", at("/orders/1042"), registry, {
      controls: { rows: "none", status: "all" },
    });
    expect(query(target.search)).toEqual({ scenario: "orders.empty" });
    const back = navigationTarget("/orders?scenario=orders.empty", at("/orders/1042"), registry, {
      controls: { rows: "many" },
    });
    expect(query(back.search)).toEqual({ scenario: "orders.empty", "c.rows": "many" });
  });

  it("`controls` sem query já é navegação explícita: descarta cenário, fixture e `c.*` anteriores", () => {
    const target = navigationTarget(
      "/orders",
      at("/orders", "?scenario=orders.empty&fixture=orders&c.rows=one&theme=dark"),
      registry,
      { controls: { status: "open" } },
    );
    expect(query(target.search)).toEqual({ theme: "dark", persona: "manager", "c.status": "open" });
  });

  it("`controls` manda sobre um `c.*` da própria query de destino", () => {
    const target = navigationTarget("/orders?c.status=all", at("/orders/1"), registry, {
      controls: { status: "open" },
    });
    expect(query(target.search)).toEqual({ "c.status": "open" });
  });
});

describe("`route.params`: a tela sem cenário abre num caminho concreto", () => {
  it("monta o caminho com os exemplos, codificados, e mantém literal o que não tem exemplo", () => {
    expect(screenHref("/billing/:account/:invoice", { account: "ACC-7", invoice: "INV 12" })).toBe(
      "/billing/ACC-7/INV%2012",
    );
    expect(screenHref("/orders/:id")).toBe("/orders/:id");
    expect(screenHref("/orders/:id", { id: "" })).toBe("/orders/:id");
    expect(screenHref("/docs/*")).toBe("/docs");
    expect(screenHref("/docs/*", { "*": "guides/start" })).toBe("/docs/guides/start");
  });

  it("o `href` da tela usa os exemplos e ainda abre a mesma tela", () => {
    const invoice = registry.screen("/billing/:account/:invoice")!;
    expect(invoice.href).toBe("/billing/ACC-7/INV%2012");
    expect(registry.screenForPath(invoice.href)?.id).toBe(invoice.id);
  });

  it("\"Copiar para o PR\" da tela sem variação linka o caminho de exemplo", () => {
    const invoice = registry.screen("/billing/:account/:invoice")!;
    const markdown = buildPrMarkdown({
      screen: invoice,
      variations: [],
      components: [],
      deploy: getDeployContext({ branchUrl: "preview.example.test" }),
      labels: DEFAULT_LABELS,
    });
    expect(markdown).toContain("(https://preview.example.test/billing/ACC-7/INV%2012)");
    expect(markdown).not.toMatch(/\]\([^)]*:account/);
  });
});

describe("validação de `route.params`", () => {
  const warnings = (definition: ProductDefinition) =>
    validateProduct(definition).filter((issue) => issue.where.startsWith("route:"));

  it("rota com `:param` sem exemplo e sem cenário que a cubra é aviso", () => {
    const issues = warnings(product({ scenarios: [] }));
    const detail = issues.filter((issue) => issue.where === "route:/orders/:id");
    expect(detail).toHaveLength(1);
    expect(detail[0]!.level).toBe("warning");
    expect(detail[0]!.message).toContain("`:id`");
    expect(detail[0]!.message).toContain('params: { id: "…" }');
  });

  it("cenário na rota ou exemplo em `params` resolvem o aviso", () => {
    expect(warnings(product())).toEqual([]);
    const withExample = product({
      scenarios: [],
      routes: product().routes.map((route) =>
        route.path === "/orders/:id" ? { ...route, params: { id: "1042" } } : route,
      ),
    });
    expect(warnings(withExample)).toEqual([]);
  });

  it("exemplo de parâmetro que a rota não tem, ou que abre outra rota, é aviso", () => {
    const issues = warnings(
      product({
        routes: [
          { path: "/orders/new", screen, name: "Novo pedido" },
          { path: "/orders/:id", screen, name: "Detalhe", params: { id: "new", extra: "1" } },
        ],
        scenarios: [],
      }),
    ).map((issue) => issue.message);
    expect(issues.some((message) => message.includes("`params.extra`"))).toBe(true);
    expect(issues.some((message) => message.includes("abre a rota `/orders/new`"))).toBe(true);
  });

  it("`params` que não é objeto é erro", () => {
    const issues = warnings(
      product({
        routes: [{ path: "/orders/:id", screen, params: ["1"] as unknown as Record<string, string> }],
        scenarios: [],
      }),
    );
    expect(issues.map((issue) => issue.level)).toEqual(["error"]);
  });
});

describe("`defaultPersona`", () => {
  const withDefault = createRegistry(
    product({ defaultPersona: "analyst", components: [{ id: "actions.button", name: "Botão", preview: () => null }] }),
  );

  it("é a persona de tela sem cenário e de cenário sem persona; URL e cenário vencem", () => {
    expect(parseControls("", withDefault, "/orders").persona).toBe("analyst");
    expect(parseControls("?persona=manager", withDefault, "/orders").persona).toBe("manager");
    expect(parseControls("?scenario=orders.empty", withDefault, "/orders").persona).toBe("manager");
    expect(parseControls("?component=actions.button", withDefault).persona).toBeUndefined();
    // Sem `defaultPersona`, nada muda.
    expect(parseControls("", registry, "/orders").persona).toBeUndefined();
  });

  it("a URL só leva a persona quando ela difere do padrão efetivo", () => {
    const state = parseControls("", withDefault, "/orders");
    expect(serializeControls(state, withDefault, "/orders")).toBe("");
    expect(serializeControls({ ...state, persona: "manager" }, withDefault, "/orders")).toBe("?persona=manager");
    const scenario = parseControls("?scenario=orders.empty&persona=analyst", withDefault, "/orders");
    expect(serializeControls(scenario, withDefault, "/orders")).toBe("?scenario=orders.empty&persona=analyst");
  });

  it("cenário sem persona nem permissões próprias usa as da persona padrão", () => {
    const definition = product({
      defaultPersona: "manager",
      scenarios: [{ id: "orders.plain", title: "Lista", route: "/orders", fixture: "orders", expected: ["x"] }],
    });
    const plain = createRegistry(definition);
    expect(plain.permissionsOf(plain.scenario("orders.plain"))).toEqual(["orders.read", "orders.approve"]);
  });

  it("navegar sem cenário não materializa a persona quando ela é o padrão", () => {
    const definition = createRegistry(
      product({
        defaultPersona: "analyst",
        scenarios: [{ ...product().scenarios[1]!, id: "orders.plain", persona: undefined }],
      }),
    );
    const target = navigationTarget("/orders?c.status=open", at("/orders/1042", "?scenario=orders.plain"), definition);
    expect(target.search).toBe("?c.status=open");
  });

  it("id inexistente é erro de validação", () => {
    const issues = validateProduct(product({ defaultPersona: "ghost" }));
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "error", where: "product", message: expect.stringContaining("`ghost`") }),
    );
    expect(validateProduct(product({ defaultPersona: "analyst" })).filter((i) => i.level === "error")).toEqual([]);
  });
});

describe("0.9.3: query da tela sobrevive às mudanças de controle", () => {
  const current = "?aba=resumo&persona=manager&c.rows=one&page=2&handoff=1&allowRoute=%2Forders";

  it("a query da tela volta junto com os controles; o que é do motor vem só do novo estado", () => {
    const state = parseControls(current, registry, "/orders");
    const search = keepScreenQuery(
      serializeControls({ ...state, persona: "analyst", network: "slow" }, registry, "/orders"),
      current,
    );
    expect(query(search)).toEqual({
      persona: "analyst",
      network: "slow",
      "c.rows": "one",
      handoff: "1",
      allowRoute: "/orders",
      aba: "resumo",
      page: "2",
    });
  });

  it("controles da tela mudam sem tirar a query da tela", () => {
    const state = parseControls(current, registry, "/orders");
    const search = keepScreenQuery(
      serializeControls({ ...state, screenControls: { rows: "many", status: "open" } }, registry, "/orders"),
      current,
    );
    const params = new URLSearchParams(search);
    expect(params.has("c.rows")).toBe(false);
    expect(params.get("c.status")).toBe("open");
    expect(params.get("aba")).toBe("resumo");
    expect(params.get("page")).toBe("2");
  });

  it("parâmetro repetido da tela segue repetido, e o do quadro não entra", () => {
    const search = keepScreenQuery("?persona=analyst", "?tag=a&tag=b&ds-frame=1&persona=manager");
    const params = new URLSearchParams(search);
    expect(params.getAll("tag")).toEqual(["a", "b"]);
    expect(params.has("ds-frame")).toBe(false);
    expect(params.getAll("persona")).toEqual(["analyst"]);
  });

  it("sem query da tela, a `search` dos controles fica como estava", () => {
    expect(keepScreenQuery("?persona=analyst", "?persona=manager&c.rows=one")).toBe("?persona=analyst");
    expect(keepScreenQuery("", "")).toBe("");
  });
});
