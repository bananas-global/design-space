import { describe, expect, it } from "vitest";

import type { ProductDefinition, RouteDefinition, Scenario } from "../types/index.js";
import { scenariosUnderTest } from "./index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];

function scenario(id: string, status: Scenario["status"]): Scenario {
  return {
    id: `requests.${id}`,
    title: id,
    route: `/requests/${id}`,
    persona: "reviewer",
    fixture: id,
    a11y: { keyboard: "full", contrast: "AA" },
    status,
  };
}

describe("scenariosUnderTest", () => {
  it("não transforma cenário apenas portado em compromisso de jornada automatizada", () => {
    const ported = scenario("ported", "ported");
    const approved = scenario("approved", "approved");
    const product = {
      id: "example",
      name: "Example",
      modules: [{ id: "requests", name: "Solicitações" }],
      scenarios: [ported, approved],
      personas: [{ id: "reviewer", name: "Pessoa revisora", permissions: [] }],
      fixtures: [
        { id: "ported", label: "Portado", data: {} },
        { id: "approved", label: "Aprovado", data: {} },
      ],
      routes: [{ path: "/requests/:id", screen }],
    } satisfies ProductDefinition;

    expect(scenariosUnderTest(product)).toEqual([approved]);
    expect(scenariosUnderTest(product, ["ported"])).toEqual([ported]);
  });
});
