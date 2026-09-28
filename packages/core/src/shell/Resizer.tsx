/**
 * Alça de redimensionamento das laterais. Arrasta com o ponteiro e responde às
 * setas do teclado, de 16 em 16 px.
 */

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

export type ResizerProps = {
  /** Lado da lateral: a esquerda cresce para a direita, a direita, para a esquerda. */
  side: "left" | "right";
  label: string;
  value: number;
  onChange: (value: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

const KEY_STEP = 16;

export function Resizer({ side, label, value, onChange, onStart, onEnd }: ResizerProps) {
  const drag = useRef<{ x: number; width: number } | undefined>(undefined);
  const direction = side === "left" ? 1 : -1;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = { x: event.clientX, width: value };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sem captura, o arrasto continua enquanto o ponteiro estiver na alça.
    }
    onStart?.();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    onChange(drag.current.width + (event.clientX - drag.current.x) * direction);
  };

  const finish = () => {
    if (!drag.current) return;
    drag.current = undefined;
    onEnd?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const sign = event.key === "ArrowRight" ? 1 : -1;
    onChange(value + sign * direction * KEY_STEP);
  };

  return (
    <div
      className="ds-resizer"
      data-side={side}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onKeyDown={onKeyDown}
    />
  );
}
