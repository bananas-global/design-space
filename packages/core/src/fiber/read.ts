/**
 * Leitura da árvore com degradação: o destaque nunca quebra a UI por causa
 * dela. Sem gancho, ou com árvore de forma desconhecida, devolve vazio e avisa
 * uma vez no console — e o destaque fica com a marcação manual.
 *
 * Os avisos são para quem mantém o produto, no console, e por isso não passam
 * por `labels.ts`.
 */

import { COMPONENT_ATTRIBUTE } from "../frame/index.js";
import { readFiberRoots } from "./hook.js";
import { findCatalogued, type CataloguedNode, type ImplementationIndex } from "./tree.js";

let warned = false;

/** Um aviso por documento: o destaque degrada, não quebra a UI. */
function warnOnce(message: string): void {
  if (warned) return;
  warned = true;
  console.warn(`[design-space] ${message}`);
}

/** Para testes: permite ver o aviso de novo. */
export function resetReadWarning(): void {
  warned = false;
}

/**
 * Instâncias catalogadas pela árvore do React. Vazio — com aviso — quando o
 * catálogo declara `implementation` e a árvore não pode ser lida.
 */
export function readCatalogued(index: ImplementationIndex, win: Window): CataloguedNode[] {
  if (index.size === 0) return [];
  const roots = readFiberRoots(win);
  if (!roots) {
    warnOnce(
      "Destacar componentes: o React carregou antes do gancho do DevTools, então só a marcação " +
        `\`${COMPONENT_ATTRIBUTE}\` é contornada. Importe "@brucesantos/design-space/devtools-hook" ` +
        "na primeira linha do ponto de entrada, antes de qualquer import de React.",
    );
    return [];
  }
  try {
    return findCatalogued(roots, index);
  } catch (error) {
    warnOnce(
      "Destacar componentes: a árvore do React não tem a forma esperada, então só a marcação " +
        `\`${COMPONENT_ATTRIBUTE}\` é contornada. ${error instanceof Error ? error.message : ""}`.trim(),
    );
    return [];
  }
}
