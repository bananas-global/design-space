import { describe, expect, it } from "vitest";

import {
  applyHandoffScope,
  handoffAllowsComponent,
  handoffAllowsPath,
  handoffAllowsScenario,
  parseHandoffScope,
} from "./index.js";
import type { Scenario } from "../types/index.js";

const scenario: Scenario = {
  id: "requests.review",
  title: "Revisar solicitação",
  route: "/requests/REQ-20",
  persona: "reviewer",
  fixture: "request",
  a11y: { keyboard: "full", contrast: "AA" },
  status: "in-review",
};

describe("escopo de handoff", () => {
  it("faz round-trip determinístico das três allowlists", () => {
    const params = new URLSearchParams();
    applyHandoffScope(params, {
      scenarios: ["requests.review", "requests.review"],
      routes: ["/help/:topic"],
      components: ["feedback.notice"],
    });

    expect(params.toString()).toBe(
      "handoff=1&allowScenario=requests.review&allowRoute=%2Fhelp%2F%3Atopic&allowComponent=feedback.notice",
    );
    expect(parseHandoffScope(params)).toEqual({
      scenarios: ["requests.review"],
      routes: ["/help/:topic"],
      components: ["feedback.notice"],
    });
  });

  it("preserva um handoff vazio como recorte que não autoriza itens", () => {
    const params = new URLSearchParams("handoff=1");
    const scope = parseHandoffScope(params);

    expect(scope).toEqual({});
    expect(handoffAllowsScenario(scope, scenario.id)).toBe(false);
    expect(handoffAllowsComponent(scope, "feedback.notice")).toBe(false);
  });

  it("autoriza a rota do cenário e padrões de rota explícitos, além da Home filtrada", () => {
    const scope = { scenarios: [scenario.id], routes: ["/help/:topic"] };

    expect(handoffAllowsPath(scope, scenario.route, [scenario])).toBe(true);
    expect(handoffAllowsPath(scope, "/help/accessibility", [scenario])).toBe(true);
    expect(handoffAllowsPath(scope, "/billing", [scenario])).toBe(false);
    expect(handoffAllowsPath(scope, "/", [scenario])).toBe(true);
  });
});
