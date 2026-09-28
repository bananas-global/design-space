import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_LABELS, EN_US_LABELS, resolveLabels } from "./labels.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("resolveLabels", () => {
  it("sem override, devolve o padrão", () => {
    expect(resolveLabels()).toBe(DEFAULT_LABELS);
  });

  it("mescla por grupo, mantendo o resto no padrão", () => {
    const labels = resolveLabels({
      network: { success: "Success" },
      topbar: { copyLink: "Copy link" },
    });

    expect(labels.network.success).toBe("Success");
    // O que não foi declarado continua padrão, inclusive no mesmo grupo.
    expect(labels.network.error).toBe(DEFAULT_LABELS.network.error);
    expect(labels.topbar.copyLink).toBe("Copy link");
    expect(labels.panel.persona).toBe(DEFAULT_LABELS.panel.persona);
  });

  it("não muta o padrão", () => {
    resolveLabels({ network: { success: "Success" } });
    expect(DEFAULT_LABELS.network.success).toBe("Sucesso");
  });

  it("aceita override de rótulo interpolado", () => {
    const labels = resolveLabels({
      topbar: { zoomValue: (percent) => `${percent} pct` },
    });

    expect(labels.topbar.zoomValue(50)).toBe("50 pct");
  });

  it("não carrega mais rótulos de status, acessibilidade ou referências portadas", () => {
    expect(Object.keys(DEFAULT_LABELS)).not.toContain("status");
    expect(Object.keys(DEFAULT_LABELS)).not.toContain("statusMeaning");
    expect(Object.keys(DEFAULT_LABELS)).not.toContain("keyboard");
    expect(JSON.stringify(Object.keys(DEFAULT_LABELS.sidebar))).not.toMatch(/ported|Ported/);
  });

  it("não carrega mais rótulos de módulo, jornada ou Home", () => {
    expect(Object.keys(DEFAULT_LABELS)).not.toContain("home");
    expect(Object.keys(DEFAULT_LABELS)).not.toContain("inspector");
    expect(JSON.stringify(Object.keys(DEFAULT_LABELS.sidebar))).not.toMatch(/flow|module/i);
  });

  it("en-US tem exatamente as mesmas chaves do padrão", () => {
    for (const group of Object.keys(DEFAULT_LABELS) as (keyof typeof DEFAULT_LABELS)[]) {
      expect(Object.keys(EN_US_LABELS[group]).sort(), group).toEqual(
        Object.keys(DEFAULT_LABELS[group]).sort(),
      );
    }
  });

  it("oferece um dicionário en-US completo", () => {
    expect(EN_US_LABELS.topbar.lightMode).toBe("Light theme");
    expect(EN_US_LABELS.sidebar.componentsTab).toBe("Components");
    expect(EN_US_LABELS.diagnostics.noIssues).toBe("No issues found.");
    expect(EN_US_LABELS.info.copyForPr).toBe("Copy for PR");
    expect(resolveLabels(EN_US_LABELS)).toEqual(EN_US_LABELS);
  });
});

/**
 * Trava do idioma do chrome.
 *
 * O chrome divide a tela com a UI do cliente, então texto fixo em português
 * dentro de um componente é intraduzível pelo produto — e o sintoma é uma
 * revisão em inglês com metade dos rótulos em português. Um literal novo tem que
 * nascer em `labels.ts`, não no JSX.
 */
describe("fronteira de idioma", () => {
  it("nenhum componente do chrome tem texto visível fixo", () => {
    const suspeito = [
      // Acento é o sinal mais barato de texto em português esquecido no JSX.
      /[À-ÿ]/,
      // Rótulo acessível e dica precisam ser traduzíveis como qualquer outro.
      /(?:aria-label|title|placeholder)="[^"]+"/,
      // Nó de texto no JSX: `>Painel<` não tem acento e continua sendo rótulo.
      />[A-Za-z][A-Za-z ]{2,}</,
    ];

    const offenders = readdirSync(here)
      .filter((file) => file.endsWith(".tsx"))
      .flatMap((file) => {
        const content = readFileSync(join(here, file), "utf8")
          // Comentário pode e deve explicar em português.
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

        return content
          .split("\n")
          .map((line, index) => ({ line, at: `${file}:${index + 1}` }))
          .filter(({ line }) => suspeito.some((pattern) => pattern.test(line)))
          .map(({ at, line }) => `${at} ${line.trim()}`);
      });

    expect(
      offenders,
      "Texto em português dentro de componente do chrome. Mova para `labels.ts`.",
    ).toEqual([]);
  });
});
