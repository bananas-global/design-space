import { describe, expect, it } from "vitest";

import {
  FRAME_PARAM,
  acceptFrameMessage,
  frameKey,
  fromFrameUrl,
  isFrameMode,
  mergeChromeParams,
  standaloneFrameUrl,
  toFrameUrl,
} from "./index.js";

describe("endereço do quadro", () => {
  it("tira os parâmetros do chrome e marca o modo quadro no fim", () => {
    const url = toFrameUrl(
      "/requests/REQ-1",
      "?scenario=requests.review&appearance=dark&panel=0&zoom=50&rotate=1&tab=info&chrome=0&viewport=mobile",
    );
    expect(url).toBe(`/requests/REQ-1?scenario=requests.review&viewport=mobile&${FRAME_PARAM}=1`);
  });

  it("é idempotente, então pai e quadro chegam à mesma string", () => {
    const once = toFrameUrl("/a", "?scenario=x&network=error");
    const { path, search } = fromFrameUrl(once);
    expect(toFrameUrl(path, search)).toBe(once);
    expect(search).toBe("?scenario=x&network=error");
  });

  it("troca de tela ou de componente muda a chave; o resto não", () => {
    const base = toFrameUrl("/requests", "?scenario=queue");
    expect(frameKey(toFrameUrl("/requests", "?scenario=queue-empty&network=error"))).toBe(
      frameKey(base),
    );
    expect(frameKey(toFrameUrl("/requests/REQ-1", "?scenario=queue"))).not.toBe(frameKey(base));
    expect(frameKey(toFrameUrl("/", "?component=a"))).not.toBe(
      frameKey(toFrameUrl("/", "?component=b")),
    );
  });

  describe("quadro sozinho, numa janela própria", () => {
    const origin = "https://review.example.test";
    const parent = {
      path: "/requests",
      search: "?scenario=queue&persona=requester&appearance=dark&zoom=75&chrome=0&tab=info",
    };

    it("parte do endereço que o quadro está mostrando, não do pai", () => {
      const url = standaloneFrameUrl(
        `${origin}/requests/REQ-1?scenario=detail&network=error&c.rows=none&aba=historico&${FRAME_PARAM}=1`,
        origin,
        parent,
      );
      expect(url).toBe(
        `/requests/REQ-1?scenario=detail&network=error&c.rows=none&aba=historico&${FRAME_PARAM}=1`,
      );
    });

    it("tira os parâmetros do chrome e mantém os do produto", () => {
      const url = standaloneFrameUrl(undefined, origin, {
        path: "/requests",
        search:
          "?scenario=queue&persona=requester&fixture=detail&network=slow&theme=dark&locale=en&c.rows=one&appearance=dark&zoom=75&rotate=1&chrome=0&panel=0&tab=info",
      });
      expect(url).toBe(
        `/requests?scenario=queue&persona=requester&fixture=detail&network=slow&theme=dark&locale=en&c.rows=one&${FRAME_PARAM}=1`,
      );
    });

    it("repõe o modo quadro quando a navegação do quadro o perdeu", () => {
      expect(standaloneFrameUrl(`${origin}/requests/REQ-1?scenario=detail`, origin, parent)).toBe(
        `/requests/REQ-1?scenario=detail&${FRAME_PARAM}=1`,
      );
    });

    it("cai no estado do pai com o quadro em branco, em outra origem ou ilegível", () => {
      const expected = `/requests?scenario=queue&persona=requester&${FRAME_PARAM}=1`;
      for (const href of [undefined, "about:blank", "https://evil.example.test/requests/REQ-1", "não é url"]) {
        expect(standaloneFrameUrl(href, origin, parent), String(href)).toBe(expected);
      }
    });
  });

  it("uma navegação do quadro mantém os controles do chrome do pai", () => {
    const merged = mergeChromeParams(
      `?scenario=detail&${FRAME_PARAM}=1`,
      "?scenario=queue&appearance=light&zoom=75&panel=0",
    );
    expect(merged).toBe("?scenario=detail&appearance=light&panel=0&zoom=75");
    // E volta ao mesmo endereço de quadro: sem recarga à toa.
    expect(toFrameUrl("/x", merged)).toBe(toFrameUrl("/x", "?scenario=detail"));
  });
});

describe("validação de postMessage", () => {
  const source = {} as MessageEventSource;
  const expected = { origin: "https://review.example.test", source };
  const message = { ds: 1, type: "navigate", url: "/a?ds-frame=1", replace: false };

  it("aceita a mesma origem vinda da janela esperada", () => {
    expect(acceptFrameMessage({ origin: expected.origin, source, data: message }, expected)).toEqual(
      message,
    );
  });

  it("recusa outra origem", () => {
    expect(
      acceptFrameMessage({ origin: "https://evil.example.test", source, data: message }, expected),
    ).toBeUndefined();
  });

  it("recusa a mesma origem vinda de outra janela", () => {
    const other = {} as MessageEventSource;
    expect(acceptFrameMessage({ origin: expected.origin, source: other, data: message }, expected))
      .toBeUndefined();
    expect(
      acceptFrameMessage({ origin: expected.origin, source, data: message }, { ...expected, source: null }),
    ).toBeUndefined();
  });

  it("recusa mensagem fora do protocolo", () => {
    for (const data of [
      null,
      "navigate",
      { type: "navigate", url: "/a" },
      { ds: 1, type: "desconhecida" },
      { ds: 1, type: "navigate" },
      { ds: 1, type: "shortcut", key: "X" },
    ]) {
      expect(acceptFrameMessage({ origin: expected.origin, source, data }, expected)).toBeUndefined();
    }
  });
});

describe("modo quadro", () => {
  it("é ligado pelo parâmetro", () => {
    const win = { location: { search: `?${FRAME_PARAM}=1` }, frameElement: null } as unknown as Window;
    expect(isFrameMode(win)).toBe(true);
  });

  it("é ligado quando o documento está dentro do iframe do chrome", () => {
    const frameElement = { hasAttribute: (name: string) => name === "data-ds-frame" };
    const win = { location: { search: "" }, frameElement } as unknown as Window;
    expect(isFrameMode(win)).toBe(true);
  });

  it("fica desligado no documento de cima", () => {
    const win = { location: { search: "?scenario=a" }, frameElement: null } as unknown as Window;
    expect(isFrameMode(win)).toBe(false);
    expect(isFrameMode(undefined)).toBe(false);
  });
});
