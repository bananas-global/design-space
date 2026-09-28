/**
 * Lateral esquerda: Telas e Componentes.
 *
 * Uma tela é uma rota; um componente é uma referência do catálogo. A busca vale
 * para as duas abas ao mesmo tempo, sem diferenciar acento nem caixa, e a
 * contagem de cada aba mostra quantos itens casam — quem busca "botao" na aba
 * Telas vê que a resposta está em Componentes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Registry, ScreenNode } from "../registry/index.js";
import type { ComponentPreview, HandoffScope } from "../types/index.js";
import { Icon } from "./icons.js";
import { useLabels } from "./labels.js";
import { Resizer } from "./Resizer.js";

type SidebarTab = "screens" | "components";

export type SidebarProps = {
  registry: Registry;
  handoff: HandoffScope | undefined;
  activeScreen: string | undefined;
  activeComponent: string | undefined;
  onOpenScreen: (screenId: string) => void;
  onOpenComponent: (componentId: string) => void;
  width: number;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
};

export function Sidebar({
  registry,
  handoff,
  activeScreen,
  activeComponent,
  onOpenScreen,
  onOpenComponent,
  width,
  onResize,
  onResizeStart,
  onResizeEnd,
}: SidebarProps) {
  const labels = useLabels();
  const s = labels.sidebar;
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const allScreens = registry.screensFor({ handoff });
  const allComponents = registry.componentsFor(handoff);
  const hasScreens = allScreens.length > 0;
  const hasComponents = allComponents.length > 0;

  const [tab, setTab] = useState<SidebarTab>(() =>
    activeComponent || !hasScreens ? "components" : "screens",
  );

  // A aba segue o item aberto: um link de componente abre em Componentes. As
  // duas abas aparecem sempre, mesmo vazias — a aba vazia diz onde as telas
  // entram.
  useEffect(() => {
    if (activeComponent && hasComponents) setTab("components");
    else if (activeScreen && hasScreens) setTab("screens");
  }, [activeComponent, activeScreen, hasComponents, hasScreens]);
  const currentTab = tab;

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

  const screens = useMemo(
    () => registry.searchScreens(query, { handoff }),
    [handoff, query, registry],
  );
  const components = useMemo(
    () => registry.searchComponents(query, handoff),
    [handoff, query, registry],
  );
  const groups = useMemo(() => groupComponents(components, s.ungrouped), [components, s.ungrouped]);
  const searching = query.trim().length > 0;

  const toggleGroup = (group: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <nav className="ds-sidebar" aria-label={s.region} style={{ width }}>
      <div className="ds-search">
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          className="ds-input ds-search__input"
          type="search"
          value={query}
          placeholder={s.searchPlaceholder}
          aria-label={s.searchLabel}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
        />
        <kbd className="ds-kbd" aria-hidden="true">
          {s.searchShortcut}
        </kbd>
      </div>

      <div className="ds-tabs" role="tablist" aria-label={s.tabs}>
        <TabButton
          selected={currentTab === "screens"}
          label={s.screensTab}
          count={screens.length}
          onSelect={() => setTab("screens")}
        />
        <TabButton
          selected={currentTab === "components"}
          label={s.componentsTab}
          count={components.length}
          onSelect={() => setTab("components")}
        />
      </div>

      <div className="ds-sidebar__list" role="tabpanel">
        {currentTab === "screens" ? (
          !hasScreens ? (
            <p className="ds-empty">{s.emptyScreens}</p>
          ) : screens.length === 0 ? (
            <p className="ds-empty">{s.noMatch(query)}</p>
          ) : (
            <ul className="ds-items">
              {screens.map((screen) => (
                <ScreenItem
                  key={screen.id}
                  screen={screen}
                  active={screen.id === activeScreen && !activeComponent}
                  onOpen={onOpenScreen}
                />
              ))}
            </ul>
          )
        ) : !hasComponents ? (
          <p className="ds-empty">{s.emptyComponents}</p>
        ) : components.length === 0 ? (
          <p className="ds-empty">{s.noMatch(query)}</p>
        ) : (
          groups.map(({ group, items }) => {
            const isCollapsed = collapsed.has(group) && !searching;
            return (
              <section key={group} className="ds-group-section">
                <button
                  type="button"
                  className="ds-group-section__head"
                  aria-expanded={!isCollapsed}
                  aria-label={s.toggleGroup(group)}
                  onClick={() => toggleGroup(group)}
                >
                  <Icon name="chevron" size={12} />
                  <span>{group}</span>
                  <span className="ds-count">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <ul className="ds-items">
                    {items.map((component) => (
                      <li key={component.id}>
                        <button
                          type="button"
                          className="ds-item"
                          aria-current={component.id === activeComponent ? "true" : undefined}
                          onClick={() => onOpenComponent(component.id)}
                        >
                          <span className="ds-item__title">{component.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>

      <Resizer
        side="left"
        label={s.resize}
        value={width}
        onChange={onResize}
        onStart={onResizeStart}
        onEnd={onResizeEnd}
      />
    </nav>
  );
}

function TabButton({
  selected,
  label,
  count,
  onSelect,
}: {
  selected: boolean;
  label: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      className="ds-tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
    >
      <span>{label}</span>
      <span className="ds-count">{count}</span>
    </button>
  );
}

function ScreenItem({
  screen,
  active,
  onOpen,
}: {
  screen: ScreenNode;
  active: boolean;
  onOpen: (screenId: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="ds-item"
        aria-current={active ? "true" : undefined}
        onClick={() => onOpen(screen.id)}
      >
        <span className="ds-item__title">{screen.name}</span>
        {screen.variations.length > 1 && <span className="ds-count">{screen.variations.length}</span>}
      </button>
    </li>
  );
}

/** Componentes agrupados por `group`, na ordem em que cada grupo aparece. */
export function groupComponents(
  components: ComponentPreview[],
  ungrouped: string,
): { group: string; items: ComponentPreview[] }[] {
  const groups = new Map<string, ComponentPreview[]>();
  for (const component of components) {
    const group = component.group?.trim() || ungrouped;
    const list = groups.get(group) ?? [];
    list.push(component);
    groups.set(group, list);
  }
  return [...groups].map(([group, items]) => ({ group, items }));
}

/** Command/Ctrl + K, sem outros modificadores. */
export function isSearchShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k"
  );
}
