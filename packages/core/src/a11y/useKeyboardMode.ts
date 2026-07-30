/**
 * Modo teclado (§6.1, "No painel").
 *
 * Percorre a jornada sem mouse, com foco visível e ordem de tabulação
 * evidenciada. O ponto não é ter um checkbox de acessibilidade no painel: é
 * tornar visível, durante o desenho, que a ordem em que o Tab visita a tela é
 * uma decisão de design — e que ela quase nunca é a ordem que o layout sugere.
 */

import { useCallback, useEffect, useState } from "react";
import { describeElement, tabbableElements, type AccessibleNode } from "./accessible-tree.js";

export type TabStop = {
  index: number;
  element: HTMLElement;
  rect: DOMRect;
  /** `true` quando o elemento tem `tabindex` positivo, que fura a ordem natural. */
  forcedOrder: boolean;
};

export type KeyboardModeResult = {
  /** Elemento em foco descrito como nó acessível. */
  focused: AccessibleNode | undefined;
  /** Ordem de tabulação do palco, recalculada a cada mudança de foco. */
  tabStops: TabStop[];
  /** Recalcula a ordem manualmente, após uma mudança de layout. */
  refresh: () => void;
};

/**
 * @param enabled  Liga a observação. Desligado, o hook não instala listener
 *                 nenhum — o motor não deve custar nada quando não está em uso.
 * @param stageRef Contêiner da UI do produto. A ordem de tabulação medida é a do
 *                 produto, não a do chrome do Design Space.
 */
export function useKeyboardMode(
  enabled: boolean,
  stageRef: React.RefObject<HTMLElement | null>,
): KeyboardModeResult {
  const [focused, setFocused] = useState<AccessibleNode | undefined>();
  const [tabStops, setTabStops] = useState<TabStop[]>([]);

  const measure = useCallback(() => {
    const root = stageRef.current;
    if (!root) {
      setTabStops([]);
      return;
    }

    setTabStops(
      tabbableElements(root).map((element, index) => ({
        index: index + 1,
        element,
        rect: element.getBoundingClientRect(),
        forcedOrder: element.tabIndex > 0,
      })),
    );
  }, [stageRef]);

  useEffect(() => {
    if (!enabled) {
      setFocused(undefined);
      setTabStops([]);
      return;
    }

    const syncFocus = () => setFocused(describeElement(document.activeElement));

    // `focusin` em vez de `focus` porque borbulha: um único listener cobre a
    // árvore inteira, inclusive nós montados depois.
    document.addEventListener("focusin", syncFocus);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    syncFocus();
    measure();

    const root = stageRef.current;
    // A ordem de tabulação muda quando a tela muda — abrir um modal ou revelar um
    // campo condicional reordena tudo. Sem observar mutações, os números no
    // overlay ficariam mentindo até o próximo Tab.
    const observer = root ? new MutationObserver(() => measure()) : undefined;
    observer?.observe(root!, { childList: true, subtree: true, attributes: true });

    return () => {
      document.removeEventListener("focusin", syncFocus);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer?.disconnect();
    };
  }, [enabled, measure, stageRef]);

  return { focused, tabStops, refresh: measure };
}
