import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSpace } from "./shell/DesignSpace.js";
import { DEFAULT_LABELS } from "./shell/labels.js";
import { FRAME_PARAM } from "./frame/index.js";
import type {
  ComponentPreviewProps,
  ProductDefinition,
  ScreenProps,
} from "./types/index.js";

beforeAll(() => {
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
});

function RequestScreen({ params, context }: ScreenProps) {
  return (
    <main data-testid="screen">
      <h1>{`Request ${params.id ?? "queue"}`}</h1>
      <output data-testid="data">{JSON.stringify(context.data ?? null)}</output>
      <output data-testid="persona">{context.persona?.id ?? "none"}</output>
      <output data-testid="can">{String(context.can("requests.read"))}</output>
      <a href="/requests/REQ-9">open</a>
    </main>
  );
}

function ButtonPreview({ data }: ComponentPreviewProps<{ label: string }>) {
  return <button type="button">{data?.label ?? "empty"}</button>;
}

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "reference",
    name: "Reference",
    personas: [
      { id: "reviewer", name: "Reviewer", permissions: ["requests.read"] },
      { id: "requester", name: "Requester", permissions: [] },
    ],
    fixtures: [
      { id: "queue", label: "Queue", data: { total: 3 } },
      { id: "detail", label: "Detail", data: { id: "REQ-1" } },
    ],
    routes: [
      { path: "/requests", screen: RequestScreen, name: "Request queue" },
      { path: "/requests/:id", screen: RequestScreen, name: "Request detail" },
    ],
    scenarios: [
      {
        id: "queue",
        title: "Full queue",
        intent: "See everything waiting.",
        route: "/requests",
        persona: "reviewer",
        fixture: "queue",
        expected: ["Three requests are listed."],
        components: ["actions.button"],
      },
      {
        id: "queue-empty",
        title: "Empty queue",
        intent: "Explain the empty state.",
        route: "/requests",
        persona: "reviewer",
        fixture: "queue",
        network: "empty",
        expected: ["The empty state explains what to do."],
      },
      {
        id: "detail",
        title: "Detail",
        route: "/requests/REQ-1",
        persona: "reviewer",
        fixture: "detail",
        expected: ["The detail opens."],
      },
    ],
    components: [
      {
        id: "actions.button",
        name: "Button",
        group: "Actions",
        source: "components/button.ex → button/1",
        preview: ButtonPreview,
        fixtures: [
          { id: "default", label: "Default", data: { label: "Continue" } },
          { id: "long", label: "Long label", data: { label: "Continue to the next step" } },
        ],
      },
      { id: "feedback.notice", name: "Notice", group: "Feedback", preview: () => null },
    ],
    ...overrides,
  };
}

let root: Root | undefined;

async function mount(url: string, definition: ProductDefinition = product()) {
  window.history.replaceState(null, "", url);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<DesignSpace product={definition} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return container;
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (item) => item.textContent?.trim() === name || item.getAttribute("aria-label") === name,
  );
  if (!found) throw new Error(`Botão não encontrado: ${name}`);
  return found;
}

async function click(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
  });
}

/** O select de um cartão das Variações, pelo rótulo acessível (visualmente oculto). */
function select(container: HTMLElement, name: string): HTMLSelectElement {
  const found = [...container.querySelectorAll<HTMLLabelElement>(".ds-panel label.ds-vcard__field")].find(
    (label) => label.querySelector(".ds-visually-hidden")?.textContent === name,
  );
  const element = found?.querySelector("select");
  if (!element) throw new Error(`Select não encontrado: ${name}`);
  return element;
}

async function choose(element: HTMLSelectElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  try {
    window.localStorage.clear();
  } catch {
    // sem armazenamento no ambiente
  }
});

describe("chrome", () => {
  it("abre a raiz na primeira variação da primeira tela, sem Home", async () => {
    const container = await mount("/");
    expect(window.location.pathname).toBe("/requests");
    expect(new URLSearchParams(window.location.search).get("scenario")).toBe("queue");

    const frame = container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]");
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute("src")).toBe(`/requests?scenario=queue&${FRAME_PARAM}=1`);
    expect(container.querySelector(".ds-topbar")?.textContent).toContain("Reference");
  });

  it("abre no primeiro componente quando o produto não tem telas", async () => {
    const container = await mount("/", product({ routes: [], scenarios: [] }));
    expect(new URLSearchParams(window.location.search).get("component")).toBe("actions.button");
    // As duas abas ficam; a lateral abre em Componentes, e Telas explica onde
    // as telas entram.
    expect(container.querySelector(".ds-sidebar [role='tablist']")).not.toBeNull();
    expect(container.querySelector(".ds-sidebar")?.textContent).toContain("Button");
    await click(button(container, DEFAULT_LABELS.sidebar.screensTab));
    expect(container.querySelector(".ds-sidebar")?.textContent).toContain(DEFAULT_LABELS.sidebar.emptyScreens);
  });

  it("filtra o painel direito sem diferenciar acento, e Cmd+F foca o filtro", async () => {
    const container = await mount("/requests?scenario=queue&tab=info");
    const input = container.querySelector<HTMLInputElement>(`.ds-panel input[aria-label="${DEFAULT_LABELS.panel.searchLabel}"]`)!;
    expect(input).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", metaKey: true }));
    });
    expect(document.activeElement).toBe(input);

    const visibleRows = () =>
      [...container.querySelectorAll<HTMLElement>(".ds-panel [data-ds-filter]")].filter((row) => !row.hidden);
    const before = visibleRows().length;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "ROTA");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const after = visibleRows();
    expect(after.length).toBeGreaterThan(0);
    expect(after.length).toBeLessThan(before);
    expect(after.every((row) => row.textContent?.toLowerCase().includes("rota"))).toBe(true);

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "zzzz-nada");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector(".ds-panel")?.textContent).toContain(DEFAULT_LABELS.panel.noMatch("zzzz-nada"));
  });

  it("mostra Telas e Componentes, sem contagem fora da busca, e destaca o item ativo", async () => {
    const container = await mount("/requests?scenario=queue");
    const tabs = [...container.querySelectorAll(".ds-sidebar [role='tab']")].map((tab) =>
      tab.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(tabs).toEqual([DEFAULT_LABELS.sidebar.screensTab, DEFAULT_LABELS.sidebar.componentsTab]);
    const active = container.querySelector(".ds-sidebar [aria-current='true']");
    expect(active?.textContent).toContain("Request queue");
  });

  it("busca sem diferenciar acento nem caixa, contando por aba", async () => {
    const container = await mount("/requests?scenario=queue");
    const input = container.querySelector<HTMLInputElement>(".ds-sidebar input")!;
    await act(async () => setInputValue(input, "BÚTTON"));

    const counts = [...container.querySelectorAll(".ds-sidebar [role='tab'] .ds-count")].map(
      (item) => item.textContent,
    );
    expect(counts).toEqual(["0", "1"]);

    await click(button(container, `${DEFAULT_LABELS.sidebar.componentsTab}1`));
    expect(container.querySelector(".ds-sidebar__list")?.textContent).toContain("Button");
    expect(container.querySelector(".ds-sidebar__list")?.textContent).not.toContain("Notice");
  });

  it("lista as variações da tela e troca de variação pela URL", async () => {
    const container = await mount("/requests?scenario=queue");
    const panel = container.querySelector(".ds-panel")!;
    expect(panel.textContent).toContain("Full queue");
    expect(panel.textContent).toContain("Empty queue");
    // Atalho compacto: a intenção fica na dica, não numa segunda linha.
    expect(button(container, "Full queue").title).toBe("See everything waiting.");

    await click(button(container, "Empty queue"));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("scenario")).toBe("queue-empty");
    expect(window.location.pathname).toBe("/requests");
  });

  it("Informações da tela mostram rota, comportamento esperado e componentes com origem", async () => {
    const container = await mount("/requests?scenario=queue&tab=info");
    const panel = container.querySelector(".ds-panel")!;
    expect(panel.textContent).toContain("/requests");
    expect(panel.textContent).toContain(DEFAULT_LABELS.info.expected);
    expect(panel.textContent).toContain("Three requests are listed.");
    expect(panel.textContent).toContain("components/button.ex → button/1");
    expect(() => button(container, DEFAULT_LABELS.info.copyForPr)).not.toThrow();

    await click(button(container, "Button"));
    expect(new URLSearchParams(window.location.search).get("component")).toBe("actions.button");
  });

  it("Informações do componente mostram origem e onde é usado, com link", async () => {
    const container = await mount("/?component=actions.button&tab=info");
    const panel = container.querySelector(".ds-panel")!;
    expect(panel.textContent).toContain("components/button.ex → button/1");
    expect(panel.textContent).toContain(DEFAULT_LABELS.info.usedIn);

    await click(button(container, "Request queue"));
    expect(window.location.pathname).toBe("/requests");
    expect(new URLSearchParams(window.location.search).get("scenario")).toBe("queue");
  });

  it("as variações de um componente são as fixtures dele, num select", async () => {
    const container = await mount("/?component=actions.button");
    const title = container.querySelector(".ds-panel .ds-vcard [data-ds-filter-title]");
    expect(title?.textContent).toBe("Button");
    const fixtures = select(container, DEFAULT_LABELS.panel.componentVariations);
    expect([...fixtures.options].map((option) => option.textContent)).toEqual(["Default", "Long label"]);
    expect(fixtures.value).toBe("default");

    await choose(fixtures, "long");
    expect(new URLSearchParams(window.location.search).get("fixture")).toBe("long");
    expect(select(container, DEFAULT_LABELS.panel.componentVariations).value).toBe("long");
  });

  it("viewport, girar e zoom vão para a URL e para o tamanho do quadro", async () => {
    const container = await mount("/requests?scenario=queue");
    await click(button(container, DEFAULT_LABELS.viewport.mobile!));
    const frame = () => container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!;
    expect(new URLSearchParams(window.location.search).get("viewport")).toBe("mobile");
    expect(frame().style.width).toBe("375px");
    expect(frame().style.height).toBe("812px");

    await click(button(container, DEFAULT_LABELS.topbar.rotate));
    expect(frame().style.width).toBe("812px");

    await click(button(container, DEFAULT_LABELS.topbar.zoomOut));
    expect(new URLSearchParams(window.location.search).get("zoom")).toBe("90");
    expect(frame().style.transform).toBe("scale(0.9)");
  });

  it("Shift+C esconde o chrome e o botão discreto o traz de volta", async () => {
    const container = await mount("/requests?scenario=queue");
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "C", shiftKey: true }));
    });
    expect(container.querySelector(".ds-root")?.getAttribute("data-chrome")).toBe("hidden");
    expect(container.querySelector(".ds-topbar")).toBeNull();
    expect(new URLSearchParams(window.location.search).get("chrome")).toBe("0");

    await click(container.querySelector(".ds-restore")!);
    expect(container.querySelector(".ds-topbar")).not.toBeNull();
  });

  it("o painel fica sempre aberto com o chrome, e a barra mostra a versão do motor", async () => {
    const container = await mount("/requests?scenario=queue");
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "P", shiftKey: true }));
    });
    expect(container.querySelector(".ds-panel")).not.toBeNull();
    const version = container.querySelector<HTMLAnchorElement>(".ds-topbar__version");
    expect(version?.textContent).toMatch(/^Design Space \d+\.\d+\.\d+$/);
    expect(version?.href).toContain("npmjs.com/package/@brucesantos/design-space");
  });

  it("girar só vale para celular e tablet", async () => {
    const desktop = await mount("/requests?scenario=queue&viewport=desktop");
    expect(button(desktop, DEFAULT_LABELS.topbar.rotate).disabled).toBe(true);
    act(() => root?.unmount());
    document.body.innerHTML = "";
    const mobile = await mount("/requests?scenario=queue&viewport=mobile");
    expect(button(mobile, DEFAULT_LABELS.topbar.rotate).disabled).toBe(false);
  });

  it("segue o sistema por padrão e lembra a troca de tema", async () => {
    const container = await mount("/requests?scenario=queue");
    const rootElement = () => container.querySelector(".ds-root")!;
    expect(rootElement().getAttribute("data-appearance")).toBe("light");

    await click(button(container, DEFAULT_LABELS.topbar.darkMode));
    expect(rootElement().getAttribute("data-appearance")).toBe("dark");
    expect(new URLSearchParams(window.location.search).get("appearance")).toBe("dark");
    expect(window.localStorage.getItem("ds:appearance")).toBe("dark");
  });

  it("mostra o indicador de diagnóstico só quando há problema", async () => {
    const clean = await mount("/requests?scenario=queue");
    expect(clean.querySelector(".ds-diagnostics")).toBeNull();
    act(() => root?.unmount());
    document.body.innerHTML = "";

    const broken = await mount(
      "/requests?scenario=queue",
      product({
        scenarios: [
          ...product().scenarios,
          { id: "broken", title: "Broken", route: "/requests", fixture: "missing" },
        ],
      }),
    );
    const trigger = broken.querySelector<HTMLButtonElement>(".ds-diagnostics__trigger")!;
    expect(trigger.getAttribute("data-level")).toBe("error");
    await click(trigger);
    expect(broken.querySelector(".ds-diagnostics__popover")?.textContent).toContain("missing");
  });

  it("estado vazio simples quando o produto não tem nada", async () => {
    const container = await mount("/", product({ routes: [], scenarios: [], components: [] }));
    expect(container.textContent).toContain(DEFAULT_LABELS.shell.empty);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("filtra a navegação pelo handoff", async () => {
    const container = await mount(
      "/requests/REQ-1?scenario=detail&handoff=1&allowScenario=detail&allowComponent=feedback.notice",
    );
    const sidebar = container.querySelector(".ds-sidebar")!;
    expect(sidebar.textContent).toContain("Request detail");
    expect(sidebar.textContent).not.toContain("Request queue");
    await click(button(container, DEFAULT_LABELS.sidebar.componentsTab));
    expect(sidebar.textContent).toContain("Notice");
    expect(sidebar.textContent).not.toContain("Button");
  });
});

describe("mensagens do quadro no chrome", () => {
  function frameWindow(container: HTMLElement): Window {
    return container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!.contentWindow!;
  }

  it("adota a navegação do quadro, mantendo os controles do chrome", async () => {
    const container = await mount("/requests?scenario=queue&appearance=dark&zoom=75");
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: frameWindow(container),
          data: {
            ds: 1,
            type: "navigate",
            url: `/requests/REQ-1?scenario=detail&${FRAME_PARAM}=1`,
            replace: false,
          },
        }),
      );
    });

    expect(window.location.pathname).toBe("/requests/REQ-1");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("scenario")).toBe("detail");
    expect(params.get("appearance")).toBe("dark");
    expect(params.get("zoom")).toBe("75");
    expect(params.has(FRAME_PARAM)).toBe(false);
  });

  it("ignora mensagem de outra origem ou de outra janela", async () => {
    const container = await mount("/requests?scenario=queue");
    const data = {
      ds: 1,
      type: "navigate",
      url: `/requests/REQ-1?scenario=detail&${FRAME_PARAM}=1`,
      replace: false,
    };
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://evil.example.test",
          source: frameWindow(container),
          data,
        }),
      );
      window.dispatchEvent(new MessageEvent("message", { origin: window.location.origin, source: window, data }));
    });
    expect(window.location.pathname).toBe("/requests");
  });

  it("atalho repassado pelo quadro esconde o chrome", async () => {
    const container = await mount("/requests?scenario=queue");
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: frameWindow(container),
          data: { ds: 1, type: "shortcut", key: "C" },
        }),
      );
    });
    expect(container.querySelector(".ds-root")?.getAttribute("data-chrome")).toBe("hidden");
  });
});

describe("modo quadro", () => {
  it("renderiza só a UI do produto, sem nenhum elemento do chrome", async () => {
    const container = await mount(`/requests/REQ-1?scenario=detail&${FRAME_PARAM}=1`);
    expect(container.querySelector("[data-testid='screen']")?.textContent).toContain("Request REQ-1");
    expect(container.querySelector("[data-testid='data']")?.textContent).toBe('{"id":"REQ-1"}');
    expect(container.querySelector("[data-testid='persona']")?.textContent).toBe("reviewer");
    expect(container.querySelector("[class^='ds-'], [class*=' ds-']")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("renderiza o preview do componente com a fixture pedida", async () => {
    const container = await mount(`/?component=actions.button&fixture=long&${FRAME_PARAM}=1`);
    expect(container.textContent).toBe("Continue to the next step");
  });

  it("aplica persona e rede da URL do quadro", async () => {
    const container = await mount(
      `/requests?scenario=queue&persona=requester&network=empty&${FRAME_PARAM}=1`,
    );
    expect(container.querySelector("[data-testid='persona']")?.textContent).toBe("requester");
    expect(container.querySelector("[data-testid='data']")?.textContent).toBe("null");
  });

  it("links internos navegam dentro do quadro, sem recarregar", async () => {
    const container = await mount(`/requests?scenario=queue&${FRAME_PARAM}=1`);
    await click(container.querySelector("a")!);
    expect(window.location.pathname).toBe("/requests/REQ-9");
    expect(new URLSearchParams(window.location.search).get(FRAME_PARAM)).toBe("1");
    expect(container.querySelector("h1")?.textContent).toBe("Request REQ-9");
  });

  it("bloqueia endereço fora do handoff e preserva o recorte nos links", async () => {
    const blocked = await mount(
      `/requests?scenario=queue&handoff=1&allowScenario=detail&${FRAME_PARAM}=1`,
    );
    expect(blocked.textContent).toContain(DEFAULT_LABELS.shell.outsideHandoff);
    act(() => root?.unmount());
    document.body.innerHTML = "";

    const allowed = await mount(
      `/requests/REQ-1?scenario=detail&handoff=1&allowScenario=detail&allowRoute=%2Frequests%2F%3Aid&${FRAME_PARAM}=1`,
    );
    const href = allowed.querySelector("a")?.getAttribute("href") ?? "";
    const url = new URL(href, window.location.origin);
    expect(url.searchParams.get("handoff")).toBe("1");
    expect(url.searchParams.getAll("allowScenario")).toEqual(["detail"]);
  });
});

/* ------------------------------------------------ fluxos e controles */

function OrdersScreen({ context }: ScreenProps) {
  return (
    <main>
      <output data-testid="controls">{JSON.stringify(context.controls)}</output>
      <output data-testid="scenario">{context.scenario?.id ?? "none"}</output>
      <output data-testid="state">
        {context.error ? "error" : context.isLoading ? "loading" : context.data === undefined ? "undefined" : JSON.stringify(context.data)}
      </output>
      <button type="button" onClick={() => context.setControl("overlay", "none")}>
        close
      </button>
      <button
        type="button"
        onClick={() => {
          context.setControl("rows", "none");
          context.setControl("sort", "oldest");
          context.setControl("overlay", "none");
        }}
      >
        accumulate
      </button>
      <button type="button" onClick={() => context.setControls({ rows: "one", overlay: "cancel" })}>
        batch
      </button>
    </main>
  );
}

function OrderDetailScreen({ params, context }: ScreenProps) {
  return (
    <main>
      <h1>{`Order ${params.id}`}</h1>
      <button
        type="button"
        onClick={() => context.navigate("/orders", { controls: { rows: "one", sort: "recent" } })}
      >
        back
      </button>
    </main>
  );
}

function flowDefinition(): ProductDefinition {
  return product({
    routes: [
      { path: "/help", screen: RequestScreen, name: "Help" },
      {
        path: "/orders",
        screen: OrdersScreen,
        name: "Order list",
        group: "Orders",
        expected: ["Orders are listed."],
        controls: [
          {
            id: "table",
            title: "Order table",
            component: "actions.button",
            note: "Rows of the table.",
            controls: [
              {
                id: "rows",
                label: "Rows",
                options: [
                  { value: "many", label: "Many" },
                  { value: "one", label: "One" },
                  { value: "none", label: "None" },
                ],
              },
              {
                id: "sort",
                label: "Sort",
                options: [
                  { value: "recent", label: "Most recent first" },
                  { value: "oldest", label: "Oldest first" },
                ],
              },
            ],
          },
          {
            id: "overlay",
            title: "Overlay",
            controls: [
              {
                id: "overlay",
                label: "Open",
                options: [
                  { value: "none", label: "Nothing" },
                  { value: "cancel", label: "Cancel" },
                ],
              },
            ],
          },
        ],
      },
      { path: "/orders/:id", screen: OrderDetailScreen, name: "Order detail", group: "Orders" },
    ],
    scenarios: [
      {
        id: "orders.cancel",
        title: "Cancelling",
        route: "/orders",
        fixture: "queue",
        controls: { overlay: "cancel" },
        expected: ["The modal asks for confirmation."],
      },
    ],
  });
}

describe("fluxos e controles", () => {
  it("a aba Telas agrupa por fluxo, com as telas soltas no topo", async () => {
    const container = await mount("/orders", flowDefinition());
    const list = container.querySelector(".ds-sidebar__list")!;
    const sections = [...list.querySelectorAll(".ds-group-section")];
    expect(sections).toHaveLength(2);
    expect(sections[0]!.querySelector(".ds-group-section__head")).toBeNull();
    expect(sections[0]!.textContent).toBe("Help");
    expect(sections[1]!.querySelector(".ds-group-section__head")?.textContent).toBe("Orders2");

    await click(button(container, DEFAULT_LABELS.sidebar.toggleGroup("Orders")));
    expect(list.textContent).not.toContain("Order detail");
  });

  it("o painel mostra o cartão de contexto no topo, um cartão por grupo e os atalhos no fim", async () => {
    const container = await mount("/orders", flowDefinition());
    const heads = [...container.querySelectorAll(".ds-panel .ds-vcard__head [data-ds-filter-title]")].map(
      (item) => item.textContent,
    );
    expect(heads).toEqual([DEFAULT_LABELS.panel.context, "Order table", "Overlay", DEFAULT_LABELS.panel.shortcuts]);
    const panel = container.querySelector(".ds-panel")!;
    // Sem acordeão, sem contagem, sem segmentado: todo controle é um select.
    expect(panel.querySelector("[aria-expanded]")).toBeNull();
    expect(panel.querySelector(".ds-count")).toBeNull();
    expect(panel.querySelector("[role='radiogroup']")).toBeNull();
    expect(select(container, "Rows").value).toBe("many");
    expect(select(container, "Sort").value).toBe("recent");
    expect(select(container, "Open").value).toBe("none");
    expect(select(container, DEFAULT_LABELS.panel.persona)).toBeTruthy();
    expect(select(container, DEFAULT_LABELS.panel.network)).toBeTruthy();
  });

  it("o cartão de grupo com componente tem o botão que o abre, e a nota fica só na dica", async () => {
    const container = await mount("/orders", flowDefinition());
    const cards = [...container.querySelectorAll<HTMLElement>(".ds-panel .ds-vcard")];
    const table = cards.find((card) => card.querySelector("[data-ds-filter-title]")?.textContent === "Order table")!;
    const overlay = cards.find((card) => card.querySelector("[data-ds-filter-title]")?.textContent === "Overlay")!;

    const panel = container.querySelector(".ds-panel")!;
    expect(panel.textContent).not.toContain("Rows of the table.");
    expect(table.querySelector(".ds-vcard__head")!.getAttribute("title")).toBe("Order table — Rows of the table.");

    // Botão só de ícone: o nome acessível vem do aria-label, sem texto visível.
    const link = table.querySelector<HTMLButtonElement>(".ds-vcard__link")!;
    expect(link.getAttribute("aria-label")).toBe(DEFAULT_LABELS.panel.openComponent("Button"));
    expect(link.textContent).toBe("");
    expect(overlay.querySelector(".ds-vcard__link")).toBeNull();

    await click(link);
    expect(new URLSearchParams(window.location.search).get("component")).toBe("actions.button");
  });

  it("mudar um controle vai para a URL e para o quadro por mensagem, sem recarregar", async () => {
    const container = await mount("/orders", flowDefinition());
    const frame = container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!;
    const src = frame.getAttribute("src");
    const post = vi.spyOn(frame.contentWindow!, "postMessage");

    await choose(select(container, "Rows"), "none");
    expect(new URLSearchParams(window.location.search).get("c.rows")).toBe("none");
    expect(frame.getAttribute("src")).toBe(src);
    expect(post).toHaveBeenCalledWith(
      { ds: 1, type: "location", url: `/orders?c.rows=none&${FRAME_PARAM}=1` },
      window.location.origin,
    );

    // Voltar ao padrão tira o parâmetro.
    await choose(select(container, "Rows"), "many");
    expect(window.location.search).toBe("");
  });

  it("o filtro do painel alcança grupos, controles e opções", async () => {
    const container = await mount("/orders", flowDefinition());
    const input = container.querySelector<HTMLInputElement>(".ds-panel .ds-search input")!;
    await act(async () => setInputValue(input, "oldest"));
    const visible = [...container.querySelectorAll<HTMLElement>(".ds-panel [data-ds-filter]")].filter(
      (row) => !row.hidden && !row.closest("[hidden]"),
    );
    expect(visible.map((row) => row.textContent)).toEqual(["SortMost recent firstOldest first"]);

    await act(async () => setInputValue(input, "overlay"));
    const groups = [...container.querySelectorAll<HTMLElement>(".ds-panel [data-ds-filter-group]")].filter(
      (group) => !group.hidden,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.textContent).toContain("Cancel");
  });

  it("o cenário aplica os controles e deixa de aparecer destacado quando a combinação muda", async () => {
    const container = await mount("/orders", flowDefinition());
    await click(button(container, "Cancelling"));
    expect(new URLSearchParams(window.location.search).get("scenario")).toBe("orders.cancel");
    expect(new URLSearchParams(window.location.search).has("c.overlay")).toBe(false);
    expect(button(container, "Cancelling").getAttribute("aria-current")).toBe("true");
    expect(select(container, "Open").value).toBe("cancel");

    await choose(select(container, "Open"), "none");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("scenario")).toBe("orders.cancel");
    expect(params.get("c.overlay")).toBe("none");
    expect(button(container, "Cancelling").getAttribute("aria-current")).toBeNull();

    // Trocar um controle que o cenário não fixa não tira o destaque.
    await choose(select(container, "Open"), "cancel");
    await choose(select(container, "Rows"), "one");
    expect(button(container, "Cancelling").getAttribute("aria-current")).toBe("true");
  });

  it("valor inválido na URL cai no padrão e vira aviso no diagnóstico", async () => {
    const container = await mount("/orders?c.rows=all&c.ghost=1", flowDefinition());
    expect(select(container, "Rows").value).toBe("many");
    const trigger = container.querySelector<HTMLButtonElement>(".ds-diagnostics__trigger")!;
    expect(trigger.getAttribute("data-level")).toBe("warning");
    await click(trigger);
    const popover = container.querySelector(".ds-diagnostics__popover")!.textContent;
    expect(popover).toContain(DEFAULT_LABELS.diagnostics.invalidControl("rows", "all", "many"));
    expect(popover).toContain(DEFAULT_LABELS.diagnostics.unknownControl("ghost", "1"));
  });

  it("Informações mostram fluxo, controles com o valor atual e o esperado da rota", async () => {
    const container = await mount("/orders?c.rows=one&tab=info", flowDefinition());
    const panel = container.querySelector(".ds-panel")!;
    expect(panel.textContent).toContain(DEFAULT_LABELS.info.flow);
    expect(panel.textContent).toContain("Orders");
    expect(panel.textContent).toContain("One");
    expect(panel.textContent).toContain("c.rows=one");
    expect(panel.textContent).toContain("Orders are listed.");
  });

  it("navegar para outra tela deixa os controles da anterior para trás", async () => {
    const container = await mount("/orders?c.rows=one", flowDefinition());
    await click(button(container, "Order detail"));
    expect(window.location.pathname).toBe("/orders/:id");
    expect(window.location.search).not.toContain("c.rows");
  });
});

describe("controles dentro do quadro", () => {
  it("a tela recebe os controles e `setControl` troca a URL do quadro e avisa o pai", async () => {
    const parent = { postMessage: vi.fn() };
    const descriptor = Object.getOwnPropertyDescriptor(window, "parent");
    Object.defineProperty(window, "parent", { configurable: true, value: parent });
    try {
      const container = await mount(`/orders?scenario=orders.cancel&${FRAME_PARAM}=1`, flowDefinition());
      const output = () => JSON.parse(container.querySelector("[data-testid='controls']")!.textContent!);
      expect(output()).toEqual({ rows: "many", sort: "recent", overlay: "cancel" });

      await click(button(container, "close"));
      expect(output().overlay).toBe("none");
      expect(container.querySelector("[data-testid='scenario']")?.textContent).toBe("orders.cancel");
      const params = new URLSearchParams(window.location.search);
      expect(params.get("c.overlay")).toBe("none");
      expect(params.get(FRAME_PARAM)).toBe("1");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?scenario=orders.cancel&c.overlay=none&${FRAME_PARAM}=1`,
          replace: true,
        },
        window.location.origin,
      );
    } finally {
      if (descriptor) Object.defineProperty(window, "parent", descriptor);
      else delete (window as { parent?: unknown }).parent;
    }
  });
});

describe("tela sem cenário", () => {
  it("lê os padrões dos controles e respeita o estado de rede do contexto", async () => {
    const container = await mount(`/orders?network=error&${FRAME_PARAM}=1`, flowDefinition());
    expect(JSON.parse(container.querySelector("[data-testid='controls']")!.textContent!)).toEqual({
      rows: "many",
      sort: "recent",
      overlay: "none",
    });
    expect(container.querySelector("[data-testid='state']")?.textContent).toBe("error");
    act(() => root?.unmount());
    document.body.innerHTML = "";

    const empty = await mount(`/orders?network=empty&${FRAME_PARAM}=1`, flowDefinition());
    expect(empty.querySelector("[data-testid='state']")?.textContent).toBe("null");
    act(() => root?.unmount());
    document.body.innerHTML = "";

    const loading = await mount(`/orders?network=loading&${FRAME_PARAM}=1`, flowDefinition());
    expect(loading.querySelector("[data-testid='state']")?.textContent).toBe("loading");
  });
});

/** O fluxo de pedidos com exemplo de parâmetro no detalhe, sem cenário nele. */
function flowWithParams(): ProductDefinition {
  const base = flowDefinition();
  return {
    ...base,
    routes: base.routes.map((route) =>
      route.path === "/orders/:id"
        ? { ...route, params: { id: "ORD-7" }, components: ["feedback.notice"] }
        : route,
    ),
  };
}

function withParent<T>(run: (parent: { postMessage: ReturnType<typeof vi.fn> }) => Promise<T>): Promise<T> {
  const parent = { postMessage: vi.fn() };
  const descriptor = Object.getOwnPropertyDescriptor(window, "parent");
  Object.defineProperty(window, "parent", { configurable: true, value: parent });
  return run(parent).finally(() => {
    if (descriptor) Object.defineProperty(window, "parent", descriptor);
    else delete (window as { parent?: unknown }).parent;
  });
}

describe("0.9.1: controles acumulam dentro do quadro", () => {
  it("várias chamadas de `setControl` no mesmo handler se somam numa URL só", () =>
    withParent(async (parent) => {
      const container = await mount(`/orders?scenario=orders.cancel&${FRAME_PARAM}=1`, flowDefinition());
      const output = () => JSON.parse(container.querySelector("[data-testid='controls']")!.textContent!);

      await click(button(container, "accumulate"));
      expect(output()).toEqual({ rows: "none", sort: "oldest", overlay: "none" });
      const params = new URLSearchParams(window.location.search);
      expect(params.get("c.rows")).toBe("none");
      expect(params.get("c.sort")).toBe("oldest");
      expect(params.get("c.overlay")).toBe("none");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?scenario=orders.cancel&c.rows=none&c.sort=oldest&c.overlay=none&${FRAME_PARAM}=1`,
          replace: true,
        },
        window.location.origin,
      );
    }));

  it("`setControls` muda vários de uma vez, com uma única mensagem ao pai", () =>
    withParent(async (parent) => {
      const container = await mount(`/orders?${FRAME_PARAM}=1`, flowDefinition());
      parent.postMessage.mockClear();
      await click(button(container, "batch"));
      const navigations = parent.postMessage.mock.calls.filter(([message]) => message.type === "navigate");
      expect(navigations).toHaveLength(1);
      expect(navigations[0]![0].url).toBe(`/orders?c.rows=one&c.overlay=cancel&${FRAME_PARAM}=1`);

      // Sem mudança efetiva, não há navegação nenhuma.
      parent.postMessage.mockClear();
      await click(button(container, "batch"));
      expect(parent.postMessage.mock.calls.filter(([message]) => message.type === "navigate")).toHaveLength(0);
    }));
});

describe("0.9.1: navegação com controles preserva o contexto", () => {
  it("de dentro do quadro, `navigate(to, { controls })` leva persona, rede e viewport, e não os `c.*` anteriores", () =>
    withParent(async (parent) => {
      const container = await mount(
        `/orders/7?persona=requester&network=slow&viewport=mobile&fixture=queue&${FRAME_PARAM}=1`,
        flowDefinition(),
      );
      await click(button(container, "back"));
      expect(window.location.pathname).toBe("/orders");
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      expect(params).toEqual({
        persona: "requester",
        network: "slow",
        viewport: "mobile",
        "c.rows": "one",
        [FRAME_PARAM]: "1",
      });
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?persona=requester&network=slow&viewport=mobile&c.rows=one&${FRAME_PARAM}=1`,
          replace: false,
        },
        window.location.origin,
      );
    }));

  it("o chrome adota a navegação e devolve os próprios parâmetros", async () => {
    const container = await mount("/orders/7?persona=requester&zoom=75&tab=info", flowDefinition());
    const frame = container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!.contentWindow!;
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: frame,
          data: { ds: 1, type: "navigate", url: `/orders?persona=requester&c.rows=one&${FRAME_PARAM}=1`, replace: false },
        }),
      );
    });
    expect(window.location.pathname).toBe("/orders");
    expect(Object.fromEntries(new URLSearchParams(window.location.search))).toEqual({
      persona: "requester",
      "c.rows": "one",
      zoom: "75",
      tab: "info",
    });
  });
});

describe("0.9.1: `route.params`", () => {
  it("a lateral abre a tela sem cenário no caminho de exemplo", async () => {
    const container = await mount("/orders", flowWithParams());
    await click(button(container, "Order detail"));
    expect(window.location.pathname).toBe("/orders/ORD-7");
    expect(container.querySelector(".ds-sidebar [aria-current='true']")?.textContent).toContain("Order detail");
  });

  it("\"Usado em\" abre a tela sem cenário no caminho de exemplo", async () => {
    const container = await mount("/?component=feedback.notice&tab=info", flowWithParams());
    await click(button(container, "Order detail"));
    expect(window.location.pathname).toBe("/orders/ORD-7");
    expect(new URLSearchParams(window.location.search).has("component")).toBe(false);
  });

  it("sem `params`, o caminho continua literal e o diagnóstico avisa", async () => {
    const container = await mount("/orders", flowDefinition());
    await click(container.querySelector<HTMLButtonElement>(".ds-diagnostics__trigger")!);
    expect(container.querySelector(".ds-diagnostics__popover")?.textContent).toContain("/orders/:id");
  });
});

describe("0.9.1: `defaultPersona`", () => {
  it("é a persona e as permissões da tela sem cenário, dentro do quadro", async () => {
    const container = await mount(`/requests?${FRAME_PARAM}=1`, product({ defaultPersona: "reviewer" }));
    expect(container.querySelector("[data-testid='persona']")?.textContent).toBe("reviewer");
    expect(container.querySelector("[data-testid='can']")?.textContent).toBe("true");
    act(() => root?.unmount());
    document.body.innerHTML = "";

    // A escolha explícita continua vencendo.
    const chosen = await mount(`/requests?persona=requester&${FRAME_PARAM}=1`, product({ defaultPersona: "reviewer" }));
    expect(chosen.querySelector("[data-testid='persona']")?.textContent).toBe("requester");
    expect(chosen.querySelector("[data-testid='can']")?.textContent).toBe("false");
  });

  it("o seletor do painel não oferece \"nenhuma\" e a URL só leva a persona quando difere", async () => {
    const container = await mount("/requests/REQ-4", product({ defaultPersona: "requester" }));
    const select = container.querySelector<HTMLSelectElement>(".ds-panel select")!;
    expect([...select.options].map((option) => option.value)).toEqual(["reviewer", "requester"]);
    expect(select.value).toBe("requester");

    await act(async () => {
      select.value = "reviewer";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(new URLSearchParams(window.location.search).get("persona")).toBe("reviewer");
    await act(async () => {
      select.value = "requester";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(new URLSearchParams(window.location.search).has("persona")).toBe(false);
  });

  it("sem `defaultPersona`, o seletor mantém a opção vazia", async () => {
    const container = await mount("/requests/REQ-4");
    const select = container.querySelector<HTMLSelectElement>(".ds-panel select")!;
    expect([...select.options].map((option) => option.value)).toEqual(["", "reviewer", "requester"]);
  });
});

describe("0.9.3: a query da tela sobrevive ao painel", () => {
  const screenQuery = (search = window.location.search) => {
    const params = new URLSearchParams(search);
    return { aba: params.get("aba"), page: params.get("page") };
  };

  it("trocar persona e rede mantém a query da tela", async () => {
    const container = await mount("/orders?aba=resumo&page=2", flowDefinition());
    await choose(select(container, DEFAULT_LABELS.panel.persona), "requester");
    expect(new URLSearchParams(window.location.search).get("persona")).toBe("requester");
    expect(screenQuery()).toEqual({ aba: "resumo", page: "2" });

    await choose(select(container, DEFAULT_LABELS.panel.network), "slow");
    expect(new URLSearchParams(window.location.search).get("network")).toBe("slow");
    expect(screenQuery()).toEqual({ aba: "resumo", page: "2" });
  });

  it("mudar um controle mantém a query e o quadro a recebe por mensagem", async () => {
    const container = await mount("/orders?aba=resumo", flowDefinition());
    const frame = container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");

    await choose(select(container, "Rows"), "none");
    expect(window.location.search).toBe("?c.rows=none&aba=resumo");
    expect(post).toHaveBeenCalledWith(
      { ds: 1, type: "location", url: `/orders?c.rows=none&aba=resumo&${FRAME_PARAM}=1` },
      window.location.origin,
    );
  });

  it("zoom, girar e viewport mantêm a query, junto com o recorte de handoff", async () => {
    const container = await mount(
      "/orders?aba=resumo&handoff=1&allowRoute=%2Forders",
      flowDefinition(),
    );
    await click(button(container, DEFAULT_LABELS.viewport.mobile!));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("viewport")).toBe("mobile");
    expect(params.get("handoff")).toBe("1");
    expect(params.getAll("allowRoute")).toEqual(["/orders"]);
    expect(params.get("aba")).toBe("resumo");
  });

  it("\"Copiar link\" leva a query da tela", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const container = await mount("/orders?aba=resumo", flowDefinition());
    await choose(select(container, DEFAULT_LABELS.panel.persona), "requester");
    await click(button(container, DEFAULT_LABELS.topbar.copyLink));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/orders?persona=requester&aba=resumo"));
  });

  it("trocar de tela pela lateral deixa a query da tela anterior para trás", async () => {
    const container = await mount("/orders?aba=resumo&persona=requester", flowDefinition());
    await click(button(container, "Order detail"));
    expect(window.location.pathname).toBe("/orders/:id");
    expect(window.location.search).not.toContain("aba");
  });

  it("dentro do quadro, `setControl` mantém a query da tela no endereço e na mensagem ao pai", () =>
    withParent(async (parent) => {
      const container = await mount(`/orders?scenario=orders.cancel&aba=resumo&${FRAME_PARAM}=1`, flowDefinition());
      await click(button(container, "close"));
      const params = new URLSearchParams(window.location.search);
      expect(params.get("aba")).toBe("resumo");
      expect(params.getAll(FRAME_PARAM)).toEqual(["1"]);
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?scenario=orders.cancel&c.overlay=none&aba=resumo&${FRAME_PARAM}=1`,
          replace: true,
        },
        window.location.origin,
      );
    }));
});

describe("0.10.0: a query que a tela escreve sozinha", () => {
  /** O que uma aba faz ao abrir: reescreve a própria query com a History API. */
  const writeTab = (value: string) =>
    act(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("list_tab", value);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
    });

  it("o quadro avisa o pai, que adota a query da tela", () =>
    withParent(async (parent) => {
      await mount(`/orders?scenario=orders.cancel&${FRAME_PARAM}=1`, flowDefinition());
      await writeTab("list|history");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?scenario=orders.cancel&list_tab=list%7Chistory&${FRAME_PARAM}=1`,
          replace: true,
        },
        window.location.origin,
      );
    }));

  it("`setControl` depois disso mantém a aba no endereço e na mensagem ao pai", () =>
    withParent(async (parent) => {
      const container = await mount(`/orders?scenario=orders.cancel&${FRAME_PARAM}=1`, flowDefinition());
      await writeTab("list|history");
      await click(button(container, "close"));
      expect(new URLSearchParams(window.location.search).get("list_tab")).toBe("list|history");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        {
          ds: 1,
          type: "navigate",
          url: `/orders?scenario=orders.cancel&c.overlay=none&list_tab=list%7Chistory&${FRAME_PARAM}=1`,
          replace: true,
        },
        window.location.origin,
      );
    }));

  it("a tela não reescreve os parâmetros do motor nem tira o modo quadro", () =>
    withParent(async (parent) => {
      await mount(`/orders?scenario=orders.cancel&persona=requester&${FRAME_PARAM}=1`, flowDefinition());
      await act(() => window.history.replaceState(null, "", "/orders?aba=resumo&persona=reviewer"));
      const params = new URLSearchParams(window.location.search);
      expect(params.get("persona")).toBe("requester");
      expect(params.get("scenario")).toBe("orders.cancel");
      expect(params.get("aba")).toBe("resumo");
      expect(params.get(FRAME_PARAM)).toBe("1");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: "navigate",
          url: `/orders?scenario=orders.cancel&persona=requester&aba=resumo&${FRAME_PARAM}=1`,
        }),
        window.location.origin,
      );
    }));

  it("no chrome, a aba adotada do quadro sobrevive a uma troca no painel", async () => {
    const container = await mount("/orders?scenario=orders.cancel", flowDefinition());
    const frame = container.querySelector<HTMLIFrameElement>("iframe[data-ds-frame]")!;
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: frame.contentWindow,
          data: {
            ds: 1,
            type: "navigate",
            url: `/orders?scenario=orders.cancel&list_tab=list%7Chistory&${FRAME_PARAM}=1`,
            replace: true,
          },
        }),
      );
    });
    expect(new URLSearchParams(window.location.search).get("list_tab")).toBe("list|history");
    await choose(select(container, DEFAULT_LABELS.panel.persona), "requester");
    const params = new URLSearchParams(window.location.search);
    expect(params.get("persona")).toBe("requester");
    expect(params.get("list_tab")).toBe("list|history");
  });
});

describe("0.10.0: a tela que escreve a query durante a renderização", () => {
  function TabbedScreen({ params }: ScreenProps) {
    // Uma rota por aba: a rota diz qual aba abrir, e a tela grava na query.
    const search = new URLSearchParams(window.location.search);
    if (!search.has("main_tab")) {
      search.set("main_tab", `unit|${params.tab}`);
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${search.toString()}`);
    }
    return <a href={`/units/${params.tab === "rooms" ? "docs" : "rooms"}`}>next</a>;
  }

  it("é adotada sem atualizar estado no meio da renderização, e cada tela grava a própria aba", () =>
    withParent(async (parent) => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      // Uma rota por aba: cada aba é uma tela.
      const definition = product({
        scenarios: [],
        routes: [
          { path: "/units/rooms", screen: (props) => <TabbedScreen {...props} params={{ tab: "rooms" }} />, name: "Rooms" },
          { path: "/units/docs", screen: (props) => <TabbedScreen {...props} params={{ tab: "docs" }} />, name: "Docs" },
        ],
      });
      const container = await mount(`/units/rooms?${FRAME_PARAM}=1`, definition);
      expect(new URLSearchParams(window.location.search).get("main_tab")).toBe("unit|rooms");

      await click(container.querySelector("a")!);
      await act(async () => {
        await Promise.resolve();
      });
      expect(window.location.pathname).toBe("/units/docs");
      expect(new URLSearchParams(window.location.search).get("main_tab")).toBe("unit|docs");
      expect(parent.postMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "navigate", url: `/units/docs?main_tab=unit%7Cdocs&${FRAME_PARAM}=1` }),
        window.location.origin,
      );
      expect(error).not.toHaveBeenCalled();
      error.mockRestore();
    }));
});
