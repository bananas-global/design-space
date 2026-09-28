/**
 * Markdown do "Copiar para o PR".
 *
 * O PR é onde a tela desenhada vira trabalho de engenharia, e o que a pessoa
 * desenvolvedora precisa ali é pequeno e sempre o mesmo: que tela é, um link por
 * variação que abre exatamente aquela situação, de onde vem cada componente no
 * sistema real e o que cada variação precisa fazer. Montar isso à mão a cada PR
 * é onde os links ficam relativos e os componentes ficam de fora.
 *
 * Função pura: recebe o que o painel já tem e devolve texto.
 */

import type { DeployContext } from "../deploy/index.js";
import { scenarioUrl } from "../deploy/index.js";
import type { ScreenNode } from "../registry/index.js";
import type { ComponentPreview, ControlsState, Scenario } from "../types/index.js";
import { applyOverrides } from "../controls/params.js";
import type { Labels } from "./labels.js";

export type PrMarkdownInput = {
  screen: ScreenNode;
  /** Variações a listar, normalmente as visíveis no recorte ativo. */
  variations: Scenario[];
  components: ComponentPreview[];
  deploy: DeployContext;
  labels: Labels;
  /** Controles que o link precisa carregar, como o recorte de handoff. */
  overrides?: Partial<ControlsState>;
};

export function buildPrMarkdown({
  screen,
  variations,
  components,
  deploy,
  labels,
  overrides,
}: PrMarkdownInput): string {
  const pr = labels.pr;
  const lines: string[] = [`## ${screen.name}`, ""];
  if (screen.description) lines.push(screen.description, "");
  lines.push(`\`${screen.route.path}\``, "");

  // Link imutável só existe quando o produto informa o domínio do deployment;
  // sem ele, o commit ainda entra como texto para a revisão ser rastreável.
  const immutableOrigin = deploy.deploymentUrl ? `https://${deploy.deploymentUrl}` : undefined;
  const commitNote = deploy.shortCommit ? pr.commit(deploy.shortCommit) : undefined;

  lines.push(`### ${pr.variations}`, "");
  if (variations.length === 0) {
    const url = new URL(screen.href, deploy.origin);
    applyOverrides(url.searchParams, overrides);
    lines.push(`- [${labels.panel.defaultVariation}](${url.toString()})`);
  }
  for (const variation of variations) {
    const url = scenarioUrl(variation, { origin: deploy.origin, overrides });
    let line = `- [${escapeLinkText(variation.title)}](${url})`;
    if (immutableOrigin) {
      const pinned = scenarioUrl(variation, { origin: immutableOrigin, overrides });
      line += ` · [${commitNote ?? pr.immutableLink}](${pinned})`;
    } else if (commitNote) {
      line += ` · ${commitNote}`;
    }
    lines.push(line);
  }
  lines.push("");

  if (components.length > 0) {
    lines.push(`### ${pr.components}`, "");
    lines.push(`| ${pr.component} | ${pr.source} |`, "| --- | --- |");
    for (const component of components) {
      const source = component.source ? `\`${escapeCell(component.source)}\`` : pr.empty;
      lines.push(`| ${escapeCell(component.name)} (\`${component.id}\`) | ${source} |`);
    }
    lines.push("");
  }

  lines.push(`### ${pr.expected}`, "");
  if (variations.length === 0) {
    lines.push(`**${labels.panel.defaultVariation}**`, "", pr.noExpected, "");
  }
  for (const variation of variations) {
    lines.push(`**${variation.title}**`, "");
    if (variation.expected?.length) {
      for (const item of variation.expected) lines.push(`- ${item}`);
    } else {
      lines.push(pr.noExpected);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeLinkText(value: string): string {
  return value.replace(/([[\]])/g, "\\$1");
}
