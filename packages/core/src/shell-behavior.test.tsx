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

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "reference",
    name: "Reference",
    modules: [{ id: "requests", name: "Requests" }],
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

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("ported visibility in the shell", () => {
  it("shows an active-work empty state for a product containing only ported scenarios", () => {
    const registry = createRegistry(product());
    const markup = withLabels(<Home registry={registry} onOpenScenario={() => undefined} />);

    expect(markup).toContain(DEFAULT_LABELS.home.noActiveWork);
    expect(markup).not.toContain(portedScenario.title);
  });

  it("includes ported scenarios on the home page when explicitly enabled", () => {
    const registry = createRegistry(product());
    const markup = withLabels(
      <Home registry={registry} showPorted onOpenScenario={() => undefined} />,
    );

    expect(markup).toContain(portedScenario.title);
    expect(markup).not.toContain(DEFAULT_LABELS.home.noActiveWork);
  });

  it("keeps a ported deep link active and explained in navigation", () => {
    const registry = createRegistry(product());
    const markup = withLabels(
      <Sidebar
        registry={registry}
        activeScenario={portedScenario}
        activeComponent={undefined}
        controls={{ ...controls, scenario: portedScenario.id }}
        onOpenScenario={() => undefined}
        onOpenComponent={() => undefined}
        onShowPortedChange={() => undefined}
      />,
    );

    expect(markup).toContain(portedScenario.title);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.activePorted);
    expect(markup).toContain(DEFAULT_LABELS.sidebar.showPorted);
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
