/**
 * `@brucesantos/design-space/testing`
 *
 * Utilitários para os testes do produto. Vive num entrypoint separado porque
 * nada aqui deve chegar ao bundle do preview.
 *
 * O que este módulo assume: o preview é público, sem proteção de acesso (D-11).
 * Como não há segredo de bypass nem header de automação a emitir, o Playwright
 * aponta direto para a URL do preview — e é por isso que estas funções só
 * precisam de uma origem.
 */

import { scenarioUrl } from "../deploy/index.js";
import { validateProduct, hasErrors, formatIssues } from "../registry/validate.js";
import { assertContrastPairs } from "../a11y/contrast.js";
import type { ControlsState, ProductDefinition, Scenario, ScenarioStatus } from "../types/index.js";

/**
 * Origem contra a qual os testes rodam.
 *
 * `PREVIEW_URL` é o que o gatilho `deployment_status` do GitHub Actions entrega
 * pronto (§10.6), o que dispensa qualquer lógica de descobrir onde o preview foi
 * publicado. Sem ela, cai no dev server local.
 */
export function testOrigin(fallback = "http://localhost:5173"): string {
  const env = typeof process !== "undefined" ? process.env : {};
  const url = env.PREVIEW_URL || env.BASE_URL || fallback;
  return url.replace(/\/$/, "");
}

/** URL absoluta de um cenário para uso em `page.goto`. */
export function urlFor(
  scenario: Scenario,
  options: { origin?: string; overrides?: Partial<ControlsState> } = {},
): string {
  return scenarioUrl(scenario, { origin: options.origin ?? testOrigin(), overrides: options.overrides });
}

/**
 * Caminho relativo de um cenário: `/rota?scenario=…`.
 *
 * É a forma preferida em Playwright, porque deixa o `baseURL` da configuração
 * decidir se o teste roda contra o preview ou contra o dev server. Um teste que
 * embute a origem passa a existir em duas versões, e a versão local é a que
 * ninguém roda.
 */
export function pathFor(
  scenario: Scenario,
  overrides: Partial<ControlsState> = {},
): string {
  const url = new URL(scenarioUrl(scenario, { origin: "http://design-space.invalid", overrides }));
  return `${url.pathname}${url.search}`;
}

/**
 * Cenários que valem uma jornada automatizada.
 *
 * Deliberadamente não é "todos": rodar Playwright em cenário `proposed`
 * transforma exploração em trabalho de manutenção de teste, que é o oposto de
 * "governança proporcional" (Princípio 9). O piso é o cenário que já foi
 * aprovado ou já existe em produção.
 */
export function scenariosUnderTest(
  product: ProductDefinition,
  statuses: ScenarioStatus[] = ["approved", "in-implementation", "implemented"],
): Scenario[] {
  return product.scenarios.filter((scenario) => statuses.includes(scenario.status));
}

/** Cenários que declaram jornada completável só por teclado. */
export function keyboardScenarios(product: ProductDefinition): Scenario[] {
  return product.scenarios.filter((scenario) => scenario.a11y.keyboard === "full");
}

/**
 * Falha o teste quando o contrato de cenário do produto tem erro.
 *
 * É o equivalente do typecheck para o que o TypeScript não alcança: fixture
 * inexistente, persona escrita errada, rota que não casa com nada.
 */
export function assertValidProduct(product: ProductDefinition): void {
  const issues = validateProduct(product);
  if (hasErrors(issues)) {
    throw new Error(`Contrato de cenário inválido:\n${formatIssues(issues)}`);
  }
}

export { assertContrastPairs, formatIssues, hasErrors, validateProduct };
export { scenarioUrl } from "../deploy/index.js";
