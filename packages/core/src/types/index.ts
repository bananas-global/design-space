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

// Import de tipo, apagado no build: o dicionário de rótulos mora junto com os
// valores padrão, em `shell/labels.ts`, e só a forma dele é contrato.
import type { LabelsOverride } from "../shell/labels.js";

/* ------------------------------------------------------------------ *
 * Ciclo de vida
 * ------------------------------------------------------------------ */

/**
 * Estado de ciclo de vida do cenário (§18.1). Existe para evitar que a
 * referência envelheça em silêncio quando o produto real muda.
 */
export type ScenarioStatus =
  | "ported"
  | "proposed"
  | "in-review"
  | "approved"
  | "in-implementation"
  | "implemented"
  | "superseded";

export const SCENARIO_STATUSES: readonly ScenarioStatus[] = [
  "ported",
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
   * domínio, não seletores: `request.status`, `retry.result`.
   *
   * Um cenário de aprovação bloqueada em que a recusa não é anunciada está
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
  /** Nome no vocabulário do cliente: "Aprovador". */
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
  /** Onde a regra vive no código, quando existir: `src/rules/requests.ts`. */
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
  /** `modulo.situacao` em kebab-case: `requests.approve-blocked`. */
  id: string;
  /** Título no vocabulário do negócio: "Aprovação bloqueada por falta de documento". */
  title: string;
  /** Rota que o cenário abre. Precisa casar com uma rota do produto. */
  route: string;
  /** Id de uma persona registrada no produto. */
  persona: string;
  /**
   * Permissões efetivas do cenário. Quando ausente, herda as da persona.
   * Declarar aqui permite representar "solicitante sem permissão de aprovar"
   * sem inventar uma segunda persona.
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
  /** Título de negócio: "Decidir uma solicitação". */
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
  /** `requests`, `catalog`, `billing`. */
  id: string;
  /** Nome no vocabulário do cliente: "Solicitações". */
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

/**
 * Componente do produto exposto no catálogo do Design Space.
 *
 * O motor só organiza e renderiza a referência. Implementação, aparência e
 * conteúdo continuam no repositório do produto.
 */
export type ComponentPreviewFixture<T = unknown> = {
  /** Identificador estável, com escopo apenas dentro deste componente. */
  id: string;
  /** Rótulo legível para o seletor de dados do componente. */
  label: string;
  description?: string;
  /** Valor sintético determinístico, ou factory pura que o produz. */
  data: T | (() => T);
};

/** Controles e dados que o motor entrega a um preview isolado. */
export type ComponentPreviewProps<T = unknown> = {
  fixture?: ComponentPreviewFixture<T>;
  data: T | undefined;
  viewport: ViewportSetting;
  /** `default` quando o produto não declara modos de tema. */
  themeMode: string;
  /** `default` quando o produto não declara idiomas. */
  locale: string;
  a11y: {
    keyboardMode: boolean;
    reducedMotion: boolean;
    textScale: number;
  };
};

export type ComponentPreview<T = unknown> = {
  /** Identificador estável usado no deep link: `button.primary`. */
  id: string;
  /** Nome legível no vocabulário do produto. */
  name: string;
  /** Grupo de navegação: `Ações`, `Formulários`, `Feedback`. */
  group?: string;
  description?: string;
  /** Composição visual fornecida e mantida pelo produto. */
  preview: ComponentType<ComponentPreviewProps<T>>;
  /** Dados sintéticos exclusivos deste componente; não usam o catálogo de cenários. */
  fixtures?: ComponentPreviewFixture<T>[];
  /** Id da fixture selecionada quando o deep link não informa outra. */
  defaultFixture?: string;
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
  /**
   * Rótulos do chrome do motor. Sobrescreve por grupo o que estiver em
   * `DEFAULT_LABELS`; o que não for declarado fica no padrão em português.
   *
   * Serve para o Design Space de um cliente que revisa em outro idioma: o chrome
   * divide a tela com a UI do produto, e chrome em português ao lado de interface
   * em inglês é ruído no meio da revisão.
   *
   * Isto é rótulo de **mecanismo**. Nome de módulo, título de cenário e nome de
   * persona continuam vindo do catálogo do produto.
   */
  labels?: LabelsOverride;
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
  /** `acme`. */
  id: string;
  /** "Acme". */
  name: string;
  /** Uma linha sobre o produto, exibida na entrada do Design Space. */
  tagline?: string;
  modules: Module[];
  scenarios: Scenario[];
  personas: Persona[];
  fixtures: Fixture[];
  rules?: Rule[];
  routes: RouteDefinition[];
  /** Catálogo visual opcional, implementado integralmente pelo produto. */
  /** Cada item pode ter seu próprio tipo de dados; o registry os trata como opacos. */
  components?: ComponentPreview<any>[];
  theme?: ProductTheme;
  /**
   * Adapters de dados disponíveis. `fixtures` é o padrão (D-05); qualquer
   * outro entra como opção explícita e justificada.
   */
  dataSources?: {
    default: string;
    adapters?: DataSourceAdapter[];
  };
  /**
   * Contexto do deployment, informado pelo produto. **Opcional**: um Design
   * Space que roda só local não precisa dele.
   *
   * O motor **não consegue** descobrir isso sozinho. Ele é uma biblioteca já
   * compilada: o `import.meta.env` do código dele foi resolvido no build do
   * pacote, não no build do produto, então não sobra nada para o bundler do
   * produto substituir. Quem tem acesso ao próprio ambiente de build é o produto.
   *
   * Passe os valores do bundler, com o nome que o seu build usar:
   *
   * ```ts
   * deploy: {
   *   env: import.meta.env.VITE_DEPLOY_ENV,
   *   branch: import.meta.env.VITE_DEPLOY_BRANCH,
   *   commit: import.meta.env.VITE_DEPLOY_COMMIT,
   * }
   * ```
   *
   * Sem isso o cabeçalho da revisão mostra "development" e omite branch e
   * commit — e é o commit que torna uma aprovação rastreável.
   */
  deploy?: DeployOverrides;

  /** Renderizado quando nenhuma rota casa. Padrão: aviso neutro do motor. */
  notFound?: ComponentType<{ path: string }>;
  /** Envolve a UI do produto. Serve para providers de tema, i18n ou store. */
  wrapper?: ComponentType<{ children: ReactNode; context: ScenarioContext }>;
};

/**
 * Contexto do deployment informado pelo produto. Todos os campos são opcionais,
 * e é essa a fonte única: o motor não lê ambiente nem conhece provedor de
 * hospedagem. Campo ausente cai no padrão local.
 */
export type DeployOverrides = {
  /** `development`, `preview` ou `production`. */
  env?: string;
  /** Domínio da branch, sem protocolo. Quando ausente, usa a origem da janela. */
  branchUrl?: string;
  /** Domínio único deste deployment, sem protocolo. */
  deploymentUrl?: string;
  /** Nome da branch, para rotular a revisão. */
  branch?: string;
  /** Commit exato, gravado junto com o status de aprovação do cenário. */
  commit?: string;
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

/** Aparência do chrome do Design Space. Não altera o tema da UI do produto. */
export type ChromeTheme = "dark" | "light";

/** Coleção de cenários exibida na navegação, home, busca e contagens. */
export type ScenarioView = "active" | "ported";

/* ------------------------------------------------------------------ *
 * Estado dos controles — serializado na URL (deep link)
 * ------------------------------------------------------------------ */

export type ControlsState = {
  scenario: string | undefined;
  /** Visão atual. `active` é o padrão e `ported` é a biblioteca de referências. */
  view?: ScenarioView;
  /** @deprecated Compatibilidade programática com 0.4.0. Use `view: "ported"`. */
  showPorted?: boolean;
  /** Referência visual ativa. Opcional para preservar objetos do contrato anterior. */
  component?: string;
  persona: string | undefined;
  fixture: string | undefined;
  network: NetworkState;
  viewport: string;
  customWidth: number | undefined;
  themeMode: string | undefined;
  locale: string | undefined;
  dataSource: string | undefined;
  /** Tema visual do chrome; independente de `themeMode` do produto. */
  chromeTheme?: ChromeTheme;
  /** Chrome do Design Space oculto: revisão limpa e captura de tela. */
  chrome: boolean;
  keyboardMode: boolean;
  reducedMotion: boolean;
  textScale: number;
  /** Painel lateral direito aberto. */
  inspector: boolean;
};
