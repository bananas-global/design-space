/**
 * Vocabulário do motor, com o português como padrão e override pelo produto.
 *
 * O motor é neutro quanto ao produto e agora também quanto ao idioma. A razão é
 * concreta: o chrome fica na mesma tela que a UI do cliente, então um Design
 * Space revisado em inglês misturava "Copiar link" e "Revisão limpa" com a
 * interface dele. Traduzir só parte do chrome seria pior que não traduzir — o
 * rótulo em outro idioma vira ruído no meio da revisão.
 *
 * Rótulo de **produto** continua vindo do produto: nome de módulo, título de
 * cenário, nome de persona, rótulo de fixture. O que vive aqui é rótulo de
 * **mecanismo**.
 *
 * O produto sobrescreve o que quiser em `theme.labels`, por grupo, e o que não
 * declarar fica no padrão:
 *
 * ```ts
 * theme: {
 *   labels: {
 *     network: { success: "Success", error: "Error" },
 *     topbar: { copyLink: "Copy link" },
 *   },
 * }
 * ```
 */

import { createContext, useContext } from "react";

import type { NetworkState } from "../types/index.js";

export type Labels = {
  network: Record<NetworkState, string>;
  /** Rótulo de viewport por id: `fit`, `mobile`, `tablet`, `desktop`, `custom`. */
  viewport: Record<string, string>;
  topbar: {
    homeTitle: (product: string) => string;
    toggleNav: string;
    copyLink: string;
    copied: string;
    copyPrompt: string;
    cleanReview: string;
    cleanReviewTitle: string;
    panel: string;
    lightMode: string;
    darkMode: string;
    branchTitle: (branch: string) => string;
    commitTitle: (commit: string) => string;
    envTitle: (env: string) => string;
  };
  sidebar: {
    region: string;
    flowsTab: string;
    componentsTab: string;
    searchPlaceholder: string;
    searchLabel: string;
    componentSearchPlaceholder: string;
    componentSearchLabel: string;
    searchShortcut: string;
    noMatch: (query: string) => string;
    matchCount: (total: number) => string;
    noComponentMatch: (query: string) => string;
    componentMatchCount: (total: number) => string;
    emptyScenarios: string;
    emptyComponents: string;
    withoutModule: string;
    scope: string;
    scopeData: string;
    scopePersona: string;
    scopeNetwork: string;
  };
  controls: {
    region: string;
    persona: string;
    fixture: string;
    componentFixture: string;
    network: string;
    viewport: string;
    customWidth: string;
    theme: string;
    locale: string;
    dataSource: string;
    fixturesOption: string;
    none: string;
  };
  inspector: {
    region: string;
    tabScenario: string;
    tabDiagnostics: string;
    diagnosticsWithErrors: (count: number) => string;
    noScenario: string;
    componentReference: string;
    componentGroup: string;
    componentFixture: string;
    componentFixtureDescription: string;
    componentFixtureFallback: (requested: string, fallback: string) => string;
    taskScope: string;
    taskScopeDescription: string;
    inheritedScope: string;
    inheritedScopeDescription: string;
    productScope: string;
    productScopeDescription: string;
    situation: string;
    reproduction: string;
    id: string;
    route: string;
    persona: string;
    personaSwapped: string;
    data: string;
    network: string;
    goal: (goal: string) => string;
    permissions: string;
    preconditions: string;
    rules: string;
    actions: string;
    expected: string;
    engineering: string;
    coverage: string;
    scenariosRegistered: (count: number) => string;
    scenarioContract: string;
    noIssues: string;
    diagnosticsProductNotice: string;
  };
  home: {
    lead: (total: number) => string;
    componentsLead: (total: number) => string;
    withoutModule: string;
    withoutModuleHint: string;
    noScenarios: string;
  };
  shell: {
    restoreChrome: string;
    noRoute: string;
    noRouteHint: string;
    outsideHandoff: string;
    outsideHandoffHint: string;
  };
};

/** Português. É o padrão, não uma obrigação. */
export const DEFAULT_LABELS: Labels = {
  network: {
    success: "Sucesso",
    loading: "Carregando",
    empty: "Vazio",
    error: "Erro",
    slow: "Lento",
  },

  viewport: {
    fit: "Ajustar",
    mobile: "Celular",
    tablet: "Tablet",
    desktop: "Desktop",
    custom: "Personalizado",
  },

  topbar: {
    homeTitle: (product) => `Ir para a página inicial de ${product}`,
    toggleNav: "Mostrar ou ocultar a navegação",
    copyLink: "Copiar link",
    copied: "Link copiado",
    copyPrompt: "Copie o link do cenário:",
    cleanReview: "Revisão limpa",
    cleanReviewTitle: "Abrir a situação em uma nova aba, sem o chrome do Design Space",
    panel: "Painel",
    lightMode: "Modo claro",
    darkMode: "Modo escuro",
    branchTitle: (branch) => `Branch: ${branch}`,
    commitTitle: (commit) => `Commit: ${commit}`,
    envTitle: (env) => `Ambiente: ${env}`,
  },

  sidebar: {
    region: "Cenários do produto",
    flowsTab: "Fluxos",
    componentsTab: "Componentes",
    searchPlaceholder: "Buscar situação…",
    searchLabel: "Buscar cenário pelo vocabulário do produto",
    componentSearchPlaceholder: "Buscar componente…",
    componentSearchLabel: "Buscar componente do produto",
    searchShortcut: "⌘K",
    noMatch: (query) => `Nenhuma situação para "${query}".`,
    matchCount: (total) => `${total} ${total === 1 ? "situação" : "situações"}.`,
    noComponentMatch: (query) => `Nenhum componente para "${query}".`,
    componentMatchCount: (total) => `${total} ${total === 1 ? "componente" : "componentes"}.`,
    emptyScenarios: "O produto ainda não registrou cenários.",
    emptyComponents: "O produto ainda não registrou componentes.",
    withoutModule: "Sem módulo",
    scope: "Escopo ativo",
    scopeData: "Dados",
    scopePersona: "Persona",
    scopeNetwork: "Rede",
  },

  controls: {
    region: "Controles do cenário",
    persona: "Persona",
    fixture: "Dados",
    componentFixture: "Dados do componente",
    network: "Rede",
    viewport: "Viewport",
    customWidth: "Largura personalizada em pixels",
    theme: "Tema",
    locale: "Idioma",
    dataSource: "Fonte",
    fixturesOption: "Fixtures",
    none: "—",
  },

  inspector: {
    region: "Painel de contexto",
    tabScenario: "Cenário",
    tabDiagnostics: "Diagnóstico",
    diagnosticsWithErrors: (count) => `Diagnóstico (${count})`,
    noScenario:
      "Nenhum cenário ativo. Escolha uma situação na navegação para ver contexto, regras e critérios.",
    componentReference: "Componente",
    componentGroup: "Grupo",
    componentFixture: "Fixture ativa",
    componentFixtureDescription: "Descrição da fixture",
    componentFixtureFallback: (requested, fallback) =>
      `A fixture \`${requested}\` não existe neste componente. Exibindo \`${fallback}\` como fallback.`,
    taskScope: "Dados desta tarefa",
    taskScopeDescription: "Contrato e estado autorizados para a situação ativa.",
    inheritedScope: "Contexto herdado do produto e da persona",
    inheritedScopeDescription:
      "Informações compartilhadas que ajudam a interpretar a tarefa, mas não pertencem só a ela.",
    productScope: "Verificações gerais do produto",
    productScopeDescription: "Resultados compartilhados por todo o catálogo, não só por esta tarefa.",
    situation: "Situação",
    reproduction: "Reprodução",
    id: "Id",
    route: "Rota",
    persona: "Persona",
    personaSwapped: "trocada",
    data: "Dados",
    network: "Rede",
    goal: (goal) => `Objetivo: ${goal}`,
    permissions: "Permissões efetivas",
    preconditions: "Pré-condições",
    rules: "Regras",
    actions: "Ações disponíveis",
    expected: "Critérios de aceite",
    engineering: "Engenharia",
    coverage: "Cobertura",
    scenariosRegistered: (count) => `${count} cenários registrados.`,
    scenarioContract: "Contrato de cenário",
    noIssues: "Nenhum problema encontrado.",
    diagnosticsProductNotice:
      "Este diagnóstico avalia o catálogo inteiro do produto, inclusive itens fora da tarefa e do handoff ativos.",
  },

  home: {
    componentsLead: (total) =>
      `Catálogo de componentes e layouts do produto, cada um com dados sintéticos próprios. ${total} ${
        total === 1 ? "componente registrado" : "componentes registrados"
      }.`,
    lead: (total) =>
      `Especificação executável: cada situação abaixo abre por link, com persona, dados e regras próprios. ${total} ${
        total === 1 ? "situação registrada" : "situações registradas"
      }.`,
    withoutModule: "Sem módulo",
    withoutModuleHint:
      "O prefixo do id não corresponde a nenhum módulo registrado, então estas situações não aparecem na navegação por módulo.",
    noScenarios: "O produto ainda não registrou cenários. Os componentes ficam na aba Componentes da navegação.",
  },

  shell: {
    restoreChrome: "Mostrar controles",
    noRoute: "Nenhuma rota para este endereço",
    noRouteHint: "não casa com nenhuma rota declarada. Escolha uma situação na navegação.",
    outsideHandoff: "Fora do escopo deste handoff",
    outsideHandoffHint:
      "Este link permite revisar somente os cenários, rotas e componentes listados no handoff. Escolha um item disponível na navegação.",
  },
};

/** English (United States), selectable by the product through `theme.labels`. */
export const EN_US_LABELS: Labels = {
  network: {
    success: "Success",
    loading: "Loading",
    empty: "Empty",
    error: "Error",
    slow: "Slow",
  },

  viewport: {
    fit: "Fit",
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
    custom: "Custom",
  },

  topbar: {
    homeTitle: (product) => `Go to ${product} home`,
    toggleNav: "Show or hide navigation",
    copyLink: "Copy link",
    copied: "Link copied",
    copyPrompt: "Copy the scenario link:",
    cleanReview: "Clean review",
    cleanReviewTitle: "Open this state in a new tab without the Design Space chrome",
    panel: "Panel",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    branchTitle: (branch) => `Branch: ${branch}`,
    commitTitle: (commit) => `Commit: ${commit}`,
    envTitle: (env) => `Environment: ${env}`,
  },

  sidebar: {
    region: "Product scenarios",
    flowsTab: "Flows",
    componentsTab: "Components",
    searchPlaceholder: "Search scenarios…",
    searchLabel: "Search scenarios using product language",
    componentSearchPlaceholder: "Search components…",
    componentSearchLabel: "Search product components",
    searchShortcut: "⌘K",
    noMatch: (query) => `No scenarios found for "${query}".`,
    matchCount: (total) => `${total} ${total === 1 ? "scenario" : "scenarios"}.`,
    noComponentMatch: (query) => `No components found for "${query}".`,
    componentMatchCount: (total) => `${total} ${total === 1 ? "component" : "components"}.`,
    emptyScenarios: "The product has not registered any scenarios yet.",
    emptyComponents: "The product has not registered any components yet.",
    withoutModule: "No module",
    scope: "Active scope",
    scopeData: "Data",
    scopePersona: "Persona",
    scopeNetwork: "Network",
  },

  controls: {
    region: "Scenario controls",
    persona: "Persona",
    fixture: "Data",
    componentFixture: "Component data",
    network: "Network",
    viewport: "Viewport",
    customWidth: "Custom width in pixels",
    theme: "Theme",
    locale: "Language",
    dataSource: "Source",
    fixturesOption: "Fixtures",
    none: "—",
  },

  inspector: {
    region: "Context panel",
    tabScenario: "Scenario",
    tabDiagnostics: "Diagnostics",
    diagnosticsWithErrors: (count) => `Diagnostics (${count})`,
    noScenario:
      "No active scenario. Choose a state in the navigation to see its context, rules, and criteria.",
    componentReference: "Component",
    componentGroup: "Group",
    componentFixture: "Active fixture",
    componentFixtureDescription: "Fixture description",
    componentFixtureFallback: (requested, fallback) =>
      `Fixture \`${requested}\` does not exist for this component. Showing \`${fallback}\` as fallback.`,
    taskScope: "This task",
    taskScopeDescription: "The contract and authorized state for the active scenario.",
    inheritedScope: "Inherited product and persona context",
    inheritedScopeDescription:
      "Shared information that helps interpret the task but does not belong only to it.",
    productScope: "Product-wide checks",
    productScopeDescription: "Results shared across the catalog, not only this task.",
    situation: "State",
    reproduction: "Reproduction",
    id: "ID",
    route: "Route",
    persona: "Persona",
    personaSwapped: "changed",
    data: "Data",
    network: "Network",
    goal: (goal) => `Goal: ${goal}`,
    permissions: "Effective permissions",
    preconditions: "Preconditions",
    rules: "Rules",
    actions: "Available actions",
    expected: "Acceptance criteria",
    engineering: "Engineering",
    coverage: "Coverage",
    scenariosRegistered: (count) => `${count} ${count === 1 ? "scenario" : "scenarios"} registered.`,
    scenarioContract: "Scenario contract",
    noIssues: "No issues found.",
    diagnosticsProductNotice:
      "These diagnostics evaluate the entire product catalog, including items outside the active task and handoff.",
  },

  home: {
    componentsLead: (total) =>
      `Catalog of the product's components and layouts, each with its own synthetic data. ${total} ${
        total === 1 ? "component registered" : "components registered"
      }.`,
    lead: (total) =>
      `Executable specification: each state below opens from a link with its own persona, data, and rules. ${total} ${
        total === 1 ? "state registered" : "states registered"
      }.`,
    withoutModule: "No module",
    withoutModuleHint:
      "The ID prefix does not match a registered module, so these states do not appear in module navigation.",
    noScenarios: "The product has not registered any scenarios yet. Components live in the Components tab of the navigation.",
  },

  shell: {
    restoreChrome: "Show controls",
    noRoute: "No route for this address",
    noRouteHint: "does not match any declared route. Choose a state from the navigation.",
    outsideHandoff: "Outside this handoff scope",
    outsideHandoffHint:
      "This link only allows review of the scenarios, routes, and components listed in the handoff. Choose an available item from the navigation.",
  },
};

/** Override por grupo. O que não vier declarado fica no padrão. */
export type LabelsOverride = {
  [Group in keyof Labels]?: Partial<Labels[Group]>;
};

/**
 * Mescla um grupo por vez. Dois níveis bastam porque a estrutura tem dois, e
 * mesclagem profunda genérica engoliria erro de digitação em vez de deixar o
 * TypeScript reclamar.
 */
export function resolveLabels(override?: LabelsOverride): Labels {
  if (!override) return DEFAULT_LABELS;

  const merged: Labels = { ...DEFAULT_LABELS };
  for (const key of Object.keys(DEFAULT_LABELS) as (keyof Labels)[]) {
    const group = override[key];
    // O cast é aqui porque o TypeScript perde a correlação entre a chave e o tipo
    // do grupo dentro do laço. A superfície pública continua tipada: quem escreve
    // `theme.labels` é checado contra `LabelsOverride`.
    if (group) (merged as Record<string, unknown>)[key] = { ...DEFAULT_LABELS[key], ...group };
  }
  return merged;
}

/**
 * Rótulos resolvidos, para o chrome inteiro.
 *
 * O padrão do contexto é o português, então `Home` e `Stage` — exportados e
 * montáveis fora do `DesignSpace` — continuam funcionando sem provider.
 */
export const LabelsContext = createContext<Labels>(DEFAULT_LABELS);

export function useLabels(): Labels {
  return useContext(LabelsContext);
}

/* ------------------------------------------------------------------ *
 * Compatibilidade
 * ------------------------------------------------------------------ */

/** @deprecated Use `useLabels().network`. */
export const NETWORK_LABELS = DEFAULT_LABELS.network;
