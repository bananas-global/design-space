/**
 * Escopo de foco para revisão e handoff.
 *
 * O formato usa parâmetros repetíveis e legíveis em vez de um payload opaco:
 * `handoff=1&allowScenario=...&allowRoute=...&allowComponent=...`.
 */

import { matchPath } from "../router/index.js";
import type { HandoffScope, Scenario } from "../types/index.js";

export const HANDOFF_PARAM = {
  enabled: "handoff",
  scenario: "allowScenario",
  route: "allowRoute",
  component: "allowComponent",
} as const;

/** Lê a allowlist. Ausência de `handoff=1` significa catálogo sem recorte. */
export function parseHandoffScope(params: URLSearchParams): HandoffScope | undefined {
  if (params.get(HANDOFF_PARAM.enabled) !== "1") return undefined;
  return normalizeHandoffScope({
    scenarios: params.getAll(HANDOFF_PARAM.scenario),
    routes: params.getAll(HANDOFF_PARAM.route),
    components: params.getAll(HANDOFF_PARAM.component),
  });
}

/** Escreve a allowlist de forma determinística, preservando um escopo vazio. */
export function applyHandoffScope(
  params: URLSearchParams,
  scope: HandoffScope | undefined,
): void {
  for (const param of Object.values(HANDOFF_PARAM)) params.delete(param);
  if (!scope) return;

  params.set(HANDOFF_PARAM.enabled, "1");
  const normalized = normalizeHandoffScope(scope);
  for (const id of normalized.scenarios ?? []) params.append(HANDOFF_PARAM.scenario, id);
  for (const route of normalized.routes ?? []) params.append(HANDOFF_PARAM.route, route);
  for (const id of normalized.components ?? []) params.append(HANDOFF_PARAM.component, id);
}

/** Remove duplicatas, vazios e diferenças de ordem que tornariam a URL instável. */
export function normalizeHandoffScope(scope: HandoffScope): HandoffScope {
  const scenarios = normalizeList(scope.scenarios);
  const routes = normalizeList(scope.routes);
  const components = normalizeList(scope.components);
  return {
    ...(scenarios.length ? { scenarios } : {}),
    ...(routes.length ? { routes } : {}),
    ...(components.length ? { components } : {}),
  };
}

export function handoffAllowsScenario(
  scope: HandoffScope | undefined,
  scenarioId: string | undefined,
): boolean {
  return !scope || Boolean(scenarioId && scope.scenarios?.includes(scenarioId));
}

export function handoffAllowsComponent(
  scope: HandoffScope | undefined,
  componentId: string | undefined,
): boolean {
  return !scope || Boolean(componentId && scope.components?.includes(componentId));
}

/**
 * A raiz é sempre permitida porque nela vive a Home já filtrada. Fora dela,
 * uma rota precisa estar explícita ou pertencer a um cenário permitido.
 */
export function handoffAllowsPath(
  scope: HandoffScope | undefined,
  path: string,
  scenarios: readonly Scenario[] = [],
): boolean {
  if (!scope || path === "/") return true;
  const patterns = [
    ...(scope.routes ?? []),
    ...scenarios
      .filter((scenario) => handoffAllowsScenario(scope, scenario.id))
      .map((scenario) => scenario.route),
  ];
  return patterns.some((pattern) => matchPath(pattern, path) !== null);
}

function normalizeList(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();
}
