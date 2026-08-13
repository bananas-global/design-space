/**
 * Cabeçalho da revisão.
 *
 * Mostra branch e commit sem nenhuma configuração por produto (§10.3), porque a
 * pergunta "qual versão eu estou olhando?" aparece em toda revisão assíncrona e
 * respondê-la por captura de tela é impossível.
 *
 * O botão de copiar link devolve a URL absoluta correta em qualquer preview: é o
 * artefato que circula em thread, ticket e handoff.
 */

import { useState } from "react";
import type { DeployContext } from "../deploy/index.js";
import { scenarioUrl } from "../deploy/index.js";
import { PARAM } from "../controls/params.js";
import { applyHandoffScope } from "../handoff/index.js";
import type {
  ChromeTheme,
  HandoffScope,
  ProductDefinition,
  Scenario,
  ScenarioView,
} from "../types/index.js";
import { useLabels } from "./labels.js";

export type TopbarProps = {
  product: ProductDefinition;
  scenario: Scenario | undefined;
  deploy: DeployContext;
  inspectorOpen: boolean;
  chromeTheme: ChromeTheme;
  view: ScenarioView;
  handoff?: HandoffScope;
  onToggleInspector: () => void;
  onToggleChromeTheme: () => void;
};

export function Topbar({
  product,
  scenario,
  deploy,
  inspectorOpen,
  chromeTheme,
  view,
  handoff,
  onToggleInspector,
  onToggleChromeTheme,
}: TopbarProps) {
  const labels = useLabels().topbar;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    // Sem cenário ativo, o link ainda vale: a rota atual com os controles
    // atuais é uma situação reproduzível, mesmo sem id declarado.
    const url = scenario
      ? scenarioUrl(scenario, {
          origin: deploy.origin,
          overrides: {
            ...(chromeTheme === "light" ? { chromeTheme } : {}),
            ...(view === "ported" ? { view } : {}),
            ...(handoff ? { handoff } : {}),
          },
        })
      : `${deploy.origin}${window.location.pathname}${window.location.search}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard bloqueado (iframe, contexto não seguro): abrir um prompt é
      // pior que oferecer o texto selecionável, então o fallback é o próprio
      // endereço no título do botão.
      window.prompt(labels.copyPrompt, url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const cleanReviewUrl = buildCleanReviewUrl(
    typeof window === "undefined" ? `${deploy.origin}/` : window.location.href,
  );
  const homeUrl = buildHomeUrl(deploy.origin, chromeTheme, view, handoff);

  return (
    <header className="ds-chrome ds-topbar">
      <div className="ds-topbar__product">
        <a
          className="ds-topbar__home"
          href={homeUrl}
          aria-label={labels.homeTitle(product.name)}
          title={labels.homeTitle(product.name)}
        >
          {product.name}
        </a>
        {product.tagline && <span className="ds-topbar__tagline">{product.tagline}</span>}
      </div>

      <div className="ds-topbar__spacer" />

      <div className="ds-topbar__meta">
        {deploy.branch && (
          <code title={labels.branchTitle(deploy.branch)}>
            {deploy.branch.length > 28 ? `${deploy.branch.slice(0, 27)}…` : deploy.branch}
          </code>
        )}
        {deploy.commit && (
          <code title={labels.commitTitle(deploy.commit)}>{deploy.shortCommit}</code>
        )}
        <code title={labels.envTitle(deploy.env)}>{deploy.env}</code>
      </div>

      <button
        type="button"
        className="ds-btn ds-btn--icon"
        aria-pressed={chromeTheme === "light"}
        aria-label={chromeTheme === "dark" ? labels.lightMode : labels.darkMode}
        title={chromeTheme === "dark" ? labels.lightMode : labels.darkMode}
        onClick={onToggleChromeTheme}
      >
        <AppearanceIcon theme={chromeTheme} />
      </button>

      <button type="button" className="ds-btn" onClick={copyLink}>
        {copied ? labels.copied : labels.copyLink}
      </button>

      <a
        className="ds-btn"
        href={cleanReviewUrl}
        target="_blank"
        rel="noreferrer"
        title={labels.cleanReviewTitle}
      >
        {labels.cleanReview}
      </a>

      <button
        type="button"
        className="ds-btn"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      >
        {labels.panel}
      </button>
    </header>
  );
}

export function buildCleanReviewUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set(PARAM.chrome, "0");
  return url.toString();
}

export function buildHomeUrl(
  origin: string,
  chromeTheme: ChromeTheme,
  view: ScenarioView = "active",
  handoff?: HandoffScope,
): string {
  const url = new URL("/", origin);
  if (chromeTheme === "light") url.searchParams.set(PARAM.chromeTheme, chromeTheme);
  if (view === "ported") url.searchParams.set(PARAM.view, "ported");
  applyHandoffScope(url.searchParams, handoff);
  return url.toString();
}

function AppearanceIcon({ theme }: { theme: ChromeTheme }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  return theme === "dark" ? (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.42" />
    </svg>
  ) : (
    <svg {...common}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
