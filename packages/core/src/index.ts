/**
 * API pública de `@brucesantos/design-space`.
 *
 * Esta lista é a fronteira do motor. Adicionar algo aqui é um compromisso de
 * versionamento semântico com todos os produtos, então vale a regra do
 * documento: só entra o que já provou ser neutro e útil em mais de um produto
 * (Princípio 10).
 */

/* ------------------------------------- shell */
export { DesignSpace, type DesignSpaceProps } from "./shell/DesignSpace.js";
export { StageEmpty } from "./shell/Stage.js";
export {
  DEFAULT_LABELS,
  EN_US_LABELS,
  NETWORK_LABELS,
  resolveLabels,
  useLabels,
  type Labels,
  type LabelsOverride,
} from "./shell/labels.js";

/* ---------------------------------- registry */
export {
  createRegistry,
  normalizeSearch,
  type ComponentFixtureResolution,
  type ControlResolution,
  type FlowNode,
  type InvalidControl,
  type Registry,
  type ScenarioQueryOptions,
  type ScreenNode,
} from "./registry/index.js";
export {
  formatIssues,
  hasErrors,
  validateProduct,
  validateScenario,
  type ValidationIssue,
} from "./registry/validate.js";

/* ------------------------------------ router */
export { matchPath, resolveRoute, type RouteMatch } from "./router/index.js";

/* ---------------------------------- controls */
export {
  VIEWPORTS,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  parseControls,
  resolveViewport,
  serializeControls,
  useDesignSpaceState,
  type DesignSpaceState,
  type DesignSpaceStateOptions,
  type DesignSpaceLocation,
} from "./controls/state.js";

/* ------------------------------------- quadro */
export { FRAME_ATTRIBUTE, FRAME_PARAM } from "./frame/index.js";
export { CONTROL_PARAM_PREFIX, PARAM, applyOverrides, serializeValue } from "./controls/params.js";

/* ----------------------------------- handoff */
export {
  HANDOFF_PARAM,
  applyHandoffScope,
  handoffAllowsComponent,
  handoffAllowsPath,
  handoffAllowsScenario,
  normalizeHandoffScope,
  parseHandoffScope,
} from "./handoff/index.js";

/* ---------------------------------- adapters */
export {
  SLOW_NETWORK_DELAY_MS,
  SimulatedNetworkError,
  createHttpAdapter,
  fixtureAdapter,
  resolveFixture,
} from "./adapters/index.js";
export { useScenarioData, type ScenarioData } from "./adapters/useScenarioData.js";

/* ------------------------------------ deploy */
export {
  commitUrl,
  componentUrl,
  getDeployContext,
  scenarioUrl,
  type DeployContext,
} from "./deploy/index.js";

/* -------------------------------- utilitários */
/* Extraído por evidência, não por antecipação: os dois primeiros produtos
   escreveram a mesma correção de parse de data separadamente. */
export { ageInYears, daysBetween, parseIsoDate } from "./util/date.js";

/* ------------------------------------- tipos */
export {
  NETWORK_STATES,
  type ComponentPreview,
  type ComponentPreviewFixture,
  type ComponentPreviewProps,
  type ChromeTheme,
  type Control,
  type ControlGroup,
  type ControlOption,
  type ControlsState,
  type DeployOverrides,
  type DataRequest,
  type DataSourceAdapter,
  type Fixture,
  type HandoffScope,
  type NetworkState,
  type PanelTab,
  type Persona,
  type ProductDefinition,
  type ProductTheme,
  type Rule,
  type RouteDefinition,
  type Scenario,
  type ScenarioContext,
  type ScreenProps,
  type ViewportSetting,
} from "./types/index.js";
