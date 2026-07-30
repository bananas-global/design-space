/**
 * Navegação por módulo e cenário.
 *
 * A entrada principal apresenta o produto como mapa de situações, com o
 * vocabulário do cliente (§6). Não existe nome de arquivo, nem nome de
 * componente, nem id técnico em posição de destaque: o critério de aceite é que
 * uma pessoa não técnica encontre o cenário pelo vocabulário do produto.
 */

import { useMemo, useState } from "react";
import type { Registry } from "../registry/index.js";
import type { Scenario } from "../types/index.js";
import { STATUS_LABELS } from "./labels.js";

export type SidebarProps = {
  registry: Registry;
  activeScenario: string | undefined;
  onOpenScenario: (scenarioId: string) => void;
};

export function Sidebar({ registry, activeScenario, onOpenScenario }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const matches = useMemo(() => {
    if (!query.trim()) return undefined;
    return new Set(registry.search(query).map((s) => s.id));
  }, [query, registry]);

  const toggle = (moduleId: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  const visible = (scenarios: Scenario[]) =>
    matches ? scenarios.filter((s) => matches.has(s.id)) : scenarios;

  const nodes = registry.tree
    .map((node) => ({ ...node, scenarios: visible(node.scenarios) }))
    // Durante a busca, módulo sem resultado sai da lista. Fora dela, módulo
    // vazio permanece: um módulo declarado e sem cenário é informação útil.
    .filter((node) => (matches ? node.scenarios.length > 0 : true));

  const orphans = visible(registry.orphans);
  const total = nodes.reduce((sum, node) => sum + node.scenarios.length, 0) + orphans.length;

  return (
    <nav className="ds-chrome ds-sidebar" aria-label="Cenários do produto">
      <div className="ds-sidebar__search">
        <input
          className="ds-input ds-input--search"
          type="search"
          value={query}
          placeholder="Buscar situação…"
          aria-label="Buscar cenário pelo vocabulário do produto"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="ds-sidebar__tree">
        {query.trim() !== "" && (
          <p className="ds-sidebar__empty" role="status">
            {total === 0
              ? `Nenhuma situação para "${query}".`
              : `${total} ${total === 1 ? "situação" : "situações"}.`}
          </p>
        )}

        {nodes.map((node) => {
          const isOpen = !collapsed.has(node.module.id) || Boolean(matches);
          return (
            <section className="ds-module" key={node.module.id}>
              <button
                type="button"
                className="ds-module__header"
                aria-expanded={isOpen}
                onClick={() => toggle(node.module.id)}
              >
                <span className="ds-module__chevron" aria-hidden="true">
                  ▶
                </span>
                <span>{node.module.name}</span>
                <span className="ds-module__count">{node.scenarios.length}</span>
              </button>

              {isOpen && (
                <ul className="ds-module__scenarios">
                  {node.scenarios.map((scenario) => (
                    <ScenarioItem
                      key={scenario.id}
                      scenario={scenario}
                      isActive={scenario.id === activeScenario}
                      onOpen={onOpenScenario}
                    />
                  ))}
                  {node.scenarios.length === 0 && (
                    <li className="ds-sidebar__empty">Nenhum cenário ainda.</li>
                  )}
                </ul>
              )}
            </section>
          );
        })}

        {orphans.length > 0 && (
          <section className="ds-module">
            <div className="ds-module__header" aria-hidden="true">
              <span className="ds-module__chevron">▶</span>
              <span>Sem módulo</span>
              <span className="ds-module__count">{orphans.length}</span>
            </div>
            <ul className="ds-module__scenarios">
              {orphans.map((scenario) => (
                <ScenarioItem
                  key={scenario.id}
                  scenario={scenario}
                  isActive={scenario.id === activeScenario}
                  onOpen={onOpenScenario}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </nav>
  );
}

function ScenarioItem({
  scenario,
  isActive,
  onOpen,
}: {
  scenario: Scenario;
  isActive: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="ds-scenario"
        aria-current={isActive}
        onClick={() => onOpen(scenario.id)}
      >
        <span
          className="ds-status-dot"
          data-status={scenario.status}
          title={STATUS_LABELS[scenario.status]}
        />
        <span className="ds-scenario__title">{scenario.title}</span>
        <span className="ds-visually-hidden">{STATUS_LABELS[scenario.status]}</span>
      </button>
    </li>
  );
}
