import { describe, expect, it } from "vitest";
import { parseControls, resolveViewport, serializeControls } from "./state.js";
import { createRegistry } from "../registry/index.js";
import type { ProductDefinition, RouteDefinition } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const preview = () => null;

const registry = createRegistry({
  id: "acme",
  name: "Acme",
  scenarios: [
    {
      id: "requests.approve-blocked",
      title: "Aprovação bloqueada por falta de documento",
      route: "/requests/REQ-2043",
      persona: "analyst",
      fixture: "request-blocked",
      network: "error",
    },
    {
      id: "requests.imported",
      title: "Referência sem persona",
      route: "/requests/imported",
      fixture: "request-approved",
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
  components: [
    { id: "feedback.notice", name: "Aviso", preview },
    {
      id: "actions.button",
      name: "Botão",
      group: "Ações",
      preview,
      fixtures: [
        { id: "default", label: "Padrão", data: { label: "Continuar" } },
        { id: "disabled", label: "Desabilitado", data: { disabled: true } },
      ],
      defaultFixture: "disabled",
    },
  ],
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

  it("ignora valor inválido de rede", () => {
    const controls = parseControls("?network=explodiu", registry);
    expect(controls.network).toBe("success");
  });

  it("mantém o chrome visível a não ser que a URL peça o contrário", () => {
    expect(parseControls("", registry).chrome).toBe(true);
    expect(parseControls("?chrome=0", registry).chrome).toBe(false);
  });

  it("deixa o tema do chrome em aberto sem parâmetro e persiste os dois temas", () => {
    expect(parseControls("", registry).chromeTheme).toBeUndefined();
    const light = parseControls("?appearance=light", registry);
    expect(light.chromeTheme).toBe("light");
    expect(serializeControls(light, registry)).toBe("?appearance=light");
    const dark = parseControls("?appearance=dark", registry);
    expect(serializeControls(dark, registry)).toBe("?appearance=dark");
    expect(parseControls("?appearance=desconhecido", registry).chromeTheme).toBeUndefined();
  });

  it("lê zoom dentro da faixa, girar e aba do painel", () => {
    expect(parseControls("", registry)).toMatchObject({
      zoom: 100,
      rotated: false,
      panelTab: "variations",
    });
    expect(parseControls("?zoom=50&rotate=1&tab=info", registry)).toMatchObject({
      zoom: 50,
      rotated: true,
      panelTab: "info",
    });
    expect(parseControls("?zoom=5", registry).zoom).toBe(25);
    expect(parseControls("?zoom=900", registry).zoom).toBe(150);
    expect(parseControls("?zoom=abc", registry).zoom).toBe(100);
    expect(parseControls("?tab=outra", registry).panelTab).toBe("variations");
  });

  it("abre componente por deep link sem manter cenário ativo", () => {
    const controls = parseControls(
      "?scenario=requests.approve-blocked&component=actions.button",
      registry,
    );
    expect(controls.component).toBe("actions.button");
    expect(controls.scenario).toBeUndefined();
    expect(serializeControls(controls, registry)).toBe(
      "?component=actions.button&fixture=disabled",
    );
  });

  it("resolve a fixture padrão do componente e a mantém no deep link", () => {
    const controls = parseControls("?component=actions.button", registry);
    expect(controls.fixture).toBe("disabled");
    expect(serializeControls(controls, registry)).toBe(
      "?component=actions.button&fixture=disabled",
    );
  });

  it("restaura fixture de componente e preserva id inexistente para fallback explícito", () => {
    const selected = parseControls("?component=actions.button&fixture=default", registry);
    expect(selected.fixture).toBe("default");
    expect(serializeControls(selected, registry)).toBe(
      "?component=actions.button&fixture=default",
    );

    const missing = parseControls("?component=actions.button&fixture=missing", registry);
    expect(missing.fixture).toBe("missing");
    expect(serializeControls(missing, registry)).toBe(
      "?component=actions.button&fixture=missing",
    );
  });

  it("mantém componente sem fixture compatível", () => {
    const controls = parseControls("?component=feedback.notice", registry);
    expect(controls.fixture).toBeUndefined();
    expect(serializeControls(controls, registry)).toBe("?component=feedback.notice");
  });

  it("abre cenário sem persona com persona indefinida e sem serializá-la", () => {
    const controls = parseControls("?scenario=requests.imported", registry);
    expect(controls.scenario).toBe("requests.imported");
    expect(controls.persona).toBeUndefined();
    expect(serializeControls(controls, registry)).toBe("?scenario=requests.imported");
  });

  it("ignora parâmetros removidos na 0.7 e na 0.8", () => {
    const controls = parseControls(
      "?view=ported&showPorted=1&kb=1&motion=1&scale=2&module=requests&flow=decide&step=2",
      registry,
    );
    expect(serializeControls(controls, registry)).toBe("");
  });
});

describe("serializeControls", () => {
  it("restaura e preserva o escopo explícito de handoff", () => {
    const search =
      "?handoff=1&allowScenario=requests.approve-blocked&allowRoute=%2Fhelp%2F%3Atopic&allowComponent=actions.button";
    const controls = parseControls(search, registry);

    expect(controls.handoff).toEqual({
      scenarios: ["requests.approve-blocked"],
      routes: ["/help/:topic"],
      components: ["actions.button"],
    });
    expect(parseControls(serializeControls(controls, registry), registry)).toEqual(controls);
  });

  it("não ativa cenário ou componente fora da allowlist", () => {
    const scenario = parseControls(
      "?scenario=requests.approve-blocked&handoff=1&allowScenario=requests.imported",
      registry,
    );
    const component = parseControls(
      "?component=actions.button&handoff=1&allowComponent=feedback.notice",
      registry,
    );

    expect(scenario.scenario).toBeUndefined();
    expect(component.component).toBeUndefined();
  });

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
      "?scenario=requests.approve-blocked&viewport=custom&w=800&chrome=0&panel=0",
      registry,
    );
    const roundTripped = parseControls(serializeControls(original, registry), registry);
    expect(roundTripped).toEqual(original);
  });

  it("faz round-trip de viewport, girar, zoom, aba, tema e painel", () => {
    const search =
      "?scenario=requests.approve-blocked&viewport=mobile&appearance=dark&panel=0&tab=info&zoom=75&rotate=1";
    const controls = parseControls(search, registry);
    expect(serializeControls(controls, registry)).toBe(search);
    expect(parseControls(serializeControls(controls, registry), registry)).toEqual(controls);
  });

  it("omite zoom 100, aba padrão e viewport sem giro", () => {
    const controls = parseControls("?zoom=100&tab=variations&rotate=0", registry);
    expect(serializeControls(controls, registry)).toBe("");
  });
});

describe("resolveViewport", () => {
  it("usa os presets de janela real e troca largura e altura ao girar", () => {
    expect(resolveViewport(parseControls("?viewport=mobile", registry))).toMatchObject({
      width: 375,
      height: 812,
    });
    expect(resolveViewport(parseControls("?viewport=tablet", registry)).width).toBe(768);
    expect(resolveViewport(parseControls("?viewport=desktop", registry)).width).toBe(1280);
    expect(resolveViewport(parseControls("?viewport=mobile&rotate=1", registry))).toMatchObject({
      width: 812,
      height: 375,
    });
  });

  it("Ajustar não tem tamanho e não gira", () => {
    const fit = resolveViewport(parseControls("?rotate=1", registry));
    expect(fit.id).toBe("fit");
    expect(fit.width).toBeUndefined();
  });

  it("aceita `custom` de links antigos", () => {
    expect(resolveViewport(parseControls("?viewport=custom&w=640", registry))).toMatchObject({
      id: "custom",
      width: 640,
    });
  });
});
