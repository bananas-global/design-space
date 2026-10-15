/**
 * Destaque de componentes, desenhado dentro do quadro.
 *
 * Serve à avaliação de design: o que na tela é componente e o que é marcação
 * solta. Duas fontes, unidas (decisão 0017):
 *
 * 1. **A árvore do React.** Cada instância de um componente que o catálogo
 *    declara em `implementation` é contornada, pelo primeiro nó de DOM que ela
 *    renderiza — ou pela união dos nós de topo, se for fragment. A árvore vem
 *    do gancho do DevTools (`./fiber/`), não de propriedade interna do DOM.
 * 2. **A marcação manual** `data-ds-component="<id>"`, para o que a árvore não
 *    resolve. Continua valendo com a árvore disponível.
 *
 * Um contorno por conjunto de nós: componentes que caem nos mesmos nós — um
 * wrapper que só repassa, ou a marcação manual sobre um componente que a árvore
 * já achou — viram um contorno com os nomes juntos, sem repetir id. Componentes
 * aninhados com nós diferentes, como um botão dentro de um cartão, aparecem os
 * dois. Se a árvore não estiver disponível ou mudar de forma, fica só a
 * marcação manual, com um aviso no console.
 *
 * Nada aqui toca nos elementos do produto. Os contornos são uma camada fixa por
 * cima da UI, sem receber ponteiro, montada no `body` do quadro: um `transform`
 * no wrapper do produto não desloca a camada. Vale o mesmo preto e branco do
 * chrome — traço escuro com halo claro, legível sobre qualquer fundo.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Registry } from "../registry/index.js";
import { COMPONENT_ATTRIBUTE } from "../frame/index.js";
import { installDevtoolsHook, subscribeCommits } from "../fiber/hook.js";
import { indexImplementations, type CataloguedNode, type ImplementationIndex } from "../fiber/tree.js";
import { readCatalogued } from "../fiber/read.js";
import { useLabels } from "./labels.js";

type Box = {
  key: string;
  /** Ids do catálogo, o de fora antes do de dentro; a marcação manual por último. */
  ids: string[];
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Caixas dos componentes visíveis, em coordenadas da janela. */
export function measureComponents(doc: Document, index: ImplementationIndex = new Map()): Box[] {
  const win = doc.defaultView ?? window;
  const targets: CataloguedNode[] = readCatalogued(index, win);
  doc.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTRIBUTE}]`).forEach((element) => {
    targets.push({ ids: [element.getAttribute(COMPONENT_ATTRIBUTE) ?? ""], elements: [element] });
  });

  // Mesmo conjunto de nós, um contorno só.
  const numbers = new Map<Element, number>();
  const byNodes = new Map<string, { ids: string[]; elements: Element[] }>();
  for (const target of targets) {
    const elements = target.elements.filter((element) => element.isConnected && !element.closest(".ds-highlight"));
    if (elements.length === 0) continue;
    const key = elements
      .map((element) => {
        if (!numbers.has(element)) numbers.set(element, numbers.size);
        return numbers.get(element);
      })
      .join(",");
    const entry = byNodes.get(key) ?? { ids: [], elements };
    for (const id of target.ids) if (!entry.ids.includes(id)) entry.ids.push(id);
    byNodes.set(key, entry);
  }

  const boxes: Box[] = [];
  for (const [key, { ids, elements }] of byNodes) {
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      top = Math.min(top, rect.top);
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }
    if (top === Infinity) continue;
    boxes.push({ key, ids, top, left, width: right - left, height: bottom - top });
  }
  return boxes;
}

function sameBoxes(a: Box[], b: Box[]): boolean {
  return (
    a.length === b.length &&
    a.every((box, i) => {
      const other = b[i]!;
      return (
        box.key === other.key &&
        box.top === other.top &&
        box.left === other.left &&
        box.width === other.width &&
        box.height === other.height &&
        box.ids.join("\n") === other.ids.join("\n")
      );
    })
  );
}

/** Altura do rótulo, em px; igual à de `.ds-highlight__label`. */
const LABEL_HEIGHT = 16;

export function Highlight({ registry }: { registry: Registry }) {
  const labels = useLabels();
  const index = useMemo(() => indexImplementations(registry.componentsFor()), [registry]);
  // A primeira medida espera o efeito: no render inicial do quadro, a raiz do
  // React ainda não fez o commit que a registra no gancho.
  const [boxes, setBoxes] = useState<Box[]>([]);

  // Remede no próximo quadro de animação a cada coisa que pode mover um
  // componente: commit do React, rolagem em qualquer contêiner, janela
  // redimensionada, DOM alterado, transição ou animação terminada.
  useEffect(() => {
    // Sem efeito quando o ponto de entrada já instalou; sem ele, só serve para
    // encadear no DevTools real, se houver.
    installDevtoolsHook(window);
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const next = measureComponents(document, index);
        // O próprio `setBoxes` faz commit; sem esta checagem, cada commit
        // agendaria outra medida.
        setBoxes((previous) => (sameBoxes(previous, next) ? previous : next));
      });
    };
    // A própria camada muda a cada medida; reagir a ela seria remedir à toa.
    const observer = new MutationObserver((records) => {
      const outside = records.some((record) => {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        return !target?.closest(".ds-highlight");
      });
      if (outside) schedule();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("transitionend", schedule, true);
    document.addEventListener("animationend", schedule, true);
    const unsubscribe = subscribeCommits(schedule, window);
    schedule();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("animationend", schedule, true);
      unsubscribe();
    };
  }, [index]);

  return createPortal(
    <div className="ds-highlight" aria-hidden="true">
      {boxes.map((box) => {
        const entries = box.ids.map((id) => ({ id, known: registry.component(id) }));
        return (
          <div
            key={box.key}
            className="ds-highlight__box"
            data-known={entries.every((entry) => entry.known) ? "true" : "false"}
            // Rótulo acima do contorno, para não cobrir o componente; dentro
            // dele só quando não há espaço no alto da janela.
            data-label={box.top < LABEL_HEIGHT ? "inside" : "above"}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          >
            <span className="ds-highlight__label">
              {entries
                .map((entry) => (entry.known ? entry.known.name : labels.highlight.notInCatalog(entry.id)))
                .join(" · ")}
            </span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
