import type { Fixture, Rule, Scenario } from "@brucesantos/design-space";

import { personas } from "../personas/index.js";
import { fixtures as requestFixtures } from "../fixtures/requests.js";
import { rules as requestRules } from "../rules/requests.js";
import { queueControls, scenarios as requestScenarios } from "../scenarios/requests.js";

/**
 * Catálogo: tudo que descreve o produto **sem** tocar em React nem em
 * `import.meta`.
 *
 * A separação existe por um motivo concreto de ferramenta. O Playwright carrega
 * os arquivos de teste com esbuild puro, sem os plugins do Vite — então um
 * `import` de SVG, de CSS ou um `import.meta.env` na cadeia derruba a suíte
 * inteira antes do primeiro teste, e o erro aparece como "No tests found".
 *
 * O teste de jornada só precisa dos cenários para montar deep links, então
 * importar o catálogo em vez da `ProductDefinition` mantém a cadeia limpa.
 *
 * O ganho secundário é conceitual: fica explícito o que é especificação e o que é
 * implementação. Quem vai criar um cenário mexe aqui; quem vai mudar uma tela
 * mexe em `product.ts`.
 *
 * Não existe módulo nem jornada: cada rota de `product.ts` é uma tela, `group`
 * junta as telas de um fluxo, e os cenários cuja `route` casa com a tela são
 * atalhos para combinações dos controles dela.
 */

export const scenarios: Scenario[] = requestScenarios;
export const fixtures: Fixture[] = requestFixtures as Fixture[];
export const rules: Rule[] = requestRules;
export { personas };
export { queueControls };
