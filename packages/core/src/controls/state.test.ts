import { describe, expect, it } from "vitest";
import { parseControls, serializeControls } from "./state.js";
import { createRegistry } from "../registry/index.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

const registry = createRegistry({
  id: "acme",
  name: "Acme",
  modules: [{ id: "finance", name: "Financeiro" }],
  scenarios: [
    {
      id: "finance.insurance-denied",
      title: "Convênio recusado",
      route: "/finance/claims/CLM-1042",
      persona: "analyst",
      fixture: "claim-denied",
      a11y: { keyboard: "full", contrast: "AA" },
      status: "approved",
      network: "error",
    },
  ],
  personas: [
    { id: "analyst", name: "Analista", permissions: [] },
    { id: "receptionist", name: "Recepcionista", permissions: [] },
  ],
  fixtures: [
    { id: "claim-denied", label: "Recusada", data: {} },
    { id: "claim-approved", label: "Aprovada", data: {} },
  ],
  routes: [{ path: "/finance/claims/:id", screen }],
} satisfies ProductDefinition);

describe("parseControls", () => {
  it("herda persona, fixture e rede do cenário quando só o id vem na URL", () => {
    const controls = parseControls("?scenario=finance.insurance-denied", registry);
    expect(controls.persona).toBe("analyst");
    expect(controls.fixture).toBe("claim-denied");
    expect(controls.network).toBe("error");
  });

  it("deixa o parâmetro explícito ganhar do cenário", () => {
    const controls = parseControls(
      "?scenario=finance.insurance-denied&persona=receptionist&network=empty",
      registry,
    );
    expect(controls.persona).toBe("receptionist");
    expect(controls.network).toBe("empty");
  });

  it("ignora cenário inexistente em vez de quebrar", () => {
    const controls = parseControls("?scenario=nao.existe", registry);
    expect(controls.scenario).toBeUndefined();
    expect(controls.network).toBe("success");
  });

  it("ignora valor inválido de rede e de escala", () => {
    const controls = parseControls("?network=explodiu&scale=7", registry);
    expect(controls.network).toBe("success");
    expect(controls.textScale).toBe(1);
  });

  it("mantém o chrome visível a não ser que a URL peça o contrário", () => {
    expect(parseControls("", registry).chrome).toBe(true);
    expect(parseControls("?chrome=0", registry).chrome).toBe(false);
  });
});

describe("serializeControls", () => {
  it("omite o que já é o padrão do cenário, mantendo a URL curta", () => {
    const controls = parseControls("?scenario=finance.insurance-denied", registry);
    expect(serializeControls(controls, registry)).toBe("?scenario=finance.insurance-denied");
  });

  it("carrega o que divergir do cenário", () => {
    const controls = parseControls(
      "?scenario=finance.insurance-denied&persona=receptionist",
      registry,
    );
    const search = serializeControls(controls, registry);
    expect(search).toContain("persona=receptionist");
    expect(search).not.toContain("fixture=");
  });

  it("faz round-trip de todos os controles de ambiente", () => {
    const original = parseControls(
      "?scenario=finance.insurance-denied&viewport=custom&w=800&chrome=0&kb=1&motion=1&scale=1.5&panel=0",
      registry,
    );
    const roundTripped = parseControls(serializeControls(original, registry), registry);
    expect(roundTripped).toEqual(original);
  });
});
