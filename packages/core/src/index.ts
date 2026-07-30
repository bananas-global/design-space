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
export { Stage, StageEmpty, TabOrderOverlay, type StageProps } from "./shell/Stage.js";
export { Home, type HomeProps } from "./shell/Home.js";
export {
  KEYBOARD_LABELS,
  NETWORK_LABELS,
  STATUS_LABELS,
  STATUS_MEANING,
} from "./shell/labels.js";

/* ---------------------------------- registry */
export { createRegistry, type ModuleNode, type Registry } from "./registry/index.js";
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
  TEXT_SCALES,
  VIEWPORTS,
  parseControls,
  resolveViewport,
  serializeControls,
  useDesignSpaceState,
  type DesignSpaceState,
  type DesignSpaceLocation,
} from "./controls/state.js";
export { PARAM, applyOverrides, serializeValue } from "./controls/params.js";

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
  getDeployContext,
  scenarioUrl,
  type DeployContext,
} from "./deploy/index.js";

/* -------------------------------------- a11y */
export {
  CONTRAST_THRESHOLDS,
  assertContrastPairs,
  checkContrastPair,
  checkContrastPairs,
  contrastRatio,
  flatten,
  parseColor,
  readCssVariable,
  relativeLuminance,
  type ContrastResult,
  type Rgb,
} from "./a11y/contrast.js";
export {
  computeRole,
  describeElement,
  shortSelector,
  tabbableElements,
  type AccessibleNode,
} from "./a11y/accessible-tree.js";
export {
  useKeyboardMode,
  type KeyboardModeResult,
  type TabStop,
} from "./a11y/useKeyboardMode.js";

/* ------------------------------------- tipos */
export {
  NETWORK_STATES,
  SCENARIO_STATUSES,
  type A11yContract,
  type ContrastPair,
  type ContrastTarget,
  type ControlsState,
  type DataRequest,
  type DataSourceAdapter,
  type Fixture,
  type Flow,
  type FlowStep,
  type KeyboardCoverage,
  type Module,
  type NetworkState,
  type Persona,
  type ProductDefinition,
  type ProductTheme,
  type Rule,
  type RouteDefinition,
  type Scenario,
  type ScenarioContext,
  type ScenarioStatus,
  type ScreenProps,
  type ViewportSetting,
} from "./types/index.js";
