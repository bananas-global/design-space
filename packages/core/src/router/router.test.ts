import { describe, expect, it } from "vitest";
import { matchPath, resolveRoute } from "./index.js";
import type { RouteDefinition } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const route = (path: string): RouteDefinition => ({ path, screen });

describe("matchPath", () => {
  it("casa rota literal", () => {
    expect(matchPath("/orders", "/orders")).toEqual({});
    expect(matchPath("/orders", "/requests")).toBeNull();
  });

  it("extrai parâmetros", () => {
    expect(matchPath("/requests/:id", "/requests/REQ-2043")).toEqual({ id: "REQ-2043" });
  });

  it("exige o mesmo número de segmentos", () => {
    expect(matchPath("/requests/:id", "/requests")).toBeNull();
    expect(matchPath("/requests/:id", "/requests/1/history")).toBeNull();
  });

  it("captura o resto com curinga", () => {
    expect(matchPath("/docs/*", "/docs/a/b/c")).toEqual({ "*": "a/b/c" });
  });

  it("ignora a query string e decodifica o path", () => {
    expect(matchPath("/requests/:name", "/requests/Ana%20Silva?scenario=x")).toEqual({
      name: "Ana Silva",
    });
  });
});

describe("resolveRoute", () => {
  it("prefere segmento literal a parâmetro, independente da ordem declarada", () => {
    const routes = [route("/requests/:id"), route("/requests/new")];
    expect(resolveRoute(routes, "/requests/new")?.definition.path).toBe("/requests/new");
    expect(resolveRoute(routes, "/requests/42")?.definition.path).toBe("/requests/:id");
  });

  it("usa o curinga só como último recurso", () => {
    const routes = [route("/*"), route("/orders")];
    expect(resolveRoute(routes, "/orders")?.definition.path).toBe("/orders");
    expect(resolveRoute(routes, "/qualquer")?.definition.path).toBe("/*");
  });

  it("devolve undefined quando nada casa", () => {
    expect(resolveRoute([route("/requests")], "/billing")).toBeUndefined();
  });
});
