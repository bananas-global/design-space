/**
 * `@brucesantos/design-space/pr`
 *
 * A descrição do PR gerada do registro do produto. O critério de aceite é
 * escrito uma vez, no cenário (`intent`, `preconditions`, `actions`,
 * `expected`, `rules`), e chega ao PR por aqui, reescrito a cada push. Ninguém
 * copia nada à mão: cópia diverge na primeira mudança, e quem valida a entrega,
 * gente ou agente, precisa de uma fonte só. Ver a decisão 0018.
 *
 * Funções puras, sem Node nem DOM. Quem lê o produto do disco e fala com o
 * repositório é o comando `design-space-pr`.
 */

import { scenarioUrl } from "../deploy/index.js";
import { createRegistry, type Registry, type ScreenNode } from "../registry/index.js";
import { resolveLabels, type Labels } from "../shell/labels.js";
import type { ProductDefinition, Scenario } from "../types/index.js";

/**
 * Marcas do bloco gerado. Tudo entre elas é reescrito a cada push; tudo fora
 * delas é de quem escreveu o PR e nunca é tocado.
 */
export const PR_MARKERS = {
  start: "<!-- design-space:pr:start -->",
  end: "<!-- design-space:pr:end -->",
} as const;

export type PrChange = "new" | "changed";

export type PrScreen = {
  screen: ScreenNode;
  /** O que mudou em cada variação neste PR, por id. Ausente: sem mudança. */
  changes: Map<string, PrChange>;
  /** Variações que a base tinha nesta tela e o PR removeu. */
  removed: Scenario[];
};

export type PrDiff = {
  /** `false` quando não houve base para comparar: aí todas as telas entram. */
  compared: boolean;
  /** Telas que o PR cria ou altera, na ordem do produto. */
  screens: PrScreen[];
  /** Telas que existiam na base e o PR removeu. */
  removedScreens: { name: string; path: string }[];
};

/**
 * Compara o registro do PR com o da base.
 *
 * Uma tela entra quando é nova, quando a rota mudou ou quando algum cenário
 * dela foi criado, alterado ou removido. Mudança no enunciado de uma regra
 * conta como mudança dos cenários que a citam. Mudança só no código da tela,
 * sem tocar no registro, não muda critério e não entra.
 */
export function diffProducts(head: ProductDefinition, base?: ProductDefinition): PrDiff {
  const registry = createRegistry(head);
  if (!base) {
    return {
      compared: false,
      screens: registry.screens.map((screen) => ({ screen, changes: new Map(), removed: [] })),
      removedScreens: [],
    };
  }

  const baseRegistry = createRegistry(base);
  const baseScenarios = new Map(
    (base.scenarios ?? []).map((scenario) => [scenario.id, scenarioPrint(baseRegistry, scenario)]),
  );
  const baseScreens = new Map(baseRegistry.screens.map((screen) => [screen.route.path, screen]));
  const headIds = new Set((head.scenarios ?? []).map((scenario) => scenario.id));

  const screens: PrScreen[] = [];
  for (const screen of registry.screens) {
    const before = baseScreens.get(screen.route.path);
    const changes = new Map<string, PrChange>();
    for (const variation of screen.variations) {
      const print = baseScenarios.get(variation.id);
      if (print === undefined) changes.set(variation.id, "new");
      else if (print !== scenarioPrint(registry, variation)) changes.set(variation.id, "changed");
    }
    const removed = before?.variations.filter((variation) => !headIds.has(variation.id)) ?? [];
    const routeChanged = !before || routePrint(before) !== routePrint(screen);
    if (routeChanged || changes.size > 0 || removed.length > 0) screens.push({ screen, changes, removed });
  }

  const headPaths = new Set(registry.screens.map((screen) => screen.route.path));
  const removedScreens = baseRegistry.screens
    .filter((screen) => !headPaths.has(screen.route.path))
    .map((screen) => ({ name: screen.name, path: screen.route.path }));

  return { compared: true, screens, removedScreens };
}

// Função não serializa: o componente da tela fica de fora, e o que sobra é o
// que o registro declara.
function scenarioPrint(registry: Registry, scenario: Scenario): string {
  return JSON.stringify({ scenario, rules: registry.rulesOf(scenario) });
}

function routePrint(screen: ScreenNode): string {
  return JSON.stringify(screen.route);
}

export type PrSectionInput = {
  /** O produto como está no PR. */
  head: ProductDefinition;
  /** O produto na base do PR. Sem ela, todas as telas entram. */
  base?: ProductDefinition;
  /** Origem absoluta do preview deste PR. Sem ela, o bloco sai sem links. */
  origin?: string;
  /** Commit do PR que gerou o bloco. */
  commit?: string;
  /**
   * Tamanho máximo do bloco, em caracteres. As telas que não couberem saem só
   * pelo nome. A descrição de PR tem limite, e um bloco cortado no meio de um
   * critério é pior que um que diz o que ficou de fora.
   */
  maxLength?: number;
};

/** O bloco gerado, com as marcas. */
export function buildPrSection({ head, base, origin, commit, maxLength }: PrSectionInput): string {
  const registry = createRegistry(head);
  const diff = diffProducts(head, base);
  const pr = resolveLabels(head.theme?.labels).pr;
  const root = origin?.replace(/\/+$/, "") || undefined;

  const lines: string[] = [PR_MARKERS.start, `## ${pr.title}`, "", `> ${pr.notice(commit?.slice(0, 7))}`, ""];
  if (root) lines.push(`${pr.preview}: ${root}`, "");

  if (diff.screens.length === 0 && diff.removedScreens.length === 0) {
    lines.push(pr.nothingChanged, "");
  } else {
    lines.push(diff.compared ? pr.scopeChanged : pr.scopeAll, "");
  }

  const tail: string[] = [];
  if (diff.removedScreens.length > 0) {
    const names = diff.removedScreens.map((screen) => `${escapeMarkdown(screen.name)} (\`${screen.path}\`)`);
    tail.push(`**${pr.removedScreens}:** ${names.join(", ")}`, "");
  }
  tail.push(PR_MARKERS.end);

  // Folga para a linha das telas que ficarem de fora.
  const budget = maxLength === undefined ? Infinity : maxLength - size(tail) - 2000;
  const left: string[] = [];
  for (const item of diff.screens) {
    const chunk = screenLines(item, registry, pr, root);
    if (left.length === 0 && size(lines) + size(chunk) <= budget) lines.push(...chunk);
    else left.push(`${escapeMarkdown(item.screen.name)} (\`${item.screen.route.path}\`)`);
  }
  if (left.length > 0) lines.push(`**${pr.truncated}:** ${left.join(", ")}`, "");

  lines.push(...tail);
  return `${lines.join("\n")}\n`;
}

function size(lines: string[]): number {
  return lines.reduce((total, line) => total + line.length + 1, 0);
}

function screenLines(item: PrScreen, registry: Registry, pr: Labels["pr"], origin: string | undefined): string[] {
  const { screen } = item;
  const lines = [`### ${escapeMarkdown(screen.name)}`, ""];
  // Com cenário, cada um tem o seu link; o da tela só faz falta quando não há
  // nenhum, e aí abre o caminho de exemplo (`params`).
  const link =
    origin && screen.variations.length === 0
      ? ` · [${pr.open}](${new URL(screen.href, origin).toString()})`
      : "";
  lines.push(`\`${screen.route.path}\`${link}`, "");
  if (screen.description) lines.push(oneLine(screen.description), "");
  if (screen.route.expected?.length) lines.push(`**${pr.screenExpected}**`, "", ...numbered(screen.route.expected), "");

  for (const variation of screen.variations) {
    const change = item.changes.get(variation.id);
    const status = change === "new" ? pr.statusNew : change === "changed" ? pr.statusChanged : undefined;
    lines.push(
      `#### ${escapeMarkdown(variation.title)} · \`${variation.id}\`${status ? ` · ${status}` : ""}`,
      "",
    );

    const meta: string[] = [];
    if (origin) meta.push(`[${pr.open}](${scenarioUrl(variation, { origin })})`);
    const persona = registry.persona(variation.persona);
    if (persona) meta.push(`${pr.persona}: ${escapeMarkdown(persona.name)}`);
    if (variation.ticket) meta.push(`${pr.ticket}: ${variation.ticket}`);
    if (meta.length > 0) lines.push(meta.join(" · "), "");

    if (variation.intent) lines.push(oneLine(variation.intent), "");
    if (variation.preconditions?.length) lines.push(`**${pr.preconditions}**`, "", ...bullets(variation.preconditions), "");
    if (variation.actions?.length) lines.push(`**${pr.actions}**`, "", ...bullets(variation.actions), "");
    lines.push(`**${pr.expected}**`, "");
    lines.push(...(variation.expected?.length ? numbered(variation.expected) : [pr.noExpected]), "");

    const rules = registry.rulesOf(variation);
    if (rules.length > 0) {
      lines.push(`**${pr.rules}**`, "");
      for (const rule of rules) lines.push(`- \`${rule.id}\` — ${oneLine(rule.statement)}`);
      lines.push("");
    }
  }

  const components = registry.componentsOfScreen(screen);
  if (components.length > 0) {
    lines.push(`**${pr.components}**`, "", `| ${pr.component} | ${pr.source} |`, "| --- | --- |");
    for (const component of components) {
      const source = component.source ? `\`${escapeCell(component.source)}\`` : pr.empty;
      lines.push(`| ${escapeCell(component.name)} (\`${component.id}\`) | ${source} |`);
    }
    lines.push("");
  }

  if (item.removed.length > 0) {
    const names = item.removed.map((variation) => `${escapeMarkdown(variation.title)} (\`${variation.id}\`)`);
    lines.push(`**${pr.removedScenarios}:** ${names.join(", ")}`, "");
  }

  return lines;
}

/**
 * A descrição nova do PR.
 *
 * Com as marcas, troca só o que está entre elas. Sem as marcas, acrescenta o
 * bloco ao fim do que já houver. Em branco, a descrição é só o bloco: o PR não
 * tem seção para preencher à mão, e o formato é o mesmo em todo produto.
 */
export function mergePrBody(body: string | null | undefined, section: string): string {
  const current = (body ?? "").replace(/\r\n/g, "\n");
  const block = section.trim();
  const start = current.indexOf(PR_MARKERS.start);
  if (start !== -1) {
    const end = current.indexOf(PR_MARKERS.end, start);
    // Marca de fim apagada à mão: o bloco vai até o fim da descrição.
    const after = end === -1 ? "" : current.slice(end + PR_MARKERS.end.length);
    return `${current.slice(0, start)}${block}${after}`;
  }
  return current.trim() ? `${current.trimEnd()}\n\n${block}\n` : `${block}\n`;
}

function numbered(items: string[]): string[] {
  return items.map((item, index) => `${index + 1}. ${oneLine(item)}`);
}

function bullets(items: string[]): string[] {
  return items.map((item) => `- ${oneLine(item)}`);
}

function oneLine(value: string): string {
  return value.replace(/\s*\n\s*/g, " ").trim();
}

function escapeCell(value: string): string {
  return oneLine(value).replace(/\|/g, "\\|");
}

function escapeMarkdown(value: string): string {
  return oneLine(value).replace(/([*_[\]`])/g, "\\$1");
}
