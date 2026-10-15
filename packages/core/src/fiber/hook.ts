/**
 * Gancho do React DevTools, reduzido ao que o destaque de componentes precisa:
 * saber quais raízes de React existem nesta janela e quando elas fazem commit.
 *
 * O React procura `__REACT_DEVTOOLS_GLOBAL_HOOK__` **uma vez**, quando o
 * `react-dom` é avaliado. Gancho instalado depois disso não recebe nada. Por
 * isso a instalação mora num entrypoint próprio, sem nenhum `import` de React,
 * que o produto importa na primeira linha do ponto de entrada:
 *
 * ```ts
 * import "@brucesantos/design-space/devtools-hook";
 * ```
 *
 * Com o React DevTools aberto, o gancho já existe — a extensão instala antes de
 * qualquer script da página. Nesse caso nada é trocado: o callback de commit da
 * extensão é encadeado, chamado primeiro, e o destaque só observa.
 *
 * Este arquivo não pode importar React nem nada que importe React.
 */

/** Raiz de React como o gancho a recebe (`FiberRoot`). Forma não contratual. */
export type FiberRoot = { current?: unknown; containerInfo?: unknown };

type DevtoolsHook = {
  renderers?: Map<number, unknown>;
  supportsFiber?: boolean;
  inject?: (renderer: unknown) => number;
  onCommitFiberRoot?: (rendererId: number, root: FiberRoot, ...rest: unknown[]) => void;
  onCommitFiberUnmount?: (...args: unknown[]) => void;
  onPostCommitFiberRoot?: (...args: unknown[]) => void;
  checkDCE?: (...args: unknown[]) => void;
  getFiberRoots?: (rendererId: number) => Set<FiberRoot>;
};

type Tracker = {
  roots: Set<FiberRoot>;
  listeners: Set<() => void>;
};

type HookWindow = Window & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook;
  __DS_REACT_TREE__?: Tracker;
};

/**
 * Instala o gancho mínimo, ou encadeia no que já existe. Idempotente: o estado
 * fica na própria janela, porque este entrypoint e o bundle principal são
 * arquivos diferentes e cada um teria a sua cópia do módulo.
 */
export function installDevtoolsHook(win: Window | undefined = typeof window === "undefined" ? undefined : window): void {
  const target = win as HookWindow | undefined;
  if (!target || target.__DS_REACT_TREE__) return;
  const tracker: Tracker = { roots: new Set(), listeners: new Set() };
  target.__DS_REACT_TREE__ = tracker;

  let hook = target.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) {
    const renderers = new Map<number, unknown>();
    hook = {
      renderers,
      supportsFiber: true,
      inject(renderer) {
        const id = renderers.size + 1;
        renderers.set(id, renderer);
        return id;
      },
      onCommitFiberUnmount() {},
      onPostCommitFiberRoot() {},
      // O `react-dom` de produção chama `checkDCE(fn)` para o DevTools avisar de
      // build sem eliminação de código morto. Aqui não há o que avisar.
      checkDCE() {},
      getFiberRoots: () => tracker.roots,
    };
    target.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
  }

  const previous = hook.onCommitFiberRoot;
  try {
    hook.onCommitFiberRoot = function (this: unknown, rendererId, root, ...rest) {
      // O DevTools primeiro; o destaque nunca pode quebrar o commit dele.
      try {
        previous?.call(this, rendererId, root, ...rest);
      } finally {
        try {
          track(tracker, root);
        } catch {
          // Forma de raiz desconhecida: quem lê decide o que fazer.
        }
      }
    };
  } catch {
    // Gancho congelado: sem notificação de commit, as raízes ainda vêm de
    // `getFiberRoots` quando o gancho as expõe.
  }
}

function track(tracker: Tracker, root: FiberRoot): void {
  // Raiz desmontada faz um último commit sem filhos.
  const current = root?.current as { child?: unknown } | undefined;
  if (current && current.child == null) tracker.roots.delete(root);
  else tracker.roots.add(root);
  for (const listener of tracker.listeners) listener();
}

/**
 * Raízes de React conhecidas nesta janela, ou `undefined` quando nenhuma chegou
 * por gancho — o `react-dom` carregou antes da instalação. Quem chama já está
 * dentro de uma árvore de React, então "nenhuma raiz" quer dizer isso.
 */
export function readFiberRoots(win: Window = window): FiberRoot[] | undefined {
  const target = win as HookWindow;
  const hook = target.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const roots = new Set<FiberRoot>(target.__DS_REACT_TREE__?.roots ?? []);
  // Com o DevTools real, as raízes que fizeram commit antes de o destaque
  // encadear o callback só existem no registro dele. O gancho do React Refresh
  // (Vite e afins em desenvolvimento) não preenche `renderers` nem tem
  // `getFiberRoots`; ali as raízes vêm só do callback encadeado.
  if (hook && hook.renderers instanceof Map && typeof hook.getFiberRoots === "function") {
    for (const id of hook.renderers.keys()) {
      for (const root of hook.getFiberRoots(id) ?? []) roots.add(root);
    }
  }
  return roots.size > 0 ? [...roots] : undefined;
}

/** Avisa a cada commit de qualquer raiz. Devolve a função que desinscreve. */
export function subscribeCommits(listener: () => void, win: Window = window): () => void {
  const tracker = (win as HookWindow).__DS_REACT_TREE__;
  if (!tracker) return () => {};
  tracker.listeners.add(listener);
  return () => tracker.listeners.delete(listener);
}
