/**
 * Barra de controles (§6).
 *
 * Cada controle troca uma variável da situação sem refazer o fluxo. Persona,
 * conjunto de dados, viewport, tema, idioma, estado de rede e acessibilidade
 * estão no mesmo nível de hierarquia de propósito: acessibilidade é dimensão de
 * primeira classe (D-15), não uma aba escondida.
 */

import type { Registry } from "../registry/index.js";
import { NETWORK_STATES, type ControlsState } from "../types/index.js";
import { TEXT_SCALES, VIEWPORTS } from "../controls/state.js";
import { useLabels } from "./labels.js";

export type ControlsProps = {
  registry: Registry;
  controls: ControlsState;
  onChange: (patch: Partial<ControlsState>) => void;
};

export function Controls({ registry, controls, onChange }: ControlsProps) {
  const all = useLabels();
  const labels = all.controls;
  const { product } = registry;
  const adapters = product.dataSources?.adapters ?? [];
  const modes = product.theme?.modes ?? [];
  const locales = product.theme?.locales ?? [];

  return (
    <div className="ds-chrome ds-controls" role="group" aria-label={labels.region}>
      <div className="ds-field">
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
      </div>

      <div className="ds-field">
        <label htmlFor="ds-fixture">{labels.fixture}</label>
        <select
          id="ds-fixture"
          className="ds-select"
          value={controls.fixture ?? ""}
          onChange={(event) => onChange({ fixture: event.target.value || undefined })}
        >
          <option value="">{labels.none}</option>
          {product.fixtures.map((fixture) => (
            <option key={fixture.id} value={fixture.id}>
              {fixture.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ds-field">
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
      </div>

      <div className="ds-field">
        <span className="ds-field__label" id="ds-viewport-label">
          {labels.viewport}
        </span>
        <div className="ds-segmented" role="group" aria-labelledby="ds-viewport-label">
          {VIEWPORTS.map((viewport) => (
            <button
              key={viewport.id}
              type="button"
              aria-pressed={controls.viewport === viewport.id}
              onClick={() => onChange({ viewport: viewport.id })}
            >
              {all.viewport[viewport.id] ?? viewport.label}
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

      {adapters.length > 0 && (
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

      <div className="ds-field">
        <span className="ds-field__label">{labels.a11y}</span>
        <button
          type="button"
          className="ds-btn"
          aria-pressed={controls.keyboardMode}
          onClick={() => onChange({ keyboardMode: !controls.keyboardMode })}
          title={labels.keyboardModeTitle}
        >
          {labels.keyboardMode}
        </button>
        <button
          type="button"
          className="ds-btn"
          aria-pressed={controls.reducedMotion}
          onClick={() => onChange({ reducedMotion: !controls.reducedMotion })}
          title={labels.reducedMotionTitle}
        >
          {labels.reducedMotion}
        </button>
        <div className="ds-segmented" role="group" aria-label={labels.textScale}>
          {TEXT_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              aria-pressed={controls.textScale === scale}
              onClick={() => onChange({ textScale: scale })}
            >
              {scale === 1 ? "100%" : `${scale * 100}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
