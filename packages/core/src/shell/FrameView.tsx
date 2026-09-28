/**
 * Modo quadro: o documento dentro do `<iframe>` do chrome.
 *
 * Renderiza **só** a UI do produto — o wrapper do produto mais a tela da rota
 * ou o preview do componente. Nenhum elemento do chrome, nenhuma classe `ds-`
 * fora do estado vazio, e nenhuma regra do chrome alcança este documento.
 *
 * Os dados, a persona e a rede saem da URL do próprio quadro, que o pai mantém
 * em sincronia por mensagem.
 */

import { useEffect, useMemo, useRef } from "react";
import type { ProductDefinition, ScenarioContext } from "../types/index.js";
import type { Registry } from "../registry/index.js";
import { useDesignSpaceState } from "../controls/state.js";
import { resolveRoute } from "../router/index.js";
import { fixtureAdapter } from "../adapters/index.js";
import { useScenarioData } from "../adapters/useScenarioData.js";
import { PARAM } from "../controls/params.js";
import {
  applyHandoffScope,
  handoffAllowsComponent,
  handoffAllowsPath,
  handoffAllowsScenario,
} from "../handoff/index.js";
import { postFrameMessage, type FrameShortcut } from "../frame/index.js";
import { StageEmpty } from "./Stage.js";
import { useLabels } from "./labels.js";

export function FrameView({ product, registry }: { product: ProductDefinition; registry: Registry }) {
  const labels = useLabels();
  const { location, controls, viewport, navigate, openScenario } = useDesignSpaceState(registry, {
    frame: true,
  });
  const rootRef = useRef<HTMLDivElement>(null);

  // Link comum da UI do produto dentro do quadro: navega sem recarregar e sem
  // perder o modo quadro. Clique com modificador, `target` e download seguem o
  // navegador — abrir em nova aba leva ao chrome completo, que é o desejado.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href") ?? "";
      if (raw.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  // Atalhos do chrome com o foco dentro do quadro: o teclado não atravessa o
  // iframe, então o quadro repassa. Campos de texto ficam de fora.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (window.parent === window) return;
      const key = frameShortcutOf(event);
      if (!key) return;
      const target = event.target as HTMLElement | null;
      if (key === "C" && target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
      event.preventDefault();
      postFrameMessage(window.parent, { ds: 1, type: "shortcut", key }, window.location.origin);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Com handoff, links internos carregam o recorte: vale para nova aba e para
  // "copiar endereço", sem alcançar links externos nem âncoras locais.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !controls.handoff) return;

    const preserveScope = () => {
      for (const anchor of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        const raw = anchor.getAttribute("href");
        if (!raw || raw.startsWith("#")) continue;
        let url: URL;
        try {
          url = new URL(raw, window.location.href);
        } catch {
          continue;
        }
        if (url.origin !== window.location.origin) continue;
        applyHandoffScope(url.searchParams, controls.handoff);
        const scoped = `${url.pathname}${url.search}${url.hash}`;
        if (raw !== scoped) anchor.setAttribute("href", scoped);
      }
    };

    preserveScope();
    const observer = new MutationObserver(preserveScope);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    return () => observer.disconnect();
  }, [controls.handoff]);

  const scenario = registry.scenario(controls.scenario);
  const component = registry.component(controls.component);
  const requested = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      scenario: params.get(PARAM.scenario) ?? undefined,
      component: params.get(PARAM.component) ?? undefined,
    };
  }, [location.search]);
  const handoffBlocked = Boolean(
    controls.handoff &&
      ((requested.scenario && !handoffAllowsScenario(controls.handoff, requested.scenario)) ||
        (requested.component && !handoffAllowsComponent(controls.handoff, requested.component)) ||
        (!requested.component &&
          !handoffAllowsPath(controls.handoff, location.path, product.scenarios))),
  );

  const componentFixture = useMemo(
    () => registry.resolveComponentFixture(component?.id, component ? controls.fixture : undefined),
    [component, controls.fixture, registry],
  );
  const componentData = useMemo(() => {
    const value = componentFixture.fixture?.data;
    return typeof value === "function" ? (value as () => unknown)() : value;
  }, [componentFixture.fixture]);

  const persona = registry.persona(controls.persona ?? scenario?.persona);
  const fixture = registry.fixture(controls.fixture ?? scenario?.fixture);

  const adapter = useMemo(() => {
    const id = controls.dataSource ?? "fixtures";
    if (id === "fixtures") return fixtureAdapter;
    return product.dataSources?.adapters?.find((a) => a.id === id) ?? fixtureAdapter;
  }, [controls.dataSource, product.dataSources?.adapters]);

  const { data, isLoading, error } = useScenarioData({
    scenario,
    fixture,
    network: controls.network,
    adapter,
  });

  const permissions = useMemo(() => {
    // Persona trocada no controle manda sobre a do cenário: é assim que se
    // responde "e se um perfil sem permissão abrir esta tela?" sem um segundo
    // cenário.
    if (controls.persona && controls.persona !== scenario?.persona) {
      return registry.persona(controls.persona)?.permissions ?? [];
    }
    return registry.permissionsOf(scenario);
  }, [controls.persona, registry, scenario]);

  const context: ScenarioContext = useMemo(
    () => ({
      scenario,
      persona,
      permissions,
      can: (permission) => permissions.includes(permission),
      data,
      fixture,
      network: controls.network,
      isLoading,
      error,
      rules: registry.rulesOf(scenario),
      viewport,
      themeMode: controls.themeMode,
      locale: controls.locale,
      navigate: (to: string) => navigate(to),
      openScenario,
    }),
    [
      scenario,
      persona,
      permissions,
      data,
      fixture,
      controls.network,
      controls.themeMode,
      controls.locale,
      isLoading,
      error,
      registry,
      viewport,
      navigate,
      openScenario,
    ],
  );

  const match = resolveRoute(product.routes ?? [], location.path);
  const Wrapper = product.wrapper;
  const NotFound = product.notFound;
  const Preview = component?.preview;

  const screen = handoffBlocked ? (
    <StageEmpty title={labels.shell.outsideHandoff}>
      <p>{labels.shell.outsideHandoffHint}</p>
    </StageEmpty>
  ) : Preview ? (
    <Preview
      fixture={componentFixture.fixture}
      data={componentData}
      viewport={viewport}
      themeMode={controls.themeMode ?? "default"}
      locale={controls.locale ?? "default"}
    />
  ) : match ? (
    <match.definition.screen params={match.params} context={context} />
  ) : NotFound ? (
    <NotFound path={location.path} />
  ) : (
    <StageEmpty title={labels.shell.noRoute}>
      <p>
        <code>{location.path}</code> {labels.shell.noRouteHint}
      </p>
    </StageEmpty>
  );

  return (
    // `display: contents` deixa o layout do produto como se este nó não
    // existisse: ele só serve de raiz para observar os links.
    <div ref={rootRef} style={{ display: "contents" }}>
      {Wrapper && !handoffBlocked ? <Wrapper context={context}>{screen}</Wrapper> : screen}
    </div>
  );
}

/** O atalho do chrome que este evento representa, se algum. */
export function frameShortcutOf(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
): FrameShortcut | undefined {
  if (event.altKey) return undefined;
  if (event.shiftKey && !event.metaKey && !event.ctrlKey && event.key === "C") return "C";
  if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
    const key = event.key.toLowerCase();
    if (key === "k") return "K";
    if (key === "f") return "F";
  }
  return undefined;
}
