/**
 * Trava da forma da árvore do React.
 *
 * O destaque automático lê fibers, que não são contrato do React. Este teste
 * roda contra o React instalado: se uma versão nova mudar o registro no gancho
 * do DevTools ou a forma do fiber, ele quebra aqui, antes de o destaque cair
 * em silêncio para a marcação manual nos produtos.
 *
 * O gancho precisa existir antes de o `react-dom/client` ser avaliado, então
 * este arquivo não importa `react-dom` estaticamente — nem nada que importe.
 */

import { act, forwardRef, Fragment, memo, type ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { installDevtoolsHook, readFiberRoots, subscribeCommits } from "./hook.js";
import { findCatalogued, indexImplementations } from "./tree.js";

installDevtoolsHook(window);
const { createRoot } = await import("react-dom/client");
const { createPortal } = await import("react-dom");

beforeAll(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}
function Button({ children }: { children: ReactNode }) {
  return <button type="button">{children}</button>;
}
const MemoButton = memo(Button);
const Field = forwardRef<HTMLInputElement, { label: string }>(function Field({ label }, ref) {
  return <input ref={ref} aria-label={label} />;
});
const MemoField = memo(Field);
function Pair() {
  return (
    <Fragment>
      <span className="left">a</span>
      <span className="right">b</span>
    </Fragment>
  );
}
function Overlay() {
  return createPortal(<div className="overlay">overlay</div>, document.body);
}
function Loose() {
  return <p>loose</p>;
}

const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);

afterAll(() => {
  act(() => root.unmount());
});

describe("árvore do React instalado", () => {
  it("o react-dom se registra no gancho e as raízes chegam pelo commit", async () => {
    const commits = vi.fn();
    const unsubscribe = subscribeCommits(commits, window);
    await act(async () => {
      root.render(
        <Card>
          <MemoButton>Continue</MemoButton>
          <MemoField label="Name" />
          <Pair />
          <Overlay />
          <Loose />
        </Card>,
      );
    });
    unsubscribe();
    expect(commits).toHaveBeenCalled();
    expect(readFiberRoots(window)).toHaveLength(1);
  });

  it("acha cada componente catalogado pelo nó de topo, com memo, forwardRef, fragment e portal", () => {
    const index = indexImplementations([
      { id: "layout.card", implementation: Card },
      // Registrado pela função crua; a tela usa o memo.
      { id: "actions.button", implementation: Button },
      // Registrado embrulhado; o memo envolve o forwardRef.
      { id: "forms.field", implementation: MemoField },
      { id: "layout.pair", implementation: Pair },
      { id: "feedback.overlay", implementation: Overlay },
    ]);
    const found = findCatalogued(readFiberRoots(window)!, index);
    const describeNode = (node: (typeof found)[number]) => ({
      ids: node.ids,
      elements: node.elements.map((element) => element.className || element.tagName.toLowerCase()),
    });
    // `memo(forwardRef)` gera dois fibers sobre o mesmo nó; o destaque une os
    // dois num contorno só.
    expect(found.map(describeNode)).toEqual([
      { ids: ["layout.card"], elements: ["card"] },
      { ids: ["actions.button"], elements: ["button"] },
      { ids: ["forms.field"], elements: ["input"] },
      { ids: ["forms.field"], elements: ["input"] },
      { ids: ["layout.pair"], elements: ["left", "right"] },
      { ids: ["feedback.overlay"], elements: ["overlay"] },
    ]);
  });

  it("sem nada catalogado, não acha nada", () => {
    expect(findCatalogued(readFiberRoots(window)!, indexImplementations([]))).toEqual([]);
    expect(findCatalogued(readFiberRoots(window)!, indexImplementations([{ id: "other", implementation: Loose }])))
      .toHaveLength(1);
  });

  it("desmontar a raiz tira ela do registro", async () => {
    const extra = createRoot(document.createElement("div"));
    await act(async () => extra.render(<Loose />));
    expect(readFiberRoots(window)).toHaveLength(2);
    await act(async () => extra.unmount());
    expect(readFiberRoots(window)).toHaveLength(1);
  });
});
