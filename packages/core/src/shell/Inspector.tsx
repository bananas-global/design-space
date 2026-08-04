/**
 * Painel de contexto: regras, critérios, acessibilidade e diagnóstico.
 *
 * É aqui que o ambiente para de ser um protótipo bonito e passa a ser
 * especificação. A aba de acessibilidade existe no mesmo nível das outras de
 * propósito — se ela fosse a última aba, seria auditoria de fim de projeto com
 * outro nome.
 */

import { useState } from "react";
import type { Registry } from "../registry/index.js";
import type { AccessibleNode } from "../a11y/accessible-tree.js";
import { checkContrastPairs } from "../a11y/contrast.js";
import type { ControlsState, Scenario } from "../types/index.js";
import { useLabels } from "./labels.js";

type Tab = "scenario" | "a11y" | "diagnostics";

export type InspectorProps = {
  registry: Registry;
  scenario: Scenario | undefined;
  controls: ControlsState;
  focusedNode: AccessibleNode | undefined;
  tabStopCount: number;
};

export function Inspector({
  registry,
  scenario,
  controls,
  focusedNode,
  tabStopCount,
}: InspectorProps) {
  const labels = useLabels().inspector;
  const [tab, setTab] = useState<Tab>("scenario");
  const errorCount = registry.issues.filter((issue) => issue.level === "error").length;

  return (
    <aside className="ds-chrome ds-inspector" aria-label={labels.region}>
      <div className="ds-inspector__tabs" role="tablist">
        <TabButton id="scenario" current={tab} onSelect={setTab}>
          {labels.tabScenario}
        </TabButton>
        <TabButton id="a11y" current={tab} onSelect={setTab}>
          {labels.tabA11y}
        </TabButton>
        <TabButton id="diagnostics" current={tab} onSelect={setTab}>
          {errorCount > 0 ? labels.diagnosticsWithErrors(errorCount) : labels.tabDiagnostics}
        </TabButton>
      </div>

      <div className="ds-inspector__body" role="tabpanel">
        {tab === "scenario" && (
          <ScenarioPanel registry={registry} scenario={scenario} controls={controls} />
        )}
        {tab === "a11y" && (
          <A11yPanel
            registry={registry}
            scenario={scenario}
            focusedNode={focusedNode}
            keyboardMode={controls.keyboardMode}
            tabStopCount={tabStopCount}
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
  controls,
}: {
  registry: Registry;
  scenario: Scenario | undefined;
  controls: ControlsState;
}) {
  const all = useLabels();
  const labels = all.inspector;

  if (!scenario) {
    return <p className="ds-block">{labels.noScenario}</p>;
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
      <div className="ds-block">
        <h2 className="ds-block__title">{labels.situation}</h2>
        <p style={{ color: "var(--ds-fg)", fontSize: 14, fontWeight: 600 }}>{scenario.title}</p>
        {scenario.intent && <p>{scenario.intent}</p>}
        <div className="ds-chips">
          <span className="ds-chip" data-tone={statusTone(scenario.status)}>
            {all.status[scenario.status]}
          </span>
          {(scenario.tags ?? []).map((tag) => (
            <span className="ds-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <p style={{ marginTop: 6 }}>{all.statusMeaning[scenario.status]}</p>
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">{labels.reproduction}</h2>
        <dl className="ds-kv">
          <dt>{labels.id}</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.id}</dd>
          <dt>{labels.route}</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.route}</dd>
          <dt>{labels.persona}</dt>
          <dd>
            {persona?.name ?? "—"}
            {personaOverridden && (
              <span className="ds-chip" data-tone="warn" style={{ marginLeft: 6 }}>
                {labels.personaSwapped}
              </span>
            )}
          </dd>
          <dt>{labels.data}</dt>
          <dd>{fixture?.label ?? "—"}</dd>
          <dt>{labels.network}</dt>
          <dd>{all.network[controls.network]}</dd>
        </dl>
        {persona?.goal && <p style={{ marginTop: 8 }}>{labels.goal(persona.goal)}</p>}
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

      {scenario.approvedAt && (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.approval}</h2>
          <p>
            {scenario.approvedAt.date} · <code>{scenario.approvedAt.commit.slice(0, 7)}</code>
          </p>
          <a href={scenario.approvedAt.url} target="_blank" rel="noreferrer">
            {labels.openApproved}
          </a>
        </div>
      )}

      {scenario.ticket && (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.engineering}</h2>
          <p>{scenario.ticket}</p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Acessibilidade
 * ------------------------------------------------------------------ */

function A11yPanel({
  registry,
  scenario,
  focusedNode,
  keyboardMode,
  tabStopCount,
}: {
  registry: Registry;
  scenario: Scenario | undefined;
  focusedNode: AccessibleNode | undefined;
  keyboardMode: boolean;
  tabStopCount: number;
}) {
  const all = useLabels();
  const labels = all.inspector;
  const contrast = checkContrastPairs(registry.product.theme?.contrastPairs);
  const failing = contrast.filter((result) => result.passes !== true);

  return (
    <>
      {scenario && (
        <div className="ds-block">
          <h2 className="ds-block__title">{labels.a11yContract}</h2>
          <dl className="ds-kv">
            <dt>{labels.keyboard}</dt>
            <dd>{all.keyboard[scenario.a11y.keyboard]}</dd>
            <dt>{labels.contrast}</dt>
            <dd>{labels.contrastTarget(scenario.a11y.contrast)}</dd>
          </dl>
          {scenario.a11y.announces?.length ? (
            <>
              <p style={{ marginTop: 8 }}>{labels.announces}</p>
              <div className="ds-chips">
                {scenario.a11y.announces.map((event) => (
                  <span className="ds-chip" key={event}>
                    {event}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {scenario.a11y.notes && <p style={{ marginTop: 8 }}>{scenario.a11y.notes}</p>}
        </div>
      )}

      <div className="ds-block">
        <h2 className="ds-block__title">{labels.focusedElement}</h2>
        {!keyboardMode ? (
          <p>{labels.keyboardModeOff}</p>
        ) : !focusedNode ? (
          <p>{labels.pressTab(tabStopCount)}</p>
        ) : (
          <>
            <dl className="ds-kv">
              <dt>{labels.role}</dt>
              <dd>{focusedNode.role}</dd>
              <dt>{labels.name}</dt>
              <dd>
                {focusedNode.name ? (
                  focusedNode.name
                ) : (
                  <span style={{ color: "var(--ds-err)" }}>{labels.noAccessibleName}</span>
                )}
              </dd>
              <dt>{labels.nameFrom}</dt>
              <dd>{focusedNode.nameFrom}</dd>
              {focusedNode.description ? (
                <>
                  <dt>{labels.description}</dt>
                  <dd>{focusedNode.description}</dd>
                </>
              ) : null}
              <dt>{labels.selector}</dt>
              <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>
                {focusedNode.selector}
              </dd>
            </dl>
            {focusedNode.states.length > 0 && (
              <div className="ds-chips" style={{ marginTop: 8 }}>
                {focusedNode.states.map((state) => (
                  <span className="ds-chip" key={state}>
                    {state}
                  </span>
                ))}
              </div>
            )}
            {focusedNode.hiddenFromAssistiveTech && (
              <p className="ds-note" style={{ marginTop: 8 }}>
                {labels.focusableButHidden}
              </p>
            )}
            <p style={{ marginTop: 8 }}>{labels.tabStopsInStage(tabStopCount)}</p>
          </>
        )}
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">{labels.tokenContrast}</h2>
        {contrast.length === 0 ? (
          <p>{labels.noContrastPairs}</p>
        ) : (
          <table className="ds-contrast">
            <thead>
              <tr>
                <th scope="col">{labels.pair}</th>
                <th scope="col">{labels.ratio}</th>
              </tr>
            </thead>
            <tbody>
              {contrast.map((result) => (
                <tr key={result.pair.name}>
                  <td>
                    <span
                      className="ds-swatch"
                      style={{ background: result.pair.background }}
                      aria-hidden="true"
                    />
                    <span
                      className="ds-swatch"
                      style={{ background: result.pair.foreground }}
                      aria-hidden="true"
                    />
                    {result.pair.name}
                  </td>
                  <td
                    style={{
                      color:
                        result.passes === true
                          ? "var(--ds-ok)"
                          : result.passes === false
                            ? "var(--ds-err)"
                            : "var(--ds-warn)",
                    }}
                  >
                    {result.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {failing.length > 0 && (
          <p className="ds-note" style={{ marginTop: 8 }}>
            {labels.pairsFailing(failing.length)}
          </p>
        )}
      </div>

      <p className="ds-note">{labels.automatedIsFloor}</p>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Diagnóstico
 * ------------------------------------------------------------------ */

function DiagnosticsPanel({ registry }: { registry: Registry }) {
  const all = useLabels();
  const labels = all.inspector;
  const coverage = registry.coverage();
  const { issues } = registry;

  return (
    <>
      <div className="ds-block">
        <h2 className="ds-block__title">{labels.coverage}</h2>
        <dl className="ds-kv">
          {Object.entries(coverage)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status} style={{ display: "contents" }}>
                <dt>{all.status[status as Scenario["status"]]}</dt>
                <dd style={{ fontVariantNumeric: "tabular-nums" }}>{count}</dd>
              </div>
            ))}
        </dl>
        <p style={{ marginTop: 8 }}>{labels.scenariosRegistered(registry.product.scenarios.length)}</p>
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
    </>
  );
}

function statusTone(status: Scenario["status"]): string | undefined {
  if (status === "approved" || status === "implemented") return "ok";
  if (status === "in-review" || status === "proposed") return "warn";
  return undefined;
}
