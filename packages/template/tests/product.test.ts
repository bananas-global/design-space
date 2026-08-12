import { describe, expect, it } from "vitest";
import { assertValidProduct, validateProduct } from "@brucesantos/design-space/testing";
import { productDefinition } from "../src/app/product.js";
import { createRegistry, parseControls, serializeControls } from "@brucesantos/design-space";
import { canApprove, HIGH_VALUE_THRESHOLD_CENTS } from "../src/rules/requests.js";
import type { PurchaseRequest } from "../src/contracts/index.js";

/**
 * Estes testes são o piso de qualidade do repositório: rodam em milissegundos,
 * não precisam de navegador e pegam a classe de erro que mais custa tempo —
 * cenário apontando para fixture, persona, regra ou rota que não existe.
 */
describe("contrato de cenário", () => {
  it("não tem erro de referência nem de forma", () => {
    expect(() => assertValidProduct(productDefinition)).not.toThrow();
  });

  it("não acumula aviso silencioso", () => {
    const warnings = validateProduct(productDefinition).filter((i) => i.level === "warning");
    // Aviso não quebra o build, mas um repositório que convive com dez avisos
    // deixa de ler o décimo primeiro. Se este teste falhar, resolva ou registre
    // a exceção — não aumente o número.
    expect(warnings.map((w) => `${w.where}: ${w.message}`)).toEqual([]);
  });

  it("cobre sucesso, vazio, regra e permissão", () => {
    const tags = new Set(productDefinition.scenarios.flatMap((s) => s.tags ?? []));
    for (const required of ["sucesso", "vazio", "regra", "permissão"]) {
      expect(tags.has(required), `falta cenário com a etiqueta "${required}"`).toBe(true);
    }
  });

  it("declara acessibilidade em todo cenário", () => {
    for (const scenario of productDefinition.scenarios) {
      expect(scenario.a11y.contrast, scenario.id).toBeDefined();
      expect(scenario.a11y.keyboard, scenario.id).toBeDefined();
    }
  });
});

describe("referências portadas e fixtures de componente", () => {
  const registry = createRegistry(productDefinition);

  it("mantém portados fora do trabalho ativo por padrão", () => {
    expect(productDefinition.scenarios.some((scenario) => scenario.status === "ported")).toBe(true);
    expect(registry.activeScenarios().some((scenario) => scenario.status === "ported")).toBe(false);
    expect(registry.activeScenarios({ includePorted: true }).some((scenario) => scenario.status === "ported"))
      .toBe(true);
  });

  it("cobre componente legado sem fixture e componente com múltiplas fixtures", () => {
    expect(registry.component("feedback.status")?.fixtures).toBeUndefined();
    expect(registry.component("actions.buttons")?.fixtures?.length).toBeGreaterThan(1);
    expect(registry.component("actions.buttons")?.defaultFixture).toBe("default");
  });

  it("restaura component + fixture pelo deep link", () => {
    const controls = parseControls("?component=actions.buttons&fixture=error", registry);
    expect(controls.component).toBe("actions.buttons");
    expect(controls.fixture).toBe("error");
    expect(serializeControls(controls, registry)).toBe(
      "?component=actions.buttons&fixture=error",
    );
  });
});

describe("regra approval-requires-attachment", () => {
  const base: PurchaseRequest = {
    id: "REQ-1",
    title: "Compra",
    status: "in-review",
    amountCents: 100_000,
    requester: { id: "u", name: "Ana", department: "Ops" },
    createdAt: "2026-03-12T14:00:00.000Z",
    attachments: [],
  };
  const approver = ["requests.read", "requests.approve"];

  it("permite abaixo do limite sem documento", () => {
    expect(canApprove(base, approver).allowed).toBe(true);
  });

  it("bloqueia acima do limite sem documento, explicando o motivo", () => {
    const result = canApprove({ ...base, amountCents: HIGH_VALUE_THRESHOLD_CENTS + 1 }, approver);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/anexar documento/);
  });

  it("permite acima do limite com documento", () => {
    const result = canApprove(
      {
        ...base,
        amountCents: HIGH_VALUE_THRESHOLD_CENTS + 1,
        attachments: [{ id: "a", name: "orcamento.pdf" }],
      },
      approver,
    );
    expect(result.allowed).toBe(true);
  });

  it("bloqueia por permissão antes de olhar a regra de valor", () => {
    const result = canApprove(base, ["requests.read"]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/não aprova/);
  });

  it("não aprova o que não está em análise", () => {
    expect(canApprove({ ...base, status: "approved" }, approver).allowed).toBe(false);
  });
});
