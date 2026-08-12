/**
 * Estado dos controles, serializado na URL.
 *
 * A regra que governa este arquivo: **a URL é o estado**. Não existe controle
 * cujo valor viva só em memória, porque o critério de aceite do ambiente é que
 * a mesma URL gere a mesma situação e os mesmos dados (§15.1 "Determinismo") e
 * que um PO possa enviar um link que abra o cenário certo sem sequência manual
 * anterior (§6).
 *
 * Precedência de valores, do mais forte para o mais fraco:
 * 1. parâmetro explícito na URL;
 * 2. valor declarado no cenário ativo;
 * 3. padrão do motor.
 *
 * Isso é o que permite colar `?scenario=requests.approve-blocked` sozinho e
 * receber a persona, a fixture e o estado de rede corretos de brinde.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChromeTheme,
  ControlsState,
  NetworkState,
  ScenarioView,
  ViewportSetting,
} from "../types/index.js";
import type { Registry } from "../registry/index.js";
import { NETWORK_STATES } from "../types/index.js";
import { PARAM } from "./params.js";

export const VIEWPORTS: readonly ViewportSetting[] = [
  { id: "fit", label: "Ajustar" },
  { id: "mobile", label: "Celular", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", width: 834, height: 1112 },
  { id: "desktop", label: "Desktop", width: 1440, height: 900 },
  { id: "custom", label: "Personalizado" },
] as const;

export const TEXT_SCALES = [1, 1.25, 1.5, 2] as const;


export type DesignSpaceLocation = {
  path: string;
  search: string;
};

/**
 * Lê os controles da query string, aplicando os padrões do cenário ativo.
 * Pura e testável: não toca em `window`.
 */
export function parseControls(search: string, registry: Registry): ControlsState {
  const params = new URLSearchParams(search);
  const componentId = params.get(PARAM.component) ?? undefined;
  const component = registry.component(componentId);
  const scenarioId = params.get(PARAM.scenario) ?? undefined;
  const scenario = component ? undefined : registry.scenario(scenarioId);
  const requestedFixture = params.get(PARAM.fixture) ?? undefined;
  const componentFixture = component
    ? requestedFixture ??
      registry.componentFixture(component.id, component.defaultFixture)?.id ??
      component.fixtures?.[0]?.id
    : undefined;

  const network = params.get(PARAM.network);
  const scale = Number(params.get(PARAM.textScale));
  const requestedView = params.get(PARAM.view);
  const view: ScenarioView =
    scenario?.status === "ported" ||
    requestedView === "ported" ||
    params.get(PARAM.showPorted) === "1"
      ? "ported"
      : "active";

  return {
    scenario: scenario?.id,
    view,
    showPorted: view === "ported",
    component: component?.id,
    persona: params.get(PARAM.persona) ?? scenario?.persona,
    fixture: component ? componentFixture : requestedFixture ?? scenario?.fixture,
    network: isNetworkState(network) ? network : (scenario?.network ?? "success"),
    viewport: params.get(PARAM.viewport) ?? "fit",
    customWidth: positiveInt(params.get(PARAM.customWidth)),
    themeMode: params.get(PARAM.themeMode) ?? registry.product.theme?.modes?.[0],
    locale: params.get(PARAM.locale) ?? registry.product.theme?.locales?.[0],
    dataSource: params.get(PARAM.dataSource) ?? registry.product.dataSources?.default ?? "fixtures",
    chromeTheme: isChromeTheme(params.get(PARAM.chromeTheme))
      ? (params.get(PARAM.chromeTheme) as ChromeTheme)
      : "dark",
    // Chrome visível por padrão. `?chrome=0` é o modo de revisão limpa e captura
    // de tela, então precisa ser explícito para não sumir sem pedido.
    chrome: params.get(PARAM.chrome) !== "0",
    keyboardMode: params.get(PARAM.keyboardMode) === "1",
    reducedMotion: params.get(PARAM.reducedMotion) === "1",
    textScale: (TEXT_SCALES as readonly number[]).includes(scale) ? scale : 1,
    inspector: params.get(PARAM.inspector) !== "0",
  };
}

/**
 * Serializa os controles de volta na query string, omitindo tudo que é padrão.
 * URL curta é URL que sobrevive a ser colada em ticket e em thread.
 */
export function serializeControls(state: ControlsState, registry: Registry): string {
  const params = new URLSearchParams();
  const scenario = registry.scenario(state.scenario);

  if (state.component) params.set(PARAM.component, state.component);
  else if (state.scenario) params.set(PARAM.scenario, state.scenario);

  if (scenarioView(state) === "ported") params.set(PARAM.view, "ported");

  // Persona e fixture só entram quando divergem do cenário: um link com a
  // combinação declarada não precisa repeti-la, e um link com combinação
  // deliberadamente diferente precisa carregá-la.
  if (state.persona && state.persona !== scenario?.persona) {
    params.set(PARAM.persona, state.persona);
  }
  if (state.component && state.fixture) {
    params.set(PARAM.fixture, state.fixture);
  } else if (state.fixture && state.fixture !== scenario?.fixture) {
    params.set(PARAM.fixture, state.fixture);
  }
  if (state.network !== (scenario?.network ?? "success")) {
    params.set(PARAM.network, state.network);
  }

  if (state.viewport !== "fit") params.set(PARAM.viewport, state.viewport);
  if (state.viewport === "custom" && state.customWidth) {
    params.set(PARAM.customWidth, String(state.customWidth));
  }

  const defaultTheme = registry.product.theme?.modes?.[0];
  if (state.themeMode && state.themeMode !== defaultTheme) {
    params.set(PARAM.themeMode, state.themeMode);
  }
  const defaultLocale = registry.product.theme?.locales?.[0];
  if (state.locale && state.locale !== defaultLocale) {
    params.set(PARAM.locale, state.locale);
  }
  const defaultSource = registry.product.dataSources?.default ?? "fixtures";
  if (state.dataSource && state.dataSource !== defaultSource) {
    params.set(PARAM.dataSource, state.dataSource);
  }
  if (state.chromeTheme === "light") params.set(PARAM.chromeTheme, "light");

  if (!state.chrome) params.set(PARAM.chrome, "0");
  if (state.keyboardMode) params.set(PARAM.keyboardMode, "1");
  if (state.reducedMotion) params.set(PARAM.reducedMotion, "1");
  if (state.textScale !== 1) params.set(PARAM.textScale, String(state.textScale));
  if (!state.inspector) params.set(PARAM.inspector, "0");

  const query = params.toString();
  return query ? `?${query}` : "";
}

export type DesignSpaceState = {
  location: DesignSpaceLocation;
  controls: ControlsState;
  viewport: ViewportSetting;
  /** Altera um ou mais controles, preservando a rota. */
  setControls: (patch: Partial<ControlsState>) => void;
  /** Troca entre trabalho ativo e referências portadas sem misturar coleções. */
  setScenarioView: (view: ScenarioView) => void;
  /** Navega para uma rota, preservando os controles ativos. */
  navigate: (to: string, options?: { replace?: boolean }) => void;
  /**
   * Abre um cenário: vai para a rota dele e reseta persona, fixture e rede para
   * o que o cenário declara. Controles de ambiente (viewport, chrome, texto)
   * são preservados de propósito — quem está revisando no celular não quer
   * voltar ao desktop a cada troca de situação.
   */
  openScenario: (scenarioId: string) => void;
  /** Abre uma referência do catálogo de componentes. */
  openComponent: (componentId: string) => void;
};

/**
 * Fonte única de verdade da navegação e dos controles. Usa a History API
 * diretamente, sem router externo, e escuta `popstate` para que voltar e
 * avançar no navegador funcionem como o usuário espera.
 */
export function useDesignSpaceState(registry: Registry): DesignSpaceState {
  const [location, setLocation] = useState<DesignSpaceLocation>(() => currentLocation());

  useEffect(() => {
    const onPopState = () => setLocation(currentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const controls = useMemo(() => parseControls(location.search, registry), [location.search, registry]);

  const push = useCallback((path: string, search: string, replace = false) => {
    const url = `${path}${search}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setLocation({ path, search });
  }, []);

  const setControls = useCallback(
    (patch: Partial<ControlsState>) => {
      const patchedView =
        patch.view ??
        (patch.showPorted === undefined ? undefined : patch.showPorted ? "ported" : "active");
      const next = {
        ...controls,
        ...patch,
        ...(patchedView
          ? { view: patchedView, showPorted: patchedView === "ported" }
          : {}),
      };
      // Troca de controle é replace, não push: o histórico do navegador deve
      // registrar navegação entre situações, não cada ajuste de viewport.
      push(location.path, serializeControls(next, registry), true);
    },
    [controls, location.path, push, registry],
  );

  const setScenarioView = useCallback(
    (view: ScenarioView) => {
      const scenario = registry.scenario(controls.scenario);
      const scenarioBelongsToView =
        !scenario || (view === "ported" ? scenario.status === "ported" : scenario.status !== "ported");
      const next: ControlsState = {
        ...controls,
        view,
        showPorted: view === "ported",
        ...(scenarioBelongsToView
          ? {}
          : {
              scenario: undefined,
              persona: undefined,
              fixture: undefined,
              network: "success",
            }),
      };
      push(scenarioBelongsToView ? location.path : "/", serializeControls(next, registry), false);
    },
    [controls, location.path, push, registry],
  );

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const [rawPath, rawSearch] = to.split("?");
      const path = rawPath || "/";
      // Uma rota com query própria manda; sem query, os controles seguem.
      const search = rawSearch ? `?${rawSearch}` : location.search;
      push(path, search, options?.replace ?? false);
    },
    [location.search, push],
  );

  const openScenario = useCallback(
    (scenarioId: string) => {
      const scenario = registry.scenario(scenarioId);
      if (!scenario) return;

      const next: ControlsState = {
        ...controls,
        scenario: scenario.id,
        view: scenario.status === "ported" ? "ported" : "active",
        showPorted: scenario.status === "ported",
        component: undefined,
        persona: scenario.persona,
        fixture: scenario.fixture,
        network: scenario.network ?? "success",
      };
      push(scenario.route, serializeControls(next, registry), false);
    },
    [controls, push, registry],
  );

  const openComponent = useCallback(
    (componentId: string) => {
      const component = registry.component(componentId);
      if (!component) return;

      const next: ControlsState = {
        ...controls,
        scenario: undefined,
        component: component.id,
        persona: undefined,
        fixture: undefined,
        network: "success",
      };
      next.fixture =
        registry.componentFixture(component.id, component.defaultFixture)?.id ??
        component.fixtures?.[0]?.id;
      push("/", serializeControls(next, registry), false);
    },
    [controls, push, registry],
  );

  const viewport = useMemo(() => resolveViewport(controls), [controls]);

  return {
    location,
    controls,
    viewport,
    setControls,
    setScenarioView,
    navigate,
    openScenario,
    openComponent,
  };
}

/** Resolve objetos 0.4.0 que ainda só carregam `showPorted`. */
export function scenarioView(state: Pick<ControlsState, "view" | "showPorted">): ScenarioView {
  return state.view ?? (state.showPorted ? "ported" : "active");
}

export function resolveViewport(controls: ControlsState): ViewportSetting {
  const preset = VIEWPORTS.find((v) => v.id === controls.viewport);
  if (controls.viewport === "custom") {
    return { id: "custom", label: "Personalizado", width: controls.customWidth ?? 1024 };
  }
  return preset ?? { id: "fit", label: "Ajustar" };
}

function currentLocation(): DesignSpaceLocation {
  if (typeof window === "undefined") return { path: "/", search: "" };
  return { path: window.location.pathname, search: window.location.search };
}

function isNetworkState(value: string | null): value is NetworkState {
  return value !== null && (NETWORK_STATES as readonly string[]).includes(value);
}

function isChromeTheme(value: string | null): value is ChromeTheme {
  return value === "dark" || value === "light";
}

function positiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
