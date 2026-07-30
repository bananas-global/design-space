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
import type { Flow, Module, Scenario } from "../types/index.js";
import { STATUS_LABELS } from "./labels.js";

export type HomeProps = {
  registry: Registry;
  onOpenScenario: (scenarioId: string) => void;
};

export function Home({ registry, onOpenScenario }: HomeProps) {
  const { product } = registry;
  const coverage = registry.coverage();
  const total = product.scenarios.length;

  return (
    <div className="ds-chrome ds-home">
      <header className="ds-home__header">
        <h1>{product.name}</h1>
        {product.tagline && <p className="ds-home__tagline">{product.tagline}</p>}
        <p className="ds-home__lead">
          Especificação executável: cada situação abaixo abre por link, com persona, dados e regras
          próprios. {total} {total === 1 ? "situação registrada" : "situações registradas"}.
        </p>
        <div className="ds-chips">
          {Object.entries(coverage)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <span className="ds-chip" key={status}>
                {STATUS_LABELS[status as Scenario["status"]]}: {count}
              </span>
            ))}
        </div>
      </header>

      {registry.tree.map(({ module, scenarios }) => (
        <ModuleCard
          key={module.id}
          module={module}
          scenarios={scenarios}
          registry={registry}
          onOpenScenario={onOpenScenario}
        />
      ))}

      {registry.orphans.length > 0 && (
        <section className="ds-home__module">
          <h2>Sem módulo</h2>
          <p className="ds-home__hint">
            O prefixo do id não corresponde a nenhum módulo registrado, então estas situações não
            aparecem na navegação por módulo.
          </p>
          <ScenarioGrid
            scenarios={registry.orphans}
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
  onOpenScenario,
}: {
  module: Module;
  scenarios: Scenario[];
  registry: Registry;
  onOpenScenario: (id: string) => void;
}) {
  return (
    <section className="ds-home__module">
      <h2>{module.name}</h2>
      {module.description && <p className="ds-home__hint">{module.description}</p>}

      {(module.flows ?? []).map((flow) => (
        <FlowOutline key={flow.id} flow={flow} registry={registry} onOpenScenario={onOpenScenario} />
      ))}

      <ScenarioGrid scenarios={scenarios} registry={registry} onOpenScenario={onOpenScenario} />
    </section>
  );
}

function FlowOutline({
  flow,
  registry,
  onOpenScenario,
}: {
  flow: Flow;
  registry: Registry;
  onOpenScenario: (id: string) => void;
}) {
  return (
    <div className="ds-flow">
      <h3>{flow.title}</h3>
      {flow.description && <p className="ds-home__hint">{flow.description}</p>}
      <ol className="ds-flow__steps">
        {flow.steps.map((step, index) => {
          const scenario = registry.scenario(step.scenario);
          const branches = Object.entries(step.branches ?? {});
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
  if (scenarios.length === 0) {
    return <p className="ds-home__hint">Nenhuma situação registrada neste módulo ainda.</p>;
  }

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
              {STATUS_LABELS[scenario.status]}
              {scenario.a11y.keyboard === "full" ? " · teclado" : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
