import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createRegistry } from "./registry/index.js";
import { Controls } from "./shell/Controls.js";
import { DesignSpace } from "./shell/DesignSpace.js";
import { Home } from "./shell/Home.js";
import { Inspector } from "./shell/Inspector.js";
import { LabelsContext, DEFAULT_LABELS } from "./shell/labels.js";
import { Sidebar } from "./shell/Sidebar.js";
import type {
  ComponentPreviewProps,
  ControlsState,
  ProductDefinition,
  Scenario,
} from "./types/index.js";

beforeAll(() => {
  const environment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
});

const controls: ControlsState = {
  scenario: undefined,
  component: undefined,
  persona: undefined,
  fixture: undefined,
  network: "success",
  viewport: "fit",
  customWidth: undefined,
  themeMode: undefined,
  locale: undefined,
  dataSource: "fixtures",
  chromeTheme: "dark",
  chrome: true,
  inspector: true,
};

const portedScenario: Scenario = {
  id: "requests.imported",
  title: "Imported reference",
  route: "/requests/imported",
  fixture: "request-imported",
};

const activeScenario: Scenario = {
  id: "billing.review",
  title: "Active review",
  route: "/billing/review",
  persona: "reviewer",
  fixture: "request-imported",
};

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "reference",
    name: "Reference",
    modules: [
      { id: "requests", name: "Requests" },
      { id: "billing", name: "Billing" },
      { id: "empty", name: "Empty module" },
    ],
    scenarios: [portedScenario],
    personas: [{ id: "reviewer", name: "Reviewer", permissions: [] }],
    fixtures: [{ id: "request-imported", label: "Imported", data: {} }],
    routes: [{ path: "/requests/:id", screen: () => null }],
    ...overrides,
  };
}

function withLabels(node: React.ReactNode): string {
  return renderToStaticMarkup(
    <LabelsContext.Provider value={DEFAULT_LABELS}>{node}</LabelsContext.Provider>,
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("navegação sem status nem coleções", () => {
  it("exibe todo cenário registrado na Home, sem legenda de status nem módulo vazio", () => {
    const registry = createRegistry(product({ scenarios: [activeScenario, portedScenario] }));
    const markup = withLabels(<Home registry={registry} onOpenScenario={() => undefined} />);

    expect(markup).toContain(activeScenario.title);
    expect(markup).toContain(portedScenario.title);
    expect(markup).not.toContain("data-status");
    expect(markup).not.toContain("ds-home__legend");
    expect(markup).not.toContain("Empty module");
  });

  it("mostra um único estado vazio quando não há cenário nem componente", () => {
    const registry = createRegistry(product({ scenarios: [] }));
    const markup = withLabels(<Home registry={registry} onOpenScenario={() => undefined} />);

    expect(markup.match(/ds-home__empty/g)).toHaveLength(1);
    expect(markup).toContain(DEFAULT_LABELS.home.noScenarios);
    expect(markup).not.toContain("Empty module");
  });

  it("busca em todos os cenários registrados", () => {
    const registry = createRegistry(product({ scenarios: [activeScenario, portedScenario] }));
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(
      <Sidebar
        registry={registry}
        activeScenario={undefined}
        activeComponent={undefined}
        controls={controls}
        onOpenScenario={() => undefined}
        onOpenComponent={() => undefined}
      />,
    ));

    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => setInputValue(input, "Imported reference"));
    expect(container.textContent).toContain(portedScenario.title);
    expect(container.textContent).not.toContain(activeScenario.title);
    act(() => setInputValue(input, "nada disso"));
    expect(container.textContent).toContain(DEFAULT_LABELS.sidebar.noMatch("nada disso"));
    act(() => root.unmount());
  });

  it("abre cenário sem persona com permissões vazias", async () => {
    let permissions: string[] | undefined;
    const definition = product({
      scenarios: [portedScenario],
      routes: [{
        path: "/requests/:id",
        screen: ({ context }) => {
          permissions = context.permissions;
          return createElement("span", null, "SCREEN");
        },
      }],
    });
    window.history.replaceState(null, "", `/requests/imported?scenario=${portedScenario.id}`);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={definition} />));

    expect(container.textContent).toContain("SCREEN");
    expect(permissions).toEqual([]);
    expect(container.querySelector('[aria-current="true"]')?.textContent).toContain(
      portedScenario.title,
    );
    await act(async () => root.unmount());
  });
});

describe("produto que é só catálogo de componentes", () => {
  function catalogOnly(): ProductDefinition {
    return {
      id: "catalog",
      name: "Catalog",
      modules: [],
      scenarios: [],
      personas: [],
      fixtures: [],
      routes: [],
      components: [
        { id: "actions.button", name: "Button", group: "Actions", preview: () => null },
        {
          id: "layouts.page",
          name: "Page layout",
          group: "Layouts",
          description: "Two columns",
          preview: () => createElement("span", null, "PAGE LAYOUT"),
        },
      ],
    };
  }

  it("abre a Home no catálogo, sem seções de cenário vazias", async () => {
    window.history.replaceState(null, "", "/");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={catalogOnly()} />));

    const text = container.textContent ?? "";
    expect(text).toContain(DEFAULT_LABELS.home.componentsLead(2));
    expect(text).toContain("Actions");
    expect(text).toContain("Layouts");
    expect(text).toContain("Page layout");
    expect(text).not.toContain(DEFAULT_LABELS.home.noScenarios);
    expect(text).not.toContain(DEFAULT_LABELS.sidebar.emptyScenarios);
    expect(container.querySelector(".ds-home__empty")).toBeNull();
    // A navegação abre direto nos componentes, sem aba de fluxos vazia.
    expect(container.querySelector(".ds-sidebar__tabs")).toBeNull();
    expect(container.querySelectorAll(".ds-component-item")).toHaveLength(2);
    // Nenhum erro no diagnóstico: produto sem rota e sem cenário é válido.
    expect(text).not.toMatch(new RegExp(`${DEFAULT_LABELS.inspector.tabDiagnostics} \\(`));

    const card = [...container.querySelectorAll(".ds-home__card")].find((button) =>
      button.textContent?.includes("Page layout"),
    );
    await act(async () => card?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(window.location.search).toBe("?component=layouts.page");
    expect(container.textContent).toContain("PAGE LAYOUT");
    await act(async () => root.unmount());
  });
});

describe("component preview fixtures in the shell", () => {
  it("renders the data selector only for components that declare fixtures", () => {
    const definition = product({
      components: [
        { id: "feedback.notice", name: "Notice", preview: () => null },
        {
          id: "actions.button",
          name: "Button",
          preview: () => null,
          fixtures: [{ id: "filled", label: "Filled", data: { label: "Continue" } }],
        },
      ],
    });
    const registry = createRegistry(definition);
    const withoutFixtures = registry.component("feedback.notice");
    const withFixtures = registry.component("actions.button");

    const withoutMarkup = withLabels(
      <Controls
        registry={registry}
        controls={{ ...controls, component: withoutFixtures?.id }}
        scenarioActive={false}
        component={withoutFixtures}
        componentFixture={registry.resolveComponentFixture(withoutFixtures?.id, undefined)}
        onChange={() => undefined}
      />,
    );
    const withMarkup = withLabels(
      <Controls
        registry={registry}
        controls={{ ...controls, component: withFixtures?.id, fixture: "filled" }}
        scenarioActive={false}
        component={withFixtures}
        componentFixture={registry.resolveComponentFixture(withFixtures?.id, "filled")}
        onChange={() => undefined}
      />,
    );

    expect(withoutMarkup).not.toContain("ds-component-fixture");
    expect(withMarkup).toContain("ds-component-fixture");
    expect(withMarkup).toContain("Filled");
  });

  it("passes resolved fixture data and relevant controls without ScenarioContext", async () => {
    let received: ComponentPreviewProps<{ label: string }> | undefined;
    const Preview = (props: ComponentPreviewProps<{ label: string }>) => {
      received = props;
      return createElement("span", null, props.data?.label);
    };
    const definition = product({
      theme: { modes: ["light", "dark"], locales: ["pt-BR", "en-US"] },
      components: [{
        id: "actions.button",
        name: "Button",
        preview: Preview,
        fixtures: [{ id: "filled", label: "Filled", data: () => ({ label: "Continue" }) }],
        defaultFixture: "filled",
      }],
    });
    window.history.replaceState(
      null,
      "",
      "/?component=actions.button&fixture=filled&viewport=mobile&theme=dark&locale=en-US",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<DesignSpace product={definition} />));

    expect(received).toMatchObject({
      fixture: { id: "filled", label: "Filled" },
      data: { label: "Continue" },
      viewport: { id: "mobile", width: 390, height: 844 },
      themeMode: "dark",
      locale: "en-US",
    });
    expect(received).not.toHaveProperty("scenario");
    expect(received).not.toHaveProperty("a11y");
    await act(async () => root.unmount());
  });

  it("makes an invalid fixture fallback explicit instead of failing silently", async () => {
    const definition = product({
      components: [{
        id: "feedback.notice",
        name: "Notice",
        preview: ({ data }: ComponentPreviewProps<{ message: string }>) =>
          createElement("span", null, data?.message),
        fixtures: [{ id: "default", label: "Default", data: { message: "Ready" } }],
      }],
    });
    window.history.replaceState(
      null,
      "",
      "/?component=feedback.notice&fixture=missing",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<DesignSpace product={definition} />));

    expect(container.textContent).toContain("Ready");
    expect(container.textContent).toContain("missing");
    expect(container.textContent).toContain("fallback");
    expect(window.location.search).toContain("fixture=missing");
    await act(async () => root.unmount());
  });
});

describe("handoff focado no shell", () => {
  const hiddenScenario: Scenario = {
    ...activeScenario,
    id: "billing.hidden",
    title: "Hidden review",
    route: "/billing/hidden",
  };

  function scopedProduct(): ProductDefinition {
    return product({
      modules: [{
        id: "billing",
        name: "Billing",
        flows: [{
          id: "review",
          title: "Review flow",
          steps: [
            { scenario: activeScenario.id, label: "Allowed step" },
            { scenario: hiddenScenario.id, label: "Hidden step" },
          ],
        }],
      }, { id: "requests", name: "Requests" }],
      scenarios: [activeScenario, hiddenScenario, portedScenario],
      routes: [
        { path: "/billing/:id", screen: () => createElement("span", null, "SENSITIVE SCREEN") },
        { path: "/requests/:id", screen: () => null },
      ],
      components: [
        { id: "feedback.allowed", name: "Allowed component", preview: () => null },
        { id: "feedback.hidden", name: "Hidden component", preview: () => null },
      ],
    });
  }

  it("filtra Home, flows e componentes pela allowlist", async () => {
    const registry = createRegistry(scopedProduct());
    const handoff = {
      scenarios: [activeScenario.id, portedScenario.id],
      components: ["feedback.allowed"],
    };
    const home = withLabels(
      <Home
        registry={registry}
        handoff={handoff}
        onOpenScenario={() => undefined}
      />,
    );
    expect(home).toContain(activeScenario.title);
    expect(home).toContain("Allowed step");
    expect(home).not.toContain(hiddenScenario.title);
    expect(home).not.toContain("Hidden step");
    expect(home).toContain(portedScenario.title);

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(
      <LabelsContext.Provider value={DEFAULT_LABELS}>
        <Sidebar
          registry={registry}
          activeScenario={activeScenario}
          activeComponent={undefined}
          controls={{ ...controls, handoff }}
          onOpenScenario={() => undefined}
          onOpenComponent={() => undefined}
        />
      </LabelsContext.Provider>,
    ));
    const componentsTab = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === DEFAULT_LABELS.sidebar.componentsTab,
    );
    await act(async () => componentsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toContain("Allowed component");
    expect(container.textContent).not.toContain("Hidden component");
    await act(async () => root.unmount());
  });

  it("mostra bloqueio claro para URL fora do escopo e aceita rota autorizada", async () => {
    const definition = scopedProduct();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    window.history.replaceState(
      null,
      "",
      "/billing/hidden?scenario=billing.hidden&handoff=1&allowScenario=billing.review",
    );
    await act(async () => root.render(<DesignSpace product={definition} />));
    expect(container.textContent).toContain(DEFAULT_LABELS.shell.outsideHandoff);
    expect(container.textContent).not.toContain("SENSITIVE SCREEN");

    await act(async () => {
      window.history.replaceState(
        null,
        "",
        "/billing/hidden?handoff=1&allowRoute=%2Fbilling%2F%3Aid",
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(container.textContent).toContain("SENSITIVE SCREEN");
    expect(container.textContent).not.toContain(DEFAULT_LABELS.shell.outsideHandoff);
    await act(async () => root.unmount());
  });

  it("preserva a allowlist quando a tela navega com query própria", async () => {
    const navigable = scopedProduct();
    navigable.routes = [{
      path: "/billing/:id",
      screen: ({ context }) => createElement(
        "button",
        { onClick: () => context.navigate("/billing/hidden?panel=0") },
        "LEAVE SCOPE",
      ),
    }];
    window.history.replaceState(
      null,
      "",
      "/billing/review?scenario=billing.review&handoff=1&allowScenario=billing.review",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={navigable} />));

    const leave = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "LEAVE SCOPE",
    );
    await act(async () => leave?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(window.location.pathname).toBe("/billing/hidden");
    expect(window.location.search).toContain("handoff=1");
    expect(window.location.search).toContain("allowScenario=billing.review");
    expect(window.location.search).toContain("panel=0");
    expect(container.textContent).toContain(DEFAULT_LABELS.shell.outsideHandoff);
    await act(async () => root.unmount());
  });

  it("acrescenta o handoff a links internos da UI do produto", async () => {
    const linked = scopedProduct();
    linked.routes = [{
      path: "/billing/:id",
      screen: () => createElement(
        "div",
        null,
        createElement("a", { href: "/billing/hidden?tab=details" }, "INTERNAL LINK"),
        createElement("a", { href: "https://docs.example.test/guide" }, "EXTERNAL LINK"),
      ),
    }];
    window.history.replaceState(
      null,
      "",
      "/billing/review?scenario=billing.review&handoff=1&allowScenario=billing.review",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={linked} />));

    const anchors = [...container.querySelectorAll("a")];
    const internal = anchors.find((anchor) => anchor.textContent === "INTERNAL LINK");
    const external = anchors.find((anchor) => anchor.textContent === "EXTERNAL LINK");
    expect(internal?.getAttribute("href")).toContain("tab=details");
    expect(internal?.getAttribute("href")).toContain("handoff=1");
    expect(internal?.getAttribute("href")).toContain("allowScenario=billing.review");
    expect(external?.getAttribute("href")).toBe("https://docs.example.test/guide");
    await act(async () => root.unmount());
  });
});

describe("escopos autoexplicativos do Inspector", () => {
  it("separa tarefa, contexto herdado e produto, sem aba de acessibilidade", async () => {
    const scenario: Scenario = {
      ...activeScenario,
      permissions: ["requests.read"],
      expected: ["A decisão fica registrada."],
    };
    const registry = createRegistry(product({ scenarios: [scenario] }));
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(
      <LabelsContext.Provider value={DEFAULT_LABELS}>
        <Inspector
          registry={registry}
          scenario={scenario}
          controls={{ ...controls, scenario: scenario.id }}
        />
      </LabelsContext.Provider>,
    ));

    expect(container.textContent).toContain(DEFAULT_LABELS.inspector.taskScope);
    expect(container.textContent).toContain(DEFAULT_LABELS.inspector.inheritedScope);
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(2);

    const diagnostics = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.startsWith(DEFAULT_LABELS.inspector.tabDiagnostics),
    );
    await act(async () => diagnostics?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.textContent).toContain(DEFAULT_LABELS.inspector.diagnosticsProductNotice);
    await act(async () => root.unmount());
  });
});
