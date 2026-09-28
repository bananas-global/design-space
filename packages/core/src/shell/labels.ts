/**
 * Vocabulário do motor, com o português como padrão e override pelo produto.
 *
 * O motor é neutro quanto ao produto e agora também quanto ao idioma. A razão é
 * concreta: o chrome fica na mesma tela que a UI do cliente, então um Design
 * Space revisado em inglês misturava "Copiar link" e "Revisão limpa" com a
 * interface dele. Traduzir só parte do chrome seria pior que não traduzir — o
 * rótulo em outro idioma vira ruído no meio da revisão.
 *
 * Rótulo de **produto** continua vindo do produto: nome de tela, título de
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
    region: string;
    viewportGroup: string;
    rotate: string;
    zoomOut: string;
    zoomIn: string;
    zoomReset: string;
    zoomValue: (percent: number) => string;
    copyLink: string;
    copied: string;
    copyPrompt: string;
    cleanReview: string;
    lightMode: string;
    darkMode: string;
    openPanel: string;
    closePanel: string;
    diagnostics: (errors: number, warnings: number) => string;
    branchTitle: (branch: string) => string;
    commitTitle: (commit: string) => string;
    envTitle: (env: string) => string;
  };
  sidebar: {
    region: string;
    tabs: string;
    screensTab: string;
    componentsTab: string;
    searchPlaceholder: string;
    searchLabel: string;
    searchShortcut: string;
    noMatch: (query: string) => string;
    emptyScreens: string;
    emptyComponents: string;
    ungrouped: string;
    toggleGroup: (group: string) => string;
    resize: string;
  };
  panel: {
    region: string;
    tabs: string;
    variationsTab: string;
    infoTab: string;
    resize: string;
    variationsList: string;
    defaultVariation: string;
    defaultVariationHint: string;
    noVariations: string;
    noComponentVariations: string;
    nothingSelected: string;
    persona: string;
    network: string;
    theme: string;
    locale: string;
    dataSource: string;
    fixturesOption: string;
    none: string;
    fixtureFallback: (requested: string, fallback: string) => string;
  };
  info: {
    screen: string;
    variation: string;
    component: string;
    name: string;
    id: string;
    group: string;
    description: string;
    source: string;
    usedIn: string;
    notUsed: string;
    route: string;
    persona: string;
    permissions: string;
    intent: string;
    preconditions: string;
    actions: string;
    expected: string;
    rules: string;
    components: string;
    ticket: string;
    copyForPr: string;
    copiedForPr: string;
    copyPrompt: string;
  };
  diagnostics: {
    title: string;
    noIssues: string;
    error: string;
    warning: string;
    close: string;
  };
  /** Texto do markdown gerado por "Copiar para o PR". */
  pr: {
    variations: string;
    components: string;
    component: string;
    source: string;
    expected: string;
    commit: (shortCommit: string) => string;
    immutableLink: string;
    noExpected: string;
    empty: string;
  };
  shell: {
    restoreChrome: string;
    frameTitle: (product: string) => string;
    noRoute: string;
    noRouteHint: string;
    outsideHandoff: string;
    outsideHandoffHint: string;
    empty: string;
    emptyHint: string;
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
    region: "Barra do Design Space",
    viewportGroup: "Viewport",
    rotate: "Girar",
    zoomOut: "Diminuir zoom",
    zoomIn: "Aumentar zoom",
    zoomReset: "Voltar o zoom para 100%",
    zoomValue: (percent) => `${percent}%`,
    copyLink: "Copiar link",
    copied: "Link copiado",
    copyPrompt: "Copie o link:",
    cleanReview: "Revisão limpa (Shift+C)",
    lightMode: "Tema claro",
    darkMode: "Tema escuro",
    openPanel: "Abrir painel (Shift+P)",
    closePanel: "Fechar painel (Shift+P)",
    diagnostics: (errors, warnings) =>
      `Diagnóstico: ${errors} ${errors === 1 ? "erro" : "erros"}, ${warnings} ${
        warnings === 1 ? "aviso" : "avisos"
      }`,
    branchTitle: (branch) => `Branch: ${branch}`,
    commitTitle: (commit) => `Commit: ${commit}`,
    envTitle: (env) => `Ambiente: ${env}`,
  },

  sidebar: {
    region: "Navegação",
    tabs: "Telas e componentes",
    screensTab: "Telas",
    componentsTab: "Componentes",
    searchPlaceholder: "Buscar",
    searchLabel: "Buscar telas e componentes",
    searchShortcut: "⌘K",
    noMatch: (query) => `Nada encontrado para "${query}".`,
    emptyScreens: "O produto ainda não registrou telas.",
    emptyComponents: "O produto ainda não registrou componentes.",
    ungrouped: "Outros",
    toggleGroup: (group) => `Mostrar ou ocultar ${group}`,
    resize: "Redimensionar a navegação",
  },

  panel: {
    region: "Painel",
    tabs: "Variações e informações",
    variationsTab: "Variações",
    infoTab: "Informações",
    resize: "Redimensionar o painel",
    variationsList: "Variações da tela",
    defaultVariation: "Padrão",
    defaultVariationHint: "A tela sem cenário declarado, sem fixture.",
    noVariations: "Esta tela não tem variações.",
    noComponentVariations: "Este componente não declara variações de dados.",
    nothingSelected: "Escolha uma tela ou um componente na navegação.",
    persona: "Persona",
    network: "Estado de rede",
    theme: "Tema",
    locale: "Idioma",
    dataSource: "Fonte de dados",
    fixturesOption: "Fixtures",
    none: "—",
    fixtureFallback: (requested, fallback) =>
      `A variação \`${requested}\` não existe neste componente. Exibindo \`${fallback}\`.`,
  },

  info: {
    screen: "Tela",
    variation: "Variação",
    component: "Componente",
    name: "Nome",
    id: "Id",
    group: "Grupo",
    description: "Descrição",
    source: "Origem",
    usedIn: "Usado em",
    notUsed: "Nenhuma tela declara este componente.",
    route: "Rota",
    persona: "Persona",
    permissions: "Permissões",
    intent: "Intenção",
    preconditions: "Pré-condições",
    actions: "Ações",
    expected: "Comportamento esperado",
    rules: "Regras",
    components: "Componentes usados",
    ticket: "Ticket",
    copyForPr: "Copiar para o PR",
    copiedForPr: "Copiado",
    copyPrompt: "Copie o texto para o PR:",
  },

  diagnostics: {
    title: "Diagnóstico",
    noIssues: "Nenhum problema encontrado.",
    error: "Erro",
    warning: "Aviso",
    close: "Fechar diagnóstico",
  },

  pr: {
    variations: "Variações",
    components: "Componentes",
    component: "Componente",
    source: "Origem",
    expected: "Comportamento esperado",
    commit: (shortCommit) => `Commit \`${shortCommit}\``,
    immutableLink: "link deste deployment",
    noExpected: "Sem comportamento esperado declarado.",
    empty: "—",
  },

  shell: {
    restoreChrome: "Mostrar o chrome (Shift+C)",
    frameTitle: (product) => `Pré-visualização de ${product}`,
    noRoute: "Nenhuma rota para este endereço",
    noRouteHint: "não casa com nenhuma rota declarada. Escolha uma tela na navegação.",
    outsideHandoff: "Fora do escopo deste handoff",
    outsideHandoffHint:
      "Este link permite revisar somente os cenários, rotas e componentes listados no handoff. Escolha um item disponível na navegação.",
    empty: "Nada para mostrar ainda",
    emptyHint: "O produto ainda não registrou telas nem componentes.",
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
    region: "Design Space bar",
    viewportGroup: "Viewport",
    rotate: "Rotate",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    zoomReset: "Reset zoom to 100%",
    zoomValue: (percent) => `${percent}%`,
    copyLink: "Copy link",
    copied: "Link copied",
    copyPrompt: "Copy the link:",
    cleanReview: "Clean review (Shift+C)",
    lightMode: "Light theme",
    darkMode: "Dark theme",
    openPanel: "Open panel (Shift+P)",
    closePanel: "Close panel (Shift+P)",
    diagnostics: (errors, warnings) =>
      `Diagnostics: ${errors} ${errors === 1 ? "error" : "errors"}, ${warnings} ${
        warnings === 1 ? "warning" : "warnings"
      }`,
    branchTitle: (branch) => `Branch: ${branch}`,
    commitTitle: (commit) => `Commit: ${commit}`,
    envTitle: (env) => `Environment: ${env}`,
  },

  sidebar: {
    region: "Navigation",
    tabs: "Screens and components",
    screensTab: "Screens",
    componentsTab: "Components",
    searchPlaceholder: "Search",
    searchLabel: "Search screens and components",
    searchShortcut: "⌘K",
    noMatch: (query) => `Nothing found for "${query}".`,
    emptyScreens: "The product has not registered any screens yet.",
    emptyComponents: "The product has not registered any components yet.",
    ungrouped: "Other",
    toggleGroup: (group) => `Show or hide ${group}`,
    resize: "Resize navigation",
  },

  panel: {
    region: "Panel",
    tabs: "Variations and information",
    variationsTab: "Variations",
    infoTab: "Information",
    resize: "Resize panel",
    variationsList: "Screen variations",
    defaultVariation: "Default",
    defaultVariationHint: "The screen without a declared scenario or fixture.",
    noVariations: "This screen has no variations.",
    noComponentVariations: "This component does not declare data variations.",
    nothingSelected: "Choose a screen or a component in the navigation.",
    persona: "Persona",
    network: "Network state",
    theme: "Theme",
    locale: "Language",
    dataSource: "Data source",
    fixturesOption: "Fixtures",
    none: "—",
    fixtureFallback: (requested, fallback) =>
      `Variation \`${requested}\` does not exist for this component. Showing \`${fallback}\`.`,
  },

  info: {
    screen: "Screen",
    variation: "Variation",
    component: "Component",
    name: "Name",
    id: "ID",
    group: "Group",
    description: "Description",
    source: "Source",
    usedIn: "Used in",
    notUsed: "No screen declares this component.",
    route: "Route",
    persona: "Persona",
    permissions: "Permissions",
    intent: "Intent",
    preconditions: "Preconditions",
    actions: "Actions",
    expected: "Expected behavior",
    rules: "Rules",
    components: "Components used",
    ticket: "Ticket",
    copyForPr: "Copy for PR",
    copiedForPr: "Copied",
    copyPrompt: "Copy the text for the PR:",
  },

  diagnostics: {
    title: "Diagnostics",
    noIssues: "No issues found.",
    error: "Error",
    warning: "Warning",
    close: "Close diagnostics",
  },

  pr: {
    variations: "Variations",
    components: "Components",
    component: "Component",
    source: "Source",
    expected: "Expected behavior",
    commit: (shortCommit) => `Commit \`${shortCommit}\``,
    immutableLink: "this deployment",
    noExpected: "No expected behavior declared.",
    empty: "—",
  },

  shell: {
    restoreChrome: "Show chrome (Shift+C)",
    frameTitle: (product) => `${product} preview`,
    noRoute: "No route for this address",
    noRouteHint: "does not match any declared route. Choose a screen from the navigation.",
    outsideHandoff: "Outside this handoff scope",
    outsideHandoffHint:
      "This link only allows review of the scenarios, routes, and components listed in the handoff. Choose an available item from the navigation.",
    empty: "Nothing to show yet",
    emptyHint: "The product has not registered any screens or components yet.",
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
 * O padrão do contexto é o português, então `StageEmpty` — exportado e
 * montável fora do `DesignSpace` — continua funcionando sem provider.
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
