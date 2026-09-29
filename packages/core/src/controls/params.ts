/**
 * Nomes dos parâmetros de URL, em um módulo próprio.
 *
 * Separado de `state.ts` porque `deploy/` também precisa deste mapa para montar
 * deep links, e importar o estado inteiro criaria dependência circular. Mais
 * importante: com o mapa em um só lugar, é impossível um override de teste
 * escrever `inspector=0` quando a URL real usa `panel=0`.
 */

import type { ControlsState } from "../types/index.js";
import { applyHandoffScope } from "../handoff/index.js";

/** Nomes curtos: a URL é colada em Slack, em ticket e em thread de revisão. */
export const PARAM = {
  scenario: "scenario",
  component: "component",
  persona: "persona",
  fixture: "fixture",
  network: "network",
  viewport: "viewport",
  customWidth: "w",
  themeMode: "theme",
  locale: "locale",
  dataSource: "source",
  chromeTheme: "appearance",
  chrome: "chrome",
  inspector: "panel",
  panelTab: "tab",
  zoom: "zoom",
  rotated: "rotate",
} as const satisfies Record<Exclude<keyof ControlsState, "handoff" | "screenControls">, string>;

/**
 * Prefixo dos controles da tela na URL: `c.<id>=<value>`. O prefixo separa os
 * controles declarados pelo produto dos parâmetros do motor, então um controle
 * chamado `persona` não colide com a persona.
 */
export const CONTROL_PARAM_PREFIX = "c.";

/** Os `c.<id>` de uma query string, como id → value. */
export function readControlParams(search: string | URLSearchParams): Record<string, string> {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const values: Record<string, string> = {};
  for (const [key, value] of params) {
    if (!key.startsWith(CONTROL_PARAM_PREFIX)) continue;
    const id = key.slice(CONTROL_PARAM_PREFIX.length);
    if (id) values[id] = value;
  }
  return values;
}

/** Remove todos os `c.<id>` de uma query. */
export function deleteControlParams(params: URLSearchParams): void {
  for (const key of [...params.keys()]) {
    if (key.startsWith(CONTROL_PARAM_PREFIX)) params.delete(key);
  }
}

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
    if (key === "handoff") {
      applyHandoffScope(params, value as ControlsState["handoff"]);
      continue;
    }
    if (key === "screenControls") {
      for (const [id, control] of Object.entries(value as Record<string, string>)) {
        params.set(`${CONTROL_PARAM_PREFIX}${id}`, control);
      }
      continue;
    }
    const param = PARAM[key as Exclude<keyof ControlsState, "handoff" | "screenControls">];
    if (!param) continue;
    params.set(param, serializeValue(value));
  }
}
