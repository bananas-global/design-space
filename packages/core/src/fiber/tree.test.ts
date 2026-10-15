import { forwardRef, lazy, memo } from "react";
import { describe, expect, it } from "vitest";

import { FiberShapeError, findCatalogued, indexImplementations, matchFiber, unwrapComponent } from "./tree.js";

function Button() {
  return null;
}

describe("unwrapComponent", () => {
  it("desembrulha memo, forwardRef e os dois juntos", () => {
    const render = () => null;
    const forwarded = forwardRef(render);
    const memoized = memo(Button);
    const both = memo(forwarded);
    expect(unwrapComponent(Button)).toEqual([Button]);
    expect(unwrapComponent(memoized)).toEqual([memoized, Button]);
    expect(unwrapComponent(forwarded)).toEqual([forwarded, render]);
    expect(unwrapComponent(both)).toEqual([both, forwarded, render]);
  });

  it("mantém lazy e valores que não são componente como estão", () => {
    const lazyButton = lazy(async () => ({ default: Button }));
    expect(unwrapComponent(lazyButton)).toEqual([lazyButton]);
    expect(unwrapComponent("div")).toEqual([]);
    expect(unwrapComponent(null)).toEqual([]);
  });
});

describe("casamento por referência", () => {
  it("casa a função registrada, embrulhada ou não, e nunca pelo nome", () => {
    const index = indexImplementations([{ id: "actions.button", implementation: memo(Button) }]);
    // Fiber de `memo` simples guarda a função em `type` e o memo em `elementType`.
    expect(matchFiber({ type: Button, elementType: memo(Button) }, index)).toEqual(["actions.button"]);
    expect(matchFiber({ type: Button, elementType: Button }, index)).toEqual(["actions.button"]);

    const impostor = { Button: () => null }.Button;
    expect(impostor.name).toBe(Button.name);
    expect(matchFiber({ type: impostor, elementType: impostor }, index)).toEqual([]);
  });

  it("aceita lista de referências e mais de uma entrada para a mesma função", () => {
    const Icon = () => null;
    const index = indexImplementations([
      { id: "actions.button", implementation: [Button, Icon] },
      { id: "actions.link", implementation: Button },
      { id: "feedback.status" },
    ]);
    expect(matchFiber({ type: Button, elementType: Button }, index)).toEqual(["actions.button", "actions.link"]);
    expect(matchFiber({ type: Icon, elementType: Icon }, index)).toEqual(["actions.button"]);
  });

  it("casa lazy pelo elementType, que guarda o lazy original", () => {
    const lazyButton = lazy(async () => ({ default: Button }));
    const index = indexImplementations([{ id: "actions.button", implementation: lazyButton }]);
    expect(matchFiber({ type: Button, elementType: lazyButton }, index)).toEqual(["actions.button"]);
  });
});

/* Árvore sintética, só com os campos que `tree.ts` lê. */
type FakeFiber = {
  type: unknown;
  elementType: unknown;
  stateNode: unknown;
  child: FakeFiber | null;
  sibling: FakeFiber | null;
};

function fiber(type: unknown, children: FakeFiber[] = [], stateNode: unknown = null): FakeFiber {
  const node: FakeFiber = { type, elementType: type, stateNode, child: null, sibling: null };
  children.forEach((child, i) => {
    if (i === 0) node.child = child;
    else children[i - 1]!.sibling = child;
  });
  return node;
}

function host(tag: string, children: FakeFiber[] = []) {
  return fiber(tag, children, document.createElement(tag));
}

function rootOf(...children: FakeFiber[]) {
  const root: { current: FakeFiber } = { current: fiber(null, children) };
  root.current.stateNode = root;
  return root;
}

describe("findCatalogued", () => {
  it("contorna o primeiro nó hospedeiro, ou a união dos nós de topo no fragment", () => {
    function Group() {
      return null;
    }
    const button = host("button");
    const left = host("span");
    const right = host("span");
    const root = rootOf(host("main", [fiber(Button, [button]), fiber(Group, [fiber(Symbol.for("react.fragment"), [left, right])])]));
    const index = indexImplementations([
      { id: "actions.button", implementation: Button },
      { id: "layout.group", implementation: Group },
    ]);
    expect(findCatalogued([root], index)).toEqual([
      { ids: ["actions.button"], elements: [button.stateNode] },
      { ids: ["layout.group"], elements: [left.stateNode, right.stateNode] },
    ]);
  });

  it("devolve os aninhados, o de fora antes do de dentro", () => {
    function Card() {
      return null;
    }
    const inner = host("button");
    const outer = host("section", [fiber(Button, [inner])]);
    const root = rootOf(fiber(Card, [outer]));
    const index = indexImplementations([
      { id: "actions.button", implementation: Button },
      { id: "layout.card", implementation: Card },
    ]);
    expect(findCatalogued([root], index).map((node) => node.ids[0])).toEqual(["layout.card", "actions.button"]);
  });

  it("sem nada catalogado, não acha nada", () => {
    const root = rootOf(host("main", [fiber(Button, [host("button")])]));
    expect(findCatalogued([root], indexImplementations([]))).toEqual([]);
    expect(findCatalogued([root], indexImplementations([{ id: "feedback.status" }]))).toEqual([]);
    const Other = () => null;
    expect(findCatalogued([root], indexImplementations([{ id: "other", implementation: Other }]))).toEqual([]);
  });

  it("recusa árvore de forma desconhecida", () => {
    const index = indexImplementations([{ id: "actions.button", implementation: Button }]);
    expect(() => findCatalogued([{ current: {} }], index)).toThrow(FiberShapeError);
    const root = rootOf(host("main"));
    root.current.stateNode = null;
    expect(() => findCatalogued([root], index)).toThrow(FiberShapeError);
  });
});
