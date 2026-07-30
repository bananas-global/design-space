/**
 * Contraste (§6.1, "No token").
 *
 * Contraste é propriedade de par de cores, não de componente. Validar na
 * definição do token resolve na origem, uma vez, em vez de perseguir o mesmo
 * problema em trinta telas — e é por isso que esta função roda junto do build do
 * produto, não só no painel.
 *
 * Implementa a razão de contraste do WCAG 2.x, que é a mesma em 2.2.
 */

import type { ContrastPair, ContrastTarget } from "../types/index.js";

export type Rgb = { r: number; g: number; b: number; a: number };

/** Limiares do WCAG 2.2: 1.4.3 (AA) e 1.4.6 (AAA). */
export const CONTRAST_THRESHOLDS = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
} as const;

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "#00000000",
};

/**
 * Interpreta hex de 3, 4, 6 ou 8 dígitos, `rgb()`, `rgba()` e as três palavras
 * que aparecem em token de verdade. Devolve `undefined` para o que não sabe ler
 * — deliberadamente: um par que não pôde ser medido precisa aparecer como
 * "não verificado" no painel, não como aprovado.
 */
export function parseColor(input: string): Rgb | undefined {
  const value = input.trim().toLowerCase();
  const named = NAMED_COLORS[value];
  if (named) return parseColor(named);

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expand = (chunk: string) => Number.parseInt(chunk.repeat(2), 16);

    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = [...hex];
      if (!r || !g || !b) return undefined;
      return { r: expand(r), g: expand(g), b: expand(b), a: a ? expand(a) / 255 : 1 };
    }

    if (hex.length === 6 || hex.length === 8) {
      const pair = (index: number) => Number.parseInt(hex.slice(index, index + 2), 16);
      const values = [pair(0), pair(2), pair(4)];
      if (values.some(Number.isNaN)) return undefined;
      return {
        r: values[0]!,
        g: values[1]!,
        b: values[2]!,
        a: hex.length === 8 ? pair(6) / 255 : 1,
      };
    }

    return undefined;
  }

  const functional = value.match(/^rgba?\(([^)]+)\)$/);
  if (functional?.[1]) {
    const parts = functional[1].split(/[\s,/]+/).filter(Boolean);
    const [r, g, b, a] = parts.map(Number);
    if ([r, g, b].some((n) => n === undefined || Number.isNaN(n))) return undefined;
    return { r: r!, g: g!, b: b!, a: a === undefined || Number.isNaN(a) ? 1 : a };
  }

  return undefined;
}

/**
 * Compõe uma cor semitransparente sobre um fundo opaco.
 *
 * Importa porque metade dos tokens semânticos de produto real é
 * `rgba(43, 35, 91, 0.6)` — medir isso ignorando o alfa dá um resultado
 * otimista e falso.
 */
export function flatten(foreground: Rgb, background: Rgb): Rgb {
  if (foreground.a >= 1) return foreground;
  const mix = (fg: number, bg: number) => fg * foreground.a + bg * (1 - foreground.a);
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

/** Luminância relativa (WCAG 2.x, definição de `relative luminance`). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (raw: number) => {
    const value = raw / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste entre 1 e 21. `undefined` quando alguma cor é ilegível. */
export function contrastRatio(foreground: string, background: string): number | undefined {
  const bg = parseColor(background);
  const fgRaw = parseColor(foreground);
  if (!bg || !fgRaw) return undefined;

  const fg = flatten(fgRaw, bg);
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastResult = {
  pair: ContrastPair;
  target: ContrastTarget;
  /** `undefined` quando alguma das cores não pôde ser interpretada. */
  ratio: number | undefined;
  required: number;
  /** `undefined` quando não foi possível medir. Nunca `true` por omissão. */
  passes: boolean | undefined;
  /** Razão arredondada para exibição: "4.62:1". */
  label: string;
};

export function checkContrastPair(pair: ContrastPair): ContrastResult {
  const target = pair.target ?? "AA";
  const required = pair.largeText
    ? CONTRAST_THRESHOLDS[target].large
    : CONTRAST_THRESHOLDS[target].normal;
  const ratio = contrastRatio(pair.foreground, pair.background);

  return {
    pair,
    target,
    ratio,
    required,
    passes: ratio === undefined ? undefined : ratio >= required,
    label: ratio === undefined ? "não medido" : `${ratio.toFixed(2)}:1`,
  };
}

export function checkContrastPairs(pairs: ContrastPair[] = []): ContrastResult[] {
  return pairs.map(checkContrastPair);
}

/**
 * Falha o build quando algum par declarado não atinge o alvo.
 *
 * Chamado por um teste do produto (`tests/tokens.test.ts` no template), porque
 * validar tokens é responsabilidade do produto — o motor só sabe medir.
 */
export function assertContrastPairs(pairs: ContrastPair[]): void {
  const failures = checkContrastPairs(pairs).filter((result) => result.passes !== true);
  if (failures.length === 0) return;

  const detail = failures
    .map(
      (f) =>
        `  ✖ ${f.pair.name}: ${f.label} (mínimo ${f.required}:1 para ${f.target}` +
        `${f.pair.largeText ? ", texto grande" : ""})`,
    )
    .join("\n");

  throw new Error(`Pares de contraste fora do alvo:\n${detail}`);
}

/**
 * Lê o valor computado de uma custom property. Serve para o painel medir o que
 * está realmente aplicado na tela, não o que o arquivo de token diz.
 */
export function readCssVariable(name: string, element?: Element): string | undefined {
  if (typeof window === "undefined") return undefined;
  const target = element ?? document.documentElement;
  const value = window.getComputedStyle(target).getPropertyValue(name).trim();
  return value || undefined;
}
