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
      status: { approved: "Approved" },
      topbar: { copyLink: "Copy link" },
    });

    expect(labels.status.approved).toBe("Approved");
    // O que não foi declarado continua padrão, inclusive no mesmo grupo.
    expect(labels.status["in-review"]).toBe(DEFAULT_LABELS.status["in-review"]);
    expect(labels.topbar.copyLink).toBe("Copy link");
    expect(labels.controls.persona).toBe(DEFAULT_LABELS.controls.persona);
  });

  it("não muta o padrão", () => {
    resolveLabels({ status: { approved: "Approved" } });
    expect(DEFAULT_LABELS.status.approved).toBe("Aprovado");
  });

  it("aceita override de rótulo interpolado", () => {
    const labels = resolveLabels({
      home: { lead: (total) => `${total} scenarios` },
    });

    expect(labels.home.lead(3)).toBe("3 scenarios");
  });

  it("explica que cenário portado ainda não foi validado nem assumido como compromisso", () => {
    expect(DEFAULT_LABELS.status.ported).toBe("Portado — não validado");
    expect(DEFAULT_LABELS.statusMeaning.ported).toContain("não representa compromisso de implementação");
  });

  it("oferece um dicionário en-US completo", () => {
    expect(EN_US_LABELS.status.ported).toBe("Ported — not validated");
    expect(EN_US_LABELS.topbar.lightMode).toBe("Light mode");
    expect(EN_US_LABELS.sidebar.componentsTab).toBe("Components");
    expect(EN_US_LABELS.inspector.noIssues).toBe("No issues found.");
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
