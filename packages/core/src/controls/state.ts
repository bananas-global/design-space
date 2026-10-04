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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChromeTheme,
  ControlsState,
  NavigateOptions,
  NetworkState,
  PanelTab,
  ViewportSetting,
} from "../types/index.js";
import type { Registry, ScreenNode } from "../registry/index.js";
import type { Scenario } from "../types/index.js";
import { NETWORK_STATES } from "../types/index.js";
import {
  CONTROL_PARAM_PREFIX,
  PARAM,
  deleteControlParams,
  isEngineParam,
  readControlParams,
} from "./params.js";
import {
  applyHandoffScope,
  handoffAllowsComponent,
  handoffAllowsScenario,
  parseHandoffScope,
} from "../handoff/index.js";
import {
  FRAME_PARAM,
  acceptFrameMessage,
  fromFrameUrl,
  postFrameMessage,
  toFrameUrl,
} from "../frame/index.js";

/**
 * Presets de viewport. A largura é a da janela que o produto enxerga dentro do
 * quadro; a altura é a da janela e pode ser trocada com a largura (girar).
 * `custom` só existe por URL (`viewport=custom&w=…`), para links antigos.
 */
export const VIEWPORTS: readonly ViewportSetting[] = [
  { id: "mobile", label: "Celular", width: 375, height: 812 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "desktop", label: "Desktop", width: 1280, height: 800 },
  { id: "fit", label: "Ajustar" },
  { id: "custom", label: "Personalizado" },
] as const;

/** Faixa do zoom da visualização, em porcentagem. */
export const ZOOM_MIN = 25;
export const ZOOM_MAX = 150;
export const ZOOM_DEFAULT = 100;

export type DesignSpaceLocation = {
  path: string;
  search: string;
};

/**
 * A tela a que os controles se referem: a do caminho, quando informado, ou a do
 * cenário. E o cenário, só quando ele é variação dessa tela — cenário de outra
 * tela não fixa controle aqui.
 */
function controlTarget(
  registry: Registry,
  scenario: Scenario | undefined,
  path: string | undefined,
): { screen: ScreenNode | undefined; scenario: Scenario | undefined } {
  const screen = path !== undefined ? registry.screenForPath(path) : registry.screenOf(scenario);
  const own = scenario && screen && registry.screenOf(scenario)?.id === screen.id ? scenario : undefined;
  return { screen, scenario: own };
}

/**
 * Lê os controles da query string, aplicando os padrões do cenário ativo.
 * Pura e testável: não toca em `window`.
 *
 * `path` é o caminho aberto. Com ele, os controles da tela (`c.<id>`) são
 * resolvidos contra a tela daquele caminho; sem ele, contra a tela do cenário.
 */
export function parseControls(search: string, registry: Registry, path?: string): ControlsState {
  const params = new URLSearchParams(search);
  const handoff = parseHandoffScope(params);
  const componentId = params.get(PARAM.component) ?? undefined;
  const component = handoffAllowsComponent(handoff, componentId)
    ? registry.component(componentId)
    : undefined;
  const scenarioId = params.get(PARAM.scenario) ?? undefined;
  const scenario = component || !handoffAllowsScenario(handoff, scenarioId)
    ? undefined
    : registry.scenario(scenarioId);
  const requestedFixture = params.get(PARAM.fixture) ?? undefined;
  const componentFixture = component
    ? requestedFixture ??
      registry.componentFixture(component.id, component.defaultFixture)?.id ??
      component.fixtures?.[0]?.id
    : undefined;

  const network = params.get(PARAM.network);

  const target = component ? undefined : controlTarget(registry, scenario, path);
  const screenControls =
    target?.screen && target.screen.controls.length > 0
      ? registry.resolveControls(target.screen, {
          scenario: target.scenario,
          requested: readControlParams(params),
        }).values
      : undefined;

  return {
    scenario: scenario?.id,
    handoff,
    component: component?.id,
    // Precedência: URL, cenário, padrão do produto. O preview de componente não
    // tem persona, então o padrão não se aplica a ele.
    persona: params.get(PARAM.persona) ?? scenario?.persona ?? (component ? undefined : registry.defaultPersona),
    fixture: component ? componentFixture : requestedFixture ?? scenario?.fixture,
    network: isNetworkState(network) ? network : (scenario?.network ?? "success"),
    viewport: params.get(PARAM.viewport) ?? "fit",
    customWidth: positiveInt(params.get(PARAM.customWidth)),
    themeMode: params.get(PARAM.themeMode) ?? registry.product.theme?.modes?.[0],
    locale: params.get(PARAM.locale) ?? registry.product.theme?.locales?.[0],
    dataSource: params.get(PARAM.dataSource) ?? registry.product.dataSources?.default ?? "fixtures",
    // Sem parâmetro, o tema do chrome fica em aberto: o shell resolve pela
    // última escolha da pessoa e, na falta dela, pelo sistema.
    chromeTheme: isChromeTheme(params.get(PARAM.chromeTheme))
      ? (params.get(PARAM.chromeTheme) as ChromeTheme)
      : undefined,
    // Chrome visível por padrão. `?chrome=0` é o modo de revisão limpa e captura
    // de tela, então precisa ser explícito para não sumir sem pedido.
    chrome: params.get(PARAM.chrome) !== "0",
    inspector: params.get(PARAM.inspector) !== "0",
    panelTab: isPanelTab(params.get(PARAM.panelTab))
      ? (params.get(PARAM.panelTab) as PanelTab)
      : "variations",
    zoom: clampZoom(params.get(PARAM.zoom)),
    rotated: params.get(PARAM.rotated) === "1",
    screenControls,
  };
}

/**
 * Serializa os controles de volta na query string, omitindo tudo que é padrão.
 * URL curta é URL que sobrevive a ser colada em ticket e em thread.
 */
export function serializeControls(
  state: ControlsState,
  registry: Registry,
  path?: string,
): string {
  const params = new URLSearchParams();
  const scenario = registry.scenario(state.scenario);

  if (state.component) params.set(PARAM.component, state.component);
  else if (state.scenario) params.set(PARAM.scenario, state.scenario);

  // Persona e fixture só entram quando divergem do cenário (e a persona, do
  // padrão do produto quando o cenário não tem uma): um link com a combinação
  // declarada não precisa repeti-la, e um link com combinação deliberadamente
  // diferente precisa carregá-la.
  if (state.persona && state.persona !== (scenario?.persona ?? registry.defaultPersona)) {
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

  // Controles da tela: só o que difere do que o cenário e os padrões já dão. Sem
  // tela conhecida, não há base para comparar, e tudo vai.
  if (state.screenControls && !state.component) {
    const target = controlTarget(registry, scenario, path);
    const base = target.screen
      ? registry.resolveControls(target.screen, { scenario: target.scenario }).values
      : {};
    const order = target.screen
      ? registry.controlsOf(target.screen).map((control) => control.id)
      : Object.keys(state.screenControls);
    for (const id of order) {
      const value = state.screenControls[id];
      if (value !== undefined && value !== base[id]) {
        params.set(`${CONTROL_PARAM_PREFIX}${id}`, value);
      }
    }
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
  if (state.chromeTheme) params.set(PARAM.chromeTheme, state.chromeTheme);

  if (!state.chrome) params.set(PARAM.chrome, "0");
  if (!state.inspector) params.set(PARAM.inspector, "0");
  if (state.panelTab === "info") params.set(PARAM.panelTab, "info");
  const zoom = clampZoom(state.zoom === undefined ? null : String(state.zoom));
  if (zoom !== ZOOM_DEFAULT) params.set(PARAM.zoom, String(zoom));
  if (state.rotated) params.set(PARAM.rotated, "1");
  applyHandoffScope(params, state.handoff);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export type DesignSpaceState = {
  location: DesignSpaceLocation;
  controls: ControlsState;
  viewport: ViewportSetting;
  /**
   * Altera um ou mais controles, preservando a rota e a query da tela (ver
   * {@link keepScreenQuery}). Parte sempre do endereço mais recente: chamadas
   * seguidas no mesmo ciclo se acumulam.
   */
  setControls: (patch: Partial<ControlsState>) => void;
  /**
   * Muda controles da tela (id → value) sobre os valores mais recentes, numa só
   * atualização de URL. Sem mudança efetiva, não toca no histórico.
   */
  setScreenControls: (patch: Record<string, string>) => void;
  /** Navega para uma rota. Ver {@link navigationTarget} para o que a query leva. */
  navigate: (to: string, options?: NavigateOptions) => void;
  /**
   * Abre um cenário: vai para a rota dele e reseta persona, fixture e rede para
   * o que o cenário declara. Controles de ambiente (viewport, chrome, tema)
   * são preservados de propósito — quem está revisando no celular não quer
   * voltar ao desktop a cada troca de situação.
   */
  openScenario: (scenarioId: string) => void;
  /** Abre uma referência do catálogo de componentes. */
  openComponent: (componentId: string, options?: { replace?: boolean }) => void;
  /**
   * Abre uma tela: a primeira variação visível ou, sem variação, a rota crua,
   * sem cenário, persona nem fixture.
   */
  openScreen: (screenId: string, options?: { replace?: boolean }) => void;
  /**
   * Vai para um endereço exato, sem herdar a query atual. É o que o chrome usa
   * para adotar a navegação que aconteceu dentro do quadro.
   */
  go: (path: string, search: string, options?: { replace?: boolean }) => void;
};

export type DesignSpaceStateOptions = {
  /**
   * Modo quadro: o documento é o `<iframe>` do chrome. A navegação troca o
   * endereço do próprio quadro sem criar entrada de histórico — o histórico é
   * do pai — e avisa o pai; o pai manda o estado novo por mensagem.
   */
  frame?: boolean;
};

/**
 * Fonte única de verdade da navegação e dos controles. Usa a History API
 * diretamente, sem router externo, e escuta `popstate` para que voltar e
 * avançar no navegador funcionem como o usuário espera.
 */
export function useDesignSpaceState(
  registry: Registry,
  options: DesignSpaceStateOptions = {},
): DesignSpaceState {
  const frame = Boolean(options.frame);
  const [location, setLocationState] = useState<DesignSpaceLocation>(() => currentLocation());
  // O endereço mais recente, à frente da renderização: duas mudanças no mesmo
  // ciclo precisam partir uma da outra, não do valor que o React renderizou.
  const locationRef = useRef(location);
  const setLocation = useCallback((next: DesignSpaceLocation) => {
    locationRef.current = next;
    setLocationState(next);
  }, []);

  /**
   * Escrita do próprio motor no endereço do quadro. Passa pela History API, mas
   * não é a tela escrevendo a própria query — ver o efeito abaixo.
   */
  const engineWriting = useRef(false);
  const writeFrameUrl = useCallback((url: string) => {
    engineWriting.current = true;
    try {
      window.history.replaceState(null, "", url);
    } finally {
      engineWriting.current = false;
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setLocation(currentLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setLocation]);

  // Quadro: a tela pode guardar estado na própria query escrevendo direto na
  // History API (uma aba que se lembra de onde estava, por exemplo). O motor
  // adota essa query e avisa o pai, senão a próxima mudança de controle — que
  // parte do endereço que o motor conhece — a apagaria, e o link copiado no
  // chrome não a levaria. Só a query da tela é adotada: os parâmetros do motor
  // continuam os dele, e o quadro nunca cria entrada no histórico, que é do pai.
  // Mudança de caminho feita assim continua fora do motor; para ela existe
  // `context.navigate`.
  useEffect(() => {
    if (!frame) return;
    const history = window.history;
    const { pushState, replaceState } = history;

    const adopt = (replace: boolean) => {
      const latest = locationRef.current;
      if (window.location.pathname !== latest.path) return false;
      const search = keepScreenQuery(latest.search, fromFrameUrl(window.location.href).search);
      const url = toFrameUrl(latest.path, search);
      const written = `${window.location.pathname}${window.location.search}`;
      if (written !== url) replaceState.call(history, history.state, "", `${url}${window.location.hash}`);
      if (search === latest.search) return true;
      setLocation({ path: latest.path, search });
      postFrameMessage(
        window.parent === window ? undefined : window.parent,
        { ds: 1, type: "navigate", url, replace },
        window.location.origin,
      );
      return true;
    };

    history.replaceState = function (data, unused, url) {
      replaceState.call(history, data, unused, url);
      if (!engineWriting.current) adopt(true);
    };
    history.pushState = function (data, unused, url) {
      const before = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      replaceState.call(history, data, unused, url);
      if (adopt(false)) return;
      // Outro caminho: devolve o endereço e segue o pedido como era.
      replaceState.call(history, history.state, "", before);
      pushState.call(history, data, unused, url);
    };
    // O que a tela escreveu enquanto montava, antes deste efeito.
    adopt(true);

    return () => {
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, [frame, setLocation]);

  // Quadro: recebe estado do pai e avisa que montou. O pai decide se o endereço
  // de montagem ainda é o certo — pode ter mudado enquanto o quadro carregava.
  useEffect(() => {
    if (!frame || window.parent === window) return;
    const origin = window.location.origin;
    const onMessage = (event: MessageEvent) => {
      const message = acceptFrameMessage(event, { origin, source: window.parent });
      if (message?.type !== "location") return;
      const { path, search } = fromFrameUrl(message.url);
      writeFrameUrl(toFrameUrl(path, search));
      setLocation({ path, search });
    };
    window.addEventListener("message", onMessage);
    const here = currentLocation();
    postFrameMessage(
      window.parent,
      { ds: 1, type: "ready", url: toFrameUrl(here.path, here.search) },
      origin,
    );
    return () => window.removeEventListener("message", onMessage);
  }, [frame, setLocation, writeFrameUrl]);

  const controls = useMemo(
    () => parseControls(location.search, registry, location.path),
    [location.path, location.search, registry],
  );

  const push = useCallback(
    (path: string, search: string, replace = false) => {
      if (frame) {
        const url = toFrameUrl(path, search);
        const clean = fromFrameUrl(url);
        writeFrameUrl(url);
        setLocation(clean);
        postFrameMessage(
          window.parent === window ? undefined : window.parent,
          { ds: 1, type: "navigate", url, replace },
          window.location.origin,
        );
        return;
      }
      const url = `${path}${search}`;
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      setLocation({ path, search });
    },
    [frame, setLocation, writeFrameUrl],
  );

  /** Controles do endereço mais recente, mesmo antes de renderizar. */
  const latestControls = useCallback((): ControlsState => {
    const latest = locationRef.current;
    return latest === location ? controls : parseControls(latest.search, registry, latest.path);
  }, [controls, location, registry]);

  const setControls = useCallback(
    (patch: Partial<ControlsState>) => {
      const latest = locationRef.current;
      const next = { ...latestControls(), ...patch };
      // Troca de controle é replace, não push: o histórico do navegador deve
      // registrar navegação entre situações, não cada ajuste de viewport.
      const search = keepScreenQuery(serializeControls(next, registry, latest.path), latest.search);
      if (search === latest.search) return;
      push(latest.path, search, true);
    },
    [latestControls, push, registry],
  );

  const setScreenControls = useCallback(
    (patch: Record<string, string>) => {
      const current = latestControls().screenControls ?? {};
      const changed = Object.entries(patch).some(([id, value]) => current[id] !== value);
      if (!changed) return;
      setControls({ screenControls: { ...current, ...patch } });
    },
    [latestControls, setControls],
  );

  const navigate = useCallback(
    (to: string, navigateOptions?: NavigateOptions) => {
      const target = navigationTarget(to, locationRef.current, registry, {
        controls: navigateOptions?.controls,
      });
      push(target.path, target.search, navigateOptions?.replace ?? false);
    },
    [push, registry],
  );

  const openScenario = useCallback(
    (scenarioId: string) => {
      const scenario = registry.scenario(scenarioId);
      if (!scenario || !handoffAllowsScenario(controls.handoff, scenarioId)) return;

      const next: ControlsState = {
        ...controls,
        scenario: scenario.id,
        component: undefined,
        persona: scenario.persona,
        fixture: scenario.fixture,
        network: scenario.network ?? "success",
        // Os controles voltam ao que o cenário fixa, sobre os padrões da tela.
        screenControls: undefined,
      };
      push(scenario.route, serializeControls(next, registry, scenario.route), false);
    },
    [controls, push, registry],
  );

  const openComponent = useCallback(
    (componentId: string, openOptions?: { replace?: boolean }) => {
      const component = registry.component(componentId);
      if (!component || !handoffAllowsComponent(controls.handoff, componentId)) return;

      const next: ControlsState = {
        ...controls,
        scenario: undefined,
        component: component.id,
        persona: undefined,
        fixture: undefined,
        network: "success",
        screenControls: undefined,
      };
      next.fixture =
        registry.componentFixture(component.id, component.defaultFixture)?.id ??
        component.fixtures?.[0]?.id;
      push("/", serializeControls(next, registry), openOptions?.replace ?? false);
    },
    [controls, push, registry],
  );

  const openScreen = useCallback(
    (screenId: string, openOptions?: { replace?: boolean }) => {
      const screen = registry.screensFor({ handoff: controls.handoff }).find((s) => s.id === screenId);
      if (!screen) return;
      const first = screen.variations[0];
      if (first) {
        const next: ControlsState = {
          ...controls,
          scenario: first.id,
          component: undefined,
          persona: first.persona,
          fixture: first.fixture,
          network: first.network ?? "success",
          screenControls: undefined,
        };
        push(first.route, serializeControls(next, registry, first.route), openOptions?.replace ?? false);
        return;
      }
      const next: ControlsState = {
        ...controls,
        scenario: undefined,
        component: undefined,
        persona: undefined,
        fixture: undefined,
        network: "success",
        screenControls: undefined,
      };
      push(screen.href, serializeControls(next, registry, screen.href), openOptions?.replace ?? false);
    },
    [controls, push, registry],
  );

  const go = useCallback(
    (path: string, search: string, goOptions?: { replace?: boolean }) =>
      push(path || "/", search, goOptions?.replace ?? false),
    [push],
  );

  const viewport = useMemo(() => resolveViewport(controls), [controls]);

  return {
    location,
    controls,
    viewport,
    setControls,
    setScreenControls,
    navigate,
    openScenario,
    openComponent,
    openScreen,
    go,
  };
}

/**
 * Para onde vai uma navegação: caminho e query do destino. Pura e testável.
 *
 * - **Sem query e sem `controls`** (`navigate("/x")`): a query atual segue
 *   inteira; numa tela diferente, os `c.*` e a query da tela anterior ficam
 *   para trás.
 * - **Com query própria ou com `controls`**: o destino manda. O contexto do
 *   motor — tudo que não é `scenario`, `fixture`, `component` nem `c.*`:
 *   persona, rede, viewport, tema, idioma, fonte de dados, handoff e os
 *   parâmetros do chrome — segue, a menos que o destino traga o mesmo
 *   parâmetro. A query da tela segue do mesmo jeito, mas só na mesma tela. A persona que vinha do cenário deixado para trás vira parâmetro
 *   explícito, para quem está olhando não mudar só porque o cenário saiu.
 *   `controls` vira `c.*` do destino, sem os valores que já são o padrão da
 *   tela de destino.
 *
 * Em qualquer caso, o recorte de handoff atual é reaplicado: a UI do produto não
 * consegue apagá-lo escrevendo a própria query.
 */
export function navigationTarget(
  to: string,
  current: DesignSpaceLocation,
  registry: Registry,
  options: { controls?: Record<string, string> } = {},
): DesignSpaceLocation {
  const withoutHash = to.split("#")[0] ?? to;
  const mark = withoutHash.indexOf("?");
  const path = (mark === -1 ? withoutHash : withoutHash.slice(0, mark)) || "/";
  const rawSearch = mark === -1 ? undefined : withoutHash.slice(mark + 1);
  const currentParams = new URLSearchParams(current.search);
  const state = parseControls(current.search, registry, current.path);
  // Controles e query da tela são da tela: numa tela diferente, os da anterior
  // não valem.
  const otherScreen = !isSameScreen(registry, path, current.path);

  let params: URLSearchParams;
  if (rawSearch === undefined && options.controls === undefined) {
    params = new URLSearchParams(current.search);
    if (otherScreen) {
      deleteControlParams(params);
      deleteScreenQuery(params);
    }
  } else {
    const target = new URLSearchParams(rawSearch ?? "");
    params = new URLSearchParams();
    for (const [key, value] of currentParams) {
      if (!isContextParam(key) || target.has(key)) continue;
      if (otherScreen && !isEngineParam(key)) continue;
      params.append(key, value);
    }
    // O cenário fica para trás; quem está olhando, não. A persona que ele dava
    // vira parâmetro explícito. A rede e a fixture dele são da situação dele e
    // ficam com ele — a rede escolhida no painel já está na URL e segue.
    if (
      state.scenario &&
      !target.has(PARAM.scenario) &&
      state.persona &&
      state.persona !== registry.defaultPersona &&
      !params.has(PARAM.persona) &&
      !target.has(PARAM.persona)
    ) {
      params.set(PARAM.persona, state.persona);
    }
    for (const [key, value] of target) params.append(key, value);

    if (options.controls) {
      const screen = registry.screenForPath(path);
      const scenario = registry.scenario(params.get(PARAM.scenario) ?? undefined);
      const own = scenario && screen && registry.screenOf(scenario)?.id === screen.id ? scenario : undefined;
      const base = screen ? registry.resolveControls(screen, { scenario: own }).values : {};
      for (const [id, value] of Object.entries(options.controls)) {
        const name = `${CONTROL_PARAM_PREFIX}${id}`;
        if (base[id] === value) params.delete(name);
        else params.set(name, value);
      }
    }
  }

  if (state.handoff) applyHandoffScope(params, state.handoff);
  const query = params.toString();
  return { path, search: query ? `?${query}` : "" };
}

/**
 * Devolve os parâmetros do motor de `search` com a query da tela que está em
 * `current`: todo parâmetro que o motor não lê. Mudar persona, rede, tema ou um
 * controle não troca de tela, então o estado que a tela do produto guarda na
 * URL — aba, passo, filtro, página — continua valendo. Pura e testável.
 */
export function keepScreenQuery(search: string, current: string): string {
  const params = new URLSearchParams(search);
  deleteScreenQuery(params);
  for (const [key, value] of new URLSearchParams(current)) {
    if (key === FRAME_PARAM || isEngineParam(key)) continue;
    params.append(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Remove a query da tela — todo parâmetro que o motor não lê. */
function deleteScreenQuery(params: URLSearchParams): void {
  for (const key of [...params.keys()]) {
    if (!isEngineParam(key)) params.delete(key);
  }
}

/**
 * Os dois caminhos abrem a mesma tela: a mesma rota ou, sem rota, o mesmo
 * caminho.
 */
function isSameScreen(registry: Registry, a: string, b: string): boolean {
  const left = registry.screenForPath(a)?.id;
  const right = registry.screenForPath(b)?.id;
  return left === undefined && right === undefined ? a === b : left === right;
}

/**
 * Parâmetro de contexto do motor: o que atravessa uma navegação com query
 * própria. Ficam de fora o que escolhe a situação — cenário, fixture,
 * componente — e os controles da tela anterior.
 */
function isContextParam(key: string): boolean {
  if (key.startsWith(CONTROL_PARAM_PREFIX)) return false;
  return key !== PARAM.scenario && key !== PARAM.fixture && key !== PARAM.component;
}

export function resolveViewport(controls: ControlsState): ViewportSetting {
  if (controls.viewport === "custom") {
    return { id: "custom", label: "Personalizado", width: controls.customWidth ?? 1024 };
  }
  const preset = VIEWPORTS.find((v) => v.id === controls.viewport) ?? {
    id: "fit",
    label: "Ajustar",
  };
  // Girar só faz sentido quando existe altura para trocar com a largura.
  if (controls.rotated && preset.width && preset.height) {
    return { ...preset, width: preset.height, height: preset.width };
  }
  return { ...preset };
}

/** Zoom válido a partir do texto da URL: inteiro entre 25 e 150, ou 100. */
export function clampZoom(value: string | null): number {
  if (value === null) return ZOOM_DEFAULT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return ZOOM_DEFAULT;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parsed));
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

function isPanelTab(value: string | null): value is PanelTab {
  return value === "variations" || value === "info";
}

function positiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
