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
import type { ProductDefinition, Scenario } from "../types/index.js";

export type TopbarProps = {
  product: ProductDefinition;
  scenario: Scenario | undefined;
  deploy: DeployContext;
  inspectorOpen: boolean;
  sidebarOpen: boolean;
  onToggleInspector: () => void;
  onToggleSidebar: () => void;
  onHideChrome: () => void;
};

export function Topbar({
  product,
  scenario,
  deploy,
  inspectorOpen,
  sidebarOpen,
  onToggleInspector,
  onToggleSidebar,
  onHideChrome,
}: TopbarProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    // Sem cenário ativo, o link ainda vale: a rota atual com os controles
    // atuais é uma situação reproduzível, mesmo sem id declarado.
    const url = scenario
      ? scenarioUrl(scenario, { origin: deploy.origin })
      : `${deploy.origin}${window.location.pathname}${window.location.search}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard bloqueado (iframe, contexto não seguro): abrir um prompt é
      // pior que oferecer o texto selecionável, então o fallback é o próprio
      // endereço no título do botão.
      window.prompt("Copie o link do cenário:", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="ds-chrome ds-topbar">
      <button
        type="button"
        className="ds-btn ds-btn--ghost"
        aria-pressed={sidebarOpen}
        onClick={onToggleSidebar}
        title="Mostrar ou ocultar a navegação"
      >
        ☰
      </button>

      <div className="ds-topbar__product">
        <span>{product.name}</span>
        {product.tagline && <span className="ds-topbar__tagline">{product.tagline}</span>}
      </div>

      <div className="ds-topbar__spacer" />

      <div className="ds-topbar__meta">
        {deploy.branch && (
          <code title={`Branch: ${deploy.branch}`}>
            {deploy.branch.length > 28 ? `${deploy.branch.slice(0, 27)}…` : deploy.branch}
          </code>
        )}
        {deploy.shortCommit && <code title={`Commit: ${deploy.commit}`}>{deploy.shortCommit}</code>}
        <code title={`Ambiente: ${deploy.env}`}>{deploy.env}</code>
      </div>

      <button type="button" className="ds-btn" onClick={copyLink}>
        {copied ? "Link copiado" : "Copiar link"}
      </button>

      <button
        type="button"
        className="ds-btn"
        onClick={onHideChrome}
        title="Ocultar o chrome do Design Space para revisão limpa e captura de tela"
      >
        Revisão limpa
      </button>

      <button
        type="button"
        className="ds-btn"
        aria-pressed={inspectorOpen}
        onClick={onToggleInspector}
      >
        Painel
      </button>
    </header>
  );
}
