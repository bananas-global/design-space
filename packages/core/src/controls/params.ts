/**
 * Nomes dos parâmetros de URL, em um módulo próprio.
 *
 * Separado de `state.ts` porque `deploy/` também precisa deste mapa para montar
 * deep links, e importar o estado inteiro criaria dependência circular. Mais
 * importante: com o mapa em um só lugar, é impossível um override de teste
 * escrever `keyboardMode=1` quando a URL real usa `kb=1`.
 */

import type { ControlsState } from "../types/index.js";

/** Nomes curtos: a URL é colada em Slack, em ticket e em thread de revisão. */
export const PARAM = {
  scenario: "scenario",
  persona: "persona",
  fixture: "fixture",
  network: "network",
  viewport: "viewport",
  customWidth: "w",
  themeMode: "theme",
  locale: "locale",
  dataSource: "source",
  chrome: "chrome",
  keyboardMode: "kb",
  reducedMotion: "motion",
  textScale: "scale",
  inspector: "panel",
} as const satisfies Record<keyof ControlsState, string>;

/**
 * Serializa um valor de controle para a query string.
 *
 * Booleano vira `1`/`0` e não `true`/`false`: é o que o parser espera, e a URL
 * fica mais curta.
 */
export function serializeValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Aplica overrides de {@link ControlsState} em uma `URLSearchParams`, traduzindo
 * as chaves do estado para os nomes de parâmetro.
 */
export function applyOverrides(
  params: URLSearchParams,
  overrides: Partial<ControlsState> = {},
): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    const param = PARAM[key as keyof ControlsState];
    if (!param) continue;
    params.set(param, serializeValue(value));
  }
}
