/**
 * O palco: onde a UI do produto renderiza sem interferência visual do motor.
 *
 * O motor não injeta um único estilo aqui dentro. A única coisa que ele aplica
 * — a largura de viewport — é variável de ambiente que o produto já teria que
 * responder no mundo real, não decisão de aparência.
 */

import { forwardRef, type ReactNode } from "react";
import type { ViewportSetting } from "../types/index.js";

export type StageProps = {
  viewport: ViewportSetting;
  children: ReactNode;
};

export const Stage = forwardRef<HTMLDivElement, StageProps>(function Stage(
  { viewport, children },
  ref,
) {
  return (
    <div className="ds-stage-scroll">
      <div
        ref={ref}
        className="ds-stage"
        data-viewport={viewport.id}
        style={{
          width: viewport.width ? `${viewport.width}px` : "100%",
          minHeight: viewport.height ? `${viewport.height}px` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
});

/** Estado vazio do palco: sem cenário ativo, ou rota sem cenário declarado. */
export function StageEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ds-chrome ds-stage-empty">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
