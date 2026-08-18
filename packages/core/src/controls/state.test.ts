import { describe, expect, it } from "vitest";
import { parseControls, serializeControls } from "./state.js";
import { createRegistry } from "../registry/index.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const preview = () => null;

const registry = createRegistry({
  id: "acme",
  name: "Acme",
  modules: [{ id: "requests", name: "Solicitações" }],
  scenarios: [
    {
      id: "requests.approve-blocked",
      title: "Aprovação bloqueada por falta de documento",
      route: "/requests/REQ-2043",
      persona: "analyst",
      fixture: "request-blocked",
      a11y: { keyboard: "full", contrast: "AA" },
      status: "approved",
      network: "error",
    },
  ],
  personas: [
    { id: "analyst", name: "Analista", permissions: [] },
    { id: "requester", name: "Solicitante", permissions: [] },
  ],
  fixtures: [
    { id: "request-blocked", label: "Recusada", data: {} },
    { id: "request-approved", label: "Aprovada", data: {} },
  ],
  routes: [{ path: "/requests/:id", screen }],
  components: [{ id: "actions.button", name: "Botão", group: "Ações", preview }],
} satisfies ProductDefinition);

describe("parseControls", () => {
  it("herda persona, fixture e rede do cenário quando só o id vem na URL", () => {
    const controls = parseControls("?scenario=requests.approve-blocked", registry);
    expect(controls.persona).toBe("analyst");
    expect(controls.fixture).toBe("request-blocked");
    expect(controls.network).toBe("error");
  });

  it("deixa o parâmetro explícito ganhar do cenário", () => {
    const controls = parseControls(
      "?scenario=requests.approve-blocked&persona=requester&network=empty",
      registry,
    );
    expect(controls.persona).toBe("requester");
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

  it("usa dark por padrão e persiste light na URL", () => {
    expect(parseControls("", registry).chromeTheme).toBe("dark");
    const light = parseControls("?appearance=light", registry);
    expect(light.chromeTheme).toBe("light");
    expect(serializeControls(light, registry)).toBe("?appearance=light");
    expect(parseControls("?appearance=desconhecido", registry).chromeTheme).toBe("dark");
  });

  it("abre componente por deep link sem manter cenário ativo", () => {
    const controls = parseControls(
      "?scenario=requests.approve-blocked&component=actions.button",
      registry,
    );
    expect(controls.component).toBe("actions.button");
    expect(controls.scenario).toBeUndefined();
    expect(serializeControls(controls, registry)).toBe("?component=actions.button");
  });
});

describe("serializeControls", () => {
  it("omite o que já é o padrão do cenário, mantendo a URL curta", () => {
    const controls = parseControls("?scenario=requests.approve-blocked", registry);
    expect(serializeControls(controls, registry)).toBe("?scenario=requests.approve-blocked");
  });

  it("carrega o que divergir do cenário", () => {
    const controls = parseControls(
      "?scenario=requests.approve-blocked&persona=requester",
      registry,
    );
    const search = serializeControls(controls, registry);
    expect(search).toContain("persona=requester");
    expect(search).not.toContain("fixture=");
  });

  it("faz round-trip de todos os controles de ambiente", () => {
    const original = parseControls(
      "?scenario=requests.approve-blocked&viewport=custom&w=800&chrome=0&kb=1&motion=1&scale=1.5&panel=0",
      registry,
    );
    const roundTripped = parseControls(serializeControls(original, registry), registry);
    expect(roundTripped).toEqual(original);
  });
});
