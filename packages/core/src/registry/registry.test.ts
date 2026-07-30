import { describe, expect, it } from "vitest";
import { createRegistry } from "./index.js";
import { hasErrors, validateProduct, validateScenario } from "./validate.js";
import type { ProductDefinition, RouteDefinition, Scenario } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "finance.insurance-denied",
    title: "Convênio recusado",
    route: "/finance/claims/CLM-1042",
    persona: "financial-analyst",
    fixture: "claim-denied",
    rules: ["retry-after-document-review"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["claim.status"] },
    status: "in-review",
    expected: ["A recusa é anunciada para leitor de tela."],
    ...overrides,
  };
}

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "acme",
    name: "Acme",
    modules: [{ id: "finance", name: "Financeiro" }],
    scenarios: [scenario()],
    personas: [{ id: "financial-analyst", name: "Analista", permissions: ["claims.read"] }],
    fixtures: [{ id: "claim-denied", label: "Guia recusada", data: { id: "CLM-1042" } }],
    rules: [{ id: "retry-after-document-review", statement: "Reenvio exige revisão de documento." }],
    routes: [{ path: "/finance/claims/:id", screen }],
    ...overrides,
  };
}

describe("validateScenario", () => {
  it("aceita um cenário completo", () => {
    expect(validateScenario(scenario()).filter((i) => i.level === "error")).toEqual([]);
  });

  it("exige o contrato de acessibilidade", () => {
    const issues = validateScenario({ ...scenario(), a11y: undefined as never });
    expect(issues.some((i) => i.level === "error" && i.message.includes("`a11y`"))).toBe(true);
  });

  it("recusa id fora do padrão", () => {
    const issues = validateScenario(scenario({ id: "Finance.InsuranceDenied" }));
    expect(hasErrors(issues)).toBe(true);
  });

  it("avisa quando um cenário aprovado não registra a URL de commit", () => {
    const issues = validateScenario(scenario({ status: "approved" }));
    expect(issues.some((i) => i.level === "warning" && i.message.includes("approvedAt"))).toBe(true);
  });

  it("avisa quando falta critério de aceite", () => {
    const issues = validateScenario(scenario({ expected: undefined }));
    expect(issues.some((i) => i.message.includes("expected"))).toBe(true);
  });
});

describe("validateProduct", () => {
  it("aponta referência quebrada de fixture, persona e regra", () => {
    const issues = validateProduct(
      product({
        scenarios: [scenario({ persona: "ninguem", fixture: "nada", rules: ["inexistente"] })],
      }),
    );
    const messages = issues.filter((i) => i.level === "error").map((i) => i.message);
    expect(messages.some((m) => m.includes("Persona não registrada"))).toBe(true);
    expect(messages.some((m) => m.includes("Fixture não registrada"))).toBe(true);
    expect(messages.some((m) => m.includes("Regra não registrada"))).toBe(true);
  });

  it("aponta rota que nenhuma rota declarada atende", () => {
    const issues = validateProduct(product({ scenarios: [scenario({ route: "/nao/existe" })] }));
    expect(issues.some((i) => i.level === "error" && i.message.includes("não casa"))).toBe(true);
  });

  it("aponta id duplicado", () => {
    const issues = validateProduct(product({ scenarios: [scenario(), scenario()] }));
    expect(issues.some((i) => i.message.includes("duplicado"))).toBe(true);
  });

  it("aponta passo de jornada que não existe", () => {
    const issues = validateProduct(
      product({
        modules: [
          {
            id: "finance",
            name: "Financeiro",
            flows: [{ id: "claim", title: "Reenviar guia", steps: [{ scenario: "finance.fantasma" }] }],
          },
        ],
      }),
    );
    expect(issues.some((i) => i.message.includes("cenário inexistente"))).toBe(true);
  });

  it("avisa quando a fonte padrão deixa de ser fixture", () => {
    const issues = validateProduct(
      product({
        dataSources: {
          default: "staging",
          adapters: [{ id: "staging", label: "Staging", load: () => ({}) }],
        },
      }),
    );
    expect(issues.some((i) => i.level === "warning" && i.message.includes("D-05"))).toBe(true);
  });
});

describe("createRegistry", () => {
  const registry = createRegistry(product());

  it("agrupa cenários pelo prefixo do módulo", () => {
    expect(registry.tree[0]?.module.id).toBe("finance");
    expect(registry.tree[0]?.scenarios).toHaveLength(1);
    expect(registry.orphans).toEqual([]);
  });

  it("herda as permissões da persona quando o cenário não declara", () => {
    expect(registry.permissionsOf(registry.scenario("finance.insurance-denied"))).toEqual([
      "claims.read",
    ]);
  });

  it("respeita as permissões do cenário quando declaradas", () => {
    const custom = createRegistry(
      product({ scenarios: [scenario({ permissions: ["claims.read", "claims.retry"] })] }),
    );
    expect(custom.permissionsOf(custom.scenario("finance.insurance-denied"))).toEqual([
      "claims.read",
      "claims.retry",
    ]);
  });

  it("busca pelo vocabulário do negócio, ignorando acento", () => {
    expect(registry.search("convenio").map((s) => s.id)).toEqual(["finance.insurance-denied"]);
    expect(registry.search("Financeiro")).toHaveLength(1);
    expect(registry.search("nada disso")).toEqual([]);
  });

  it("conta cobertura por status", () => {
    expect(registry.coverage()["in-review"]).toBe(1);
    expect(registry.coverage().approved).toBe(0);
  });
});
