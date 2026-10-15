/**
 * Leitura da árvore de fibers para o destaque de componentes.
 *
 * O casamento é por **referência**: o catálogo entrega a função real do
 * componente (`ComponentPreview.implementation`) e cada fiber cujo `type` — ou
 * `elementType`, que guarda o `memo` e o `lazy` originais — aponta para ela é
 * uma instância daquele componente. Nome não entra, então o build minificado
 * casa igual.
 *
 * A forma do fiber não é contrato do React. O que este arquivo supõe é pouco e
 * está concentrado aqui: `current`, `child`, `sibling`, `type`, `elementType` e
 * `stateNode`; o `stateNode` da raiz aponta de volta para a raiz; nó hospedeiro
 * tem `type` string e um elemento em `stateNode`. Qualquer desvio vira
 * {@link FiberShapeError}, e quem chama cai para a marcação manual.
 */

import type { FiberRoot } from "./hook.js";

const MEMO = Symbol.for("react.memo");
const FORWARD_REF = Symbol.for("react.forward_ref");

type Fiber = {
  child: Fiber | null;
  sibling: Fiber | null;
  type: unknown;
  elementType: unknown;
  stateNode: unknown;
};

/** A árvore não tem a forma que este arquivo conhece. */
export class FiberShapeError extends Error {}

/**
 * A referência e tudo o que ela embrulha: `memo(forwardRef(render))` devolve o
 * `memo`, o `forwardRef` e `render`. `lazy` fica como está: depois de
 * resolvido, o fiber guarda o componente em `type` e o `lazy` em `elementType`,
 * e os dois lados são consultados.
 */
export function unwrapComponent(reference: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = reference;
  while (current && (typeof current === "function" || typeof current === "object") && !chain.includes(current)) {
    chain.push(current);
    const tag = (current as { $$typeof?: unknown }).$$typeof;
    if (tag === MEMO) current = (current as { type?: unknown }).type;
    else if (tag === FORWARD_REF) current = (current as { render?: unknown }).render;
    else break;
  }
  return chain;
}

/** Referência de componente → ids do catálogo que a declaram. */
export type ImplementationIndex = Map<unknown, string[]>;

export function indexImplementations(
  components: readonly { id: string; implementation?: unknown }[],
): ImplementationIndex {
  const index: ImplementationIndex = new Map();
  for (const component of components) {
    const references = Array.isArray(component.implementation)
      ? component.implementation
      : component.implementation === undefined
        ? []
        : [component.implementation];
    for (const reference of references) {
      for (const item of unwrapComponent(reference)) {
        const ids = index.get(item) ?? [];
        if (!ids.includes(component.id)) ids.push(component.id);
        index.set(item, ids);
      }
    }
  }
  return index;
}

/** Ids do catálogo a que o fiber corresponde, na ordem do catálogo. */
export function matchFiber(
  fiber: { type?: unknown; elementType?: unknown },
  index: ImplementationIndex,
): string[] {
  const ids: string[] = [];
  for (const side of [fiber.type, fiber.elementType]) {
    for (const item of unwrapComponent(side)) {
      for (const id of index.get(item) ?? []) if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/** Uma instância de componente catalogado na tela. */
export type CataloguedNode = {
  ids: string[];
  /** Nós de DOM de topo que a instância renderiza; mais de um em fragment. */
  elements: Element[];
};

function isElement(value: unknown): value is Element {
  return Boolean(value) && (value as Node).nodeType === 1;
}

function isHost(fiber: Fiber): boolean {
  return typeof fiber.type === "string" && isElement(fiber.stateNode);
}

function assertFiber(value: unknown): asserts value is Fiber {
  if (!value || typeof value !== "object" || !("child" in value) || !("sibling" in value) || !("stateNode" in value)) {
    throw new FiberShapeError("fiber sem child, sibling ou stateNode");
  }
}

/**
 * Nós hospedeiros de topo abaixo de um fiber: desce por componentes,
 * fragments e portais até o primeiro elemento de cada ramo, sem passar dele.
 */
function topHostElements(fiber: Fiber, out: Element[]): void {
  for (let child = fiber.child; child; child = child.sibling) {
    assertFiber(child);
    if (isHost(child)) out.push(child.stateNode as Element);
    else topHostElements(child, out);
  }
}

/**
 * Instâncias de componente catalogado, em ordem de árvore — o de fora antes do
 * de dentro. Lança {@link FiberShapeError} se a árvore não for reconhecida.
 */
export function findCatalogued(roots: readonly FiberRoot[], index: ImplementationIndex): CataloguedNode[] {
  const found: CataloguedNode[] = [];
  if (index.size === 0) return found;
  for (const root of roots) {
    const current = root?.current as Fiber | undefined;
    assertFiber(current);
    if (current.stateNode !== root) throw new FiberShapeError("raiz sem `current.stateNode` de volta");
    // Pilha em vez de recursão: telas grandes têm árvores fundas.
    const stack: Fiber[] = current.child ? [current.child] : [];
    while (stack.length > 0) {
      const fiber = stack.pop()!;
      assertFiber(fiber);
      if (fiber.sibling) stack.push(fiber.sibling);
      if (fiber.child) stack.push(fiber.child);
      if (isHost(fiber)) continue;
      const ids = matchFiber(fiber, index);
      if (ids.length === 0) continue;
      const elements: Element[] = [];
      topHostElements(fiber, elements);
      if (elements.length > 0) found.push({ ids, elements });
    }
  }
  return found;
}
