/**
 * Painel de contexto: regras, critérios e diagnóstico.
 *
 * É aqui que o ambiente para de ser um protótipo bonito e passa a ser
 * especificação.
 */

import { useState } from "react";
import type { ComponentFixtureResolution, Registry } from "../registry/index.js";
import type { ComponentPreview, ControlsState, Scenario } from "../types/index.js";
import { useLabels } from "./labels.js";

type Tab = "scenario" | "diagnostics";

export type InspectorProps = {
  registry: Registry;
  scenario: Scenario | undefined;
  component?: ComponentPreview;
  componentFixture?: ComponentFixtureResolution;
  controls: ControlsState;
};

export function Inspector({
  registry,
  scenario,
  component,
  componentFixture,
  controls,
}: InspectorProps) {
  const labels = useLabels().inspector;
  const [tab, setTab] = useState<Tab>("scenario");
  const errorCount = registry.issues.filter((issue) => issue.level === "error").length;

  return (
    <aside className="ds-chrome ds-inspector" aria-label={labels.region}>
      <div className="ds-inspector__tabs" role="tablist">
        <TabButton id="scenario" current={tab} onSelect={setTab}>
          {component ? labels.componentReference : labels.tabScenario}
        </TabButton>
        <TabButton id="diagnostics" current={tab} onSelect={setTab}>
          {errorCount > 0 ? labels.diagnosticsWithErrors(errorCount) : labels.tabDiagnostics}
        </TabButton>
      </div>

      <div className="ds-inspector__body" role="tabpanel">
        {tab === "scenario" && (
          <ScenarioPanel
            registry={registry}
            scenario={scenario}
            component={component}
            componentFixture={componentFixture}
            controls={controls}
          />
        )}
        {tab === "diagnostics" && <DiagnosticsPanel registry={registry} />}
      </div>
    </aside>
  );
}

function TabButton({
  id,
  current,
  onSelect,
  children,
}: {
  id: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Cenário
 * ------------------------------------------------------------------ */

function ScenarioPanel({
  registry,
  scenario,
  component,
  componentFixture,
  controls,
}: {
  registry: Registry;
  scenario: Scenario | undefined;
  component: ComponentPreview | undefined;
  componentFixture: ComponentFixtureResolution | undefined;
  controls: ControlsState;
}) {
  const all = useLabels();
  const labels = all.inspector;

  if (!scenario) {
    if (!component) return <p className="ds-block">{labels.noScenario}</p>;
    return (
      <div className="ds-block">
        <h2 className="ds-block__title">{labels.componentReference}</h2>
        <p style={{ color: "var(--ds-fg)", fontSize: 15, fontWeight: 600 }}>{component.name}</p>
        {component.description && <p>{component.description}</p>}
        <dl className="ds-kv" style={{ marginTop: 14 }}>
          <dt>{labels.id}</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{component.id}</dd>
          {component.group && <><dt>{labels.componentGroup}</dt><dd>{component.group}</dd></>}
          {componentFixture?.fixture && (
            <>
              <dt>{labels.componentFixture}</dt>
              <dd>{componentFixture.fixture.label} <code>{componentFixture.fixture.id}</code></dd>
              {componentFixture.fixture.description && (
                <>
                  <dt>{labels.componentFixtureDescription}</dt>
                  <dd>{componentFixture.fixture.description}</dd>
                </>
              )}
            </>
          )}
        </dl>
        {componentFixture?.didFallback && componentFixture.fixture && (
          <p className="ds-note" data-tone="warn">
            {labels.componentFixtureFallback(
              componentFixture.requestedId ?? "",
              componentFixture.fixture.id,
            )}
          </p>
        )}
      </div>
    );
  }

  const persona = registry.persona(controls.persona ?? scenario.persona);
  const permissions = controls.persona
    ? (registry.persona(controls.persona)?.permissions ?? [])
    : registry.permissionsOf(scenario);
  const rules = registry.rulesOf(scenario);
  const fixture = registry.fixture(controls.fixture ?? scenario.fixture);

  // Persona trocada pelo controle sem estar declarada no cenário é exatamente o
  // caso "e se um perfil sem permissão abrir esta tela?" — vale sinalizar, para
  // que a captura de tela não seja lida como o cenário canônico.
  const personaOverridden = Boolean(controls.persona && controls.persona !== scenario.persona);

  return (
    <>
      <ScopeGroup
        scope="task"
        title={labels.taskScope}
        description={labels.taskScopeDescription}
      >
      <div className="ds-block">
        <h2 className="ds-block__title">{labels.situation}</h2>
        <p style={{ color: "var(--ds-fg)", fontSize: 14, fontWeight: 600 }}>{scenario.title}</p>
        {scenario.intent && <p>{scenario.intent}</p>}
        {scenario.tags?.length ? (
          <div className="ds-chips">
            {scenario.tags.map((tag) => (
              <span className="ds-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">{labels.reproduction}</h2>
        <dl className="ds-kv">
          <dt>{labels.id}</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.id}</dd>
          <dt>{labels.route}</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.route}</dd>
          <dt>{labels.data}</dt>
          <dd>{fixture?.label ?? "—"}</dd>
          <dt>{labels.network}</dt>
          <dd>{all.network[controls.network]}</dd>
        </dl>
      </div>

      {scenario.preconditions?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.preconditions}</h2>
          <ul className="ds-list">
            {scenario.preconditions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rules.length > 0 && (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.rules}</h2>
          {rules.map((rule) => (
            <div className="ds-rule" key={rule.id}>
              <span className="ds-rule__id">{rule.id}</span>
              <span className="ds-rule__statement">{rule.statement}</span>
              {rule.rationale && <p className="ds-rule__rationale">{rule.rationale}</p>}
            </div>
          ))}
        </div>
      )}

      {scenario.actions?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.actions}</h2>
          <ul className="ds-list">
            {scenario.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scenario.expected?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.expected}</h2>
          <ul className="ds-list">
            {scenario.expected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scenario.ticket && (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.engineering}</h2>
          <p>{scenario.ticket}</p>
        </div>
      )}
      </ScopeGroup>

      <ScopeGroup
        scope="inherited"
        title={labels.inheritedScope}
        description={labels.inheritedScopeDescription}
      >
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.persona}</h2>
          <p style={{ color: "var(--ds-fg)", fontWeight: 600 }}>
            {persona?.name ?? "—"}
            {personaOverridden && (
              <span className="ds-chip" data-tone="warn" style={{ marginLeft: 6 }}>
                {labels.personaSwapped}
              </span>
            )}
          </p>
          {persona?.goal && <p>{labels.goal(persona.goal)}</p>}
        </div>

        {permissions.length > 0 && (
          <div className="ds-block">
            <h2 className="ds-block__title">{labels.permissions}</h2>
            <div className="ds-chips">
              {permissions.map((permission) => (
                <span className="ds-chip" key={permission}>
                  {permission}
                </span>
              ))}
            </div>
          </div>
        )}
      </ScopeGroup>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Diagnóstico
 * ------------------------------------------------------------------ */

function DiagnosticsPanel({ registry }: { registry: Registry }) {
  const labels = useLabels().inspector;
  const { issues } = registry;

  return (
    <>
      <ScopeGroup
        scope="product"
        title={labels.productScope}
        description={labels.diagnosticsProductNotice}
      >
      <div className="ds-block">
        <h2 className="ds-block__title">{labels.coverage}</h2>
        <p>{labels.scenariosRegistered(registry.product.scenarios.length)}</p>
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">{labels.scenarioContract}</h2>
        {issues.length === 0 ? (
          <p>{labels.noIssues}</p>
        ) : (
          issues.map((issue, index) => (
            <div className="ds-issue" data-level={issue.level} key={`${issue.where}-${index}`}>
              <span className="ds-issue__where">{issue.where}</span>
              {issue.message}
            </div>
          ))
        )}
      </div>
      </ScopeGroup>
    </>
  );
}

function ScopeGroup({
  scope,
  title,
  description,
  children,
}: {
  scope: "task" | "inherited" | "product";
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ds-scope-group" data-scope={scope}>
      <header className="ds-scope-group__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}
