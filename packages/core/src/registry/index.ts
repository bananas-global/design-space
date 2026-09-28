/**
 * Registry: índice consultável do produto (E1).
 *
 * A navegação e o agente de IA precisam localizar tela, cenário, persona,
 * fixture, regra e componente sem varrer o projeto. O registry é esse índice,
 * construído uma vez a partir da `ProductDefinition`.
 *
 * O modelo de organização é o menor possível: **uma tela é uma rota**, e as
 * **variações** da tela são os cenários cuja `route` casa com ela. Não existe
 * outra camada de agrupamento para manter em sincronia com as rotas.
 */

import type {
  ComponentPreview,
  ComponentPreviewFixture,
  Fixture,
  HandoffScope,
  Persona,
  ProductDefinition,
  RouteDefinition,
  Rule,
  Scenario,
} from "../types/index.js";
import { validateProduct, type ValidationIssue } from "./validate.js";
import {
  handoffAllowsComponent,
  handoffAllowsPath,
  handoffAllowsScenario,
} from "../handoff/index.js";
import { resolveRoute } from "../router/index.js";

/**
 * Uma tela: uma rota declarada e as variações dela.
 *
 * `variations` vazio é caso válido — a rota ainda é uma tela, aberta numa
 * variação implícita, sem fixture.
 */
export type ScreenNode = {
  /** O `path` da rota. Estável e único, serve de identificador da tela. */
  id: string;
  /** `route.name`, ou o título do primeiro cenário, ou o `path`. */
  name: string;
  description: string | undefined;
  route: RouteDefinition;
  /**
   * Caminho concreto para abrir a tela quando não há variação: o `path` com
   * `*` removido. Parâmetros `:id` ficam literais.
   */
  href: string;
  /** Cenários da rota, na ordem de `scenarios`. */
  variations: Scenario[];
};

export type ScenarioQueryOptions = {
  /** Recorte de handoff. Sem ele, todo cenário registrado é visível. */
  handoff?: HandoffScope;
};

export type ComponentFixtureResolution = {
  fixture: ComponentPreviewFixture | undefined;
  /** Id que veio da URL, inclusive quando não existe. */
  requestedId: string | undefined;
  /** `true` quando a URL pediu um id inexistente e o motor usou o fallback. */
  didFallback: boolean;
};

export type Registry = {
  product: ProductDefinition;
  /** Telas na ordem de `routes`, cada uma com suas variações. */
  screens: ScreenNode[];
  issues: ValidationIssue[];

  scenario: (id: string | undefined) => Scenario | undefined;
  component: (id: string | undefined) => ComponentPreview | undefined;
  componentFixture: (
    componentId: string | undefined,
    fixtureId: string | undefined,
  ) => ComponentPreviewFixture | undefined;
  resolveComponentFixture: (
    componentId: string | undefined,
    requestedId: string | undefined,
  ) => ComponentFixtureResolution;
  persona: (id: string | undefined) => Persona | undefined;
  fixture: (id: string | undefined) => Fixture | undefined;
  rule: (id: string | undefined) => Rule | undefined;

  /** Tela por id (o `path` da rota). */
  screen: (id: string | undefined) => ScreenNode | undefined;
  /** Tela que renderiza um endereço, pelo mesmo casamento do roteador. */
  screenForPath: (path: string) => ScreenNode | undefined;
  /** Tela da qual o cenário é variação. */
  screenOf: (scenario: Scenario | undefined) => ScreenNode | undefined;
  /** Telas permitidas pelo recorte, com variações também filtradas. */
  screensFor: (options?: ScenarioQueryOptions) => ScreenNode[];

  /** Regras de um cenário, resolvidas e na ordem declarada. */
  rulesOf: (scenario: Scenario | undefined) => Rule[];
  /** Permissões efetivas: as do cenário, ou as da persona quando ausentes. */
  permissionsOf: (scenario: Scenario | undefined) => string[];
  /** Variações da tela que renderiza `route`. */
  scenariosForRoute: (route: string, options?: ScenarioQueryOptions) => Scenario[];
  /** Cenários permitidos pelo recorte; sem handoff devolve todos. */
  activeScenarios: (options?: ScenarioQueryOptions) => Scenario[];
  /**
   * Busca de cenário por vocabulário de negócio, sem diferenciar acento nem
   * caixa: "aprovacao" acha "Aprovação".
   */
  search: (query: string, options?: ScenarioQueryOptions) => Scenario[];
  /** Busca de telas: nome, descrição, rota e as variações de cada uma. */
  searchScreens: (query: string, options?: ScenarioQueryOptions) => ScreenNode[];
  /** Busca de componentes: nome, descrição, grupo, id e `source`. */
  searchComponents: (query: string, handoff?: HandoffScope) => ComponentPreview[];
  /** Componentes permitidos pelo recorte; sem handoff devolve o catálogo. */
  componentsFor: (handoff?: HandoffScope) => ComponentPreview[];
  /**
   * Componentes usados por uma tela: a união de `components` das variações, na
   * ordem em que aparecem. Id sem componente registrado fica de fora.
   */
  componentsOfScreen: (screen: ScreenNode | undefined) => ComponentPreview[];
  /** Telas com ao menos um cenário que lista o componente em `components`. */
  usagesOf: (componentId: string | undefined, options?: ScenarioQueryOptions) => ScreenNode[];
};

export function createRegistry(product: ProductDefinition): Registry {
  const scenarioList = product.scenarios ?? [];
  const routeList = product.routes ?? [];
  const componentList = product.components ?? [];

  const scenarios = new Map(scenarioList.map((s) => [s.id, s]));
  const components = new Map(componentList.map((component) => [component.id, component]));
  const personas = new Map((product.personas ?? []).map((p) => [p.id, p]));
  const fixtures = new Map((product.fixtures ?? []).map((f) => [f.id, f]));
  const rules = new Map((product.rules ?? []).map((r) => [r.id, r]));

  // Cada cenário pertence à rota que o roteador escolheria para ele. Casar pela
  // forma, e não por igualdade de texto, é o que põe `/requests/REQ-1` na tela
  // `/requests/:id` — e a especificidade põe `/requests/new` na tela literal.
  const variationsByPath = new Map<string, Scenario[]>();
  const screenPathOf = new Map<string, string>();
  for (const scenario of scenarioList) {
    const match = resolveRoute(routeList, scenario.route ?? "");
    if (!match) continue;
    const path = match.definition.path;
    screenPathOf.set(scenario.id, path);
    const list = variationsByPath.get(path) ?? [];
    list.push(scenario);
    variationsByPath.set(path, list);
  }

  const seen = new Set<string>();
  const screens: ScreenNode[] = [];
  for (const route of routeList) {
    // Rota duplicada é erro de validação; aqui só a primeira vira tela.
    if (seen.has(route.path)) continue;
    seen.add(route.path);
    const variations = variationsByPath.get(route.path) ?? [];
    screens.push({
      id: route.path,
      name: route.name?.trim() || variations[0]?.title || route.path,
      description: route.description,
      route,
      href: screenHref(route.path),
      variations,
    });
  }
  const screensById = new Map(screens.map((screen) => [screen.id, screen]));

  const scenario = (id: string | undefined) => (id ? scenarios.get(id) : undefined);
  const persona = (id: string | undefined) => (id ? personas.get(id) : undefined);
  const componentFixture = (componentId: string | undefined, fixtureId: string | undefined) => {
    if (!componentId || !fixtureId) return undefined;
    return components.get(componentId)?.fixtures?.find((fixture) => fixture.id === fixtureId);
  };
  const visibleScenarios = (options: ScenarioQueryOptions = {}) =>
    scenarioList.filter((target) => handoffAllowsScenario(options.handoff, target.id));

  const screenForPath = (path: string) => {
    const match = resolveRoute(routeList, path);
    return match ? screensById.get(match.definition.path) : undefined;
  };

  const screensFor = (options: ScenarioQueryOptions = {}): ScreenNode[] => {
    const { handoff } = options;
    if (!handoff) return screens;
    return screens
      .map((screen) => ({
        ...screen,
        variations: screen.variations.filter((target) => handoffAllowsScenario(handoff, target.id)),
      }))
      .filter(
        (screen) =>
          screen.variations.length > 0 ||
          ((handoff.routes ?? []).length > 0 && handoffAllowsPath(handoff, screen.href)),
      );
  };

  const permissionsOf = (target: Scenario | undefined): string[] => {
    if (!target) return [];
    if (target.permissions) return target.permissions;
    return persona(target.persona)?.permissions ?? [];
  };

  const componentsFor = (handoff?: HandoffScope) =>
    componentList.filter((component) => handoffAllowsComponent(handoff, component.id));

  return {
    product,
    screens,
    issues: validateProduct(product),

    scenario,
    component: (id) => (id ? components.get(id) : undefined),
    componentFixture,
    resolveComponentFixture: (componentId, requestedId) => {
      const component = componentId ? components.get(componentId) : undefined;
      const requested = componentFixture(componentId, requestedId);
      const fallback =
        componentFixture(componentId, component?.defaultFixture) ?? component?.fixtures?.[0];
      return {
        fixture: requested ?? fallback,
        requestedId,
        didFallback: Boolean(requestedId && !requested),
      };
    },
    persona,
    fixture: (id) => (id ? fixtures.get(id) : undefined),
    rule: (id) => (id ? rules.get(id) : undefined),

    screen: (id) => (id ? screensById.get(id) : undefined),
    screenForPath,
    screenOf: (target) => {
      const path = target ? screenPathOf.get(target.id) : undefined;
      return path ? screensById.get(path) : undefined;
    },
    screensFor,

    rulesOf: (target) =>
      (target?.rules ?? []).map((id) => rules.get(id)).filter((r): r is Rule => Boolean(r)),
    permissionsOf,

    scenariosForRoute: (route, options) => {
      const screen = screenForPath(route);
      if (!screen) return [];
      return screen.variations.filter((target) => handoffAllowsScenario(options?.handoff, target.id));
    },

    activeScenarios: visibleScenarios,

    search: (query, options) => {
      const needle = normalizeSearch(query);
      const visible = visibleScenarios(options);
      if (!needle) return visible;
      return visible.filter((s) =>
        normalizeSearch(
          [
            s.title,
            s.id,
            s.intent ?? "",
            s.route,
            persona(s.persona)?.name ?? "",
            (s.tags ?? []).join(" "),
            (s.expected ?? []).join(" "),
          ].join(" "),
        ).includes(needle),
      );
    },

    searchScreens: (query, options) => {
      const needle = normalizeSearch(query);
      const visible = screensFor(options);
      if (!needle) return visible;
      return visible.filter((screen) =>
        normalizeSearch(
          [
            screen.name,
            screen.description ?? "",
            screen.id,
            ...screen.variations.flatMap((variation) => [
              variation.title,
              variation.id,
              (variation.tags ?? []).join(" "),
            ]),
          ].join(" "),
        ).includes(needle),
      );
    },

    searchComponents: (query, handoff) => {
      const needle = normalizeSearch(query);
      const visible = componentsFor(handoff);
      if (!needle) return visible;
      return visible.filter((component) =>
        normalizeSearch(
          [
            component.name,
            component.description ?? "",
            component.group ?? "",
            component.id,
            component.source ?? "",
          ].join(" "),
        ).includes(needle),
      );
    },

    componentsFor,

    componentsOfScreen: (screen) => {
      const ids = new Set<string>();
      for (const variation of screen?.variations ?? []) {
        for (const id of variation.components ?? []) ids.add(id);
      }
      return [...ids]
        .map((id) => components.get(id))
        .filter((component): component is ComponentPreview => Boolean(component));
    },

    usagesOf: (componentId, options) => {
      if (!componentId) return [];
      return screensFor(options).filter((screen) =>
        screen.variations.some((variation) => variation.components?.includes(componentId)),
      );
    },
  };
}

/**
 * Minúsculas sem acento e sem espaço nas pontas: "Aprovação" acha "aprovacao".
 * A navegação usa exatamente a mesma regra do registry.
 */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Caminho concreto de uma rota sem cenário: o curinga final some. */
function screenHref(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments[segments.length - 1] === "*") segments.pop();
  return `/${segments.join("/")}`;
}
