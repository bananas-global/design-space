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
});

describe("catálogo e fixtures de componente", () => {
  const registry = createRegistry(productDefinition);

  it("exibe todo cenário registrado", () => {
    expect(registry.activeScenarios()).toHaveLength(productDefinition.scenarios.length);
  });

  it("organiza as situações em duas telas, cada uma com suas variações", () => {
    expect(registry.screens.map((screen) => [screen.name, screen.variations.length])).toEqual([
      ["Fila de solicitações", 2],
      ["Detalhe da solicitação", 3],
    ]);
  });

  it("agrupa as duas telas no fluxo Solicitações", () => {
    expect(registry.flows().map((flow) => [flow.name, flow.screens.map((screen) => screen.name)])).toEqual([
      ["Solicitações", ["Fila de solicitações", "Detalhe da solicitação"]],
    ]);
  });

  it("a fila combina controles por componente, e a fila vazia é um atalho", () => {
    const queue = registry.screen("/requests")!;
    expect(registry.resolveControls(queue).values).toEqual({ rows: "all", status: "all", notice: "none" });
    expect(
      registry.resolveControls(queue, { scenario: registry.scenario("requests.queue-empty") }).values.rows,
    ).toBe("none");
    const controls = parseControls("?c.status=approved&c.notice=overdue", registry, "/requests");
    expect(serializeControls(controls, registry, "/requests")).toBe("?c.status=approved&c.notice=overdue");
  });

  it("o detalhe aberto sem cenário vai para o exemplo de `params`, não para `:id`", () => {
    expect(registry.screen("/requests/:id")?.href).toBe("/requests/REQ-2042");
  });

  it("tela sem cenário vê como a persona padrão, e a URL não repete o padrão", () => {
    const controls = parseControls("?c.status=approved", registry, "/requests");
    expect(controls.persona).toBe("approver");
    expect(serializeControls(controls, registry, "/requests")).toBe("?c.status=approved");
  });

  it("todo cenário declara os componentes que usa, e todo componente tem origem", () => {
    for (const scenario of productDefinition.scenarios) {
      expect(scenario.components?.length, scenario.id).toBeGreaterThan(0);
    }
    for (const component of productDefinition.components ?? []) {
      expect(component.source, component.id).toBeTruthy();
    }
    expect(registry.usagesOf("actions.buttons").map((screen) => screen.id)).toEqual([
      "/requests/:id",
    ]);
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
