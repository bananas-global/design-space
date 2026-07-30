/**
 * Contexto de deployment e deep links (§10.3).
 *
 * A Vercel expõe o contexto do deployment como variável de ambiente. O motor lê
 * esse contexto e monta a URL absoluta de qualquer cenário sem nenhum domínio
 * hardcoded — que é o que permite o botão "copiar link" funcionar igual em
 * localhost, em preview de branch e em produção.
 *
 * As variáveis precisam do prefixo `VITE_` para chegar ao cliente. O template já
 * nasce com o mapeamento no `vite.config.ts`.
 */

import type { ControlsState, DeployOverrides, Scenario } from "../types/index.js";
import { PARAM, applyOverrides } from "../controls/params.js";

export type DeployContext = {
  /** `development`, `preview` ou `production`. */
  env: string;
  /** Origem absoluta, com protocolo, sem barra final. */
  origin: string;
  /** Domínio estável da branch, quando em preview. */
  branchUrl: string | undefined;
  /** Domínio único deste deployment. Imutável. */
  deploymentUrl: string | undefined;
  /** Nome da branch, para rotular a revisão na interface. */
  branch: string | undefined;
  /** Commit exato, gravado junto com o status de aprovação do cenário. */
  commit: string | undefined;
  /** Primeiros 7 caracteres do commit. */
  shortCommit: string | undefined;
  /** `true` quando roda em preview ou produção na Vercel. */
  isDeployed: boolean;
};

type EnvRecord = Record<string, string | undefined>;

function readEnv(): EnvRecord {
  // `import.meta.env` só existe sob um bundler. Em Node (testes, scripts de CI)
  // cai para `process.env`, que é onde a Vercel também publica as variáveis.
  const viteEnv = (import.meta as unknown as { env?: EnvRecord }).env;
  if (viteEnv) return viteEnv;
  if (typeof process !== "undefined" && process.env) return process.env as EnvRecord;
  return {};
}

/**
 * Lê o contexto do deployment.
 *
 * `overrides` vem do produto e tem precedência. Ele existe porque o motor é uma
 * biblioteca já compilada: o `import.meta.env` deste arquivo foi resolvido no
 * build do pacote, não no build do produto. A leitura de ambiente abaixo só
 * funciona quando o motor roda a partir do código-fonte — em testes e no
 * workspace — e por isso não pode ser a única fonte.
 */
export function getDeployContext(overrides: DeployOverrides = {}): DeployContext {
  const env = readEnv();

  const branchUrl = overrides.branchUrl || env.VITE_VERCEL_BRANCH_URL || env.VERCEL_BRANCH_URL;
  const deploymentUrl = overrides.deploymentUrl || env.VITE_VERCEL_URL || env.VERCEL_URL;
  const vercelEnv = overrides.env || env.VITE_VERCEL_ENV || env.VERCEL_ENV;
  const commit = overrides.commit || env.VITE_VERCEL_GIT_COMMIT_SHA || env.VERCEL_GIT_COMMIT_SHA;

  // Preferência deliberada: a URL de branch é estável e sempre reflete o último
  // commit daquela branch, que é o que se quer ao circular um cenário em
  // revisão (§10.2). A URL de commit entra no registro de aprovação, não aqui.
  const origin =
    (branchUrl && `https://${branchUrl}`) ||
    (deploymentUrl && `https://${deploymentUrl}`) ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

  return {
    env: vercelEnv ?? "development",
    origin: origin.replace(/\/$/, ""),
    branchUrl,
    deploymentUrl,
    branch: overrides.branch || env.VITE_VERCEL_GIT_COMMIT_REF || env.VERCEL_GIT_COMMIT_REF,
    commit,
    shortCommit: commit?.slice(0, 7),
    isDeployed: vercelEnv === "preview" || vercelEnv === "production",
  };
}

/**
 * URL absoluta de um cenário: rota mais os controles necessários para
 * reproduzir a situação. É o link que um PO envia sem precisar explicar
 * nenhuma sequência manual anterior.
 */
export function scenarioUrl(
  scenario: Scenario,
  options: { origin?: string; overrides?: Partial<ControlsState> } = {},
): string {
  const origin = options.origin ?? getDeployContext().origin;
  const url = new URL(scenario.route, origin);

  url.searchParams.set(PARAM.scenario, scenario.id);
  url.searchParams.set(PARAM.persona, scenario.persona);
  url.searchParams.set(PARAM.fixture, scenario.fixture);
  if (scenario.network && scenario.network !== "success") {
    url.searchParams.set(PARAM.network, scenario.network);
  }

  applyOverrides(url.searchParams, options.overrides);

  return url.toString();
}

/**
 * URL imutável de aprovação (§10.2). Aponta para o commit exato, então a
 * aprovação não muda de conteúdo debaixo de quem aprovou.
 *
 * Requer o escopo do projeto na Vercel, que é a parte do domínio depois do
 * hash e não está exposta como variável — por isso vem do produto.
 */
export function commitUrl(
  scenario: Scenario,
  options: { project: string; scope: string; commit?: string },
): string | undefined {
  const commit = options.commit ?? getDeployContext().shortCommit;
  if (!commit) return undefined;
  const origin = `https://${options.project}-${commit}-${options.scope}.vercel.app`;
  return scenarioUrl(scenario, { origin });
}
