/**
 * Contexto de deployment e deep links (§10.3).
 *
 * O motor não conhece provedor de hospedagem. Ele recebe o contexto do produto —
 * `ProductDefinition.deploy` — e monta a URL absoluta de qualquer cenário sem
 * domínio hardcoded, que é o que faz o botão "copiar link" funcionar igual em
 * localhost, em preview e em produção.
 *
 * Não existe detecção automática aqui, e a razão é concreta: o motor é uma
 * biblioteca já compilada, então o `import.meta.env` deste arquivo foi resolvido
 * no build do **pacote**, não no build do produto. Ler ambiente daqui nunca
 * funcionou em produto real — ver 0.1.1 no `CHANGELOG.md`. Quem tem acesso ao
 * próprio ambiente de build é o produto, então é ele quem informa.
 *
 * Design Space sem hospedagem nenhuma é caso suportado, não degradação: sem
 * contexto, `env` é `development`, a origem é a da janela e o cabeçalho da
 * revisão omite branch e commit.
 */

import type {
  ComponentPreview,
  ControlsState,
  DeployOverrides,
  Scenario,
} from "../types/index.js";
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
  /** `true` quando o produto informou preview ou produção. */
  isDeployed: boolean;
};

/**
 * Monta o contexto do deployment a partir do que o produto informou.
 *
 * Campo ausente ou vazio cai no padrão local — string vazia é o que um `define`
 * de bundler produz quando a variável não existe, e um cabeçalho de revisão com
 * branch vazia é pior que um sem branch.
 */
export function getDeployContext(overrides: DeployOverrides = {}): DeployContext {
  const branchUrl = overrides.branchUrl || undefined;
  const deploymentUrl = overrides.deploymentUrl || undefined;
  const commit = overrides.commit || undefined;
  const env = overrides.env || "development";

  // Preferência deliberada: a URL de branch é estável e sempre reflete o último
  // commit daquela branch, que é o que se quer ao circular um cenário em
  // revisão (§10.2). A URL de commit entra no registro de aprovação, não aqui.
  const origin =
    (branchUrl && `https://${branchUrl}`) ||
    (deploymentUrl && `https://${deploymentUrl}`) ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

  return {
    env,
    origin: origin.replace(/\/$/, ""),
    branchUrl,
    deploymentUrl,
    branch: overrides.branch || undefined,
    commit,
    shortCommit: commit?.slice(0, 7),
    isDeployed: env === "preview" || env === "production",
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

/** URL absoluta de um preview de componente, incluindo sua fixture isolada. */
export function componentUrl(
  component: ComponentPreview,
  options: {
    origin?: string;
    fixture?: string;
    overrides?: Partial<ControlsState>;
  } = {},
): string {
  const origin = options.origin ?? getDeployContext().origin;
  const url = new URL("/", origin);
  const fixture =
    options.fixture ??
    component.fixtures?.find((item) => item.id === component.defaultFixture)?.id ??
    component.fixtures?.[0]?.id;

  url.searchParams.set(PARAM.component, component.id);
  if (fixture) url.searchParams.set(PARAM.fixture, fixture);
  applyOverrides(url.searchParams, options.overrides);

  return url.toString();
}

/**
 * URL imutável de aprovação (§10.2). Aponta para o commit exato, então a
 * aprovação não muda de conteúdo debaixo de quem aprovou.
 *
 * O formato da URL é do provedor, não do motor, então vem do produto como
 * template com `{commit}` ou `{shortCommit}`:
 *
 * ```ts
 * commitUrl(scenario, { template: "https://acme-{shortCommit}-time.example.app" });
 * commitUrl(scenario, { template: "https://{commit}.review.acme.dev" });
 * ```
 *
 * Sem commit não há aprovação rastreável, e a função devolve `undefined` em vez
 * de um link que aponta para o lugar errado.
 */
export function commitUrl(
  scenario: Scenario,
  options: { template: string; commit?: string },
): string | undefined {
  const commit = options.commit ?? getDeployContext().commit;
  if (!commit) return undefined;

  const origin = options.template
    .replaceAll("{shortCommit}", commit.slice(0, 7))
    .replaceAll("{commit}", commit);

  return scenarioUrl(scenario, { origin });
}
