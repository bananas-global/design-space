/**
 * Roteamento declarativo mínimo.
 *
 * Não usa uma biblioteca de rotas de propósito: o motor precisa ficar pequeno e
 * neutro (Princípio 6), e o que o Design Space exige de roteamento é pequeno —
 * casar um path contra uma lista declarada e extrair parâmetros. Em troca, o
 * produto não herda a versão nem as convenções de um router externo.
 *
 * O que faz este roteamento funcionar em preview é o rewrite de SPA no
 * `vercel.json` (§10.4): sem ele, abrir uma rota profunda direto pela URL
 * devolve 404 no primeiro carregamento e quebra a promessa central do produto.
 */

import type { RouteDefinition } from "../types/index.js";

export type RouteMatch = {
  definition: RouteDefinition;
  params: Record<string, string>;
};

/**
 * Casa um path contra um padrão com segmentos `:param` e `*` final.
 * Devolve os parâmetros extraídos, ou `null` quando não casa.
 */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = decodePath(path).split("/").filter(Boolean);
  const params: Record<string, string> = {};

  for (const [index, segment] of patternSegments.entries()) {
    if (segment === "*") {
      params["*"] = pathSegments.slice(index).join("/");
      return params;
    }

    const actual = pathSegments[index];
    if (actual === undefined) return null;

    if (segment.startsWith(":")) {
      params[segment.slice(1)] = actual;
      continue;
    }

    if (segment !== actual) return null;
  }

  if (patternSegments.length !== pathSegments.length) return null;
  return params;
}

/**
 * Resolve a rota ativa. Rotas mais específicas primeiro: entre `/patients/new`
 * e `/patients/:id`, a literal ganha, independente da ordem de declaração.
 */
export function resolveRoute(routes: RouteDefinition[], path: string): RouteMatch | undefined {
  const ranked = [...routes].sort((a, b) => specificity(b.path) - specificity(a.path));

  for (const definition of ranked) {
    const params = matchPath(definition.path, path);
    if (params) return { definition, params };
  }

  return undefined;
}

/**
 * Pontuação de especificidade: segmento literal vale mais que parâmetro, que
 * vale mais que curinga. Rotas mais longas desempatam.
 */
function specificity(pattern: string): number {
  const segments = pattern.split("/").filter(Boolean);
  let score = segments.length;
  for (const segment of segments) {
    if (segment === "*") score -= 2;
    else if (segment.startsWith(":")) score += 1;
    else score += 4;
  }
  return score;
}

function decodePath(path: string): string {
  const withoutQuery = path.split("?")[0] ?? path;
  try {
    return decodeURI(withoutQuery);
  } catch {
    return withoutQuery;
  }
}
