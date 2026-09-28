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
import type { ComponentPreview, Flow, HandoffScope, Module, Scenario } from "../types/index.js";
import { useLabels } from "./labels.js";

export type HomeProps = {
  registry: Registry;
  onOpenScenario: (scenarioId: string) => void;
  /** Abre um componente. Usado quando o produto é só catálogo de componentes. */
  onOpenComponent?: (componentId: string) => void;
  handoff?: HandoffScope;
};

export function Home({ registry, onOpenScenario, onOpenComponent, handoff }: HomeProps) {
  const labels = useLabels();
  const { product } = registry;
  const options = { handoff };
  const total = registry.activeScenarios(options).length;
  const nodes = registry.treeFor(options).filter((node) => node.scenarios.length > 0);
  const orphans = registry.orphansFor(options);
  const components = registry.componentsFor(handoff);
  // Sem cenário, a entrada é o catálogo: um mapa de situações vazio não diz
  // nada, e a pergunta de quem abre o link passa a ser "que componentes existem".
  const componentsOnly = total === 0 && components.length > 0;

  return (
    <div className="ds-chrome ds-home">
      <header className="ds-home__header">
        <h1>{product.name}</h1>
        {product.tagline && <p className="ds-home__tagline">{product.tagline}</p>}
        <p className="ds-home__lead">
          {componentsOnly ? labels.home.componentsLead(components.length) : labels.home.lead(total)}
        </p>
      </header>

      {componentsOnly && (
        <ComponentCatalog components={components} onOpenComponent={onOpenComponent} />
      )}

      {total === 0 && !componentsOnly && (
        <section className="ds-home__empty">
          <p>{labels.home.noScenarios}</p>
        </section>
      )}

      {nodes.map(({ module, scenarios }) => (
        <ModuleCard
          key={module.id}
          module={module}
          scenarios={scenarios}
          registry={registry}
          handoff={handoff}
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
  handoff,
  onOpenScenario,
}: {
  module: Module;
  scenarios: Scenario[];
  registry: Registry;
  handoff?: HandoffScope;
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
          handoff={handoff}
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
  handoff,
  onOpenScenario,
}: {
  flow: Flow;
  registry: Registry;
  handoff?: HandoffScope;
  onOpenScenario: (id: string) => void;
}) {
  const allowed = (id: string) =>
    Boolean(registry.scenario(id)) && (!handoff || Boolean(handoff.scenarios?.includes(id)));
  const visibleSteps = flow.steps.filter((step) => allowed(step.scenario));
  if (visibleSteps.length === 0) return null;

  return (
    <div className="ds-flow">
      <h3>{flow.title}</h3>
      {flow.description && <p className="ds-home__hint">{flow.description}</p>}
      <ol className="ds-flow__steps">
        {visibleSteps.map((step, index) => {
          const scenario = registry.scenario(step.scenario);
          const branches = Object.entries(step.branches ?? {}).filter(([, target]) =>
            allowed(target),
          );
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
  return (
    <ul className="ds-home__grid">
      {scenarios.map((scenario) => (
        <li key={scenario.id}>
          <button type="button" className="ds-home__card" onClick={() => onOpenScenario(scenario.id)}>
            <span className="ds-home__card-head">
              <span className="ds-home__card-title">{scenario.title}</span>
            </span>
            {scenario.intent && <span className="ds-home__card-intent">{scenario.intent}</span>}
            {scenario.persona && (
              <span className="ds-home__card-meta">
                {registry.persona(scenario.persona)?.name ?? scenario.persona}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ComponentCatalog({
  components,
  onOpenComponent,
}: {
  components: ComponentPreview[];
  onOpenComponent?: (id: string) => void;
}) {
  const labels = useLabels();
  const groups = new Map<string, ComponentPreview[]>();
  for (const component of components) {
    const group = component.group ?? labels.sidebar.componentsTab;
    groups.set(group, [...(groups.get(group) ?? []), component]);
  }

  return (
    <>
      {[...groups.entries()].map(([group, items]) => (
        <section className="ds-home__module" key={group}>
          <h2>{group}</h2>
          <ul className="ds-home__grid">
            {items.map((component) => (
              <li key={component.id}>
                <button
                  type="button"
                  className="ds-home__card"
                  onClick={() => onOpenComponent?.(component.id)}
                >
                  <span className="ds-home__card-head">
                    <span className="ds-home__card-title">{component.name}</span>
                  </span>
                  {component.description && (
                    <span className="ds-home__card-intent">{component.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
