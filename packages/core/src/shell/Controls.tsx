/**
 * Barra de controles (§6).
 *
 * Cada controle troca uma variável da situação sem refazer o fluxo. Persona,
 * viewport, tema, idioma e estado de rede podem ser alterados sem refazer o
 * fluxo. O escopo de dados do cenário ativo fica junto da navegação, onde a
 * pessoa escolhe o que revisar.
 */

import type { ComponentFixtureResolution, Registry } from "../registry/index.js";
import { NETWORK_STATES, type ComponentPreview, type ControlsState } from "../types/index.js";
import { VIEWPORTS } from "../controls/state.js";
import { useLabels } from "./labels.js";

export type ControlsProps = {
  registry: Registry;
  controls: ControlsState;
  scenarioActive: boolean;
  component?: ComponentPreview;
  componentFixture?: ComponentFixtureResolution;
  onChange: (patch: Partial<ControlsState>) => void;
};

export function Controls({
  registry,
  controls,
  scenarioActive,
  component,
  componentFixture,
  onChange,
}: ControlsProps) {
  const all = useLabels();
  const labels = all.controls;
  const { product } = registry;
  const adapters = product.dataSources?.adapters ?? [];
  const modes = product.theme?.modes ?? [];
  const locales = product.theme?.locales ?? [];

  return (
    <div className="ds-chrome ds-controls" role="group" aria-label={labels.region}>
      {component?.fixtures?.length ? (
        <div className="ds-field">
          <label htmlFor="ds-component-fixture">{labels.componentFixture}</label>
          <select
            id="ds-component-fixture"
            className="ds-select"
            value={componentFixture?.fixture?.id ?? ""}
            onChange={(event) => onChange({ fixture: event.target.value || undefined })}
          >
            {component.fixtures.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {scenarioActive && <div className="ds-field">
        <label htmlFor="ds-persona">{labels.persona}</label>
        <select
          id="ds-persona"
          className="ds-select"
          value={controls.persona ?? ""}
          onChange={(event) => onChange({ persona: event.target.value || undefined })}
        >
          <option value="">{labels.none}</option>
          {product.personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
      </div>}

      {scenarioActive && <div className="ds-field">
        <span className="ds-field__label" id="ds-network-label">
          {labels.network}
        </span>
        <div className="ds-segmented" role="group" aria-labelledby="ds-network-label">
          {NETWORK_STATES.map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={controls.network === state}
              onClick={() => onChange({ network: state })}
            >
              {all.network[state]}
            </button>
          ))}
        </div>
      </div>}

      <div className="ds-field">
        <span className="ds-field__label" id="ds-viewport-label">
          {labels.viewport}
        </span>
        <div className="ds-segmented" role="group" aria-labelledby="ds-viewport-label">
          {VIEWPORTS.map((viewport) => (
            <button
              key={viewport.id}
              type="button"
              className="ds-icon-button"
              aria-pressed={controls.viewport === viewport.id}
              aria-label={all.viewport[viewport.id] ?? viewport.label}
              title={all.viewport[viewport.id] ?? viewport.label}
              onClick={() => onChange({ viewport: viewport.id })}
            >
              <ViewportIcon id={viewport.id} />
            </button>
          ))}
        </div>
        {controls.viewport === "custom" && (
          <input
            className="ds-input"
            type="number"
            min={240}
            max={3840}
            step={10}
            style={{ width: 88 }}
            aria-label={labels.customWidth}
            value={controls.customWidth ?? 1024}
            onChange={(event) => onChange({ customWidth: Number(event.target.value) || undefined })}
          />
        )}
      </div>

      {modes.length > 1 && (
        <div className="ds-field">
          <label htmlFor="ds-theme">{labels.theme}</label>
          <select
            id="ds-theme"
            className="ds-select"
            value={controls.themeMode ?? modes[0]}
            onChange={(event) => onChange({ themeMode: event.target.value })}
          >
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      )}

      {locales.length > 1 && (
        <div className="ds-field">
          <label htmlFor="ds-locale">{labels.locale}</label>
          <select
            id="ds-locale"
            className="ds-select"
            value={controls.locale ?? locales[0]}
            onChange={(event) => onChange({ locale: event.target.value })}
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
      )}

      {scenarioActive && adapters.length > 0 && (
        <div className="ds-field">
          <label htmlFor="ds-source">{labels.dataSource}</label>
          <select
            id="ds-source"
            className="ds-select"
            value={controls.dataSource ?? "fixtures"}
            onChange={(event) => onChange({ dataSource: event.target.value })}
          >
            <option value="fixtures">{labels.fixturesOption}</option>
            {adapters
              .filter((adapter) => adapter.id !== "fixtures")
              .map((adapter) => (
                <option key={adapter.id} value={adapter.id}>
                  {adapter.label}
                </option>
              ))}
          </select>
        </div>
      )}

    </div>
  );
}

/** SVGs derivados do conjunto Lucide (MIT), incorporados para manter o core sem dependência runtime. */
function ViewportIcon({ id }: { id: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "fit") return <svg {...common}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>;
  if (id === "mobile") return <svg {...common}><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>;
  if (id === "tablet") return <svg {...common}><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>;
  if (id === "desktop") return <svg {...common}><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  return <svg {...common}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>;
}
