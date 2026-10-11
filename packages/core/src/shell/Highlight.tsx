/**
 * Destaque de componentes, desenhado dentro do quadro.
 *
 * Serve à avaliação de design: o que na tela é componente e o que é marcação
 * solta. O motor não adivinha — contorna só o que o produto marcou com
 * `data-ds-component="<id>"`. O que fica sem contorno é, para a avaliação, o
 * que ainda não virou componente.
 *
 * Nada aqui toca nos elementos do produto. Os contornos são uma camada fixa por
 * cima da UI, sem receber ponteiro, montada no `body` do quadro: um `transform`
 * no wrapper do produto não desloca a camada. Vale o mesmo preto e branco do
 * chrome — traço escuro com halo claro, legível sobre qualquer fundo.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Registry } from "../registry/index.js";
import { COMPONENT_ATTRIBUTE } from "../frame/index.js";
import { useLabels } from "./labels.js";

type Box = {
  key: string;
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Caixas dos componentes marcados e visíveis, em coordenadas da janela. */
export function measureComponents(doc: Document): Box[] {
  const boxes: Box[] = [];
  doc.querySelectorAll<HTMLElement>(`[${COMPONENT_ATTRIBUTE}]`).forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    boxes.push({
      key: `${index}`,
      id: element.getAttribute(COMPONENT_ATTRIBUTE) ?? "",
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  });
  return boxes;
}

/** Altura do rótulo, em px; igual à de `.ds-highlight__label`. */
const LABEL_HEIGHT = 16;

export function Highlight({ registry }: { registry: Registry }) {
  const labels = useLabels();
  const [boxes, setBoxes] = useState<Box[]>(() => measureComponents(document));

  // Remede no próximo quadro de animação a cada coisa que pode mover um
  // componente: rolagem em qualquer contêiner, janela redimensionada, DOM
  // alterado, transição ou animação terminada.
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setBoxes(measureComponents(document));
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
    schedule();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("animationend", schedule, true);
    };
  }, []);

  return createPortal(
    <div className="ds-highlight" aria-hidden="true">
      {boxes.map((box) => {
        const known = registry.component(box.id);
        return (
          <div
            key={box.key}
            className="ds-highlight__box"
            data-known={known ? "true" : "false"}
            // Rótulo acima do contorno, para não cobrir o componente; dentro
            // dele só quando não há espaço no alto da janela.
            data-label={box.top < LABEL_HEIGHT ? "inside" : "above"}
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          >
            <span className="ds-highlight__label">
              {known ? known.name : labels.highlight.notInCatalog(box.id)}
            </span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
