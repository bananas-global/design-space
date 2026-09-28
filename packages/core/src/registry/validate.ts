/**
 * Validação em runtime do contrato de cenário (E2).
 *
 * Existe porque tipo de TypeScript desaparece no build: uma fixture inexistente
 * ou uma persona escrita errada só apareceria como tela vazia no preview, que é
 * exatamente o tipo de erro que corrói a confiança no ambiente. Aqui ela
 * aparece como problema nomeado, no painel e no CI.
 *
 * Sem dependência de schema externo de propósito: o contrato é pequeno, e o
 * motor precisa ficar pequeno e neutro (Princípio 6).
 */

import {
  NETWORK_STATES,
  type ProductDefinition,
  type Scenario,
} from "../types/index.js";

export type ValidationIssue = {
  level: "error" | "warning";
  /** Onde o problema está: `scenario:requests.approve-blocked`. */
  where: string;
  message: string;
};

const ID_PATTERN = /^[a-z0-9]+([.\-][a-z0-9]+)*$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Valida um cenário isolado: forma, não referências. Referências dependem do
 * produto inteiro e são checadas em {@link validateProduct}.
 */
export function validateScenario(scenario: Scenario, index?: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const where = isNonEmptyString(scenario?.id)
    ? `scenario:${scenario.id}`
    : `scenario[${index ?? "?"}]`;

  const err = (message: string) => issues.push({ level: "error", where, message });
  const warn = (message: string) => issues.push({ level: "warning", where, message });

  if (!isNonEmptyString(scenario?.id)) {
    err("`id` é obrigatório.");
  } else if (!ID_PATTERN.test(scenario.id)) {
    err(
      "`id` deve ser minúsculo, em kebab-case, com pontos opcionais: `requests.approve-blocked` ou `approve-blocked`.",
    );
  }

  if (!isNonEmptyString(scenario?.title)) {
    err("`title` é obrigatório e deve usar o vocabulário do negócio.");
  }

  if (!isNonEmptyString(scenario?.route)) {
    err("`route` é obrigatório.");
  } else if (!scenario.route.startsWith("/")) {
    err("`route` deve começar com `/`.");
  }

  if (scenario?.persona !== undefined && !isNonEmptyString(scenario.persona)) {
    err("`persona`, quando informada, deve ser o id de uma persona registrada.");
  }
  if (!isNonEmptyString(scenario?.fixture)) {
    err("`fixture` é obrigatório. O padrão do ambiente é dado sintético (D-05).");
  }

  if (scenario?.components !== undefined && !Array.isArray(scenario.components)) {
    err("`components`, quando informado, deve ser uma lista de ids de componente.");
  }

  if (scenario?.network && !NETWORK_STATES.includes(scenario.network)) {
    err(`\`network\` deve ser um de: ${NETWORK_STATES.join(", ")}.`);
  }

  if (!scenario?.expected?.length) {
    warn(
      "Sem `expected`, o cenário não vira caso verificável no handoff — é tela bonita sem critério (risco: prototype theater).",
    );
  }

  return issues;
}

/**
 * Valida o produto inteiro: forma de cada cenário mais integridade das
 * referências entre cenário, persona, fixture, regra e rota.
 */
export function validateProduct(product: ProductDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (level: ValidationIssue["level"], where: string, message: string) =>
    issues.push({ level, where, message });

  const personaIds = new Set(product.personas?.map((p) => p.id) ?? []);
  const fixtureIds = new Set(product.fixtures?.map((f) => f.id) ?? []);
  const ruleIds = new Set(product.rules?.map((r) => r.id) ?? []);
  const scenarioIds = new Set<string>();

  if (!isNonEmptyString(product.id)) push("error", "product", "`id` é obrigatório.");
  if (!isNonEmptyString(product.name)) push("error", "product", "`name` é obrigatório.");
  // Um produto que é só catálogo de componentes e layouts não precisa de rota:
  // o preview de componente renderiza sem roteamento. Sem rota, o problema só
  // existe quando há cenário que precisa abrir uma tela.
  if (!product.routes?.length && product.scenarios?.length) {
    push("error", "product", "`routes` está vazio: nenhum cenário conseguirá renderizar.");
  }

  if ("modules" in (product as object)) {
    push(
      "warning",
      "product",
      "`modules` foi removido na 0.8.0 e é ignorado: cada rota é uma tela, e os cenários da rota são as variações dela.",
    );
  }

  const routePaths = new Set<string>();
  for (const [index, route] of (product.routes ?? []).entries()) {
    const where = `route:${route?.path ?? index}`;
    if (!isNonEmptyString(route?.path)) {
      push("error", where, "`path` é obrigatório.");
      continue;
    }
    if (!route.path.startsWith("/")) push("error", where, "`path` deve começar com `/`.");
    if (routePaths.has(route.path)) {
      push("error", where, `\`path\` duplicado: ${route.path}. Cada rota é uma tela.`);
    }
    routePaths.add(route.path);
    if (typeof route.screen !== "function" && typeof route.screen !== "object") {
      push("error", where, "`screen` é obrigatório.");
    }
    if (route.name !== undefined && !isNonEmptyString(route.name)) {
      push("warning", where, "`name` vazio: a tela aparece com o título do primeiro cenário.");
    }
  }

  const componentIds = new Set<string>();
  for (const [index, component] of (product.components ?? []).entries()) {
    const where = `component:${component?.id ?? index}`;
    if (!isNonEmptyString(component?.id)) {
      push("error", where, "`id` é obrigatório.");
    } else if (!ID_PATTERN.test(component.id)) {
      push("error", where, "`id` deve ser minúsculo em kebab-case ou usar pontos para agrupamento.");
    } else if (componentIds.has(component.id)) {
      push("error", where, `\`id\` duplicado: ${component.id}.`);
    } else {
      componentIds.add(component.id);
    }
    if (!isNonEmptyString(component?.name)) push("error", where, "`name` é obrigatório.");
    if (typeof component?.preview !== "function" && typeof component?.preview !== "object") {
      push("error", where, "`preview` é obrigatório.");
    }
    if (component?.source !== undefined && typeof component.source !== "string") {
      push("error", where, "`source`, quando informado, é texto livre.");
    }

    const componentFixtureIds = new Set<string>();
    for (const [fixtureIndex, fixture] of (component?.fixtures ?? []).entries()) {
      const fixtureWhere = `${where}/fixture:${fixture?.id ?? fixtureIndex}`;
      if (!isNonEmptyString(fixture?.id)) {
        push("error", fixtureWhere, "`id` da fixture do componente é obrigatório.");
      } else if (!ID_PATTERN.test(fixture.id)) {
        push(
          "error",
          fixtureWhere,
          `Id de fixture do componente inválido: \`${fixture.id}\`. Use minúsculas em kebab-case.`,
        );
      } else if (componentFixtureIds.has(fixture.id)) {
        push("error", fixtureWhere, `Id de fixture do componente duplicado: \`${fixture.id}\`.`);
      } else {
        componentFixtureIds.add(fixture.id);
      }
      if (!isNonEmptyString(fixture?.label)) {
        push("error", fixtureWhere, "`label` da fixture do componente é obrigatório.");
      }
      if (!fixture || !("data" in fixture)) {
        push("error", fixtureWhere, "`data` da fixture do componente é obrigatório.");
      }
    }
    if (component?.defaultFixture && !componentFixtureIds.has(component.defaultFixture)) {
      push(
        "error",
        where,
        `\`defaultFixture\` aponta para fixture inexistente: \`${component.defaultFixture}\`.`,
      );
    }
  }

  for (const [index, scenario] of (product.scenarios ?? []).entries()) {
    issues.push(...validateScenario(scenario, index));

    const where = `scenario:${scenario?.id ?? index}`;

    if (scenario?.id) {
      if (scenarioIds.has(scenario.id)) {
        push("error", where, `\`id\` duplicado: ${scenario.id}.`);
      }
      scenarioIds.add(scenario.id);
    }

    if (scenario?.persona && !personaIds.has(scenario.persona)) {
      push("error", where, `Persona não registrada: \`${scenario.persona}\`.`);
    }
    if (scenario?.fixture && !fixtureIds.has(scenario.fixture)) {
      push("error", where, `Fixture não registrada: \`${scenario.fixture}\`.`);
    }
    for (const rule of scenario?.rules ?? []) {
      if (!ruleIds.has(rule)) {
        push("error", where, `Regra não registrada: \`${rule}\`.`);
      }
    }
    for (const component of Array.isArray(scenario?.components) ? scenario.components : []) {
      if (!componentIds.has(component)) {
        push(
          "warning",
          where,
          `Componente não registrado: \`${component}\`. Ele não aparece em "Componentes usados".`,
        );
      }
    }
    if (scenario?.route && !matchesAnyRoute(scenario.route, product)) {
      push(
        "error",
        where,
        `Rota \`${scenario.route}\` não casa com nenhuma rota declarada. O deep link abriria a tela de rota inexistente.`,
      );
    }
  }

  const defaultSource = product.dataSources?.default;
  if (defaultSource && defaultSource !== "fixtures") {
    const adapterIds = new Set(product.dataSources?.adapters?.map((a) => a.id) ?? []);
    if (!adapterIds.has(defaultSource)) {
      push("error", "product", `\`dataSources.default\` aponta para adapter inexistente: \`${defaultSource}\`.`);
    }
    push(
      "warning",
      "product",
      "A fonte padrão não é `fixtures`. O padrão do ambiente é dado sintético e determinístico (D-05); API real entra como adapter opcional, com justificativa.",
    );
  }

  return issues;
}

function matchesAnyRoute(route: string, product: ProductDefinition): boolean {
  const path = route.split("?")[0] ?? route;
  return (product.routes ?? []).some((definition) => matchPathShape(definition.path, path));
}

/**
 * Casamento de forma de rota, usado pela validação. O casamento com extração de
 * parâmetros vive em `router/`; aqui só interessa "existe rota compatível".
 */
function matchPathShape(pattern: string, path: string): boolean {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = path.split("/").filter(Boolean);

  for (const [index, segment] of patternSegments.entries()) {
    if (segment === "*") return true;
    const actual = pathSegments[index];
    if (actual === undefined) return false;
    if (segment.startsWith(":")) continue;
    if (segment !== actual) return false;
  }

  return patternSegments.length === pathSegments.length;
}

/** `true` quando existe pelo menos uma violação de nível `error`. */
export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}

/** Formata as violações para saída de terminal, usada no CI e em testes. */
export function formatIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return "Nenhum problema encontrado.";
  return issues
    .map((issue) => `${issue.level === "error" ? "✖" : "▲"} ${issue.where}\n  ${issue.message}`)
    .join("\n");
}
