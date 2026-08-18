/**
 * `<DesignSpace />` — o único componente que o produto monta.
 *
 * Tudo que o produto entrega é uma `ProductDefinition`. O motor cuida de
 * navegação, deep link, controles, contexto e verificação; o produto cuida de
 * aparência, domínio e dados. Essa é a fronteira inteira (§8).
 */

import { useEffect, useMemo, useRef } from "react";
import type { ProductDefinition, ScenarioContext } from "../types/index.js";
import { createRegistry } from "../registry/index.js";
import { useDesignSpaceState } from "../controls/state.js";
import { resolveRoute } from "../router/index.js";
import { fixtureAdapter } from "../adapters/index.js";
import { useScenarioData } from "../adapters/useScenarioData.js";
import { getDeployContext } from "../deploy/index.js";
import { useKeyboardMode } from "../a11y/useKeyboardMode.js";
import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";
import { Controls } from "./Controls.js";
import { Inspector } from "./Inspector.js";
import { Stage, StageEmpty, TabOrderOverlay } from "./Stage.js";
import { Home } from "./Home.js";
import { LabelsContext, resolveLabels } from "./labels.js";
import "./shell.css";

export type DesignSpaceProps = {
  product: ProductDefinition;
};

export function DesignSpace({ product }: DesignSpaceProps) {
  const registry = useMemo(() => createRegistry(product), [product]);
  const labels = useMemo(() => resolveLabels(product.theme?.labels), [product.theme?.labels]);
  const deploy = useMemo(() => getDeployContext(product.deploy), [product.deploy]);
  const { location, controls, viewport, setControls, navigate, openScenario, openComponent } =
    useDesignSpaceState(registry);

  const stageRef = useRef<HTMLDivElement>(null);
  const { focused, tabStops } = useKeyboardMode(controls.keyboardMode, stageRef);

  const scenario = registry.scenario(controls.scenario);
  const component = registry.component(controls.component);
  const componentFixture = useMemo(
    () => registry.resolveComponentFixture(component?.id, component ? controls.fixture : undefined),
    [component, controls.fixture, registry],
  );
  const componentData = useMemo(() => {
    const value = componentFixture.fixture?.data;
    return typeof value === "function" ? value() : value;
  }, [componentFixture.fixture]);
  const persona = registry.persona(controls.persona ?? scenario?.persona);
  const fixture = registry.fixture(controls.fixture ?? scenario?.fixture);

  const adapter = useMemo(() => {
    const id = controls.dataSource ?? "fixtures";
    if (id === "fixtures") return fixtureAdapter;
    return product.dataSources?.adapters?.find((a) => a.id === id) ?? fixtureAdapter;
  }, [controls.dataSource, product.dataSources?.adapters]);

  const { data, isLoading, error } = useScenarioData({ scenario, fixture, network: controls.network, adapter });

  // Atalhos globais do ambiente. Busca vive na Sidebar; aqui ficam apenas os
  // modos de inspeção que não competem com atalhos conhecidos do navegador.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      switch (event.key) {
        case "K":
          setControls({ keyboardMode: !controls.keyboardMode });
          break;
        case "P":
          setControls({ inspector: !controls.inspector });
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controls.keyboardMode, controls.inspector, setControls]);

  const permissions = useMemo(() => {
    // Persona escolhida no controle manda sobre a do cenário: é assim que se
    // responde "e se um perfil sem permissão abrir esta tela?" sem inventar um
    // segundo cenário.
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
      a11y: {
        keyboardMode: controls.keyboardMode,
        reducedMotion: controls.reducedMotion,
        textScale: controls.textScale,
      },
      navigate,
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
      controls.keyboardMode,
      controls.reducedMotion,
      controls.textScale,
      isLoading,
      error,
      registry,
      viewport,
      navigate,
      openScenario,
    ],
  );

  // A raiz sem cenário ativo é o mapa de situações, não uma tela do produto.
  // Quem recebe o link cru precisa ver o que existe antes de escolher; cair no
  // meio de um fluxo — ou num estado sem permissão — se lê como defeito.
  const isHome = !scenario && !component && location.path === "/";

  const match = resolveRoute(product.routes, location.path);
  const Wrapper = product.wrapper;
  const NotFound = product.notFound;

  const Preview = component?.preview;
  const screen = Preview ? (
    <Preview
      fixture={componentFixture.fixture}
      data={componentData}
      viewport={viewport}
      themeMode={controls.themeMode ?? "default"}
      locale={controls.locale ?? "default"}
      a11y={{
        keyboardMode: controls.keyboardMode,
        reducedMotion: controls.reducedMotion,
        textScale: controls.textScale,
      }}
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

  const stageContent = Wrapper ? <Wrapper context={context}>{screen}</Wrapper> : screen;

  return (
    <LabelsContext.Provider value={labels}>
      <div
        className="ds-root"
        data-chrome={controls.chrome ? "visible" : "hidden"}
        data-appearance={controls.chromeTheme ?? "dark"}
        data-inspector={controls.inspector ? "open" : "closed"}
        data-viewport={viewport.id}
      >
        {controls.chrome && (
          <Topbar
            product={product}
            scenario={scenario}
            deploy={deploy}
            inspectorOpen={controls.inspector}
            chromeTheme={controls.chromeTheme ?? "dark"}
            showPorted={controls.showPorted ?? false}
            onToggleInspector={() => setControls({ inspector: !controls.inspector })}
            onToggleChromeTheme={() =>
              setControls({ chromeTheme: controls.chromeTheme === "light" ? "dark" : "light" })
            }
          />
        )}

        {controls.chrome && (
          <Sidebar
            registry={registry}
            activeScenario={scenario}
            activeComponent={controls.component}
            controls={controls}
            onOpenScenario={openScenario}
            onOpenComponent={openComponent}
            onShowPortedChange={(showPorted) => setControls({ showPorted })}
          />
        )}

        <div className="ds-stage-area">
          {isHome ? (
            <div className="ds-stage-scroll">
              <Home
                registry={registry}
                showPorted={controls.showPorted ?? false}
                onOpenScenario={openScenario}
              />
            </div>
          ) : (
            <Stage
              ref={stageRef}
              viewport={viewport}
              textScale={controls.textScale}
              reducedMotion={controls.reducedMotion}
              keyboardMode={controls.keyboardMode}
            >
              {stageContent}
            </Stage>
          )}

          {controls.chrome && (
            <Controls
              registry={registry}
              controls={controls}
              scenarioActive={Boolean(scenario)}
              component={component}
              componentFixture={componentFixture}
              onChange={setControls}
            />
          )}
        </div>

        {controls.chrome && (
          <Inspector
            registry={registry}
            scenario={scenario}
            component={component}
            componentFixture={componentFixture}
            controls={controls}
            focusedNode={focused}
            tabStopCount={tabStops.length}
          />
        )}

        {controls.keyboardMode && <TabOrderOverlay stops={tabStops} />}

        {/* Sem chrome não há como voltar a não ser editando a URL, o que trava
            quem recebeu o link em modo de revisão limpa. Este botão é invisível
            até receber hover ou foco, então não aparece em captura de tela. */}
        {!controls.chrome && (
          <button
            type="button"
            className="ds-chrome ds-restore"
            onClick={() => setControls({ chrome: true })}
          >
            {labels.shell.restoreChrome}
          </button>
        )}
      </div>
    </LabelsContext.Provider>
  );
}
