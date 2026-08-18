/** Navegação entre fluxos e componentes do produto. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Registry } from "../registry/index.js";
import type { ComponentPreview, ControlsState, Scenario } from "../types/index.js";
import { useLabels } from "./labels.js";

type SidebarMode = "flows" | "components";

export type SidebarProps = {
  registry: Registry;
  activeScenario: Scenario | undefined;
  activeComponent: string | undefined;
  controls: ControlsState;
  onOpenScenario: (scenarioId: string) => void;
  onOpenComponent: (componentId: string) => void;
};

export function Sidebar({
  registry,
  activeScenario,
  activeComponent,
  controls,
  onOpenScenario,
  onOpenComponent,
}: SidebarProps) {
  const labels = useLabels();
  const [mode, setMode] = useState<SidebarMode>(activeComponent ? "components" : "flows");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (activeComponent) setMode("components");
    else if (activeScenario) setMode("flows");
  }, [activeComponent, activeScenario]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const scenarioMatches = useMemo(() => {
    if (!query.trim()) return undefined;
    return new Set(registry.search(query).map((scenario) => scenario.id));
  }, [query, registry]);

  const componentMatches = useMemo(() => {
    const needle = normalize(query);
    return (registry.product.components ?? []).filter((component) =>
      normalize([component.name, component.id, component.group, component.description].join(" ")).includes(
        needle,
      ),
    );
  }, [query, registry.product.components]);

  const visible = (scenarios: Scenario[]) =>
    scenarioMatches ? scenarios.filter((scenario) => scenarioMatches.has(scenario.id)) : scenarios;

  const nodes = registry.tree
    .map((node) => ({ ...node, scenarios: visible(node.scenarios) }))
    .filter((node) => (scenarioMatches ? node.scenarios.length > 0 : true));
  const orphans = visible(registry.orphans);
  const scenarioTotal =
    nodes.reduce((sum, node) => sum + node.scenarios.length, 0) + orphans.length;

  const groupedComponents = groupComponents(componentMatches);
  const visibleItemIds =
    mode === "flows"
      ? [...nodes.flatMap((node) => node.scenarios), ...orphans].map((scenario) => scenario.id)
      : componentMatches.map((component) => component.id);

  const focusItem = (currentId: string | undefined, offset: number) => {
    if (visibleItemIds.length === 0) return;
    const next = nextItemId(visibleItemIds, currentId, offset);
    if (next) itemRefs.current.get(next)?.focus();
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(undefined, 1);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  };

  const onItemKeyDown = (id: string, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    focusItem(id, event.key === "ArrowDown" ? 1 : -1);
  };

  const setItemRef = (id: string, element: HTMLButtonElement | null) => {
    if (element) itemRefs.current.set(id, element);
    else itemRefs.current.delete(id);
  };

  const toggle = (moduleId: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  return (
    <nav className="ds-chrome ds-sidebar" aria-label={labels.sidebar.region}>
      <div className="ds-sidebar__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "flows"}
          onClick={() => {
            setMode("flows");
            setQuery("");
          }}
        >
          {labels.sidebar.flowsTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "components"}
          onClick={() => {
            setMode("components");
            setQuery("");
          }}
        >
          {labels.sidebar.componentsTab}
        </button>
      </div>

      <div className="ds-sidebar__search">
        <input
          ref={searchRef}
          className="ds-input ds-input--search"
          type="search"
          value={query}
          placeholder={
            mode === "flows"
              ? labels.sidebar.searchPlaceholder
              : labels.sidebar.componentSearchPlaceholder
          }
          aria-label={
            mode === "flows" ? labels.sidebar.searchLabel : labels.sidebar.componentSearchLabel
          }
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onSearchKeyDown}
        />
        <kbd>{labels.sidebar.searchShortcut}</kbd>
      </div>

      <div className="ds-sidebar__tree" role="tabpanel">
        {query.trim() !== "" && (
          <p className="ds-sidebar__empty" role="status">
            {mode === "flows"
              ? scenarioTotal === 0
                ? labels.sidebar.noMatch(query)
                : labels.sidebar.matchCount(scenarioTotal)
              : componentMatches.length === 0
                ? labels.sidebar.noComponentMatch(query)
                : labels.sidebar.componentMatchCount(componentMatches.length)}
          </p>
        )}

        {mode === "flows" ? (
          <ScenarioTree
            nodes={nodes}
            orphans={orphans}
            matches={scenarioMatches}
            collapsed={collapsed}
            activeScenario={activeScenario?.id}
            emptyModuleLabel={labels.sidebar.emptyModule}
            withoutModuleLabel={labels.sidebar.withoutModule}
            onToggle={toggle}
            onOpen={onOpenScenario}
            onKeyDown={onItemKeyDown}
            setItemRef={setItemRef}
          />
        ) : groupedComponents.length === 0 && !query ? (
          <p className="ds-sidebar__empty">{labels.sidebar.emptyComponents}</p>
        ) : (
          groupedComponents.map(([group, components]) => (
            <section className="ds-component-group" key={group}>
              <h2>{group}</h2>
              <ul>
                {components.map((component) => (
                  <li key={component.id}>
                    <button
                      ref={(element) => setItemRef(component.id, element)}
                      type="button"
                      className="ds-component-item"
                      aria-current={component.id === activeComponent}
                      onClick={() => onOpenComponent(component.id)}
                      onKeyDown={(event) => onItemKeyDown(component.id, event)}
                    >
                      <span>{component.name}</span>
                      {component.description && <small>{component.description}</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {mode === "flows" && activeScenario && (
        <aside className="ds-sidebar__scope" aria-label={labels.sidebar.scope}>
          <h2>{labels.sidebar.scope}</h2>
          <dl>
            <dt>{labels.sidebar.scopeData}</dt>
            <dd>{registry.fixture(controls.fixture ?? activeScenario.fixture)?.label ?? labels.controls.none}</dd>
            <dt>{labels.sidebar.scopePersona}</dt>
            <dd>{registry.persona(controls.persona ?? activeScenario.persona)?.name ?? labels.controls.none}</dd>
            <dt>{labels.sidebar.scopeNetwork}</dt>
            <dd>{labels.network[controls.network]}</dd>
          </dl>
        </aside>
      )}
    </nav>
  );
}

type ScenarioTreeProps = {
  nodes: Registry["tree"];
  orphans: Scenario[];
  matches: Set<string> | undefined;
  collapsed: Set<string>;
  activeScenario: string | undefined;
  emptyModuleLabel: string;
  withoutModuleLabel: string;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onKeyDown: (id: string, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  setItemRef: (id: string, element: HTMLButtonElement | null) => void;
};

function ScenarioTree(props: ScenarioTreeProps) {
  return (
    <>
      {props.nodes.map((node) => {
        const isOpen = !props.collapsed.has(node.module.id) || Boolean(props.matches);
        return (
          <section className="ds-module" key={node.module.id}>
            <button
              type="button"
              className="ds-module__header"
              aria-expanded={isOpen}
              onClick={() => props.onToggle(node.module.id)}
            >
              <span className="ds-module__chevron" aria-hidden="true">▶</span>
              <span>{node.module.name}</span>
              <span className="ds-module__count">{node.scenarios.length}</span>
            </button>
            {isOpen && (
              <ul className="ds-module__scenarios">
                {node.scenarios.map((scenario) => (
                  <ScenarioItem key={scenario.id} scenario={scenario} {...props} />
                ))}
                {node.scenarios.length === 0 && <li className="ds-sidebar__empty">{props.emptyModuleLabel}</li>}
              </ul>
            )}
          </section>
        );
      })}
      {props.orphans.length > 0 && (
        <section className="ds-module">
          <div className="ds-module__header" aria-hidden="true">
            <span className="ds-module__chevron">▶</span>
            <span>{props.withoutModuleLabel}</span>
            <span className="ds-module__count">{props.orphans.length}</span>
          </div>
          <ul className="ds-module__scenarios">
            {props.orphans.map((scenario) => <ScenarioItem key={scenario.id} scenario={scenario} {...props} />)}
          </ul>
        </section>
      )}
    </>
  );
}

function ScenarioItem({ scenario, activeScenario, onOpen, onKeyDown, setItemRef }: ScenarioTreeProps & { scenario: Scenario }) {
  const status = useLabels().status[scenario.status];
  return (
    <li>
      <button
        ref={(element) => setItemRef(scenario.id, element)}
        type="button"
        className="ds-scenario"
        aria-current={scenario.id === activeScenario}
        onClick={() => onOpen(scenario.id)}
        onKeyDown={(event) => onKeyDown(scenario.id, event)}
      >
        <span className="ds-status-dot" data-status={scenario.status} title={status} />
        <span className="ds-scenario__title">{scenario.title}</span>
        <span className="ds-visually-hidden">{status}</span>
      </button>
    </li>
  );
}

function groupComponents(components: ComponentPreview[]): [string, ComponentPreview[]][] {
  const groups = new Map<string, ComponentPreview[]>();
  for (const component of components) {
    const group = component.group ?? "Componentes";
    groups.set(group, [...(groups.get(group) ?? []), component]);
  }
  return [...groups.entries()];
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function isSearchShortcut(event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): boolean {
  const key = event.key.toLowerCase();
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && (key === "k" || key === "f");
}

export function nextItemId(ids: string[], currentId: string | undefined, offset: number): string | undefined {
  if (ids.length === 0) return undefined;
  const current = currentId ? ids.indexOf(currentId) : -1;
  const next = Math.max(0, Math.min(ids.length - 1, current + offset));
  return ids[next];
}
