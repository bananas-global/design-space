import { describe, expect, it } from "vitest";

import { createRegistry, groupScreens, scenarioMatchesControls } from "../registry/index.js";
import { hasErrors, validateProduct } from "../registry/validate.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";
import { applyOverrides, readControlParams } from "./params.js";
import { parseControls, serializeControls } from "./state.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const preview = () => null;

/** Um fluxo de pedidos com três telas, controles na lista, e uma tela solta. */
function flowProduct(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "acme",
    name: "Acme",
    personas: [{ id: "analyst", name: "Analista", permissions: [] }],
    fixtures: [{ id: "orders", label: "Pedidos", data: {} }],
    components: [
      { id: "data.table", name: "Tabela", source: "table.ex → table/1", preview },
      { id: "overlay.modal", name: "Modal", preview },
    ],
    routes: [
      {
        path: "/orders",
        screen,
        name: "Lista de pedidos",
        group: "Pedidos",
        expected: ["A lista mostra os pedidos do período."],
        components: ["data.table"],
        controls: [
          {
            id: "table",
            title: "Tabela de pedidos · table",
            component: "data.table",
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
              {
                id: "sort",
                label: "Ordenação",
                default: "recent",
                options: [
                  { value: "oldest", label: "Mais antigos primeiro" },
                  { value: "recent", label: "Mais recentes primeiro" },
                ],
              },
            ],
          },
          {
            id: "overlay",
            title: "Sobreposição",
            component: "overlay.modal",
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
      { path: "/help", screen, name: "Ajuda" },
      { path: "/orders/new", screen, name: "Novo pedido", group: "Pedidos" },
      { path: "/orders/:id", screen, name: "Detalhe do pedido", group: "Pedidos" },
      { path: "/billing", screen, name: "Cobranças", group: "Cobrança" },
    ],
    scenarios: [
      {
        id: "orders.empty",
        title: "Lista vazia",
        route: "/orders",
        fixture: "orders",
        controls: { rows: "none" },
        expected: ["A lista vazia explica o que fazer."],
      },
      {
        id: "orders.cancel",
        title: "Cancelando um pedido",
        route: "/orders",
        fixture: "orders",
        controls: { overlay: "cancel", sort: "oldest" },
        expected: ["O modal pede confirmação."],
      },
      {
        id: "orders.detail",
        title: "Pedido aberto",
        route: "/orders/1042",
        fixture: "orders",
        expected: ["O pedido abre."],
      },
    ],
    ...overrides,
  };
}

const registry = createRegistry(flowProduct());

describe("telas agrupadas por fluxo", () => {
  it("agrupa por `route.group` na ordem das rotas, com as telas sem fluxo no topo e sem título", () => {
    expect(
      registry.flows().map((flow) => [flow.name, flow.screens.map((item) => item.name)]),
    ).toEqual([
      [undefined, ["Ajuda"]],
      ["Pedidos", ["Lista de pedidos", "Novo pedido", "Detalhe do pedido"]],
      ["Cobrança", ["Cobranças"]],
    ]);
    expect(registry.screen("/orders")?.group).toBe("Pedidos");
    expect(registry.flowOf(registry.screen("/orders/:id"))?.screens).toHaveLength(3);
  });

  it("sem tela solta, não cria grupo vazio", () => {
    const grouped = registry.screens.filter((item) => item.group);
    expect(groupScreens(grouped).map((flow) => flow.name)).toEqual(["Pedidos", "Cobrança"]);
  });

  it("a busca de telas casa o nome do fluxo, sem acento nem caixa", () => {
    expect(registry.searchScreens("cobranca").map((item) => item.name)).toEqual(["Cobranças"]);
    expect(registry.searchScreens("PEDIDOS").map((item) => item.id)).toEqual([
      "/orders",
      "/orders/new",
      "/orders/:id",
    ]);
  });

  it("componentes da tela unem `route.components` e os dos cenários", () => {
    expect(registry.componentsOfScreen(registry.screen("/orders")).map((item) => item.id)).toEqual([
      "data.table",
    ]);
    expect(registry.usagesOf("data.table").map((item) => item.id)).toEqual(["/orders"]);
  });
});

describe("resolução de controles", () => {
  const list = registry.screen("/orders")!;

  it("padrão é `default` ou a primeira opção", () => {
    expect(registry.resolveControls(list)).toEqual({
      values: { rows: "many", sort: "recent", overlay: "none" },
      invalid: [],
    });
  });

  it("cenário aplica os controles dele sobre os padrões, e a URL manda sobre os dois", () => {
    const scenario = registry.scenario("orders.cancel");
    expect(registry.resolveControls(list, { scenario }).values).toEqual({
      rows: "many",
      sort: "oldest",
      overlay: "cancel",
    });
    expect(
      registry.resolveControls(list, { scenario, requested: { overlay: "none" } }).values.overlay,
    ).toBe("none");
  });

  it("valor inválido cai no padrão e é relatado; controle desconhecido também", () => {
    const { values, invalid } = registry.resolveControls(list, {
      requested: { rows: "all", ghost: "1" },
    });
    expect(values.rows).toBe("many");
    expect(invalid).toEqual([
      { id: "rows", value: "all", reason: "invalid-value", fallback: "many" },
      { id: "ghost", value: "1", reason: "unknown-control" },
    ]);
  });

  it("o cenário deixa de casar quando a combinação dele muda", () => {
    const scenario = registry.scenario("orders.cancel");
    expect(scenarioMatchesControls(scenario, { rows: "one", sort: "oldest", overlay: "cancel" })).toBe(true);
    expect(scenarioMatchesControls(scenario, { rows: "many", sort: "recent", overlay: "cancel" })).toBe(false);
  });
});

describe("controles na URL (`c.<id>`)", () => {
  it("lê os `c.*` e ignora o resto", () => {
    expect(readControlParams("?c.rows=one&persona=analyst&c.=x&c.overlay=cancel")).toEqual({
      rows: "one",
      overlay: "cancel",
    });
  });

  it("parse aplica padrões, cenário e URL, pela tela do caminho", () => {
    expect(parseControls("", registry, "/orders").screenControls).toEqual({
      rows: "many",
      sort: "recent",
      overlay: "none",
    });
    expect(parseControls("?scenario=orders.empty&c.sort=oldest", registry, "/orders").screenControls).toEqual({
      rows: "none",
      sort: "oldest",
      overlay: "none",
    });
    // Sem caminho, vale a tela do cenário.
    expect(parseControls("?scenario=orders.empty", registry).screenControls?.rows).toBe("none");
    // Tela sem controles não carrega o campo.
    expect(parseControls("?c.rows=one", registry, "/help").screenControls).toBeUndefined();
  });

  it("valor inválido na URL cai no padrão", () => {
    expect(parseControls("?c.rows=all", registry, "/orders").screenControls?.rows).toBe("many");
  });

  it("serializa só o que difere do padrão — ou do cenário, quando há um", () => {
    const plain = parseControls("", registry, "/orders");
    expect(serializeControls(plain, registry, "/orders")).toBe("");
    expect(
      serializeControls(
        { ...plain, screenControls: { ...plain.screenControls!, overlay: "cancel", rows: "one" } },
        registry,
        "/orders",
      ),
    ).toBe("?c.rows=one&c.overlay=cancel");

    const empty = parseControls("?scenario=orders.empty", registry, "/orders");
    expect(serializeControls(empty, registry, "/orders")).toBe("?scenario=orders.empty");
    // Voltar ao padrão da tela, contra o que o cenário fixa, precisa ir na URL.
    expect(
      serializeControls(
        { ...empty, screenControls: { ...empty.screenControls!, rows: "many" } },
        registry,
        "/orders",
      ),
    ).toBe("?scenario=orders.empty&c.rows=many");
  });

  it("ida e volta pela URL preserva a combinação", () => {
    const search = "?c.sort=oldest&c.overlay=cancel";
    const parsed = parseControls(search, registry, "/orders");
    expect(serializeControls(parsed, registry, "/orders")).toBe(search);
  });

  it("`applyOverrides` escreve `screenControls` como `c.*`", () => {
    const params = new URLSearchParams();
    applyOverrides(params, { screenControls: { rows: "one" } });
    expect(params.toString()).toBe("c.rows=one");
  });
});

describe("validação de fluxos e controles", () => {
  it("o produto de referência é válido e sem aviso", () => {
    expect(validateProduct(flowProduct())).toEqual([]);
  });

  const listRoute = flowProduct().routes[0]!;
  const withList = (patch: Partial<RouteDefinition>) =>
    flowProduct({ routes: [{ ...listRoute, ...patch }] , scenarios: [] });

  it("id de grupo e de controle são únicos na tela", () => {
    const issues = validateProduct(
      withList({
        controls: [
          { id: "a", title: "A", controls: [{ id: "x", label: "X", options: [{ value: "1", label: "1" }] }] },
          { id: "a", title: "B", controls: [{ id: "x", label: "Y", options: [{ value: "1", label: "1" }] }] },
        ],
      }),
    );
    expect(issues.filter((issue) => issue.level === "error").map((issue) => issue.message)).toEqual([
      "`id` de grupo duplicado na tela: `a`.",
      "`id` de controle duplicado na tela: `x`.",
    ]);
  });

  it("`default` precisa estar nas opções, e opção precisa existir", () => {
    const issues = validateProduct(
      withList({
        controls: [
          {
            id: "a",
            title: "A",
            controls: [
              { id: "x", label: "X", default: "3", options: [{ value: "1", label: "1" }] },
              { id: "y", label: "Y", options: [] },
              { id: "com espaço", label: "Z", options: [{ value: "1", label: "1" }] },
            ],
          },
        ],
      }),
    );
    expect(hasErrors(issues)).toBe(true);
    const messages = issues.map((issue) => `${issue.where} ${issue.message}`).join("\n");
    expect(messages).toContain("route:/orders/group:a/control:x `default` não é uma das opções: `3`");
    expect(messages).toContain("control:y `options` precisa de ao menos uma opção.");
    expect(messages).toContain("Id de controle inválido: `com espaço`");
  });

  it("`scenario.controls` usa controles e valores da tela do cenário", () => {
    const base = flowProduct();
    const issues = validateProduct({
      ...base,
      scenarios: [
        { id: "a", title: "A", route: "/orders", fixture: "orders", expected: ["ok"], controls: { rows: "all" } },
        { id: "b", title: "B", route: "/orders", fixture: "orders", expected: ["ok"], controls: { ghost: "1" } },
        { id: "c", title: "C", route: "/orders/1", fixture: "orders", expected: ["ok"], controls: { rows: "one" } },
      ],
    });
    expect(issues.filter((issue) => issue.level === "error").map((issue) => `${issue.where}: ${issue.message}`)).toEqual([
      "scenario:a: Valor `all` não é opção do controle `rows`. Opções: `many`, `one`, `none`.",
      "scenario:b: Controle `ghost` não existe na tela `/orders`.",
      "scenario:c: Controle `rows` não existe na tela `/orders/:id`.",
    ]);
  });

  it("componente inexistente em `route.components` ou em `group.component` é aviso", () => {
    const issues = validateProduct(
      withList({
        components: ["missing.one"],
        controls: [{ id: "a", title: "A", component: "missing.two", controls: [] }],
      }),
    );
    expect(hasErrors(issues)).toBe(false);
    expect(issues.map((issue) => issue.where)).toEqual(["route:/orders", "route:/orders/group:a"]);
  });
});
