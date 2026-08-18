import { describe, expect, it } from "vitest";

import { buildCleanReviewUrl, buildHomeUrl } from "./Topbar.js";

describe("revisão limpa", () => {
  it("preserva a situação e abre a variante sem chrome", () => {
    const url = new URL(
      buildCleanReviewUrl("https://example.test/requests?scenario=requests.queue&viewport=mobile"),
    );
    expect(url.searchParams.get("scenario")).toBe("requests.queue");
    expect(url.searchParams.get("viewport")).toBe("mobile");
    expect(url.searchParams.get("chrome")).toBe("0");
  });
});

describe("retorno para a home", () => {
  it("remove o contexto atual e preserva o light mode", () => {
    expect(buildHomeUrl("https://example.test", "light")).toBe(
      "https://example.test/?appearance=light",
    );
  });

  it("não serializa o tema escuro padrão", () => {
    expect(buildHomeUrl("https://example.test", "dark")).toBe("https://example.test/");
  });

  it("preserva a visão de referências portadas ao voltar para a home", () => {
    expect(buildHomeUrl("https://example.test", "dark", "ported")).toBe(
      "https://example.test/?view=ported",
    );
  });

  it("preserva o escopo de handoff ao voltar para a Home filtrada", () => {
    const url = new URL(buildHomeUrl("https://example.test", "dark", "active", {
      scenarios: ["requests.queue"],
      components: ["feedback.notice"],
    }));

    expect(url.searchParams.get("handoff")).toBe("1");
    expect(url.searchParams.getAll("allowScenario")).toEqual(["requests.queue"]);
    expect(url.searchParams.getAll("allowComponent")).toEqual(["feedback.notice"]);
  });
});
