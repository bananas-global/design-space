/**
 * Destaque automático de ponta a ponta: `<DesignSpace>` em modo quadro, com o
 * gancho instalado antes do `react-dom`, como o produto faz pelo entrypoint
 * `devtools-hook`. Por isso nada aqui importa `react-dom` estaticamente.
 */

import { act, type ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { installDevtoolsHook } from "./fiber/hook.js";
import { FRAME_PARAM } from "./frame/index.js";
import type { ProductDefinition } from "./types/index.js";

installDevtoolsHook(window);
const { createRoot } = await import("react-dom/client");
const { DesignSpace } = await import("./shell/DesignSpace.js");
const { DEFAULT_LABELS } = await import("./shell/labels.js");
const { measureComponents } = await import("./shell/Highlight.js");
const { resetReadWarning } = await import("./fiber/read.js");

beforeAll(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function Card({ children }: { children: ReactNode }) {
  return <section data-box="card">{children}</section>;
}
function Button({ children, box = "button" }: { children: ReactNode; box?: string }) {
  return <button type="button" data-box={box}>{children}</button>;
}
/** Wrapper que só repassa: cai no mesmo nó do `Button`. */
function PrimaryButton({ children }: { children: ReactNode }) {
  return <Button box="primary">{children}</Button>;
}
/** Componente que também tem a marcação manual, no mesmo nó. */
function Badge() {
  return <em data-ds-component="feedback.badge" data-box="badge">New</em>;
}

function Screen() {
  return (
    <main>
      <Card>
        <PrimaryButton>Continue</PrimaryButton>
        <Button>Back</Button>
        <Badge />
        <em data-ds-component="legacy.badge" data-box="legacy">Draft</em>
        <p data-box="loose">Loose markup</p>
      </Card>
    </main>
  );
}

function product(): ProductDefinition {
  return {
    id: "reference",
    name: "Reference",
    personas: [{ id: "reviewer", name: "Reviewer", permissions: [] }],
    fixtures: [{ id: "queue", label: "Queue", data: {} }],
    routes: [{ path: "/requests", screen: Screen, name: "Request queue" }],
    scenarios: [{ id: "queue", title: "Queue", route: "/requests", persona: "reviewer", fixture: "queue" }],
    components: [
      { id: "layout.card", name: "Card", preview: () => null, implementation: Card },
      { id: "actions.button", name: "Button", preview: () => null, implementation: Button },
      { id: "actions.primary", name: "Primary", preview: () => null, implementation: PrimaryButton },
      { id: "feedback.badge", name: "Badge", preview: () => null, implementation: Badge },
    ],
  };
}

let root: ReturnType<typeof createRoot> | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
  resetReadWarning();
  vi.restoreAllMocks();
});

/** Cada elemento com `data-box` ocupa uma faixa própria; o resto não aparece. */
function mockRects() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const order = ["card", "primary", "button", "badge", "legacy", "loose"].indexOf(this.dataset.box ?? "");
    if (order === -1) return DOMRect.fromRect({ width: 0, height: 0 });
    return DOMRect.fromRect({ x: 10, y: 40 + order * 40, width: 200, height: 30 });
  });
}

async function mount(url: string) {
  window.history.replaceState(null, "", url);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(<DesignSpace product={product()} />));
  await act(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  });
  return container;
}

describe("destaque automático", () => {
  it("contorna pelo catálogo, sem marcação, e une o que cai no mesmo nó", async () => {
    mockRects();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount(`/requests?scenario=queue&highlight=1&${FRAME_PARAM}=1`);
    const boxes = [...document.querySelectorAll<HTMLElement>(".ds-highlight__box")];
    expect(boxes.map((box) => [box.textContent, box.dataset.known, box.style.top])).toEqual([
      ["Card", "true", "40px"],
      // O wrapper e o `Button` que ele renderiza: um contorno, os dois nomes.
      ["Primary · Button", "true", "80px"],
      ["Button", "true", "120px"],
      // Achado pela árvore e marcado à mão no mesmo nó, com o mesmo id: um só.
      ["Badge", "true", "160px"],
      [DEFAULT_LABELS.highlight.notInCatalog("legacy.badge"), "false", "200px"],
    ]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("degradação", () => {
  it("árvore de forma desconhecida cai para a marcação manual e avisa uma vez", () => {
    mockRects();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__: { getFiberRoots: unknown } })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__;
    const original = hook.getFiberRoots;
    hook.getFiberRoots = () => new Set([{ current: { unexpected: true } }]);
    try {
      const element = document.createElement("em");
      element.dataset.box = "legacy";
      element.setAttribute("data-ds-component", "legacy.badge");
      document.body.append(element);
      const index = new Map<unknown, string[]>([[Button, ["actions.button"]]]);
      expect(measureComponents(document, index).map((box) => box.ids)).toEqual([["legacy.badge"]]);
      expect(measureComponents(document, index)).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]![0])).toContain("forma esperada");
    } finally {
      hook.getFiberRoots = original;
    }
  });
});
