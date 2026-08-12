/**
 * Entrada principal: o produto como mapa de situações (§6).
 *
 * Isto é do motor, não do produto, e a razão é o critério de aceite: uma pessoa
 * não técnica precisa encontrar o cenário pelo vocabulário do produto. Se a
 * entrada fosse uma tela do cliente, quem abre o link cai no meio de um fluxo
 * sem saber o que existe — ou pior, cai num estado sem permissão e conclui que
 * está quebrado.
 *
 * O mapa também expõe as jornadas com suas ramificações, que é a informação que
 * um PO procura antes de escolher o que discutir.
 */

import type { Registry } from "../registry/index.js";
import {
  SCENARIO_STATUSES,
  type Flow,
  type Module,
  type Scenario,
  type ScenarioView,
} from "../types/index.js";
import { useLabels } from "./labels.js";

export type HomeProps = {
  registry: Registry;
  onOpenScenario: (scenarioId: string) => void;
  view?: ScenarioView;
  onViewChange?: (view: ScenarioView) => void;
  /** @deprecated Use `view="ported"`. */
  showPorted?: boolean;
};

export function Home({
  registry,
  onOpenScenario,
  view: requestedView,
  onViewChange,
  showPorted = false,
}: HomeProps) {
  const labels = useLabels();
  const { product } = registry;
  const view = requestedView ?? (showPorted ? "ported" : "active");
  const options = { view };
  const coverage = registry.coverage(options);
  const total = registry.activeScenarios(options).length;
  const nodes = registry.treeFor(options).filter((node) => node.scenarios.length > 0);
  const orphans = registry.orphansFor(options);
  const portedTotal = registry.byStatus("ported").length;
  const viewLabel =
    view === "ported" ? labels.sidebar.portedReferences(portedTotal) : labels.sidebar.activeWork;

  return (
    <div className="ds-chrome ds-home">
      <header className="ds-home__header">
        <p className="ds-home__view" aria-live="polite">
          {viewLabel}
        </p>
        <h1>{product.name}</h1>
        {product.tagline && <p className="ds-home__tagline">{product.tagline}</p>}
        <p className="ds-home__lead">{labels.home.lead(total)}</p>
        <div className="ds-chips">
          {Object.entries(coverage)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <span className="ds-chip" key={status}>
                {labels.status[status as Scenario["status"]]}: {count}
              </span>
            ))}
        </div>
        {total > 0 && view === "active" && portedTotal > 0 && (
          <button
            type="button"
            className="ds-text-action ds-home__view-action"
            onClick={() => onViewChange?.("ported")}
          >
            {labels.sidebar.viewPorted(portedTotal)}
          </button>
        )}
        {view === "ported" && (
          <button
            type="button"
            className="ds-text-action ds-home__view-action"
            onClick={() => onViewChange?.("active")}
          >
            {labels.sidebar.backToActive}
          </button>
        )}
      </header>

      <section className="ds-home__legend" aria-labelledby="ds-status-legend-title">
        <h2 id="ds-status-legend-title">{labels.home.statusLegend}</h2>
        <ul>
          {SCENARIO_STATUSES.map((status) => (
            <li key={status}>
              <span className="ds-status-dot" data-status={status} aria-hidden="true" />
              <span>
                <strong>{labels.status[status]}</strong>
                <small>{labels.statusMeaning[status]}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {total === 0 && (
        <section className="ds-home__empty" aria-label={labels.sidebar.currentView(viewLabel)}>
          <p>
            {view === "ported" ? labels.home.noPortedReferences : labels.home.noActiveWork}
          </p>
          {view === "active" && portedTotal > 0 && (
            <button
              type="button"
              className="ds-text-action"
              onClick={() => onViewChange?.("ported")}
            >
              {labels.sidebar.viewPorted(portedTotal)}
            </button>
          )}
        </section>
      )}

      {nodes.map(({ module, scenarios }) => (
        <ModuleCard
          key={module.id}
          module={module}
          scenarios={scenarios}
          registry={registry}
          view={view}
          onOpenScenario={onOpenScenario}
        />
      ))}

      {orphans.length > 0 && (
        <section className="ds-home__module">
          <h2>{labels.home.withoutModule}</h2>
          <p className="ds-home__hint">{labels.home.withoutModuleHint}</p>
          <ScenarioGrid
            scenarios={orphans}
            registry={registry}
            onOpenScenario={onOpenScenario}
          />
        </section>
      )}
    </div>
  );
}

function ModuleCard({
  module,
  scenarios,
  registry,
  view,
  onOpenScenario,
}: {
  module: Module;
  scenarios: Scenario[];
  registry: Registry;
  view: ScenarioView;
  onOpenScenario: (id: string) => void;
}) {
  return (
    <section className="ds-home__module">
      <h2>{module.name}</h2>
      {module.description && <p className="ds-home__hint">{module.description}</p>}

      {(module.flows ?? []).map((flow) => (
        <FlowOutline
          key={flow.id}
          flow={flow}
          registry={registry}
          view={view}
          onOpenScenario={onOpenScenario}
        />
      ))}

      <ScenarioGrid scenarios={scenarios} registry={registry} onOpenScenario={onOpenScenario} />
    </section>
  );
}

function FlowOutline({
  flow,
  registry,
  view,
  onOpenScenario,
}: {
  flow: Flow;
  registry: Registry;
  view: ScenarioView;
  onOpenScenario: (id: string) => void;
}) {
  const visibleSteps = flow.steps.filter((step) => {
    const scenario = registry.scenario(step.scenario);
    return scenario && (view === "ported" ? scenario.status === "ported" : scenario.status !== "ported");
  });
  if (visibleSteps.length === 0) return null;

  return (
    <div className="ds-flow">
      <h3>{flow.title}</h3>
      {flow.description && <p className="ds-home__hint">{flow.description}</p>}
      <ol className="ds-flow__steps">
        {visibleSteps.map((step, index) => {
          const scenario = registry.scenario(step.scenario);
          const branches = Object.entries(step.branches ?? {}).filter(([, target]) => {
            const branchScenario = registry.scenario(target);
            return branchScenario &&
              (view === "ported" ? branchScenario.status === "ported" : branchScenario.status !== "ported");
          });
          return (
            <li key={`${step.scenario}-${index}`}>
              <button type="button" className="ds-flow__step" onClick={() => onOpenScenario(step.scenario)}>
                {step.label ?? scenario?.title ?? step.scenario}
              </button>
              {step.decision && <p className="ds-flow__decision">{step.decision}</p>}
              {branches.length > 0 && (
                <ul className="ds-flow__branches">
                  {branches.map(([label, target]) => (
                    <li key={label}>
                      <span className="ds-flow__branch-label">{label}</span>
                      <button
                        type="button"
                        className="ds-flow__step"
                        onClick={() => onOpenScenario(target)}
                      >
                        {registry.scenario(target)?.title ?? target}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ScenarioGrid({
  scenarios,
  registry,
  onOpenScenario,
}: {
  scenarios: Scenario[];
  registry: Registry;
  onOpenScenario: (id: string) => void;
}) {
  const labels = useLabels();

  return (
    <ul className="ds-home__grid">
      {scenarios.map((scenario) => (
        <li key={scenario.id}>
          <button type="button" className="ds-home__card" onClick={() => onOpenScenario(scenario.id)}>
            <span className="ds-home__card-head">
              <span className="ds-status-dot" data-status={scenario.status} />
              <span className="ds-home__card-title">{scenario.title}</span>
            </span>
            {scenario.intent && <span className="ds-home__card-intent">{scenario.intent}</span>}
            <span className="ds-home__card-meta">
              {registry.persona(scenario.persona)?.name ?? scenario.persona}
              {" · "}
              {labels.status[scenario.status]}
              {scenario.a11y.keyboard === "full" ? ` · ${labels.home.keyboardBadge}` : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
