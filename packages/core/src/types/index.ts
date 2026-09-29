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
  /**
   * Identificador estável, minúsculo, em kebab-case e com pontos opcionais:
   * `requests.approve-blocked`. Só precisa ser único no produto.
   */
  id: string;
  /**
   * Nome da variação na lista da tela, no vocabulário do negócio: "Aprovação
   * bloqueada por falta de documento".
   */
  title: string;
  /**
   * Rota que o cenário abre. Precisa casar com uma rota do produto: é essa rota
   * que define de qual tela o cenário é variação.
   */
  route: string;
  /**
   * Id de uma persona registrada no produto. Opcional: cenário sem persona tem
   * permissões vazias, a menos que declare `permissions`.
   */
  persona?: string;
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
  /** Ticket de engenharia, quando o cenário estiver em implementação. */
  ticket?: string;
  /**
   * Ids de `ComponentPreview` usados na tela. Alimentam "Componentes usados" no
   * painel de informações, o "Usado em" de cada componente e a tabela do
   * "Copiar para o PR".
   */
  components?: string[];
  /**
   * Valores de controle que este cenário fixa: um atalho para uma combinação.
   * Abrir o cenário aplica estes valores sobre os padrões da tela. Chave é o id
   * de um `Control` da tela do cenário; valor, o `value` de uma das opções.
   */
  controls?: Record<string, string>;
};

/* ------------------------------------------------------------------ *
 * Controles por componente
 * ------------------------------------------------------------------ */

/** Uma opção de um controle. */
export type ControlOption = { value: string; label: string };

/** Um controle: uma dimensão de variação de um componente da tela. */
export type Control = {
  /** Id estável, único dentro da tela; vira parâmetro de URL `c.<id>`. */
  id: string;
  label: string;
  options: ControlOption[];
  /** Valor inicial; padrão = primeira opção. */
  default?: string;
  description?: string;
};

/** Grupo de controles de um componente da tela, como no painel Variações. */
export type ControlGroup = {
  /** Id estável, único dentro da tela. */
  id: string;
  /** "Tabela de pedidos · table". */
  title: string;
  /** Id de um ComponentPreview do catálogo, quando o grupo é de um componente dele. */
  component?: string;
  controls: Control[];
  /** Uma linha de contexto, exibida sob o título. */
  note?: string;
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
  /**
   * Nome da tela na lista. Uma rota é uma tela; sem `name`, o motor usa o
   * título do primeiro cenário da rota e, na falta dele, o próprio `path`.
   */
  name?: string;
  /** Uma linha sobre a tela, exibida em Informações e usada na busca. */
  description?: string;
  /**
   * Fluxo a que a tela pertence: agrupa as telas na aba Telas, como `group`
   * agrupa componentes. Tela sem fluxo fica num grupo sem título, no topo.
   */
  group?: string;
  /** Controles por componente, exibidos no painel Variações. */
  controls?: ControlGroup[];
  /**
   * Comportamento esperado da tela, para Informações e "Copiar para o PR"
   * quando não há cenário ativo.
   */
  expected?: string[];
  /** Ids do catálogo usados pela tela (mesmo papel de `Scenario.components`). */
  components?: string[];
  /**
   * Valores de exemplo dos parâmetros do `path` (`{ id: "REQ-1" }` para
   * `/requests/:id`), e de `*` quando houver. O motor usa sempre que precisa
   * abrir a tela sem cenário — lateral, variação padrão, links de Informações e
   * "Copiar para o PR". Sem eles, o caminho abre literal (`/requests/:id`).
   */
  params?: Record<string, string>;
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
};

export type ComponentPreview<T = unknown> = {
  /** Identificador estável usado no deep link: `button.primary`. */
  id: string;
  /** Nome legível no vocabulário do produto. */
  name: string;
  /** Grupo de navegação: `Ações`, `Formulários`, `Feedback`. */
  group?: string;
  description?: string;
  /**
   * Origem no sistema real, em texto livre: `components/button.ex → button/1`.
   * Aparece em Informações e na tabela do "Copiar para o PR".
   */
  source?: string;
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
 * para oferecer os controles de tema.
 */
export type ProductTheme = {
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
   * Isto é rótulo de **mecanismo**. Nome de tela, título de cenário e nome de
   * persona continuam vindo do catálogo do produto.
   */
  labels?: LabelsOverride;
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
  /**
   * Situações do produto. Cada uma é uma **variação** da tela cuja rota casa
   * com `route`; a ordem de `routes` define a ordem das telas e a ordem deste
   * array, a das variações dentro de cada tela.
   */
  scenarios: Scenario[];
  personas: Persona[];
  /**
   * Persona efetiva de toda tela e todo cenário sem persona própria. Sem ela, a
   * tela sem cenário abre sem persona (e sem permissões). Persona do cenário e
   * a escolhida no painel continuam vencendo.
   */
  defaultPersona?: string;
  fixtures: Fixture[];
  rules?: Rule[];
  /** Rotas declarativas. Cada rota é uma tela na lista de Telas. */
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
  /** Commit exato do deployment, usado para rastrear a revisão. */
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
  /**
   * Navega dentro do Design Space, também de dentro do quadro.
   *
   * - `navigate("/x")`, sem query: a query atual segue inteira; numa tela
   *   diferente, os `c.*` da anterior ficam para trás.
   * - `navigate("/x?a=1")` ou com `options.controls`: o destino manda na query.
   *   O contexto do motor (persona, rede, viewport, tema, idioma, fonte de
   *   dados, handoff…) é preservado quando o destino não o traz; `scenario`,
   *   `fixture`, `component` e os `c.*` da tela anterior não. A persona que vinha
   *   do cenário deixado para trás vira parâmetro explícito.
   * - `options.controls` vira `c.*` do destino; valor igual ao padrão da tela
   *   de destino não entra na URL.
   */
  navigate: (to: string, options?: NavigateOptions) => void;
  /** Abre outro cenário por id. */
  openScenario: (scenarioId: string) => void;
  /**
   * Valor atual de cada controle da tela (id → value), com os padrões
   * aplicados. Vazio quando a tela não declara controles.
   */
  controls: Record<string, string>;
  /**
   * Muda um controle a partir da UI do produto (ex.: fechar um modal volta o
   * controle de sobreposição para "nenhuma"). Atualiza a URL.
   */
  setControl: (id: string, value: string) => void;
  /**
   * Muda vários controles numa única atualização de URL. Chamadas seguidas de
   * `setControl`/`setControls` no mesmo ciclo se acumulam: cada uma parte do
   * estado mais recente, não do valor da última renderização.
   */
  setControls: (patch: Record<string, string>) => void;
};

/** Opções de {@link ScenarioContext.navigate}. */
export type NavigateOptions = {
  /** Controles da tela de destino (id → value), escritos como `c.<id>`. */
  controls?: Record<string, string>;
  /** Substitui a entrada atual do histórico em vez de criar uma nova. */
  replace?: boolean;
};

export type ViewportSetting = {
  /** `mobile`, `tablet`, `desktop`, `fit` ou `custom` (só por URL). */
  id: string;
  label: string;
  /** Largura em px. `undefined` em `fit` significa "ocupa o disponível". */
  width?: number;
  height?: number;
};

/** Aparência do chrome do Design Space. Não altera o tema da UI do produto. */
export type ChromeTheme = "dark" | "light";

/**
 * Recorte de revisão/handoff transportado pela URL.
 *
 * As três listas são allowlists independentes. Um cenário permitido autoriza
 * também a própria rota; `routes` cobre páginas que não têm cenário; componentes
 * precisam ser autorizados explicitamente.
 *
 * Este recorte reduz distração no preview. Não é controle de acesso: isolamento
 * real exige build separado ou autenticação no produto que publica o preview.
 */
export type HandoffScope = {
  scenarios?: string[];
  routes?: string[];
  components?: string[];
};

/* ------------------------------------------------------------------ *
 * Estado dos controles — serializado na URL (deep link)
 * ------------------------------------------------------------------ */

export type ControlsState = {
  scenario: string | undefined;
  /** Allowlist de foco ativa, serializada na URL quando presente. */
  handoff?: HandoffScope;
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
  /**
   * Tema visual do chrome; independente de `themeMode` do produto. Ausente
   * significa "o que a pessoa escolheu por último, ou o do sistema".
   */
  chromeTheme?: ChromeTheme;
  /** Chrome do Design Space oculto: revisão limpa e captura de tela. */
  chrome: boolean;
  /** Painel lateral direito (Variações e Informações) aberto. `panel=0` fecha. */
  inspector: boolean;
  /** Aba do painel direito. Padrão: `variations`. */
  panelTab?: PanelTab;
  /** Zoom da visualização, em porcentagem (25–150). Padrão: 100. */
  zoom?: number;
  /** Viewport girado: largura e altura trocadas quando o preset tem altura. */
  rotated?: boolean;
  /**
   * Valores dos controles da tela aberta (id → value), já com os padrões e o
   * cenário aplicados. Na URL, só o que difere vai como `c.<id>=<value>`.
   */
  screenControls?: Record<string, string>;
};

/** Abas do painel direito do chrome. */
export type PanelTab = "variations" | "info";
