import { describe, expect, it } from "vitest";
import { createRegistry } from "./index.js";
import { hasErrors, validateProduct, validateScenario } from "./validate.js";
import {
  SCENARIO_STATUSES,
  type ProductDefinition,
  type RouteDefinition,
  type Scenario,
} from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "requests.approve-blocked",
    title: "Aprovação bloqueada por falta de documento",
    route: "/requests/REQ-2043",
    persona: "approver",
    fixture: "request-blocked",
    rules: ["retry-after-document-review"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["request.status"] },
    status: "in-review",
    expected: ["O bloqueio é anunciado para leitor de tela."],
    ...overrides,
  };
}

function product(overrides: Partial<ProductDefinition> = {}): ProductDefinition {
  return {
    id: "acme",
    name: "Acme",
    modules: [{ id: "requests", name: "Solicitações" }],
    scenarios: [scenario()],
    personas: [{ id: "approver", name: "Analista", permissions: ["requests.read"] }],
    fixtures: [{ id: "request-blocked", label: "Solicitação sem documento", data: { id: "REQ-2043" } }],
    rules: [{ id: "retry-after-document-review", statement: "Aprovação exige documento anexado." }],
    routes: [{ path: "/requests/:id", screen }],
    ...overrides,
  };
}

describe("validateScenario", () => {
  it("aceita um cenário completo", () => {
    expect(validateScenario(scenario()).filter((i) => i.level === "error")).toEqual([]);
  });

  it("aceita cenário portado sem tratá-lo como proposta ou compromisso", () => {
    expect(validateScenario(scenario({ status: "ported" })).filter((i) => i.level === "error"))
      .toEqual([]);
  });

  it("exige o contrato de acessibilidade", () => {
    const issues = validateScenario({ ...scenario(), a11y: undefined as never });
    expect(issues.some((i) => i.level === "error" && i.message.includes("`a11y`"))).toBe(true);
  });

  it("recusa id fora do padrão", () => {
    const issues = validateScenario(scenario({ id: "Requests.ApproveBlocked" }));
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
            id: "requests",
            name: "Solicitações",
            flows: [{ id: "decide", title: "Decidir uma solicitação", steps: [{ scenario: "requests.fantasma" }] }],
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

  it("valida e indexa o catálogo opcional de componentes", () => {
    const preview = () => null;
    const definition = product({
      components: [{ id: "actions.button", name: "Botão", group: "Ações", preview }],
    });
    expect(validateProduct(definition).filter((issue) => issue.level === "error")).toEqual([]);
    expect(createRegistry(definition).component("actions.button")?.preview).toBe(preview);
  });
});

describe("createRegistry", () => {
  const registry = createRegistry(product());

  it("agrupa cenários pelo prefixo do módulo", () => {
    expect(registry.tree[0]?.module.id).toBe("requests");
    expect(registry.tree[0]?.scenarios).toHaveLength(1);
    expect(registry.orphans).toEqual([]);
  });

  it("herda as permissões da persona quando o cenário não declara", () => {
    expect(registry.permissionsOf(registry.scenario("requests.approve-blocked"))).toEqual([
      "requests.read",
    ]);
  });

  it("respeita as permissões do cenário quando declaradas", () => {
    const custom = createRegistry(
      product({ scenarios: [scenario({ permissions: ["requests.read", "requests.approve"] })] }),
    );
    expect(custom.permissionsOf(custom.scenario("requests.approve-blocked"))).toEqual([
      "requests.read",
      "requests.approve",
    ]);
  });

  it("busca pelo vocabulário do negócio, ignorando acento", () => {
    expect(registry.search("aprovacao").map((s) => s.id)).toEqual(["requests.approve-blocked"]);
    expect(registry.search("Solicitações")).toHaveLength(1);
    expect(registry.search("nada disso")).toEqual([]);
  });

  it("conta cobertura por status", () => {
    expect(registry.coverage()["in-review"]).toBe(1);
    expect(registry.coverage().approved).toBe(0);
  });

  it("conta cenários portados separadamente dos seis estados existentes", () => {
    const custom = createRegistry(
      product({ scenarios: [scenario({ status: "ported" }), scenario({ id: "requests.review" })] }),
    );

    expect(custom.coverage()).toEqual({
      ported: 1,
      proposed: 0,
      "in-review": 1,
      approved: 0,
      "in-implementation": 0,
      implemented: 0,
      superseded: 0,
    });
    expect(custom.byStatus("ported")).toHaveLength(1);
    expect(SCENARIO_STATUSES).toEqual([
      "ported",
      "proposed",
      "in-review",
      "approved",
      "in-implementation",
      "implemented",
      "superseded",
    ]);
  });
});
