/**
 * Markdown do "Copiar para o PR".
 *
 * O PR é onde a tela desenhada vira trabalho de engenharia, e o que a pessoa
 * desenvolvedora precisa ali é pequeno e sempre o mesmo: que tela é, um link por
 * variação que abre exatamente aquela situação, de onde vem cada componente no
 * sistema real e o que cada variação precisa fazer. Montar isso à mão a cada PR
 * é onde os links ficam relativos e os componentes ficam de fora.
 *
 * Função pura: recebe o que o painel já tem e devolve texto. Tela com fluxo
 * (`route.group`) sai por {@link buildFlowPrMarkdown}, com o fluxo inteiro.
 */

import type { DeployContext } from "../deploy/index.js";
import { scenarioUrl } from "../deploy/index.js";
import { controlDefault, type Registry, type ScreenNode } from "../registry/index.js";
import { CHROME_ONLY_PARAMS } from "../frame/index.js";
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

export type FlowPrMarkdownInput = {
  /** O fluxo da tela aberta, com as telas visíveis no recorte ativo. */
  flow: { name: string; screens: ScreenNode[] };
  registry: Registry;
  /** A tela aberta: o link dela leva os controles atuais. */
  open?: { screen: ScreenNode; location: { path: string; search: string }; variation?: Scenario };
  deploy: DeployContext;
  labels: Labels;
  /** Controles que os links precisam carregar, como o recorte de handoff. */
  overrides?: Partial<ControlsState>;
};

/**
 * Markdown de um fluxo inteiro: um PR de feature costuma trazer as telas do
 * fluxo juntas, e a pessoa desenvolvedora precisa ver a sequência, não uma tela
 * solta. Para cada tela: nome, rota, link, controles disponíveis, atalhos,
 * comportamento esperado e a tabela de componentes.
 */
export function buildFlowPrMarkdown({
  flow,
  registry,
  open,
  deploy,
  labels,
  overrides,
}: FlowPrMarkdownInput): string {
  const pr = labels.pr;
  const lines: string[] = [`## ${flow.name}`, ""];
  const immutableOrigin = deploy.deploymentUrl ? `https://${deploy.deploymentUrl}` : undefined;
  const commitNote = deploy.shortCommit ? pr.commit(deploy.shortCommit) : undefined;

  const screenLink = (screen: ScreenNode, origin: string): string => {
    if (open && open.screen.id === screen.id) {
      const url = new URL(open.location.path || "/", origin);
      const params = new URLSearchParams(open.location.search);
      for (const name of CHROME_ONLY_PARAMS) params.delete(name);
      for (const [key, value] of params) url.searchParams.append(key, value);
      applyOverrides(url.searchParams, overrides);
      return url.toString();
    }
    const first = screen.variations[0];
    if (first) return scenarioUrl(first, { origin, overrides });
    const url = new URL(screen.href, origin);
    applyOverrides(url.searchParams, overrides);
    return url.toString();
  };

  for (const screen of flow.screens) {
    lines.push(`### ${screen.name}`, "");
    if (screen.description) lines.push(screen.description, "");

    let link = `\`${screen.route.path}\` · [${pr.open}](${screenLink(screen, deploy.origin)})`;
    if (immutableOrigin) link += ` · [${commitNote ?? pr.immutableLink}](${screenLink(screen, immutableOrigin)})`;
    else if (commitNote) link += ` · ${commitNote}`;
    lines.push(link, "");

    if (screen.controls.length > 0) {
      lines.push(`**${pr.controls}**`, "");
      for (const group of screen.controls) {
        lines.push(`- ${escapeMarkdown(group.title)} (\`${group.id}\`)`);
        for (const control of group.controls) {
          const fallback = controlDefault(control);
          const options = control.options
            .map((option) =>
              option.value === fallback
                ? `${escapeMarkdown(option.label)} (\`${option.value}\`, ${pr.defaultOption})`
                : `${escapeMarkdown(option.label)} (\`${option.value}\`)`,
            )
            .join(" · ");
          lines.push(`  - ${escapeMarkdown(control.label)} (\`c.${control.id}\`): ${options}`);
        }
      }
      lines.push("");
    }

    if (screen.variations.length > 0) {
      lines.push(`**${pr.shortcuts}**`, "");
      for (const variation of screen.variations) {
        lines.push(
          `- [${escapeLinkText(variation.title)}](${scenarioUrl(variation, { origin: deploy.origin, overrides })})`,
        );
      }
      lines.push("");
    }

    lines.push(`**${pr.expected}**`, "");
    const openVariation = open?.screen.id === screen.id ? open.variation : undefined;
    const own = openVariation?.expected?.length ? openVariation.expected : screen.route.expected;
    const withExpected = screen.variations.filter(
      (variation) => variation.expected?.length && variation.id !== openVariation?.id,
    );
    if (!own?.length && withExpected.length === 0) lines.push(pr.noExpected, "");
    if (own?.length) {
      for (const item of own) lines.push(`- ${item}`);
      lines.push("");
    }
    for (const variation of withExpected) {
      lines.push(`*${variation.title}*`, "");
      for (const item of variation.expected ?? []) lines.push(`- ${item}`);
      lines.push("");
    }

    const components = registry.componentsOfScreen(screen);
    if (components.length > 0) {
      lines.push(`**${pr.components}**`, "");
      lines.push(`| ${pr.component} | ${pr.source} |`, "| --- | --- |");
      for (const component of components) {
        const source = component.source ? `\`${escapeCell(component.source)}\`` : pr.empty;
        lines.push(`| ${escapeCell(component.name)} (\`${component.id}\`) | ${source} |`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([*_[\]`])/g, "\\$1");
}
