/**
 * Estado vazio do quadro: rota inexistente ou endereço fora do handoff.
 *
 * Renderiza dentro do documento do quadro, ao lado da UI do produto, então
 * carrega os próprios tokens em `.ds-stage-empty` em vez de herdar do chrome.
 */

import type { ReactNode } from "react";

export function StageEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ds-stage-empty">
      <h2 className="ds-stage-empty__title">{title}</h2>
      {children}
    </div>
  );
}
