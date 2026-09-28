/**
 * Lateral direita: Variações e Informações.
 *
 * Variações responde "em que situação esta tela está?" — os cenários da rota,
 * mais persona e estado de rede. Informações responde "o que eu preciso saber
 * para implementar?" — rota, intenção, comportamento esperado, regras e de onde
 * vem cada componente no sistema real, com o texto pronto para o PR.
 */

import { useState, type ReactNode } from "react";
import type { ComponentFixtureResolution, Registry, ScreenNode } from "../registry/index.js";
import type { DeployContext } from "../deploy/index.js";
import {
  NETWORK_STATES,
  type ComponentPreview,
  type ControlsState,
  type NetworkState,
  type PanelTab,
  type Scenario,
} from "../types/index.js";
import { Icon } from "./icons.js";
import { useLabels } from "./labels.js";
import { buildPrMarkdown } from "./prMarkdown.js";
import { Resizer } from "./Resizer.js";

export type PanelProps = {
  registry: Registry;
  controls: ControlsState;
  deploy: DeployContext;
  screen: ScreenNode | undefined;
  /** Cenário ativo quando ele é variação da tela aberta. */
  variation: Scenario | undefined;
  component: ComponentPreview | undefined;
  componentFixture: ComponentFixtureResolution;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onOpenScenario: (scenarioId: string) => void;
  onOpenComponent: (componentId: string) => void;
  onChange: (patch: Partial<ControlsState>) => void;
  width: number;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
};

export function Panel(props: PanelProps) {
  const { tab, onTab, width, onResize, onResizeStart, onResizeEnd } = props;
  const labels = useLabels().panel;

  return (
    <aside className="ds-panel" aria-label={labels.region} style={{ width }}>
      <Resizer
        side="right"
        label={labels.resize}
        value={width}
        onChange={onResize}
        onStart={onResizeStart}
        onEnd={onResizeEnd}
      />
      <div className="ds-tabs" role="tablist" aria-label={labels.tabs}>
        <button
          type="button"
          role="tab"
          className="ds-tab"
          aria-selected={tab === "variations"}
          tabIndex={tab === "variations" ? 0 : -1}
          onClick={() => onTab("variations")}
        >
          {labels.variationsTab}
        </button>
        <button
          type="button"
          role="tab"
          className="ds-tab"
          aria-selected={tab === "info"}
          tabIndex={tab === "info" ? 0 : -1}
          onClick={() => onTab("info")}
        >
          {labels.infoTab}
        </button>
      </div>
      <div className="ds-panel__body" role="tabpanel">
        {tab === "variations" ? <Variations {...props} /> : <Info {...props} />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------ variações */

function Variations({
  registry,
  controls,
  screen,
  variation,
  component,
  componentFixture,
  onOpenScenario,
  onChange,
}: PanelProps) {
  const labels = useLabels();
  const p = labels.panel;

  if (component) {
    const fixtures = component.fixtures ?? [];
    if (fixtures.length === 0) return <p className="ds-empty">{p.noComponentVariations}</p>;
    return (
      <>
        {componentFixture.didFallback && componentFixture.requestedId && componentFixture.fixture && (
          <p className="ds-notice">
            {p.fixtureFallback(componentFixture.requestedId, componentFixture.fixture.id)}
          </p>
        )}
        <ul className="ds-items" aria-label={p.variationsList}>
          {fixtures.map((fixture) => (
            <li key={fixture.id}>
              <button
                type="button"
                className="ds-item ds-item--stacked"
                aria-current={componentFixture.fixture?.id === fixture.id ? "true" : undefined}
                onClick={() => onChange({ fixture: fixture.id })}
              >
                <span className="ds-item__title">{fixture.label}</span>
                {fixture.description && <span className="ds-item__hint">{fixture.description}</span>}
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (!screen) return <p className="ds-empty">{p.nothingSelected}</p>;

  const variations = screen.variations;
  const product = registry.product;
  const modes = product.theme?.modes ?? [];
  const locales = product.theme?.locales ?? [];
  const adapters = product.dataSources?.adapters ?? [];

  return (
    <>
      <ul className="ds-items" aria-label={p.variationsList}>
        {variations.length === 0 ? (
          <li>
            <div className="ds-item ds-item--stacked" aria-current="true">
              <span className="ds-item__title">{p.defaultVariation}</span>
              <span className="ds-item__hint">{p.defaultVariationHint}</span>
            </div>
          </li>
        ) : (
          variations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="ds-item ds-item--stacked"
                aria-current={variation?.id === item.id ? "true" : undefined}
                onClick={() => onOpenScenario(item.id)}
              >
                <span className="ds-item__title">{item.title}</span>
                {item.intent && <span className="ds-item__hint">{item.intent}</span>}
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="ds-fields">
        <Field label={p.persona}>
          <select
            className="ds-select"
            value={controls.persona ?? ""}
            onChange={(event) => onChange({ persona: event.target.value || undefined })}
          >
            <option value="">{p.none}</option>
            {product.personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={p.network}>
          <select
            className="ds-select"
            value={controls.network}
            onChange={(event) => onChange({ network: event.target.value as NetworkState })}
          >
            {NETWORK_STATES.map((state) => (
              <option key={state} value={state}>
                {labels.network[state]}
              </option>
            ))}
          </select>
        </Field>

        {modes.length > 1 && (
          <Field label={p.theme}>
            <select
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
          </Field>
        )}

        {locales.length > 1 && (
          <Field label={p.locale}>
            <select
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
          </Field>
        )}

        {adapters.length > 0 && (
          <Field label={p.dataSource}>
            <select
              className="ds-select"
              value={controls.dataSource ?? "fixtures"}
              onChange={(event) => onChange({ dataSource: event.target.value })}
            >
              <option value="fixtures">{p.fixturesOption}</option>
              {adapters.map((adapter) => (
                <option key={adapter.id} value={adapter.id}>
                  {adapter.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ds-field">
      <span className="ds-field__label">{label}</span>
      {children}
    </label>
  );
}

/* --------------------------------------------------------- informações */

function Info({
  registry,
  controls,
  deploy,
  screen,
  variation,
  component,
  onOpenScenario,
  onOpenComponent,
}: PanelProps) {
  const labels = useLabels();
  const i = labels.info;
  const [copied, setCopied] = useState(false);

  if (component) {
    const usages = registry.usagesOf(component.id, { handoff: controls.handoff });
    return (
      <div className="ds-info">
        <Section title={i.component}>
          <Definition term={i.name}>{component.name}</Definition>
          <Definition term={i.id}>
            <code>{component.id}</code>
          </Definition>
          {component.group && <Definition term={i.group}>{component.group}</Definition>}
          {component.description && <Definition term={i.description}>{component.description}</Definition>}
          {component.source && (
            <Definition term={i.source}>
              <code>{component.source}</code>
            </Definition>
          )}
        </Section>
        <Section title={i.usedIn}>
          {usages.length === 0 ? (
            <p className="ds-muted">{i.notUsed}</p>
          ) : (
            <ul className="ds-links">
              {usages.map((usage) => {
                const target =
                  usage.variations.find((item) => item.components?.includes(component.id)) ??
                  usage.variations[0];
                return (
                  <li key={usage.id}>
                    <button
                      type="button"
                      className="ds-link"
                      onClick={() => target && onOpenScenario(target.id)}
                    >
                      {usage.name}
                    </button>
                    <code className="ds-muted">{usage.id}</code>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    );
  }

  if (!screen) return <p className="ds-empty">{labels.panel.nothingSelected}</p>;

  const components = registry.componentsOfScreen(screen);
  const persona = registry.persona(controls.persona ?? variation?.persona);
  const rules = registry.rulesOf(variation);

  const copyForPr = async () => {
    const markdown = buildPrMarkdown({
      screen,
      variations: screen.variations,
      components,
      deploy,
      labels,
      overrides: controls.handoff ? { handoff: controls.handoff } : undefined,
    });
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      window.prompt(i.copyPrompt, markdown);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="ds-info">
      <Section title={i.screen}>
        <Definition term={i.name}>{screen.name}</Definition>
        <Definition term={i.route}>
          <code>{screen.route.path}</code>
        </Definition>
        {screen.description && <Definition term={i.description}>{screen.description}</Definition>}
      </Section>

      {variation && (
        <Section title={i.variation}>
          <Definition term={i.name}>{variation.title}</Definition>
          <Definition term={i.id}>
            <code>{variation.id}</code>
          </Definition>
          {persona && <Definition term={i.persona}>{persona.name}</Definition>}
          {variation.intent && <Definition term={i.intent}>{variation.intent}</Definition>}
          <List term={i.preconditions} items={variation.preconditions} />
          <List term={i.actions} items={variation.actions} />
          <List term={i.expected} items={variation.expected} />
          <List term={i.rules} items={rules.map((rule) => rule.statement)} />
          {variation.ticket && (
            <Definition term={i.ticket}>
              <code>{variation.ticket}</code>
            </Definition>
          )}
        </Section>
      )}

      {components.length > 0 && (
        <Section title={i.components}>
          <ul className="ds-links">
            {components.map((item) => (
              <li key={item.id}>
                <button type="button" className="ds-link" onClick={() => onOpenComponent(item.id)}>
                  {item.name}
                </button>
                {item.source && <code className="ds-muted">{item.source}</code>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button type="button" className="ds-btn ds-btn--block" onClick={copyForPr}>
        <Icon name={copied ? "check" : "copy"} size={14} />
        <span>{copied ? i.copiedForPr : i.copyForPr}</span>
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ds-section">
      <h2 className="ds-section__title">{title}</h2>
      <div className="ds-defs">{children}</div>
    </section>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <dl className="ds-def">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </dl>
  );
}

function List({ term, items }: { term: string; items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <dl className="ds-def">
      <dt>{term}</dt>
      <dd>
        <ul className="ds-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </dd>
    </dl>
  );
}
