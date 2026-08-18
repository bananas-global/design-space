import { describe, expect, it } from "vitest";

import { commitUrl, getDeployContext, scenarioUrl } from "./index.js";
import type { Scenario } from "../types/index.js";

const scenario: Scenario = {
  id: "orders.blocked",
  title: "Pedido bloqueado",
  intent: "Verificar se o motivo do bloqueio fica claro.",
  route: "/orders/1042",
  persona: "analyst",
  fixture: "order-blocked",
  status: "in-review",
  a11y: { keyboard: "full", announces: ["motivo do bloqueio"], contrast: "AA" },
  expected: ["O motivo aparece junto da ação indisponível."],
};

describe("getDeployContext", () => {
  it("sem contexto, roda como desenvolvimento local", () => {
    const deploy = getDeployContext();

    expect(deploy.env).toBe("development");
    expect(deploy.isDeployed).toBe(false);
    expect(deploy.branch).toBeUndefined();
    expect(deploy.commit).toBeUndefined();
    expect(deploy.shortCommit).toBeUndefined();
  });

  it("ignora ambiente: só o que o produto informa conta", () => {
    // O motor é biblioteca compilada e não tem acesso ao build do produto.
    // Sujar `process.env` não pode mudar o contexto.
    process.env.DEPLOY_ENV = "production";
    process.env.DEPLOY_COMMIT = "0123456789abcdef";

    try {
      expect(getDeployContext().env).toBe("development");
      expect(getDeployContext().commit).toBeUndefined();
    } finally {
      delete process.env.DEPLOY_ENV;
      delete process.env.DEPLOY_COMMIT;
    }
  });

  it("usa o que o produto informa, e encurta o commit", () => {
    const deploy = getDeployContext({
      env: "preview",
      branch: "escopo/regra-de-bloqueio",
      commit: "0123456789abcdef",
      branchUrl: "acme-git-escopo.example.app",
    });

    expect(deploy.env).toBe("preview");
    expect(deploy.isDeployed).toBe(true);
    expect(deploy.branch).toBe("escopo/regra-de-bloqueio");
    expect(deploy.shortCommit).toBe("0123456");
    expect(deploy.origin).toBe("https://acme-git-escopo.example.app");
  });

  it("trata string vazia como ausente", () => {
    // É o que um `define` de bundler produz quando a variável não existe, e um
    // cabeçalho com branch vazia é pior que um sem branch.
    const deploy = getDeployContext({ env: "", branch: "", commit: "", branchUrl: "" });

    expect(deploy.env).toBe("development");
    expect(deploy.branch).toBeUndefined();
    expect(deploy.commit).toBeUndefined();
    expect(deploy.branchUrl).toBeUndefined();
  });

  it("prefere a URL de branch à do deployment", () => {
    const deploy = getDeployContext({
      branchUrl: "acme-git-escopo.example.app",
      deploymentUrl: "acme-abc123.example.app",
    });

    expect(deploy.origin).toBe("https://acme-git-escopo.example.app");
  });
});

describe("scenarioUrl", () => {
  it("carrega cenário, persona e fixture na query", () => {
    const url = new URL(scenarioUrl(scenario, { origin: "https://acme.example.app" }));

    expect(url.pathname).toBe("/orders/1042");
    expect(url.searchParams.get("scenario")).toBe("orders.blocked");
    expect(url.searchParams.get("persona")).toBe("analyst");
    expect(url.searchParams.get("fixture")).toBe("order-blocked");
  });

  it("preserva o light mode quando ele faz parte do estado compartilhado", () => {
    const url = new URL(
      scenarioUrl(scenario, {
        origin: "https://acme.example.app",
        overrides: { chromeTheme: "light" },
      }),
    );
    expect(url.searchParams.get("appearance")).toBe("light");
  });
});

describe("commitUrl", () => {
  it("substitui o commit no template do produto", () => {
    const url = commitUrl(scenario, {
      template: "https://acme-{shortCommit}-time.example.app",
      commit: "0123456789abcdef",
    });

    expect(url).toContain("https://acme-0123456-time.example.app/orders/1042");
  });

  it("aceita template sem relação com fornecedor nenhum", () => {
    const url = commitUrl(scenario, {
      template: "https://{commit}.review.acme.dev",
      commit: "0123456789abcdef",
    });

    expect(url).toContain("https://0123456789abcdef.review.acme.dev/orders/1042");
  });

  it("sem commit não existe aprovação rastreável", () => {
    expect(commitUrl(scenario, { template: "https://acme-{commit}.example.app" })).toBeUndefined();
  });
});
