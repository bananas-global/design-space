/**
 * `<DesignSpace />` — o único componente que o produto monta.
 *
 * Tudo que o produto entrega é uma `ProductDefinition`. O motor cuida de
 * navegação, deep link, controles, contexto e verificação; o produto cuida de
 * aparência, domínio e dados. Essa é a fronteira inteira (§8).
 *
 * O mesmo componente tem dois papéis, decididos pelo documento em que monta:
 *
 * - **Chrome** — o documento de cima: navegação, controles e painel, com a UI do
 *   produto num `<iframe>` da mesma origem e do mesmo bundle.
 * - **Quadro** — o documento do `<iframe>` (`ds-frame=1`): só a UI do produto.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ControlsState, PanelTab, ProductDefinition } from "../types/index.js";
import { createRegistry, type Registry } from "../registry/index.js";
import { useDesignSpaceState } from "../controls/state.js";
import { getDeployContext } from "../deploy/index.js";
import { PARAM } from "../controls/params.js";
import { fromFrameUrl, isFrameMode, mergeChromeParams } from "../frame/index.js";
import { Topbar } from "./Topbar.js";
import { Sidebar } from "./Sidebar.js";
import { Panel } from "./Panel.js";
import { Canvas } from "./Canvas.js";
import { FrameView } from "./FrameView.js";
import { LabelsContext, resolveLabels, useLabels } from "./labels.js";
import {
  STORAGE_KEYS,
  storedTheme,
  useStoredWidth,
  useSystemTheme,
  writeStored,
} from "./storage.js";
import "./shell.css";

export type DesignSpaceProps = {
  product: ProductDefinition;
};

export function DesignSpace({ product }: DesignSpaceProps) {
  const registry = useMemo(() => createRegistry(product), [product]);
  const labels = useMemo(() => resolveLabels(product.theme?.labels), [product.theme?.labels]);
  // Decidido uma vez: o papel do documento não muda enquanto ele existe.
  const [frame] = useState(() => isFrameMode());

  return (
    <LabelsContext.Provider value={labels}>
      {frame ? (
        <FrameView product={product} registry={registry} />
      ) : (
        <Chrome product={product} registry={registry} />
      )}
    </LabelsContext.Provider>
  );
}

/** Larguras das laterais: padrão, mínimo e máximo, em px. */
const LEFT = { initial: 260, min: 200, max: 480 } as const;
const RIGHT = { initial: 320, min: 260, max: 560 } as const;

function Chrome({ product, registry }: { product: ProductDefinition; registry: Registry }) {
  const labels = useLabels();
  const deploy = useMemo(() => getDeployContext(product.deploy), [product.deploy]);
  const { location, controls, viewport, setControls, openScenario, openComponent, openScreen, go } =
    useDesignSpaceState(registry);
  const locationRef = useRef(location);
  locationRef.current = location;

  const system = useSystemTheme();
  const [remembered, setRemembered] = useState(() => storedTheme());
  const theme = controls.chromeTheme ?? remembered ?? system;

  const [leftWidth, setLeftWidth] = useStoredWidth(
    STORAGE_KEYS.leftWidth,
    LEFT.initial,
    LEFT.min,
    LEFT.max,
  );
  const [rightWidth, setRightWidth] = useStoredWidth(
    STORAGE_KEYS.rightWidth,
    RIGHT.initial,
    RIGHT.min,
    RIGHT.max,
  );
  const [resizing, setResizing] = useState(false);

  const handoff = controls.handoff;
  const component = registry.component(controls.component);
  const scenario = registry.scenario(controls.scenario);
  const screen = component
    ? undefined
    : registry
        .screensFor({ handoff })
        .find((item) => item.id === registry.screenForPath(location.path)?.id);
  const variation =
    screen && scenario && screen.variations.some((item) => item.id === scenario.id)
      ? scenario
      : undefined;
  const componentFixture = useMemo(
    () => registry.resolveComponentFixture(component?.id, component ? controls.fixture : undefined),
    [component, controls.fixture, registry],
  );

  const firstScreen = registry.screensFor({ handoff })[0];
  const firstComponent = registry.componentsFor(handoff)[0];
  const isEmpty = !firstScreen && !firstComponent;

  // Sem Home: a raiz abre o primeiro item. Só quando o endereço não pediu nada —
  // um link para um item fora do handoff precisa mostrar o bloqueio, não sumir.
  const requestedSomething = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.has(PARAM.scenario) || params.has(PARAM.component);
  }, [location.search]);
  const redirectPending =
    location.path === "/" &&
    !requestedSomething &&
    !registry.screenForPath("/") &&
    !isEmpty;

  useEffect(() => {
    if (!redirectPending) return;
    if (firstScreen) openScreen(firstScreen.id, { replace: true });
    else if (firstComponent) openComponent(firstComponent.id, { replace: true });
  }, [firstComponent, firstScreen, openComponent, openScreen, redirectPending]);

  const toggleChrome = useCallback(
    () => setControls({ chrome: !controls.chrome }),
    [controls.chrome, setControls],
  );
  const togglePanel = useCallback(
    () => setControls({ inspector: !controls.inspector }),
    [controls.inspector, setControls],
  );

  const onShortcut = useCallback(
    (key: "C" | "P") => {
      if (key === "C") toggleChrome();
      else if (controls.chrome) togglePanel();
    },
    [controls.chrome, toggleChrome, togglePanel],
  );

  // Atalhos que não competem com os do navegador. Busca (Cmd/Ctrl+K) vive na
  // navegação; com o foco no quadro, o próprio quadro repassa Shift+C e Shift+P.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "C" && event.key !== "P") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
      event.preventDefault();
      onShortcut(event.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onShortcut]);

  const onFrameNavigate = useCallback(
    (url: string, replace: boolean) => {
      const { path, search } = fromFrameUrl(url);
      go(path, mergeChromeParams(search, locationRef.current.search), { replace });
    },
    [go],
  );

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    writeStored(STORAGE_KEYS.appearance, next);
    setRemembered(next);
    setControls({ chromeTheme: next });
  };

  const change = (patch: Partial<ControlsState>) => setControls(patch);
  const linkUrl = `${deploy.origin}${location.path}${location.search}`;
  const panelTab: PanelTab = controls.panelTab ?? "variations";
  const zoom = controls.zoom ?? 100;

  return (
    <div
      className="ds-root"
      data-appearance={theme}
      data-chrome={controls.chrome ? "visible" : "hidden"}
      data-panel={controls.inspector ? "open" : "closed"}
      data-resizing={resizing ? "true" : undefined}
      data-viewport={viewport.id}
    >
      {controls.chrome && (
        <Topbar
          productName={product.name}
          deploy={deploy}
          viewportId={controls.viewport}
          viewport={viewport}
          zoom={zoom}
          rotated={Boolean(controls.rotated)}
          theme={theme}
          panelOpen={controls.inspector}
          issues={registry.issues}
          linkUrl={linkUrl}
          onViewport={(id) => change({ viewport: id })}
          onRotate={() => change({ rotated: !controls.rotated })}
          onZoom={(next) => change({ zoom: next })}
          onCleanReview={toggleChrome}
          onToggleTheme={toggleTheme}
          onTogglePanel={togglePanel}
        />
      )}

      <div className="ds-body">
        {controls.chrome && (
          <Sidebar
            registry={registry}
            handoff={handoff}
            activeScreen={screen?.id}
            activeComponent={component?.id}
            onOpenScreen={(id) => openScreen(id)}
            onOpenComponent={(id) => openComponent(id)}
            width={leftWidth}
            onResize={setLeftWidth}
            onResizeStart={() => setResizing(true)}
            onResizeEnd={() => setResizing(false)}
          />
        )}

        <main className="ds-main">
          {isEmpty ? (
            <div className="ds-chrome-empty">
              <h1 className="ds-chrome-empty__title">{labels.shell.empty}</h1>
              <p className="ds-muted">{labels.shell.emptyHint}</p>
            </div>
          ) : redirectPending ? null : (
            <Canvas
              location={location}
              viewport={viewport}
              zoom={zoom}
              title={labels.shell.frameTitle(product.name)}
              resizing={resizing}
              onFrameNavigate={onFrameNavigate}
              onShortcut={onShortcut}
            />
          )}
        </main>

        {controls.chrome && controls.inspector && (
          <Panel
            registry={registry}
            controls={controls}
            deploy={deploy}
            screen={screen}
            variation={variation}
            component={component}
            componentFixture={componentFixture}
            tab={panelTab}
            onTab={(tab) => change({ panelTab: tab })}
            onOpenScenario={openScenario}
            onOpenComponent={(id) => openComponent(id)}
            onChange={change}
            width={rightWidth}
            onResize={setRightWidth}
            onResizeStart={() => setResizing(true)}
            onResizeEnd={() => setResizing(false)}
          />
        )}
      </div>

      {/* Sem chrome não há como voltar a não ser editando a URL, o que trava
          quem recebeu o link em revisão limpa. O botão é discreto e fica quase
          invisível até receber hover ou foco, então não pesa em captura. */}
      {!controls.chrome && (
        <button
          type="button"
          className="ds-restore"
          aria-label={labels.shell.restoreChrome}
          title={labels.shell.restoreChrome}
          onClick={toggleChrome}
        >
          <span className="ds-restore__dot" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
