/**
 * Registry: índice consultável do produto (E1).
 *
 * O agente de IA e a navegação precisam localizar cenário, persona, fixture,
 * regra e módulo sem varrer o projeto. O registry é esse índice, construído uma
 * vez a partir da `ProductDefinition`.
 */

import {
  SCENARIO_STATUSES,
  type ComponentPreview,
  type ComponentPreviewFixture,
  type Fixture,
  type Flow,
  type Module,
  type Persona,
  type ProductDefinition,
  type Rule,
  type Scenario,
  type ScenarioStatus,
} from "../types/index.js";
import { validateProduct, type ValidationIssue } from "./validate.js";

export type ModuleNode = {
  module: Module;
  scenarios: Scenario[];
};

export type ScenarioQueryOptions = {
  /** Inclui material importado ainda não validado. Padrão: `false`. */
  includePorted?: boolean;
  /** Exceção para manter compreensível um portado aberto por deep link. */
  activeScenario?: string;
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
  /** Árvore de navegação: módulos com seus cenários, na ordem declarada. */
  tree: ModuleNode[];
  /** Cenários cujo prefixo não corresponde a nenhum módulo registrado. */
  orphans: Scenario[];
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
  module: (id: string | undefined) => Module | undefined;
  flow: (id: string | undefined) => Flow | undefined;

  /** Regras de um cenário, resolvidas e na ordem declarada. */
  rulesOf: (scenario: Scenario | undefined) => Rule[];
  /** Permissões efetivas: as do cenário, ou as da persona quando ausentes. */
  permissionsOf: (scenario: Scenario | undefined) => string[];
  /** Cenários que abrem a mesma rota. Serve para o seletor de situação. */
  scenariosForRoute: (route: string, options?: ScenarioQueryOptions) => Scenario[];
  /** Cenários que contam como trabalho ativo; portados ficam fora por padrão. */
  activeScenarios: (options?: ScenarioQueryOptions) => Scenario[];
  /** Árvore filtrada para navegação, preservando `tree` como catálogo completo. */
  treeFor: (options?: ScenarioQueryOptions) => ModuleNode[];
  orphansFor: (options?: ScenarioQueryOptions) => Scenario[];
  /**
   * Busca por vocabulário de negócio. Um PO precisa achar "aprovação bloqueada"
   * sem saber o id nem o nome do arquivo (§15.1 "Compreensão de negócio").
   */
  search: (query: string, options?: ScenarioQueryOptions) => Scenario[];
  byStatus: (status: ScenarioStatus) => Scenario[];
  /** Contagem por status, para o cabeçalho de cobertura. */
  coverage: (options?: ScenarioQueryOptions) => Record<ScenarioStatus, number>;
};

export function createRegistry(product: ProductDefinition): Registry {
  const scenarios = new Map(product.scenarios.map((s) => [s.id, s]));
  const components = new Map(
    (product.components ?? []).map((component) => [component.id, component]),
  );
  const personas = new Map(product.personas.map((p) => [p.id, p]));
  const fixtures = new Map(product.fixtures.map((f) => [f.id, f]));
  const rules = new Map((product.rules ?? []).map((r) => [r.id, r]));
  const modules = new Map(product.modules.map((m) => [m.id, m]));
  const flows = new Map(
    product.modules.flatMap((m) => (m.flows ?? []).map((f) => [f.id, f] as const)),
  );

  const tree: ModuleNode[] = product.modules.map((module) => ({
    module,
    scenarios: product.scenarios.filter((s) => s.id.split(".")[0] === module.id),
  }));

  const claimed = new Set(tree.flatMap((node) => node.scenarios.map((s) => s.id)));
  const orphans = product.scenarios.filter((s) => !claimed.has(s.id));

  const scenario = (id: string | undefined) => (id ? scenarios.get(id) : undefined);
  const persona = (id: string | undefined) => (id ? personas.get(id) : undefined);
  const componentFixture = (componentId: string | undefined, fixtureId: string | undefined) => {
    if (!componentId || !fixtureId) return undefined;
    return components.get(componentId)?.fixtures?.find((fixture) => fixture.id === fixtureId);
  };
  const visibleScenarios = (options: ScenarioQueryOptions = {}) =>
    product.scenarios.filter(
      (target) =>
        options.includePorted ||
        target.status !== "ported" ||
        target.id === options.activeScenario,
    );

  const permissionsOf = (target: Scenario | undefined): string[] => {
    if (!target) return [];
    if (target.permissions) return target.permissions;
    return persona(target.persona)?.permissions ?? [];
  };

  return {
    product,
    tree,
    orphans,
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
    module: (id) => (id ? modules.get(id) : undefined),
    flow: (id) => (id ? flows.get(id) : undefined),

    rulesOf: (target) =>
      (target?.rules ?? []).map((id) => rules.get(id)).filter((r): r is Rule => Boolean(r)),
    permissionsOf,

    scenariosForRoute: (route, options) => {
      const base = route.split("?")[0];
      return visibleScenarios(options).filter((s) => s.route.split("?")[0] === base);
    },

    activeScenarios: visibleScenarios,
    treeFor: (options) => {
      const visible = new Set(visibleScenarios(options).map((target) => target.id));
      return tree.map((node) => ({
        ...node,
        scenarios: node.scenarios.filter((target) => visible.has(target.id)),
      }));
    },
    orphansFor: (options) => {
      const visible = new Set(visibleScenarios(options).map((target) => target.id));
      return orphans.filter((target) => visible.has(target.id));
    },

    search: (query, options) => {
      const needle = normalize(query);
      const visible = visibleScenarios(options);
      if (!needle) return visible;
      return visible.filter((s) => {
        const moduleName = modules.get(s.id.split(".")[0] ?? "")?.name ?? "";
        const haystack = normalize(
          [
            s.title,
            s.id,
            s.intent ?? "",
            s.route,
            moduleName,
            personas.get(s.persona)?.name ?? "",
            (s.tags ?? []).join(" "),
            (s.expected ?? []).join(" "),
          ].join(" "),
        );
        return haystack.includes(needle);
      });
    },

    byStatus: (status) => product.scenarios.filter((s) => s.status === status),

    coverage: (options) => {
      const counts = Object.fromEntries(
        SCENARIO_STATUSES.map((status) => [status, 0]),
      ) as Record<ScenarioStatus, number>;
      for (const s of visibleScenarios(options)) counts[s.status] += 1;
      return counts;
    },
  };
}

/** Minúsculas sem acento: "Aprovação" acha "aprovacao". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
