/**
 * Barra superior em três partes: o produto e a versão do motor à esquerda; no
 * centro, a visualização — viewport, girar, zoom, revisão limpa e abrir o
 * quadro numa janela própria; à direita, copiar link, tema do chrome e
 * diagnóstico.
 *
 * Nada aqui muda a UI do produto além da largura da janela que ela enxerga.
 */

import { useEffect, useRef, useState } from "react";
import type { DeployContext } from "../deploy/index.js";
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "../controls/state.js";
import type { ValidationIssue } from "../registry/validate.js";
import type { ChromeTheme, ViewportSetting } from "../types/index.js";
import { ENGINE_PACKAGE, ENGINE_VERSION } from "../version.js";
import { Icon, type IconName } from "./icons.js";
import { useLabels } from "./labels.js";

/** Presets na ordem da barra. `custom` só existe por URL. */
const PRESETS: { id: string; icon: IconName }[] = [
  { id: "mobile", icon: "mobile" },
  { id: "tablet", icon: "tablet" },
  { id: "desktop", icon: "desktop" },
  { id: "fit", icon: "fit" },
];

/** Degraus do zoom, como os de um navegador. */
export const ZOOM_STEPS = [25, 33, 50, 67, 75, 90, 100, 110, 125, 150] as const;

export function nextZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > current) ?? ZOOM_MAX;
  return [...ZOOM_STEPS].reverse().find((step) => step < current) ?? ZOOM_MIN;
}

export type TopbarProps = {
  productName: string;
  deploy: DeployContext;
  viewportId: string;
  viewport: ViewportSetting;
  zoom: number;
  rotated: boolean;
  theme: ChromeTheme;
  issues: ValidationIssue[];
  /** URL absoluta do estado atual. */
  linkUrl: string;
  onViewport: (id: string) => void;
  onRotate: () => void;
  onZoom: (zoom: number) => void;
  onCleanReview: () => void;
  /** Abre o quadro sozinho numa janela própria, para ferramenta de captura. */
  onOpenFrame: () => void;
  onToggleTheme: () => void;
};

export function Topbar({
  productName,
  viewportId,
  viewport,
  zoom,
  rotated,
  theme,
  issues,
  linkUrl,
  onViewport,
  onRotate,
  onZoom,
  onCleanReview,
  onOpenFrame,
  onToggleTheme,
}: TopbarProps) {
  const labels = useLabels();
  const t = labels.topbar;
  const [copied, setCopied] = useState(false);
  // Girar só faz sentido em aparelho: monitor e "Ajustar" não têm retrato.
  const canRotate = (viewportId === "mobile" || viewportId === "tablet") && Boolean(viewport.width && viewport.height);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
    } catch {
      // Clipboard bloqueado (contexto não seguro, permissão negada): o prompt
      // entrega o texto selecionável em vez de falhar calado.
      window.prompt(t.copyPrompt, linkUrl);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="ds-topbar" aria-label={t.region}>
      <div className="ds-topbar__product">
        <span className="ds-topbar__name">{productName}</span>
        <a
          className="ds-topbar__version"
          href={`https://www.npmjs.com/package/${ENGINE_PACKAGE}/v/${ENGINE_VERSION}`}
          target="_blank"
          rel="noreferrer"
        >
          {t.engineVersion(ENGINE_VERSION)}
        </a>
      </div>

      <div className="ds-topbar__view">
        <div className="ds-group" role="group" aria-label={t.viewportGroup}>
          {PRESETS.map((preset) => {
            const label = labels.viewport[preset.id] ?? preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className="ds-btn ds-btn--icon"
                aria-pressed={viewportId === preset.id}
                aria-label={label}
                title={label}
                onClick={() => onViewport(preset.id)}
              >
                <Icon name={preset.icon} />
              </button>
            );
          })}
          <button
            type="button"
            className="ds-btn ds-btn--icon"
            aria-pressed={rotated}
            aria-label={t.rotate}
            title={t.rotate}
            disabled={!canRotate}
            onClick={onRotate}
          >
            <Icon name="rotate" />
          </button>
        </div>

        <div className="ds-group" role="group">
          <button
            type="button"
            className="ds-btn ds-btn--icon"
            aria-label={t.zoomOut}
            title={t.zoomOut}
            disabled={zoom <= ZOOM_MIN}
            onClick={() => onZoom(nextZoom(zoom, -1))}
          >
            <Icon name="minus" />
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--zoom"
            aria-label={t.zoomReset}
            title={t.zoomReset}
            onClick={() => onZoom(ZOOM_DEFAULT)}
          >
            {t.zoomValue(zoom)}
          </button>
          <button
            type="button"
            className="ds-btn ds-btn--icon"
            aria-label={t.zoomIn}
            title={t.zoomIn}
            disabled={zoom >= ZOOM_MAX}
            onClick={() => onZoom(nextZoom(zoom, 1))}
          >
            <Icon name="plus" />
          </button>
        </div>

        <button
          type="button"
          className="ds-btn ds-btn--icon"
          aria-label={t.cleanReview}
          title={t.cleanReview}
          onClick={onCleanReview}
        >
          <Icon name="fullscreen" />
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--icon"
          aria-label={t.openFrame}
          title={t.openFrame}
          onClick={onOpenFrame}
        >
          <Icon name="external" />
        </button>
      </div>

      <div className="ds-topbar__tools">
        <button
          type="button"
          className="ds-btn ds-btn--icon"
          aria-label={copied ? t.copied : t.copyLink}
          title={copied ? t.copied : t.copyLink}
          onClick={copyLink}
        >
          <Icon name={copied ? "check" : "link"} />
        </button>
        <button
          type="button"
          className="ds-btn ds-btn--icon"
          aria-label={theme === "dark" ? t.lightMode : t.darkMode}
          title={theme === "dark" ? t.lightMode : t.darkMode}
          onClick={onToggleTheme}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        {issues.length > 0 && <DiagnosticsIndicator issues={issues} />}
      </div>
    </header>
  );
}

/**
 * Indicador de diagnóstico: só aparece quando a validação do produto tem algo a
 * dizer, e abre a lista. Vermelho só para erro — é a única cor do chrome.
 */
function DiagnosticsIndicator({ issues }: { issues: ValidationIssue[] }) {
  const labels = useLabels();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  const summary = labels.topbar.diagnostics(errors, warnings);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="ds-diagnostics" ref={rootRef}>
      <button
        type="button"
        className="ds-btn ds-diagnostics__trigger"
        data-level={errors > 0 ? "error" : "warning"}
        aria-expanded={open}
        aria-label={summary}
        title={summary}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="alert" />
        <span>{errors > 0 ? errors : warnings}</span>
      </button>
      {open && (
        <div className="ds-diagnostics__popover" role="dialog" aria-label={labels.diagnostics.title}>
          <div className="ds-diagnostics__head">
            <strong>{labels.diagnostics.title}</strong>
            <span className="ds-muted">{summary}</span>
          </div>
          <ul className="ds-diagnostics__list">
            {issues.map((issue, index) => (
              <li key={`${issue.where}-${index}`} className="ds-diagnostics__item" data-level={issue.level}>
                <span className="ds-diagnostics__level">
                  {issue.level === "error" ? labels.diagnostics.error : labels.diagnostics.warning}
                </span>
                <code className="ds-diagnostics__where">{issue.where}</code>
                <span className="ds-diagnostics__message">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
