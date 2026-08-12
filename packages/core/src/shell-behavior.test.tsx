import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createRegistry } from "./registry/index.js";
import { Controls } from "./shell/Controls.js";
import { DesignSpace } from "./shell/DesignSpace.js";
import { Home } from "./shell/Home.js";
import { LabelsContext, DEFAULT_LABELS } from "./shell/labels.js";
import { Sidebar } from "./shell/Sidebar.js";
import type {
  ComponentPreviewProps,
  ControlsState,
  ProductDefinition,
  Scenario,
} from "./types/index.js";
import { SCENARIO_STATUSES } from "./types/index.js";

beforeAll(() => {
  const environment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
});

const controls: ControlsState = {
  scenario: undefined,
  view: "active",
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
  keyboardMode: false,
  reducedMotion: false,
  textScale: 1,
  inspector: true,
};

const portedScenario: Scenario = {
  id: "requests.imported",
  title: "Imported reference",
  route: "/requests/imported",
  persona: "reviewer",
  fixture: "request-imported",
  a11y: { keyboard: "full", contrast: "AA" },
  status: "ported",
};

const activeScenario: Scenario = {
  id: "billing.review",
  title: "Active review",
  route: "/billing/review",
  persona: "reviewer",
  fixture: "request-imported",
  a11y: { keyboard: "full", contrast: "AA" },
  status: "in-review",
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

describe("ported visibility in the shell", () => {
  it("shows one active-work empty state with the references action for a ported-only product", () => {
    const registry = createRegistry(product());
    const markup = withLabels(
      <Home
        registry={registry}
        view="active"
        onViewChange={() => undefined}
        onOpenScenario={() => undefined}
      />,
    );

    expect(markup).toContain(DEFAULT_LABELS.home.noActiveWork);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.viewPorted(1));
    expect(markup).not.toContain(portedScenario.title);
    expect(markup.match(/ds-home__empty/g)).toHaveLength(1);
    expect(markup).not.toContain("Empty module");
    expect(markup).toContain(DEFAULT_LABELS.home.statusLegend);
    for (const status of SCENARIO_STATUSES) {
      expect(markup).toContain(`data-status="${status}"`);
      expect(markup).toContain(DEFAULT_LABELS.status[status]);
      expect(markup).toContain(DEFAULT_LABELS.statusMeaning[status]);
    }
  });

  it("shows one navigation empty state instead of empty module rows", () => {
    const registry = createRegistry(product());
    const markup = withLabels(
      <Sidebar
        registry={registry}
        activeScenario={undefined}
        activeComponent={undefined}
        controls={controls}
        onOpenScenario={() => undefined}
        onOpenComponent={() => undefined}
        onViewChange={() => undefined}
      />,
    );

    expect(markup.match(/ds-sidebar__view-empty/g)).toHaveLength(1);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.noActiveWork);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.viewPorted(1));
    expect(markup).not.toContain(DEFAULT_LABELS.sidebar.emptyModule);
    expect(markup).not.toContain("ds-module__count");
    expect(markup).not.toContain("ds-module__chevron");
  });

  it("renders only ported scenarios in the references view", () => {
    const registry = createRegistry(product());
    const markup = withLabels(
      <Home
        registry={registry}
        view="ported"
        onViewChange={() => undefined}
        onOpenScenario={() => undefined}
      />,
    );

    expect(markup).toContain(portedScenario.title);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.portedReferences(1));
    expect(markup).toContain(DEFAULT_LABELS.sidebar.backToActive);
    expect(markup).not.toContain(DEFAULT_LABELS.home.noActiveWork);
    expect(markup).not.toContain("Billing");
    expect(markup).not.toContain("Empty module");
  });

  it("keeps active and ported scenarios separate in a mixed product home", () => {
    const registry = createRegistry(product({ scenarios: [activeScenario, portedScenario] }));
    const markup = withLabels(
      <Home
        registry={registry}
        view="active"
        onViewChange={() => undefined}
        onOpenScenario={() => undefined}
      />,
    );

    expect(markup).toContain(activeScenario.title);
    expect(markup).not.toContain(portedScenario.title);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.viewPorted(1));
    expect(markup).not.toContain("Requests");
    expect(markup).not.toContain("Empty module");
  });

  it("removes empty modules and exposes an accessible textual view selector", () => {
    const registry = createRegistry(product({ scenarios: [activeScenario, portedScenario] }));
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => root.render(
      <Sidebar
        registry={registry}
        activeScenario={activeScenario}
        activeComponent={undefined}
        controls={{ ...controls, scenario: activeScenario.id }}
        onOpenScenario={() => undefined}
        onOpenComponent={() => undefined}
        onViewChange={() => undefined}
      />,
    ));

    expect(container.textContent).toContain(activeScenario.title);
    expect(container.textContent).not.toContain(portedScenario.title);
    expect(container.textContent).not.toContain("Requests");
    expect(container.textContent).not.toContain("Empty module");
    const switcher = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === DEFAULT_LABELS.sidebar.viewPorted(1),
    );
    expect(switcher).toBeDefined();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('[aria-label*="Trabalho ativo"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it("scopes search to the selected view", () => {
    const registry = createRegistry(product({ scenarios: [activeScenario, portedScenario] }));
    const container = document.createElement("div");
    const root = createRoot(container);
    act(() => root.render(
      <LabelsContext.Provider value={DEFAULT_LABELS}>
      <Sidebar
        registry={registry}
        activeScenario={undefined}
        activeComponent={undefined}
        controls={{ ...controls, view: "ported" }}
        onOpenScenario={() => undefined}
        onOpenComponent={() => undefined}
        onViewChange={() => undefined}
      />
      </LabelsContext.Provider>,
    ));

    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => setInputValue(input, "Active review"));
    expect(container.textContent).toContain(DEFAULT_LABELS.sidebar.noMatch("Active review"));
    expect(container.querySelectorAll(".ds-scenario")).toHaveLength(0);

    act(() => setInputValue(input, "Imported reference"));
    expect(container.textContent).toContain(portedScenario.title);
    expect(container.textContent).not.toContain(activeScenario.title);
    expect(container.textContent).not.toContain("Empty module");
    act(() => root.unmount());
  });

  it("restores view=ported on load and returns to active work without mixing the open collection", async () => {
    const definition = product({ scenarios: [activeScenario, portedScenario] });
    window.history.replaceState(null, "", "/?view=ported");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={definition} />));

    expect(container.textContent).toContain(DEFAULT_LABELS.sidebar.portedReferences(1));
    expect(container.textContent).toContain(portedScenario.title);
    expect(container.textContent).not.toContain(activeScenario.title);
    expect(window.location.search).toBe("?view=ported");

    const back = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === DEFAULT_LABELS.sidebar.backToActive,
    );
    await act(async () => back?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(window.location.pathname).toBe("/");
    expect(window.location.search).toBe("");
    expect(container.textContent).toContain(activeScenario.title);
    expect(container.textContent).not.toContain(portedScenario.title);
    await act(async () => root.unmount());
  });

  it("opens legacy showPorted=1 links in the references view", async () => {
    window.history.replaceState(null, "", "/?showPorted=1");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={product()} />));

    expect(container.textContent).toContain(DEFAULT_LABELS.sidebar.portedReferences(1));
    expect(container.textContent).toContain(portedScenario.title);
    await act(async () => root.unmount());
  });

  it("infers the references view for a direct ported scenario deep link", async () => {
    window.history.replaceState(
      null,
      "",
      `/requests/imported?scenario=${portedScenario.id}`,
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<DesignSpace product={product()} />));

    expect(container.textContent).toContain(DEFAULT_LABELS.sidebar.portedReferences(1));
    expect(container.textContent).toContain(portedScenario.title);
    expect(container.querySelector('[aria-current="true"]')?.textContent).toContain(
      portedScenario.title,
    );
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
      "/?component=actions.button&fixture=filled&viewport=mobile&theme=dark&locale=en-US&kb=1&motion=1&scale=1.5",
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
      a11y: { keyboardMode: true, reducedMotion: true, textScale: 1.5 },
    });
    expect(received).not.toHaveProperty("scenario");
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
