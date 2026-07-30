/**
 * Registry: índice consultável do produto (E1).
 *
 * O agente de IA e a navegação precisam localizar cenário, persona, fixture,
 * regra e módulo sem varrer o projeto. O registry é esse índice, construído uma
 * vez a partir da `ProductDefinition`.
 */

import type {
  Fixture,
  Flow,
  Module,
  Persona,
  ProductDefinition,
  Rule,
  Scenario,
  ScenarioStatus,
} from "../types/index.js";
import { validateProduct, type ValidationIssue } from "./validate.js";

export type ModuleNode = {
  module: Module;
  scenarios: Scenario[];
};

export type Registry = {
  product: ProductDefinition;
  /** Árvore de navegação: módulos com seus cenários, na ordem declarada. */
  tree: ModuleNode[];
  /** Cenários cujo prefixo não corresponde a nenhum módulo registrado. */
  orphans: Scenario[];
  issues: ValidationIssue[];

  scenario: (id: string | undefined) => Scenario | undefined;
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
  scenariosForRoute: (route: string) => Scenario[];
  /**
   * Busca por vocabulário de negócio. Um PO precisa achar "convênio recusado"
   * sem saber o id nem o nome do arquivo (§15.1 "Compreensão de negócio").
   */
  search: (query: string) => Scenario[];
  byStatus: (status: ScenarioStatus) => Scenario[];
  /** Contagem por status, para o cabeçalho de cobertura. */
  coverage: () => Record<ScenarioStatus, number>;
};

export function createRegistry(product: ProductDefinition): Registry {
  const scenarios = new Map(product.scenarios.map((s) => [s.id, s]));
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
    persona,
    fixture: (id) => (id ? fixtures.get(id) : undefined),
    rule: (id) => (id ? rules.get(id) : undefined),
    module: (id) => (id ? modules.get(id) : undefined),
    flow: (id) => (id ? flows.get(id) : undefined),

    rulesOf: (target) =>
      (target?.rules ?? []).map((id) => rules.get(id)).filter((r): r is Rule => Boolean(r)),
    permissionsOf,

    scenariosForRoute: (route) => {
      const base = route.split("?")[0];
      return product.scenarios.filter((s) => s.route.split("?")[0] === base);
    },

    search: (query) => {
      const needle = normalize(query);
      if (!needle) return product.scenarios;
      return product.scenarios.filter((s) => {
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

    coverage: () => {
      const counts = {
        proposed: 0,
        "in-review": 0,
        approved: 0,
        "in-implementation": 0,
        implemented: 0,
        superseded: 0,
      } satisfies Record<ScenarioStatus, number>;
      for (const s of product.scenarios) counts[s.status] += 1;
      return counts;
    },
  };
}

/** Minúsculas sem acento: "Convênio" acha "convenio". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
