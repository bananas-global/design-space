import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

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
    await click(button(container, `${DEFAULT_LABELS.sidebar.screensTab}0`));
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

  it("mostra Telas e Componentes com contagem e destaca o item ativo", async () => {
    const container = await mount("/requests?scenario=queue");
    const tabs = [...container.querySelectorAll(".ds-sidebar [role='tab']")].map((tab) =>
      tab.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(tabs).toEqual([
      `${DEFAULT_LABELS.sidebar.screensTab}2`,
      `${DEFAULT_LABELS.sidebar.componentsTab}2`,
    ]);
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
    expect(panel.textContent).toContain("See everything waiting.");
    expect(panel.textContent).toContain("Empty queue");

    await click(button(container, "Empty queueExplain the empty state."));
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

  it("as variações de um componente são as fixtures dele", async () => {
    const container = await mount("/?component=actions.button");
    await click(button(container, "Long label"));
    expect(new URLSearchParams(window.location.search).get("fixture")).toBe("long");
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
    await click(button(container, `${DEFAULT_LABELS.sidebar.componentsTab}1`));
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
