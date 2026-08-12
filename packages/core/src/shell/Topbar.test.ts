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

  it("preserva a inclusão de portados ao voltar para a home", () => {
    expect(buildHomeUrl("https://example.test", "dark", true)).toBe(
      "https://example.test/?showPorted=1",
    );
  });
});
