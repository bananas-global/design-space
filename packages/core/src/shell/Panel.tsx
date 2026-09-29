/**
 * Lateral direita: Variações e Informações.
 *
 * Variações responde "em que situação esta tela está?" — no topo o contexto
 * (persona, rede, tema, idioma, fonte de dados), depois um bloco por grupo de
 * controles da tela e, por último, os cenários como atalhos para combinações.
 * Informações responde "o que eu preciso saber
 * para implementar?" — rota, intenção, comportamento esperado, regras e de onde
 * vem cada componente no sistema real, com o texto pronto para o PR.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  controlDefault,
  normalizeSearch,
  scenarioMatchesControls,
  type ComponentFixtureResolution,
  type Registry,
  type ScreenNode,
} from "../registry/index.js";
import type { DeployContext } from "../deploy/index.js";
import type { DesignSpaceLocation } from "../controls/state.js";
import {
  NETWORK_STATES,
  type ComponentPreview,
  type Control,
  type ControlsState,
  type NetworkState,
  type PanelTab,
  type Scenario,
} from "../types/index.js";
import { Icon } from "./icons.js";
import { useLabels } from "./labels.js";
import { buildFlowPrMarkdown, buildPrMarkdown } from "./prMarkdown.js";
import { Resizer } from "./Resizer.js";

export type PanelProps = {
  registry: Registry;
  controls: ControlsState;
  deploy: DeployContext;
  /** Endereço aberto: é o link da tela aberta no "Copiar para o PR". */
  location: DesignSpaceLocation;
  screen: ScreenNode | undefined;
  /** Cenário ativo quando ele é variação da tela aberta. */
  variation: Scenario | undefined;
  component: ComponentPreview | undefined;
  componentFixture: ComponentFixtureResolution;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onOpenScenario: (scenarioId: string) => void;
  onOpenComponent: (componentId: string) => void;
  /** Abre uma tela sem cenário, no `href` dela (com os exemplos de `route.params`). */
  onOpenScreen?: (screenId: string) => void;
  onChange: (patch: Partial<ControlsState>) => void;
  width: number;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
};

export function Panel(props: PanelProps) {
  const { tab, onTab, width, onResize, onResizeStart, onResizeEnd } = props;
  const labels = useLabels().panel;
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const onToggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const filtering = query.trim().length > 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isFilterShortcut(event)) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // O filtro age sobre o que já está renderizado: cada linha filtrável some se
  // o texto dela não casa, e uma seção some quando todas as linhas somem.
  useLayoutEffect(() => {
    setEmpty(applyFilter(bodyRef.current, query));
  });

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
      <div className="ds-search">
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          className="ds-input ds-search__input"
          type="search"
          value={query}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchLabel}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
        />
        <kbd className="ds-kbd" aria-hidden="true">
          {labels.searchShortcut}
        </kbd>
      </div>
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
      <div className="ds-panel__body" role="tabpanel" ref={bodyRef}>
        {tab === "variations" ? (
          <Variations {...props} collapsed={collapsed} onToggle={onToggle} filtering={filtering} />
        ) : (
          <Info {...props} />
        )}
        {empty && <p className="ds-empty">{labels.noMatch(query)}</p>}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------ variações */

type BlockState = {
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  filtering: boolean;
};

function Variations({
  registry,
  controls,
  screen,
  variation,
  component,
  componentFixture,
  onOpenScenario,
  onOpenComponent,
  onChange,
}: PanelProps & BlockState) {
  const labels = useLabels();
  const p = labels.panel;

  if (component) {
    const fixtures = component.fixtures ?? [];
    if (fixtures.length === 0) return <p className="ds-empty">{p.noComponentVariations}</p>;
    const current = componentFixture.fixture;
    return (
      <div className="ds-vcards">
        {componentFixture.didFallback && componentFixture.requestedId && current && (
          <p className="ds-notice">{p.fixtureFallback(componentFixture.requestedId, current.id)}</p>
        )}
        <Card title={component.name} hint={current?.description}>
          <Select
            label={p.variationsList}
            value={current?.id ?? ""}
            options={fixtures.map((fixture) => ({ value: fixture.id, label: fixture.label }))}
            onChange={(value) => onChange({ fixture: value })}
          />
        </Card>
      </div>
    );
  }

  if (!screen) return <p className="ds-empty">{p.nothingSelected}</p>;

  const variations = screen.variations;
  const product = registry.product;
  const modes = product.theme?.modes ?? [];
  const locales = product.theme?.locales ?? [];
  const adapters = product.dataSources?.adapters ?? [];
  const values = controls.screenControls ?? {};
  // O atalho fica destacado enquanto a combinação atual ainda é a dele.
  const highlighted = variation && scenarioMatchesControls(variation, values) ? variation : undefined;
  const setControl = (id: string, value: string) =>
    onChange({ screenControls: { ...values, [id]: value } });

  return (
    <div className="ds-vcards">
      <Card title={p.context}>
        <Select
          label={p.persona}
          value={controls.persona ?? ""}
          options={[
            // Com persona padrão, "nenhuma" não é uma situação possível.
            ...(registry.defaultPersona ? [] : [{ value: "", label: p.none }]),
            ...product.personas.map((persona) => ({ value: persona.id, label: persona.name })),
          ]}
          onChange={(value) => onChange({ persona: value || undefined })}
        />
        <Select
          label={p.network}
          value={controls.network}
          options={NETWORK_STATES.map((state) => ({ value: state, label: labels.network[state] }))}
          onChange={(value) => onChange({ network: value as NetworkState })}
        />
        {modes.length > 1 && (
          <Select
            label={p.theme}
            value={controls.themeMode ?? modes[0]!}
            options={modes.map((mode) => ({ value: mode, label: mode }))}
            onChange={(value) => onChange({ themeMode: value })}
          />
        )}
        {locales.length > 1 && (
          <Select
            label={p.locale}
            value={controls.locale ?? locales[0]!}
            options={locales.map((locale) => ({ value: locale, label: locale }))}
            onChange={(value) => onChange({ locale: value })}
          />
        )}
        {adapters.length > 0 && (
          <Select
            label={p.dataSource}
            value={controls.dataSource ?? "fixtures"}
            options={[
              { value: "fixtures", label: p.fixturesOption },
              ...adapters.map((adapter) => ({ value: adapter.id, label: adapter.label })),
            ]}
            onChange={(value) => onChange({ dataSource: value })}
          />
        )}
      </Card>

      {screen.controls.map((group) => {
        const linked = registry.component(group.component);
        return (
          <Card
            key={group.id}
            title={group.title}
            hint={group.note}
            link={linked ? { label: p.openComponent(linked.name), onOpen: () => onOpenComponent(linked.id) } : undefined}
          >
            {group.controls.map((control) => (
              <Select
                key={control.id}
                label={control.label}
                hint={control.description}
                value={values[control.id] ?? controlDefault(control)}
                options={control.options ?? []}
                onChange={(value) => setControl(control.id, value)}
              />
            ))}
          </Card>
        );
      })}

      {variations.length > 0 && (
        <Card title={p.shortcuts}>
          <ul className="ds-items" aria-label={p.variationsList}>
            {variations.map((item) => (
              <li key={item.id} data-ds-filter>
                <button
                  type="button"
                  className="ds-item"
                  title={item.intent}
                  aria-current={highlighted?.id === item.id ? "true" : undefined}
                  onClick={() => onOpenScenario(item.id)}
                >
                  <span className="ds-item__title">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/**
 * Cartão do painel Variações: o título numa linha só, uma seta discreta para o
 * componente no catálogo e, embaixo, os selects. A nota do grupo fica no
 * `title` do cabeçalho — contexto sob demanda, sem ocupar o painel.
 */
function Card({
  title,
  hint,
  link,
  children,
}: {
  title: string;
  hint?: string;
  link?: { label: string; onOpen: () => void };
  children: ReactNode;
}) {
  return (
    <section className="ds-vcard" data-ds-filter-group>
      <header className="ds-vcard__head" title={hint ? `${title} — ${hint}` : title}>
        <h3 className="ds-vcard__title ds-section__title" data-ds-filter-title>
          {title}
        </h3>
        {link && (
          <button
            type="button"
            className="ds-btn ds-btn--icon ds-vcard__link"
            aria-label={link.label}
            title={link.label}
            onClick={link.onOpen}
          >
            <Icon name="arrow-up-right" size={14} />
          </button>
        )}
      </header>
      <div className="ds-vcard__body">{children}</div>
    </section>
  );
}

/**
 * Todo controle é um select, sem rótulo visível: as opções dizem o que são. O
 * rótulo fica para o leitor de tela, para a dica e para o filtro do painel.
 */
function Select({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="ds-vcard__field" data-ds-filter title={hint ? `${label} — ${hint}` : label}>
      <span className="ds-visually-hidden">{label}</span>
      <select className="ds-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Mantido por compatibilidade com a 0.9.0: o painel passou a usar select para
 * todo controle.
 */
export function isSegmentedControl(control: Control): boolean {
  const options = control.options ?? [];
  const total = options.reduce((sum, option) => sum + option.label.length, 0);
  return options.length > 0 && options.length <= 4 && total <= 24;
}

/* --------------------------------------------------------- informações */

function Info({
  registry,
  controls,
  deploy,
  location,
  screen,
  variation,
  component,
  onOpenScenario,
  onOpenComponent,
  onOpenScreen,
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
                  <li key={usage.id} data-ds-filter>
                    <button
                      type="button"
                      className="ds-link"
                      onClick={() => (target ? onOpenScenario(target.id) : onOpenScreen?.(usage.id))}
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

  const components = variation
    ? registry.componentsOfScreen(screen, variation)
    : registry.componentsOfScreen(screen);
  const persona = registry.persona(controls.persona ?? variation?.persona);
  const rules = registry.rulesOf(variation);
  const values = controls.screenControls ?? {};
  const expected = variation?.expected?.length ? variation.expected : screen.route.expected;
  const overrides = controls.handoff ? { handoff: controls.handoff } : undefined;

  const copyForPr = async () => {
    const flow = screen.group ? registry.flowOf(screen, { handoff: controls.handoff }) : undefined;
    const markdown = flow?.name
      ? buildFlowPrMarkdown({
          flow: { name: flow.name, screens: flow.screens },
          registry,
          open: { screen, location, variation },
          deploy,
          labels,
          overrides,
        })
      : buildPrMarkdown({
          screen,
          variations: screen.variations,
          components: registry.componentsOfScreen(screen),
          deploy,
          labels,
          overrides,
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
        {screen.group && <Definition term={i.flow}>{screen.group}</Definition>}
        {screen.description && <Definition term={i.description}>{screen.description}</Definition>}
        <List term={i.expected} items={expected} />
      </Section>

      {screen.controls.length > 0 && (
        <Section title={i.controls}>
          {screen.controls.flatMap((group) =>
            group.controls.map((control) => {
              const value = values[control.id] ?? controlDefault(control);
              const option = control.options.find((item) => item.value === value);
              return (
                <Definition key={`${group.id}/${control.id}`} term={control.label}>
                  {option?.label ?? value} <code>{`c.${control.id}=${value}`}</code>
                </Definition>
              );
            }),
          )}
        </Section>
      )}

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
              <li key={item.id} data-ds-filter>
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
    <section className="ds-section" data-ds-filter-group>
      <h2 className="ds-section__title">{title}</h2>
      <div className="ds-defs">{children}</div>
    </section>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <dl className="ds-def" data-ds-filter>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </dl>
  );
}

function List({ term, items }: { term: string; items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <dl className="ds-def" data-ds-filter>
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

/** Cmd/Ctrl+F: o filtro do painel no lugar da busca do navegador. */
export function isFilterShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "f";
}

/**
 * Esconde as linhas do painel que não casam com o filtro, sem diferenciar
 * acento nem caixa. Devolve `true` quando o filtro não deixou nada visível.
 */
export function applyFilter(root: HTMLElement | null, query: string): boolean {
  if (!root) return false;
  const needle = normalizeSearch(query);
  const rows = [...root.querySelectorAll<HTMLElement>("[data-ds-filter]")];
  for (const row of rows) {
    row.hidden = needle.length > 0 && !normalizeSearch(row.textContent ?? "").includes(needle);
  }
  for (const group of root.querySelectorAll<HTMLElement>("[data-ds-filter-group]")) {
    const own = [...group.querySelectorAll<HTMLElement>("[data-ds-filter]")];
    const title = normalizeSearch(
      group.querySelector("[data-ds-filter-title], .ds-section__title")?.textContent ?? "",
    );
    if (needle.length > 0 && title.includes(needle)) {
      group.hidden = false;
      for (const row of own) row.hidden = false;
      continue;
    }
    group.hidden = needle.length > 0 && own.every((row) => row.hidden);
  }
  return needle.length > 0 && rows.length > 0 && rows.every((row) => row.hidden);
}
