/**
 * Contratos públicos do motor.
 *
 * Estes tipos são a fronteira entre o motor e o produto. O motor nunca conhece
 * um componente, um token ou uma persona concreta: conhece apenas a forma.
 *
 * Regra de fronteira (D-02): se aparece dentro da interface do cliente e
 * contribui para sua linguagem visual ou seu domínio, pertence ao repositório
 * daquele produto e não a este arquivo.
 */

import type { ComponentType, ReactNode } from "react";

/* ------------------------------------------------------------------ *
 * Ciclo de vida
 * ------------------------------------------------------------------ */

/**
 * Estado de ciclo de vida do cenário (§18.1). Existe para evitar que a
 * referência envelheça em silêncio quando o produto real muda.
 */
export type ScenarioStatus =
  | "proposed"
  | "in-review"
  | "approved"
  | "in-implementation"
  | "implemented"
  | "superseded";

export const SCENARIO_STATUSES: readonly ScenarioStatus[] = [
  "proposed",
  "in-review",
  "approved",
  "in-implementation",
  "implemented",
  "superseded",
] as const;

/* ------------------------------------------------------------------ *
 * Acessibilidade (§6.1) — dimensão de primeira classe, não auditoria final
 * ------------------------------------------------------------------ */

/** Nível de conformidade alvo. O padrão interno é WCAG 2.2 AA. */
export type ContrastTarget = "AA" | "AAA";

/** Quanto da jornada precisa ser completável só por teclado. */
export type KeyboardCoverage = "full" | "partial" | "not-applicable";

export type A11yContract = {
  /**
   * `full` significa: a jornada declarada por este cenário é completável do
   * início ao fim sem mouse, com foco visível em cada passo.
   */
  keyboard: KeyboardCoverage;
  /** Nível de contraste exigido para os tokens em uso nesta tela. */
  contrast: ContrastTarget;
  /**
   * Eventos que precisam ser anunciados para leitor de tela. São chaves de
   * domínio, não seletores: `claim.status`, `retry.result`.
   *
   * Um cenário de convênio recusado em que a recusa não é anunciada está
   * incompleto, não está pronto para aprovação.
   */
  announces?: string[];
  /** Observação de revisão humana. O automático é piso, não teto. */
  notes?: string;
};

/* ------------------------------------------------------------------ *
 * Persona
 * ------------------------------------------------------------------ */

export type Persona = {
  /** Identificador estável usado em URL e em cenário. */
  id: string;
  /** Nome no vocabulário do cliente: "Recepcionista". */
  name: string;
  /** O que essa pessoa está tentando fazer. */
  goal?: string;
  /** Permissões concedidas por padrão a este papel. */
  permissions: string[];
  description?: string;
};

/* ------------------------------------------------------------------ *
 * Regra de negócio
 * ------------------------------------------------------------------ */

export type Rule = {
  /** Identificador citado por cenários: `retry-after-document-review`. */
  id: string;
  /** Enunciado curto, na linguagem do produto. */
  statement: string;
  /** Por que a regra existe. Contexto, não implementação. */
  rationale?: string;
  /** Onde a regra vive no código, quando existir: `src/rules/claims.ts`. */
  source?: string;
};

/* ------------------------------------------------------------------ *
 * Fixture
 * ------------------------------------------------------------------ */

/**
 * Dado sintético e determinístico que materializa um cenário.
 *
 * O motor não conhece o formato de `data` — isso é contrato do produto. O que
 * o motor garante é que a mesma URL produz a mesma fixture (§15.1
 * "Determinismo"), então `data` precisa ser um valor puro ou uma factory pura.
 */
export type Fixture<T = unknown> = {
  id: string;
  /** Rótulo legível para o seletor de conjunto de dados. */
  label: string;
  description?: string;
  /** Valor determinístico, ou factory pura que devolve um valor determinístico. */
  data: T | (() => T);
};

/* ------------------------------------------------------------------ *
 * Estado de rede
 * ------------------------------------------------------------------ */

export type NetworkState = "success" | "loading" | "empty" | "error" | "slow";

export const NETWORK_STATES: readonly NetworkState[] = [
  "success",
  "loading",
  "empty",
  "error",
  "slow",
] as const;

/* ------------------------------------------------------------------ *
 * Cenário — a unidade central (D-06)
 * ------------------------------------------------------------------ */

/**
 * Um cenário não é uma tela com dados diferentes. Ele combina intenção,
 * persona, permissões, pré-condições, dados, estado inicial, ações
 * disponíveis, regras e resultado esperado.
 */
export type Scenario = {
  /** `modulo.situacao` em kebab-case: `finance.insurance-denied`. */
  id: string;
  /** Título no vocabulário do negócio: "Convênio recusado". */
  title: string;
  /** Rota que o cenário abre. Precisa casar com uma rota do produto. */
  route: string;
  /** Id de uma persona registrada no produto. */
  persona: string;
  /**
   * Permissões efetivas do cenário. Quando ausente, herda as da persona.
   * Declarar aqui permite representar "recepcionista sem permissão de
   * cancelamento" sem inventar uma segunda persona.
   */
  permissions?: string[];
  /** Id de uma fixture registrada no produto. */
  fixture: string;
  /** Ids de regras que governam esta situação. */
  rules?: string[];
  /** Contrato de acessibilidade da situação. */
  a11y: A11yContract;
  /** Estado de ciclo de vida. */
  status: ScenarioStatus;

  /** Intenção: o que se quer discutir ou verificar aqui. */
  intent?: string;
  /** Pré-condições em linguagem de negócio. */
  preconditions?: string[];
  /** Ações que a persona pode executar nesta situação. */
  actions?: string[];
  /** Resultado esperado — vira caso de teste no handoff. */
  expected?: string[];
  /** Estado de rede inicial. Padrão: `success`. */
  network?: NetworkState;
  /** Rótulos livres para busca: "exceção", "permissão", "vazio". */
  tags?: string[];
  /**
   * URL de commit que registra a aprovação (§10.2). Imutável por definição:
   * a aprovação não pode mudar de conteúdo debaixo de quem aprovou.
   */
  approvedAt?: { url: string; commit: string; date: string };
  /** Ticket de engenharia, quando o cenário estiver em implementação. */
  ticket?: string;
};

/* ------------------------------------------------------------------ *
 * Organização: módulo e jornada
 * ------------------------------------------------------------------ */

/**
 * Uma jornada é uma sequência de passos com ramificações. Cada passo aponta
 * para um cenário, então uma jornada é navegável e testável sem duplicar
 * definição.
 */
export type Flow = {
  id: string;
  /** Título de negócio: "Agendar uma consulta". */
  title: string;
  description?: string;
  steps: FlowStep[];
};

export type FlowStep = {
  /** Cenário que materializa este passo. */
  scenario: string;
  /** Rótulo do passo, quando diferir do título do cenário. */
  label?: string;
  /** Decisão tomada aqui, quando o passo ramifica. */
  decision?: string;
  /** Saídas alternativas: rótulo → id de cenário. */
  branches?: Record<string, string>;
};

export type Module = {
  /** `agenda`, `patients`, `finance`. */
  id: string;
  /** Nome no vocabulário do cliente: "Agenda". */
  name: string;
  description?: string;
  /** Jornadas guiadas do módulo. Opcional: navegação livre é o padrão. */
  flows?: Flow[];
};

/* ------------------------------------------------------------------ *
 * Rotas declarativas
 * ------------------------------------------------------------------ */

/**
 * Rota declarativa do produto. O motor casa `path` contra a URL e renderiza
 * `screen`, passando os parâmetros dinâmicos.
 *
 * Sintaxe de `path`: segmentos literais e `:param`. Um `*` final captura o
 * resto em `params["*"]`.
 */
export type RouteDefinition = {
  path: string;
  screen: ComponentType<ScreenProps>;
};

export type ScreenProps = {
  /** Parâmetros dinâmicos casados da rota. */
  params: Record<string, string>;
  /** Contexto do cenário ativo, resolvido pelo motor. */
  context: ScenarioContext;
};

/* ------------------------------------------------------------------ *
 * Adapters de dados (§7)
 * ------------------------------------------------------------------ */

/**
 * A UI do produto nunca depende diretamente de um backend. A camada de
 * adapters permite alimentar o mesmo cenário por fixture, REST, GraphQL ou
 * staging sem alterar a composição visual.
 */
export type DataSourceAdapter<T = unknown> = {
  id: string;
  label: string;
  /**
   * Resolve os dados de um cenário. Recebe a fixture declarada para que um
   * adapter remoto possa usá-la como fallback ou como semente.
   */
  load: (request: DataRequest) => Promise<T> | T;
};

export type DataRequest = {
  scenario: Scenario;
  fixture: Fixture | undefined;
  network: NetworkState;
};

/* ------------------------------------------------------------------ *
 * Tema do produto
 * ------------------------------------------------------------------ */

/**
 * O motor não impõe aparência (D-02). Recebe do produto apenas o suficiente
 * para validar contraste e oferecer os controles de tema.
 */
export type ProductTheme = {
  /**
   * Pares de cores que precisam passar na validação de contraste.
   * Contraste é propriedade de par, então validar na definição do token
   * resolve na origem, uma vez, em vez de perseguir o problema em 30 telas.
   */
  contrastPairs?: ContrastPair[];
  /** Modos de tema disponíveis no produto, quando houver mais de um. */
  modes?: string[];
  /** Idiomas disponíveis, quando o produto tiver essa variação. */
  locales?: string[];
};

export type ContrastPair = {
  /** Nome do par: `fg-1 sobre bg-app`. */
  name: string;
  /** Cor de frente em hex, rgb() ou rgba(). */
  foreground: string;
  /** Cor de fundo. Precisa ser opaca. */
  background: string;
  /** `AA` por padrão. */
  target?: ContrastTarget;
  /** Texto grande (>=24px, ou >=18.66px bold) tem limiar menor. */
  largeText?: boolean;
};

/* ------------------------------------------------------------------ *
 * Definição do produto — a única coisa que o produto entrega ao motor
 * ------------------------------------------------------------------ */

export type ProductDefinition = {
  /** `bloomy`. */
  id: string;
  /** "Bloomy". */
  name: string;
  /** Uma linha sobre o produto, exibida na entrada do Design Space. */
  tagline?: string;
  modules: Module[];
  scenarios: Scenario[];
  personas: Persona[];
  fixtures: Fixture[];
  rules?: Rule[];
  routes: RouteDefinition[];
  theme?: ProductTheme;
  /**
   * Adapters de dados disponíveis. `fixtures` é o padrão (D-05); qualquer
   * outro entra como opção explícita e justificada.
   */
  dataSources?: {
    default: string;
    adapters?: DataSourceAdapter[];
  };
  /** Renderizado quando nenhuma rota casa. Padrão: aviso neutro do motor. */
  notFound?: ComponentType<{ path: string }>;
  /** Envolve a UI do produto. Serve para providers de tema, i18n ou store. */
  wrapper?: ComponentType<{ children: ReactNode; context: ScenarioContext }>;
};

/* ------------------------------------------------------------------ *
 * Contexto exposto à UI do produto
 * ------------------------------------------------------------------ */

/**
 * O que a UI do produto recebe do motor. Deliberadamente pequeno: dados,
 * papel, permissões e estado de ambiente. Nada de componente, token ou
 * aparência.
 */
export type ScenarioContext = {
  scenario: Scenario | undefined;
  persona: Persona | undefined;
  /** Permissões efetivas: as do cenário, ou as da persona quando ausentes. */
  permissions: string[];
  /** `true` quando a permissão está nas permissões efetivas. */
  can: (permission: string) => boolean;
  /** Dados resolvidos pelo adapter ativo. `undefined` enquanto carrega. */
  data: unknown;
  fixture: Fixture | undefined;
  network: NetworkState;
  /** `true` enquanto o adapter resolve. Reflete também o estado `slow`. */
  isLoading: boolean;
  /** Preenchido quando `network` é `error` ou o adapter falhou. */
  error: Error | undefined;
  /** Regras resolvidas do cenário ativo. */
  rules: Rule[];
  viewport: ViewportSetting;
  themeMode: string | undefined;
  locale: string | undefined;
  /** Preferências de acessibilidade ativas no painel. */
  a11y: {
    keyboardMode: boolean;
    reducedMotion: boolean;
    /** Multiplicador de tamanho de texto: 1, 1.25, 1.5, 2. */
    textScale: number;
  };
  /** Navega dentro do Design Space preservando os controles ativos. */
  navigate: (to: string) => void;
  /** Abre outro cenário por id. */
  openScenario: (scenarioId: string) => void;
};

export type ViewportSetting = {
  /** `mobile`, `tablet`, `desktop`, `fit` ou `custom`. */
  id: string;
  label: string;
  /** Largura em px. `undefined` em `fit` significa "ocupa o disponível". */
  width?: number;
  height?: number;
};

/* ------------------------------------------------------------------ *
 * Estado dos controles — serializado na URL (deep link)
 * ------------------------------------------------------------------ */

export type ControlsState = {
  scenario: string | undefined;
  persona: string | undefined;
  fixture: string | undefined;
  network: NetworkState;
  viewport: string;
  customWidth: number | undefined;
  themeMode: string | undefined;
  locale: string | undefined;
  dataSource: string | undefined;
  /** Chrome do Design Space oculto: revisão limpa e captura de tela. */
  chrome: boolean;
  keyboardMode: boolean;
  reducedMotion: boolean;
  textScale: number;
  /** Painel lateral direito aberto. */
  inspector: boolean;
};
