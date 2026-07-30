import { describe, expect, it } from "vitest";
import { matchPath, resolveRoute } from "./index.js";
import type { RouteDefinition } from "../types/index.js";

const screen = (() => null) as unknown as RouteDefinition["screen"];
const route = (path: string): RouteDefinition => ({ path, screen });

describe("matchPath", () => {
  it("casa rota literal", () => {
    expect(matchPath("/agenda", "/agenda")).toEqual({});
    expect(matchPath("/agenda", "/patients")).toBeNull();
  });

  it("extrai parâmetros", () => {
    expect(matchPath("/finance/claims/:id", "/finance/claims/CLM-1042")).toEqual({ id: "CLM-1042" });
  });

  it("exige o mesmo número de segmentos", () => {
    expect(matchPath("/patients/:id", "/patients")).toBeNull();
    expect(matchPath("/patients/:id", "/patients/1/history")).toBeNull();
  });

  it("captura o resto com curinga", () => {
    expect(matchPath("/docs/*", "/docs/a/b/c")).toEqual({ "*": "a/b/c" });
  });

  it("ignora a query string e decodifica o path", () => {
    expect(matchPath("/patients/:name", "/patients/Ana%20Silva?scenario=x")).toEqual({
      name: "Ana Silva",
    });
  });
});

describe("resolveRoute", () => {
  it("prefere segmento literal a parâmetro, independente da ordem declarada", () => {
    const routes = [route("/patients/:id"), route("/patients/new")];
    expect(resolveRoute(routes, "/patients/new")?.definition.path).toBe("/patients/new");
    expect(resolveRoute(routes, "/patients/42")?.definition.path).toBe("/patients/:id");
  });

  it("usa o curinga só como último recurso", () => {
    const routes = [route("/*"), route("/agenda")];
    expect(resolveRoute(routes, "/agenda")?.definition.path).toBe("/agenda");
    expect(resolveRoute(routes, "/qualquer")?.definition.path).toBe("/*");
  });

  it("devolve undefined quando nada casa", () => {
    expect(resolveRoute([route("/agenda")], "/finance")).toBeUndefined();
  });
});
