import { describe, expect, it } from "vitest";
import { createRegistry } from "./index.js";
import { hasErrors, validateProduct, validateScenario } from "./validate.js";
import type { ProductDefinition, RouteDefinition, Scenario } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "requests.approve-blocked",
    title: "Aprovação bloqueada por falta de documento",
    route: "/requests/REQ-2043",
    persona: "approver",
    fixture: "request-blocked",
    rules: ["retry-after-document-review"],
    expected: ["O bloqueio é anunciado para leitor de tela."],
    ...overrides,
  };
}

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "acme",
    name: "Acme",
    scenarios: [scenario()],
    personas: [{ id: "approver", name: "Analista", permissions: ["requests.read"] }],
    fixtures: [{ id: "request-blocked", label: "Solicitação sem documento", data: { id: "REQ-2043" } }],
    rules: [{ id: "retry-after-document-review", statement: "Aprovação exige documento anexado." }],
    routes: [{ path: "/requests/:id", screen }],
    ...overrides,
  };
}

describe("validateScenario", () => {
  it("aceita um cenário completo", () => {
    expect(validateScenario(scenario()).filter((i) => i.level === "error")).toEqual([]);
  });

  it("aceita cenário sem persona", () => {
    const { persona: _persona, ...withoutPersona } = scenario();
    expect(validateScenario(withoutPersona).filter((i) => i.level === "error")).toEqual([]);
  });

  it("não exige mais contrato de acessibilidade nem status", () => {
    const issues = validateScenario(scenario());
    expect(issues.some((i) => /a11y|status/.test(i.message))).toBe(false);
  });

  it("recusa id fora do padrão", () => {
    const issues = validateScenario(scenario({ id: "Requests.ApproveBlocked" }));
    expect(hasErrors(issues)).toBe(true);
  });

  it("avisa quando falta critério de aceite", () => {
    const issues = validateScenario(scenario({ expected: undefined }));
    expect(issues.some((i) => i.message.includes("expected"))).toBe(true);
  });
});

describe("validateProduct", () => {
  it("aponta referência quebrada de fixture, persona e regra", () => {
    const issues = validateProduct(
      product({
        scenarios: [scenario({ persona: "ninguem", fixture: "nada", rules: ["inexistente"] })],
      }),
    );
    const messages = issues.filter((i) => i.level === "error").map((i) => i.message);
    expect(messages.some((m) => m.includes("Persona não registrada"))).toBe(true);
    expect(messages.some((m) => m.includes("Fixture não registrada"))).toBe(true);
    expect(messages.some((m) => m.includes("Regra não registrada"))).toBe(true);
  });

  it("aceita produto só de componentes, sem módulos, cenários, fixtures nem rotas", () => {
    const issues = validateProduct({
      id: "acme",
      name: "Acme",
      scenarios: [],
      personas: [],
      fixtures: [],
      routes: [],
      components: [{ id: "actions.button", name: "Botão", preview: () => null }],
    });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("exige rota quando há cenário para renderizar", () => {
    const issues = validateProduct(product({ routes: [] }));
    expect(issues.some((i) => i.level === "error" && i.message.includes("`routes` está vazio")))
      .toBe(true);
  });

  it("não reclama de persona quando o cenário não informa uma", () => {
    const { persona: _persona, ...withoutPersona } = scenario();
    const issues = validateProduct(product({ scenarios: [withoutPersona] }));
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("aponta rota que nenhuma rota declarada atende", () => {
    const issues = validateProduct(product({ scenarios: [scenario({ route: "/nao/existe" })] }));
    expect(issues.some((i) => i.level === "error" && i.message.includes("não casa"))).toBe(true);
  });

  it("aponta id duplicado", () => {
    const issues = validateProduct(product({ scenarios: [scenario(), scenario()] }));
    expect(issues.some((i) => i.message.includes("duplicado"))).toBe(true);
  });

  it("aceita id sem prefixo e não exige módulo", () => {
    const issues = validateProduct(product({ scenarios: [scenario({ id: "approve-blocked" })] }));
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(issues.some((i) => /módulo|prefixo/.test(i.message))).toBe(false);
  });

  it("avisa quando o produto ainda declara `modules`", () => {
    const legacy = { ...product(), modules: [{ id: "requests", name: "Solicitações" }] };
    const issues = validateProduct(legacy as ProductDefinition);
    expect(issues.some((i) => i.level === "warning" && i.message.includes("`modules`"))).toBe(true);
  });

  it("aponta rota duplicada e rota sem barra inicial", () => {
    const issues = validateProduct(
      product({
        routes: [
          { path: "/requests/:id", screen },
          { path: "/requests/:id", screen },
          { path: "sem-barra", screen },
        ],
      }),
    );
    expect(issues.some((i) => i.level === "error" && i.message.includes("duplicado"))).toBe(true);
    expect(issues.some((i) => i.level === "error" && i.message.includes("começar com `/`"))).toBe(true);
  });

  it("avisa sobre componente citado pelo cenário e não registrado", () => {
    const issues = validateProduct(
      product({ scenarios: [scenario({ components: ["actions.fantasma"] })] }),
    );
    expect(
      issues.some((i) => i.level === "warning" && i.message.includes("actions.fantasma")),
    ).toBe(true);
  });

  it("avisa quando a fonte padrão deixa de ser fixture", () => {
    const issues = validateProduct(
      product({
        dataSources: {
          default: "staging",
          adapters: [{ id: "staging", label: "Staging", load: () => ({}) }],
        },
      }),
    );
    expect(issues.some((i) => i.level === "warning" && i.message.includes("D-05"))).toBe(true);
  });

  it("valida e indexa o catálogo opcional de componentes", () => {
    const preview = () => null;
    const definition = product({
      components: [{
        id: "actions.button",
        name: "Botão",
        group: "Ações",
        preview,
        fixtures: [
          { id: "default", label: "Padrão", data: { label: "Continuar" } },
          { id: "disabled", label: "Desabilitado", data: () => ({ disabled: true }) },
        ],
        defaultFixture: "disabled",
      }],
    });
    expect(validateProduct(definition).filter((issue) => issue.level === "error")).toEqual([]);
    expect(createRegistry(definition).component("actions.button")?.preview).toBe(preview);
    expect(createRegistry(definition).componentFixture("actions.button", "disabled")?.label)
      .toBe("Desabilitado");
    expect(createRegistry(definition).resolveComponentFixture("actions.button", "missing"))
      .toMatchObject({ fixture: { id: "disabled" }, requestedId: "missing", didFallback: true });
  });

  it("valida ids de fixtures do componente, duplicatas e default inexistente", () => {
    const preview = () => null;
    const issues = validateProduct(product({
      components: [{
        id: "actions.button",
        name: "Botão",
        preview,
        fixtures: [
          { id: "Inválida", label: "Inválida", data: {} },
          { id: "duplicada", label: "Primeira", data: {} },
          { id: "duplicada", label: "Segunda", data: {} },
        ],
        defaultFixture: "ausente",
      }],
    }));

    expect(issues.some((issue) => issue.message.includes("fixture") && issue.message.includes("Inválida")))
      .toBe(true);
    expect(issues.some((issue) => issue.message.includes("duplicado") && issue.message.includes("duplicada")))
      .toBe(true);
    expect(issues.some((issue) => issue.message.includes("defaultFixture") && issue.message.includes("ausente")))
      .toBe(true);
  });
});

describe("createRegistry", () => {
  const registry = createRegistry(product());

  it("não expõe mais árvore de módulos nem órfãos", () => {
    expect("tree" in registry).toBe(false);
    expect("orphans" in registry).toBe(false);
  });

  it("herda as permissões da persona quando o cenário não declara", () => {
    expect(registry.permissionsOf(registry.scenario("requests.approve-blocked"))).toEqual([
      "requests.read",
    ]);
  });

  it("dá permissões vazias a cenário sem persona e sem permissões", () => {
    const { persona: _persona, ...withoutPersona } = scenario();
    const custom = createRegistry(product({ scenarios: [withoutPersona] }));
    expect(custom.permissionsOf(custom.scenario("requests.approve-blocked"))).toEqual([]);
  });

  it("usa as permissões declaradas em cenário sem persona", () => {
    const { persona: _persona, ...withoutPersona } = scenario();
    const custom = createRegistry(
      product({ scenarios: [{ ...withoutPersona, permissions: ["requests.approve"] }] }),
    );
    expect(custom.permissionsOf(custom.scenario("requests.approve-blocked"))).toEqual([
      "requests.approve",
    ]);
  });

  it("respeita as permissões do cenário quando declaradas", () => {
    const custom = createRegistry(
      product({ scenarios: [scenario({ permissions: ["requests.read", "requests.approve"] })] }),
    );
    expect(custom.permissionsOf(custom.scenario("requests.approve-blocked"))).toEqual([
      "requests.read",
      "requests.approve",
    ]);
  });

  it("busca pelo vocabulário do negócio, ignorando acento", () => {
    expect(registry.search("aprovacao").map((s) => s.id)).toEqual(["requests.approve-blocked"]);
    expect(registry.search("ANALISTA")).toHaveLength(1);
    expect(registry.search("nada disso")).toEqual([]);
  });

  it("aplica o handoff a busca, árvore e componentes", () => {
    const custom = createRegistry(product({
      scenarios: [
        scenario({ id: "requests.allowed", title: "Permitido" }),
        scenario({ id: "requests.hidden", title: "Oculto" }),
      ],
      components: [
        { id: "feedback.allowed", name: "Permitido", preview: () => null },
        { id: "feedback.hidden", name: "Oculto", preview: () => null },
      ],
    }));
    const handoff = {
      scenarios: ["requests.allowed"],
      components: ["feedback.allowed"],
    };

    expect(custom.search("", { handoff }).map((item) => item.id)).toEqual(["requests.allowed"]);
    expect(custom.screensFor({ handoff })[0]?.variations.map((item) => item.id)).toEqual([
      "requests.allowed",
    ]);
    expect(custom.activeScenarios({ handoff }).map((item) => item.id)).toEqual([
      "requests.allowed",
    ]);
    expect(custom.componentsFor(handoff).map((item) => item.id)).toEqual(["feedback.allowed"]);
  });

  it("exibe todo cenário registrado, sem separar coleções", () => {
    const custom = createRegistry(product({
      scenarios: [
        scenario({ id: "requests.imported", title: "Referência importada" }),
        scenario({ id: "requests.review", title: "Trabalho em revisão" }),
      ],
    }));

    expect(custom.activeScenarios().map((item) => item.id)).toEqual([
      "requests.imported",
      "requests.review",
    ]);
    expect(custom.search("importada")).toHaveLength(1);
    expect(custom.screens[0]?.variations).toHaveLength(2);
    expect(custom.scenariosForRoute("/requests/REQ-2043")).toHaveLength(2);
  });
});

describe("telas e variações", () => {
  const List = (() => null) as unknown as RouteDefinition["screen"];
  const preview = () => null;
  const definition = product({
    routes: [
      { path: "/requests", screen: List, name: "Fila", description: "Fila de análise." },
      { path: "/requests/:id", screen },
      { path: "/requests/new", screen, name: "Nova solicitação" },
      { path: "/help/*", screen },
    ],
    scenarios: [
      scenario({ id: "queue", title: "Fila cheia", route: "/requests", components: ["actions.button"] }),
      scenario({ id: "detail.blocked", title: "Detalhe bloqueado", route: "/requests/REQ-1" }),
      scenario({
        id: "detail.allowed",
        title: "Detalhe permitido",
        route: "/requests/REQ-2?tab=history",
        components: ["actions.button", "feedback.notice"],
      }),
      scenario({ id: "queue-empty", title: "Fila vazia", route: "/requests" }),
      scenario({ id: "new.draft", title: "Rascunho", route: "/requests/new" }),
    ],
    components: [
      {
        id: "actions.button",
        name: "Botão",
        group: "Ações",
        source: "core_components.ex → button/1",
        preview,
      },
      { id: "feedback.notice", name: "Aviso", group: "Feedback", preview },
    ],
  });
  const registry = createRegistry(definition);

  it("cada rota é uma tela, na ordem de `routes`", () => {
    expect(registry.screens.map((item) => item.id)).toEqual([
      "/requests",
      "/requests/:id",
      "/requests/new",
      "/help/*",
    ]);
  });

  it("as variações são os cenários que casam com a rota, na ordem de `scenarios`", () => {
    expect(registry.screen("/requests")?.variations.map((item) => item.id)).toEqual([
      "queue",
      "queue-empty",
    ]);
    // `/requests/new` é literal e ganha de `/requests/:id`, independente da ordem.
    expect(registry.screen("/requests/:id")?.variations.map((item) => item.id)).toEqual([
      "detail.blocked",
      "detail.allowed",
    ]);
    expect(registry.screen("/requests/new")?.variations.map((item) => item.id)).toEqual([
      "new.draft",
    ]);
  });

  it("nomeia a tela por `name`, pelo primeiro cenário ou pelo path", () => {
    expect(registry.screen("/requests")?.name).toBe("Fila");
    expect(registry.screen("/requests")?.description).toBe("Fila de análise.");
    expect(registry.screen("/requests/:id")?.name).toBe("Detalhe bloqueado");
    expect(registry.screen("/help/*")?.name).toBe("/help/*");
  });

  it("rota sem cenário é tela com variação implícita e caminho concreto", () => {
    const help = registry.screen("/help/*");
    expect(help?.variations).toEqual([]);
    expect(help?.href).toBe("/help");
  });

  it("encontra a tela de um endereço e de um cenário", () => {
    expect(registry.screenForPath("/requests/REQ-9")?.id).toBe("/requests/:id");
    expect(registry.screenForPath("/nada")).toBeUndefined();
    expect(registry.screenOf(registry.scenario("detail.allowed"))?.id).toBe("/requests/:id");
    expect(registry.scenariosForRoute("/requests/REQ-9").map((item) => item.id)).toEqual([
      "detail.blocked",
      "detail.allowed",
    ]);
  });

  it("une os componentes das variações e acha onde cada um é usado", () => {
    expect(
      registry.componentsOfScreen(registry.screen("/requests/:id")).map((item) => item.id),
    ).toEqual(["actions.button", "feedback.notice"]);
    expect(registry.usagesOf("actions.button").map((item) => item.id)).toEqual([
      "/requests",
      "/requests/:id",
    ]);
    expect(registry.usagesOf("feedback.notice").map((item) => item.id)).toEqual(["/requests/:id"]);
  });

  it("busca telas e componentes sem diferenciar acento nem caixa", () => {
    expect(registry.searchScreens("SOLICITACAO").map((item) => item.id)).toEqual([
      "/requests/new",
    ]);
    expect(registry.searchScreens("fila").map((item) => item.id)).toEqual(["/requests"]);
    expect(registry.searchComponents("botao").map((item) => item.id)).toEqual(["actions.button"]);
    expect(registry.searchComponents("ações").map((item) => item.id)).toEqual(["actions.button"]);
    expect(registry.searchComponents("core_components").map((item) => item.id)).toEqual([
      "actions.button",
    ]);
    expect(registry.searchComponents("feedback.notice").map((item) => item.id)).toEqual([
      "feedback.notice",
    ]);
  });

  it("filtra telas e variações pelo handoff, mantendo rotas autorizadas", () => {
    const onlyAllowed = registry.screensFor({ handoff: { scenarios: ["detail.allowed"] } });
    expect(onlyAllowed.map((item) => item.id)).toEqual(["/requests/:id"]);
    expect(onlyAllowed[0]?.variations.map((item) => item.id)).toEqual(["detail.allowed"]);

    const withRoute = registry.screensFor({ handoff: { routes: ["/help"] } });
    expect(withRoute.map((item) => item.id)).toEqual(["/help/*"]);
  });
});
