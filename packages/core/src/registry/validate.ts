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
  SCENARIO_STATUSES,
  type ProductDefinition,
  type Scenario,
} from "../types/index.js";

export type ValidationIssue = {
  level: "error" | "warning";
  /** Onde o problema está: `scenario:finance.insurance-denied`. */
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
      "`id` deve ser minúsculo em kebab-case, com o módulo como prefixo: `finance.insurance-denied`.",
    );
  } else if (!scenario.id.includes(".")) {
    warn("`id` sem prefixo de módulo dificulta a navegação e a busca do agente.");
  }

  if (!isNonEmptyString(scenario?.title)) {
    err("`title` é obrigatório e deve usar o vocabulário do negócio.");
  }

  if (!isNonEmptyString(scenario?.route)) {
    err("`route` é obrigatório.");
  } else if (!scenario.route.startsWith("/")) {
    err("`route` deve começar com `/`.");
  }

  if (!isNonEmptyString(scenario?.persona)) err("`persona` é obrigatório.");
  if (!isNonEmptyString(scenario?.fixture)) {
    err("`fixture` é obrigatório. O padrão do ambiente é dado sintético (D-05).");
  }

  if (!SCENARIO_STATUSES.includes(scenario?.status)) {
    err(`\`status\` deve ser um de: ${SCENARIO_STATUSES.join(", ")}.`);
  }

  if (scenario?.network && !NETWORK_STATES.includes(scenario.network)) {
    err(`\`network\` deve ser um de: ${NETWORK_STATES.join(", ")}.`);
  }

  const a11y = scenario?.a11y;
  if (!a11y || typeof a11y !== "object") {
    err(
      "`a11y` é obrigatório. Acessibilidade é campo do contrato, não auditoria de fim de projeto (D-15).",
    );
  } else {
    if (!["full", "partial", "not-applicable"].includes(a11y.keyboard)) {
      err("`a11y.keyboard` deve ser `full`, `partial` ou `not-applicable`.");
    }
    if (!["AA", "AAA"].includes(a11y.contrast)) {
      err("`a11y.contrast` deve ser `AA` ou `AAA`. O padrão interno é WCAG 2.2 AA.");
    }
    if (a11y.announces !== undefined && !Array.isArray(a11y.announces)) {
      err("`a11y.announces` deve ser uma lista de chaves de evento de domínio.");
    }
  }

  // Gate do roadmap: não aprovar cenário de jornada crítica sem acessibilidade
  // verificada. O motor não sabe o que é crítico, então checa o que dá:
  // aprovado com teclado parcial é sinal de aprovação apressada.
  if (scenario?.status === "approved" && a11y?.keyboard === "partial") {
    warn(
      "Cenário aprovado com `a11y.keyboard: \"partial\"`. Confirme que esta jornada não é crítica.",
    );
  }

  if (scenario?.status === "approved" && !scenario.approvedAt) {
    warn(
      "Cenário aprovado sem `approvedAt`. A aprovação deve ser registrada por URL de commit (§10.2), senão muda de conteúdo debaixo de quem aprovou.",
    );
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
  const moduleIds = new Set(product.modules?.map((m) => m.id) ?? []);
  const scenarioIds = new Set<string>();

  if (!isNonEmptyString(product.id)) push("error", "product", "`id` é obrigatório.");
  if (!isNonEmptyString(product.name)) push("error", "product", "`name` é obrigatório.");
  if (!product.routes?.length) {
    push("error", "product", "`routes` está vazio: nenhum cenário conseguirá renderizar.");
  }

  for (const [index, scenario] of (product.scenarios ?? []).entries()) {
    issues.push(...validateScenario(scenario, index));

    const where = `scenario:${scenario?.id ?? index}`;

    if (scenario?.id) {
      if (scenarioIds.has(scenario.id)) {
        push("error", where, `\`id\` duplicado: ${scenario.id}.`);
      }
      scenarioIds.add(scenario.id);

      const modulePrefix = scenario.id.split(".")[0];
      if (modulePrefix && moduleIds.size > 0 && !moduleIds.has(modulePrefix)) {
        push(
          "warning",
          where,
          `Prefixo \`${modulePrefix}\` não corresponde a nenhum módulo registrado. O cenário não vai aparecer na navegação.`,
        );
      }
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
    if (scenario?.route && !matchesAnyRoute(scenario.route, product)) {
      push(
        "error",
        where,
        `Rota \`${scenario.route}\` não casa com nenhuma rota declarada. O deep link abriria a tela de rota inexistente.`,
      );
    }
  }

  for (const module of product.modules ?? []) {
    for (const flow of module.flows ?? []) {
      const where = `flow:${module.id}/${flow.id}`;
      if (!flow.steps?.length) push("warning", where, "Jornada sem passos.");
      for (const step of flow.steps ?? []) {
        if (!scenarioIds.has(step.scenario)) {
          push("error", where, `Passo aponta para cenário inexistente: \`${step.scenario}\`.`);
        }
        for (const [label, target] of Object.entries(step.branches ?? {})) {
          if (!scenarioIds.has(target)) {
            push(
              "error",
              where,
              `Ramificação "${label}" aponta para cenário inexistente: \`${target}\`.`,
            );
          }
        }
      }
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
