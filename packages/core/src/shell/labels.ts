/**
 * Vocabulário do motor, com o português como padrão e override pelo produto.
 *
 * O motor é neutro quanto ao produto e agora também quanto ao idioma. A razão é
 * concreta: o chrome fica na mesma tela que a UI do cliente, então um Design
 * Space revisado em inglês misturava "Em revisão" e "Copiar link" com a
 * interface dele. Traduzir só os status seria pior que não traduzir — o rótulo em
 * outro idioma vira ruído no meio da revisão.
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
 *     status: { approved: "Approved", "in-review": "In review" },
 *     topbar: { copyLink: "Copy link" },
 *   },
 * }
 * ```
 */

import { createContext, useContext } from "react";

import type { KeyboardCoverage, NetworkState, ScenarioStatus } from "../types/index.js";

export type Labels = {
  status: Record<ScenarioStatus, string>;
  statusMeaning: Record<ScenarioStatus, string>;
  network: Record<NetworkState, string>;
  keyboard: Record<KeyboardCoverage, string>;
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
    showPorted: string;
    activePorted: string;
    emptyModule: string;
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
    a11y: string;
    keyboardMode: string;
    keyboardModeTitle: string;
    reducedMotion: string;
    reducedMotionTitle: string;
    textScale: string;
    none: string;
  };
  inspector: {
    region: string;
    tabScenario: string;
    tabA11y: string;
    tabDiagnostics: string;
    diagnosticsWithErrors: (count: number) => string;
    noScenario: string;
    componentReference: string;
    componentGroup: string;
    componentFixture: string;
    componentFixtureDescription: string;
    componentFixtureFallback: (requested: string, fallback: string) => string;
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
    approval: string;
    openApproved: string;
    engineering: string;
    a11yContract: string;
    keyboard: string;
    contrast: string;
    contrastTarget: (target: string) => string;
    announces: string;
    focusedElement: string;
    keyboardModeOff: string;
    pressTab: (tabStops: number) => string;
    role: string;
    name: string;
    noAccessibleName: string;
    nameFrom: string;
    description: string;
    selector: string;
    focusableButHidden: string;
    tabStopsInStage: (tabStops: number) => string;
    tokenContrast: string;
    noContrastPairs: string;
    pair: string;
    ratio: string;
    pairsFailing: (count: number) => string;
    automatedIsFloor: string;
    coverage: string;
    scenariosRegistered: (count: number) => string;
    scenarioContract: string;
    noIssues: string;
  };
  home: {
    lead: (total: number) => string;
    withoutModule: string;
    withoutModuleHint: string;
    emptyModule: string;
    keyboardBadge: string;
    noActiveWork: string;
  };
  shell: {
    restoreChrome: string;
    noRoute: string;
    noRouteHint: string;
  };
};

/** Português. É o padrão, não uma obrigação. */
export const DEFAULT_LABELS: Labels = {
  status: {
    ported: "Portado — não validado",
    proposed: "Proposta",
    "in-review": "Em revisão",
    approved: "Aprovado",
    "in-implementation": "Em implementação",
    implemented: "Implementado",
    superseded: "Superado",
  },

  statusMeaning: {
    ported:
      "Veio do sistema existente, mas não foi validado e não representa compromisso de implementação.",
    proposed: "Exploração ainda não aprovada.",
    "in-review": "Aberto para validação de design, negócio ou cliente.",
    approved: "Referência autorizada, registrada por URL de commit.",
    "in-implementation": "Ligado a um trabalho ativo de engenharia.",
    implemented: "Disponível no produto real e validado.",
    superseded: "Mantido para histórico ou substituído por outra decisão.",
  },

  network: {
    success: "Sucesso",
    loading: "Carregando",
    empty: "Vazio",
    error: "Erro",
    slow: "Lento",
  },

  keyboard: {
    full: "Jornada completável só por teclado",
    partial: "Parcialmente operável por teclado",
    "not-applicable": "Não se aplica",
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
    showPorted: "Mostrar portados",
    activePorted: "Aberto por link direto; oculto do trabalho ativo",
    emptyModule: "Nenhum cenário ainda.",
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
    a11y: "Acessibilidade",
    keyboardMode: "Teclado",
    keyboardModeTitle:
      "Percorrer a jornada só por teclado, com foco visível e ordem de tabulação evidenciada",
    reducedMotion: "Movimento",
    reducedMotionTitle: "Reduzir movimento dentro do palco",
    textScale: "Ampliação de texto",
    none: "—",
  },

  inspector: {
    region: "Painel de contexto",
    tabScenario: "Cenário",
    tabA11y: "Acessibilidade",
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
    approval: "Aprovação",
    openApproved: "Abrir a versão aprovada",
    engineering: "Engenharia",
    a11yContract: "Contrato do cenário",
    keyboard: "Teclado",
    contrast: "Contraste",
    contrastTarget: (target) => `WCAG 2.2 ${target}`,
    announces: "Precisa ser anunciado:",
    focusedElement: "Elemento em foco",
    keyboardModeOff:
      "Ligue o modo teclado na barra de controles para inspecionar a árvore acessível.",
    pressTab: (tabStops) =>
      `Pressione Tab dentro do palco. ${tabStops} paradas de tabulação foram encontradas.`,
    role: "Papel",
    name: "Nome",
    noAccessibleName: "sem nome acessível",
    nameFrom: "Nome vem de",
    description: "Descrição",
    selector: "Seletor",
    focusableButHidden:
      "Este elemento é focável mas está escondido de tecnologia assistiva. Um leitor de tela recebe foco sem receber conteúdo.",
    tabStopsInStage: (tabStops) => `${tabStops} paradas de tabulação no palco.`,
    tokenContrast: "Contraste dos tokens",
    noContrastPairs:
      "O produto não declarou pares de contraste em theme.contrastPairs. Contraste é propriedade de par de cores: declarar aqui valida na origem, uma vez.",
    pair: "Par",
    ratio: "Razão",
    pairsFailing: (count) =>
      `${count} ${count === 1 ? "par" : "pares"} fora do alvo. O teste de tokens do produto falha o build por isso.`,
    automatedIsFloor:
      "Verificação automática é piso, não teto. Ordem de leitura confusa, rótulo tecnicamente presente mas sem sentido e fluxo impossível de completar com leitor de tela passam no axe.",
    coverage: "Cobertura por status",
    scenariosRegistered: (count) => `${count} cenários registrados.`,
    scenarioContract: "Contrato de cenário",
    noIssues: "Nenhum problema encontrado.",
  },

  home: {
    lead: (total) =>
      `Especificação executável: cada situação abaixo abre por link, com persona, dados e regras próprios. ${total} ${
        total === 1 ? "situação registrada" : "situações registradas"
      }.`,
    withoutModule: "Sem módulo",
    withoutModuleHint:
      "O prefixo do id não corresponde a nenhum módulo registrado, então estas situações não aparecem na navegação por módulo.",
    emptyModule: "Nenhuma situação registrada neste módulo ainda.",
    keyboardBadge: "teclado",
    noActiveWork:
      "Não há trabalho ativo. As referências portadas continuam registradas e podem ser exibidas com “Mostrar portados”.",
  },

  shell: {
    restoreChrome: "Mostrar controles",
    noRoute: "Nenhuma rota para este endereço",
    noRouteHint: "não casa com nenhuma rota declarada. Escolha uma situação na navegação.",
  },
};

/** English (United States), selectable by the product through `theme.labels`. */
export const EN_US_LABELS: Labels = {
  status: {
    ported: "Ported — not validated",
    proposed: "Proposed",
    "in-review": "In review",
    approved: "Approved",
    "in-implementation": "In implementation",
    implemented: "Implemented",
    superseded: "Superseded",
  },

  statusMeaning: {
    ported:
      "Imported from the existing system, but not validated and not an implementation commitment.",
    proposed: "Exploration that has not been approved yet.",
    "in-review": "Open for design, business, or client validation.",
    approved: "Authorized reference, recorded with a commit URL.",
    "in-implementation": "Linked to active engineering work.",
    implemented: "Available in the real product and validated.",
    superseded: "Kept for history or replaced by another decision.",
  },

  network: {
    success: "Success",
    loading: "Loading",
    empty: "Empty",
    error: "Error",
    slow: "Slow",
  },

  keyboard: {
    full: "Journey can be completed with keyboard only",
    partial: "Partially operable with keyboard",
    "not-applicable": "Not applicable",
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
    showPorted: "Show ported",
    activePorted: "Opened by direct link; hidden from active work",
    emptyModule: "No scenarios yet.",
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
    a11y: "Accessibility",
    keyboardMode: "Keyboard",
    keyboardModeTitle:
      "Complete the journey with keyboard only, showing focus and tab order",
    reducedMotion: "Motion",
    reducedMotionTitle: "Reduce motion inside the stage",
    textScale: "Text size",
    none: "—",
  },

  inspector: {
    region: "Context panel",
    tabScenario: "Scenario",
    tabA11y: "Accessibility",
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
    approval: "Approval",
    openApproved: "Open approved version",
    engineering: "Engineering",
    a11yContract: "Scenario contract",
    keyboard: "Keyboard",
    contrast: "Contrast",
    contrastTarget: (target) => `WCAG 2.2 ${target}`,
    announces: "Must be announced:",
    focusedElement: "Focused element",
    keyboardModeOff:
      "Turn on keyboard mode in the controls to inspect the accessibility tree.",
    pressTab: (tabStops) =>
      `Press Tab inside the stage. ${tabStops} tab ${tabStops === 1 ? "stop was" : "stops were"} found.`,
    role: "Role",
    name: "Name",
    noAccessibleName: "no accessible name",
    nameFrom: "Name source",
    description: "Description",
    selector: "Selector",
    focusableButHidden:
      "This element is focusable but hidden from assistive technology. A screen reader receives focus without receiving content.",
    tabStopsInStage: (tabStops) =>
      `${tabStops} tab ${tabStops === 1 ? "stop" : "stops"} in the stage.`,
    tokenContrast: "Token contrast",
    noContrastPairs:
      "The product has not declared contrast pairs in theme.contrastPairs. Contrast belongs to a pair of colors; declaring pairs here validates them once, at the source.",
    pair: "Pair",
    ratio: "Ratio",
    pairsFailing: (count) =>
      `${count} ${count === 1 ? "pair is" : "pairs are"} below the target. The product token test fails the build for this.`,
    automatedIsFloor:
      "Automated checks are a floor, not a ceiling. Confusing reading order, technically present but meaningless labels, and journeys that cannot be completed with a screen reader can still pass automated tools.",
    coverage: "Coverage by status",
    scenariosRegistered: (count) => `${count} ${count === 1 ? "scenario" : "scenarios"} registered.`,
    scenarioContract: "Scenario contract",
    noIssues: "No issues found.",
  },

  home: {
    lead: (total) =>
      `Executable specification: each state below opens from a link with its own persona, data, and rules. ${total} ${
        total === 1 ? "state registered" : "states registered"
      }.`,
    withoutModule: "No module",
    withoutModuleHint:
      "The ID prefix does not match a registered module, so these states do not appear in module navigation.",
    emptyModule: "No states have been registered in this module yet.",
    keyboardBadge: "keyboard",
    noActiveWork:
      "There is no active work. Ported references remain registered and can be included with “Show ported”.",
  },

  shell: {
    restoreChrome: "Show controls",
    noRoute: "No route for this address",
    noRouteHint: "does not match any declared route. Choose a state from the navigation.",
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

/** @deprecated Use `useLabels().status`, ou `DEFAULT_LABELS.status` fora de React. */
export const STATUS_LABELS = DEFAULT_LABELS.status;
/** @deprecated Use `useLabels().statusMeaning`. */
export const STATUS_MEANING = DEFAULT_LABELS.statusMeaning;
/** @deprecated Use `useLabels().network`. */
export const NETWORK_LABELS = DEFAULT_LABELS.network;
/** @deprecated Use `useLabels().keyboard`. */
export const KEYBOARD_LABELS = DEFAULT_LABELS.keyboard;
