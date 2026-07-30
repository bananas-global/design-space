/**
 * O palco: onde a UI do produto renderiza sem interferência visual do motor.
 *
 * O motor não injeta um único estilo aqui dentro. As três coisas que ele aplica
 * — largura de viewport, escala de texto e redução de movimento — são variáveis
 * de ambiente que o produto já teria que responder no mundo real, não decisões
 * de aparência.
 */

import { forwardRef, type ReactNode } from "react";
import type { TabStop } from "../a11y/useKeyboardMode.js";
import type { ViewportSetting } from "../types/index.js";

export type StageProps = {
  viewport: ViewportSetting;
  textScale: number;
  reducedMotion: boolean;
  keyboardMode: boolean;
  children: ReactNode;
};

export const Stage = forwardRef<HTMLDivElement, StageProps>(function Stage(
  { viewport, textScale, reducedMotion, keyboardMode, children },
  ref,
) {
  return (
    <div className="ds-stage-scroll">
      <div
        ref={ref}
        className="ds-stage"
        data-viewport={viewport.id}
        data-keyboard-mode={keyboardMode}
        data-reduced-motion={reducedMotion}
        style={{
          width: viewport.width ? `${viewport.width}px` : "100%",
          minHeight: viewport.height ? `${viewport.height}px` : undefined,
          // A ampliação é aplicada no `font-size` do contêiner, não com
          // `transform: scale`. É a diferença entre testar se o layout aguenta
          // texto grande e só dar zoom na captura de tela.
          fontSize: textScale === 1 ? undefined : `${textScale * 100}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
});

/**
 * Numeração da ordem de tabulação sobreposta ao palco.
 *
 * O amarelo marca `tabindex` positivo, que fura a ordem natural do documento —
 * quase sempre um problema, e invisível de qualquer outra forma.
 */
export function TabOrderOverlay({ stops }: { stops: TabStop[] }) {
  if (stops.length === 0) return null;

  return (
    <div className="ds-taborder" aria-hidden="true">
      {stops.map((stop) => (
        <span
          key={`${stop.index}-${stop.rect.top}-${stop.rect.left}`}
          className="ds-taborder__badge"
          data-forced={stop.forcedOrder}
          style={{ top: stop.rect.top, left: stop.rect.left }}
        >
          {stop.index}
        </span>
      ))}
    </div>
  );
}

/** Estado vazio do palco: sem cenário ativo, ou rota sem cenário declarado. */
export function StageEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ds-stage-empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
