import { describe, expect, it } from "vitest";
import {
  assertContrastPairs,
  checkContrastPair,
  contrastRatio,
  flatten,
  parseColor,
} from "./contrast.js";

describe("parseColor", () => {
  it("lê hex de 3, 6 e 8 dígitos", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor("#2b235b")).toEqual({ r: 43, g: 35, b: 91, a: 1 });
    expect(parseColor("#2b235b80")?.a).toBeCloseTo(0.502, 2);
  });

  it("lê rgb() e rgba()", () => {
    expect(parseColor("rgb(43, 35, 91)")).toEqual({ r: 43, g: 35, b: 91, a: 1 });
    expect(parseColor("rgba(43, 35, 91, 0.6)")).toEqual({ r: 43, g: 35, b: 91, a: 0.6 });
  });

  it("devolve undefined para o que não sabe ler, em vez de adivinhar", () => {
    expect(parseColor("var(--fg-1)")).toBeUndefined();
    expect(parseColor("hsl(240 40% 20%)")).toBeUndefined();
  });
});

describe("contrastRatio", () => {
  it("bate os extremos conhecidos do WCAG", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
  });

  it("é simétrico", () => {
    const a = contrastRatio("#2b235b", "#f0f6f8");
    const b = contrastRatio("#f0f6f8", "#2b235b");
    expect(a).toBeCloseTo(b!, 10);
  });

  it("compõe o alfa sobre o fundo antes de medir", () => {
    // Sem compor, `rgba(0,0,0,0.5)` seria medido como preto puro e daria um
    // resultado otimista e falso.
    const naive = contrastRatio("#000000", "#ffffff")!;
    const composed = contrastRatio("rgba(0, 0, 0, 0.5)", "#ffffff")!;
    expect(composed).toBeLessThan(naive);
    expect(composed).toBeGreaterThan(1);
  });
});

describe("flatten", () => {
  it("não altera cor opaca", () => {
    const opaque = { r: 10, g: 20, b: 30, a: 1 };
    expect(flatten(opaque, { r: 255, g: 255, b: 255, a: 1 })).toEqual(opaque);
  });

  it("mistura na proporção do alfa", () => {
    const result = flatten({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(result.r).toBeCloseTo(127.5, 1);
    expect(result.a).toBe(1);
  });
});

describe("checkContrastPair", () => {
  it("aplica o limiar de texto grande", () => {
    const pair = { name: "t", foreground: "#767676", background: "#ffffff" };
    expect(checkContrastPair(pair).passes).toBe(true); // 4.54 >= 4.5
    expect(checkContrastPair({ ...pair, target: "AAA" as const }).passes).toBe(false);
    expect(checkContrastPair({ ...pair, target: "AAA" as const, largeText: true }).passes).toBe(true);
  });

  it("não aprova por omissão quando não consegue medir", () => {
    const result = checkContrastPair({ name: "t", foreground: "var(--x)", background: "#fff" });
    expect(result.passes).toBeUndefined();
    expect(result.label).toBe("não medido");
  });
});

describe("assertContrastPairs", () => {
  it("passa quando todos os pares atingem o alvo", () => {
    expect(() =>
      assertContrastPairs([{ name: "ok", foreground: "#2b235b", background: "#ffffff" }]),
    ).not.toThrow();
  });

  it("falha nomeando o par e a razão medida", () => {
    expect(() =>
      assertContrastPairs([{ name: "fg-3 sobre branco", foreground: "#cccccc", background: "#ffffff" }]),
    ).toThrow(/fg-3 sobre branco/);
  });

  it("falha também quando o par não pôde ser medido", () => {
    expect(() =>
      assertContrastPairs([{ name: "opaco?", foreground: "#000", background: "var(--bg)" }]),
    ).toThrow(/não medido/);
  });
});
