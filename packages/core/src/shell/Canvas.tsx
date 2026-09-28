/**
 * Centro do chrome: a tela de fundo neutra e o quadro do produto.
 *
 * O quadro tem a largura do viewport — é a largura da janela que o produto
 * enxerga, então `@media` funciona. O zoom é só visualização: `transform:
 * scale` no quadro, com a caixa externa no tamanho já escalado para a rolagem
 * e a centralização baterem com o que se vê.
 *
 * Sincronização com o quadro:
 * - outra tela ou outro componente troca o endereço do quadro com
 *   `location.replace`, que não cria entrada no histórico do navegador;
 * - variação, persona, rede e dados vão por mensagem, sem recarregar;
 * - navegação feita pela UI do produto chega por mensagem e vira a URL do pai.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { DesignSpaceLocation } from "../controls/state.js";
import {
  FRAME_ATTRIBUTE,
  acceptFrameMessage,
  frameKey,
  postFrameMessage,
  toFrameUrl,
} from "../frame/index.js";
import type { ViewportSetting } from "../types/index.js";

export type CanvasProps = {
  location: DesignSpaceLocation;
  viewport: ViewportSetting;
  /**
   * Zoom em porcentagem. Em 100 (o padrão), um viewport mais largo que a área
   * central encolhe até caber; o valor efetivo volta por `onEffectiveZoom`.
   */
  zoom: number;
  onEffectiveZoom?: (zoom: number) => void;
  title: string;
  /** Desliga o ponteiro no quadro enquanto uma lateral é arrastada. */
  resizing: boolean;
  onFrameNavigate: (url: string, replace: boolean) => void;
  onShortcut: (key: "C" | "P") => void;
};

/** Respiro entre o quadro e a borda quando o viewport tem tamanho fixo. */
const GUTTER = 24;

export function Canvas({
  location,
  viewport,
  zoom,
  title,
  resizing,
  onFrameNavigate,
  onShortcut,
  onEffectiveZoom,
}: CanvasProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const area = useAreaSize(areaRef);

  const desired = toFrameUrl(location.path, location.search);
  // `src` é fixado na montagem. Depois disso o quadro é conduzido por
  // `location.replace` e por mensagem, nunca pelo atributo — trocar o atributo
  // empilharia entradas no histórico do navegador.
  const [initialSrc] = useState(desired);
  /** O endereço que o quadro deve estar mostrando agora. */
  const shownRef = useRef(desired);
  /** O último endereço carregado por navegação completa. */
  const loadedRef = useRef(desired);

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const load = useCallback(
    (url: string) => {
      loadedRef.current = url;
      const target = frameRef.current?.contentWindow;
      try {
        target?.location.replace(new URL(url, origin).toString());
      } catch {
        if (frameRef.current) frameRef.current.src = url;
      }
    },
    [origin],
  );

  useEffect(() => {
    if (desired === shownRef.current) return;
    const previous = shownRef.current;
    shownRef.current = desired;
    if (frameKey(previous) !== frameKey(desired)) {
      load(desired);
    } else {
      postFrameMessage(frameRef.current?.contentWindow, { ds: 1, type: "location", url: desired }, origin);
    }
  }, [desired, load, origin]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = acceptFrameMessage(event, {
        origin,
        source: frameRef.current?.contentWindow,
      });
      if (!message) return;

      switch (message.type) {
        case "ready": {
          if (message.url === shownRef.current) return;
          if (message.url === loadedRef.current) {
            // O quadro montou no endereço pedido, mas o estado mudou enquanto
            // ele carregava: entrega o atual.
            postFrameMessage(
              frameRef.current?.contentWindow,
              { ds: 1, type: "location", url: shownRef.current },
              origin,
            );
            return;
          }
          // O quadro chegou sozinho a outro endereço (navegação completa feita
          // pelo produto): ele é a verdade, e o pai adota.
          shownRef.current = message.url;
          loadedRef.current = message.url;
          onFrameNavigate(message.url, true);
          return;
        }
        case "navigate":
          shownRef.current = message.url;
          onFrameNavigate(message.url, message.replace);
          return;
        case "shortcut":
          onShortcut(message.key);
          return;
        default:
          return;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onFrameNavigate, onShortcut, origin]);

  const fixed = Boolean(viewport.width);
  const gutter = fixed ? GUTTER : 0;
  const availableWidth = Math.max(0, area.width - gutter * 2);
  const availableHeight = Math.max(0, area.height - gutter * 2);
  const fits = !viewport.width || availableWidth === 0 || viewport.width <= availableWidth;
  const effectiveZoom =
    zoom === 100 && !fits ? Math.max(10, Math.floor((availableWidth / viewport.width!) * 100)) : zoom;
  const scale = effectiveZoom / 100;

  useEffect(() => {
    onEffectiveZoom?.(effectiveZoom);
  }, [effectiveZoom, onEffectiveZoom]);
  const width = viewport.width ?? availableWidth / scale;
  const height = viewport.height ?? availableHeight / scale;

  return (
    <div className="ds-canvas" ref={areaRef} data-fit={fixed ? undefined : "true"}>
      <div
        className="ds-canvas__box"
        style={{ width: Math.floor(width * scale), height: Math.floor(height * scale) }}
      >
        <iframe
          ref={frameRef}
          {...{ [FRAME_ATTRIBUTE]: "" }}
          className="ds-frame"
          src={initialSrc}
          title={title}
          style={{
            width: Math.floor(width),
            height: Math.floor(height),
            transform: scale === 1 ? undefined : `scale(${scale})`,
            pointerEvents: resizing ? "none" : undefined,
          }}
        />
      </div>
    </div>
  );
}

/** Tamanho interno da área central, acompanhando redimensionamento. */
function useAreaSize(ref: RefObject<HTMLDivElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
