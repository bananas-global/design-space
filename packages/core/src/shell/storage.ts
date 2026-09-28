/**
 * Preferências locais do chrome: largura das laterais e tema escolhido.
 *
 * Só conveniência de quem revisa. Nada aqui muda a situação exibida — isso é
 * trabalho da URL — e toda leitura e escrita tolera `localStorage` ausente ou
 * bloqueado (janela anônima, política do navegador, ambiente de teste).
 */

import { useCallback, useEffect, useState } from "react";
import type { ChromeTheme } from "../types/index.js";

export const STORAGE_KEYS = {
  leftWidth: "ds:left-width",
  rightWidth: "ds:right-width",
  appearance: "ds:appearance",
} as const;

export function readStored(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento, a preferência vale só para esta visita.
  }
}

export function clampWidth(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

/** Largura lembrada entre visitas, sempre dentro da faixa. */
export function useStoredWidth(
  key: string,
  initial: number,
  min: number,
  max: number,
): [number, (next: number) => void] {
  const [width, setWidth] = useState(() => {
    const stored = Number.parseInt(readStored(key) ?? "", 10);
    return Number.isFinite(stored) ? clampWidth(stored, min, max) : initial;
  });

  const update = useCallback(
    (next: number) => {
      const clamped = clampWidth(next, min, max);
      setWidth(clamped);
      writeStored(key, String(clamped));
    },
    [key, max, min],
  );

  return [width, update];
}

/** Tema do sistema, acompanhando a troca enquanto a página está aberta. */
export function useSystemTheme(): ChromeTheme {
  const query = "(prefers-color-scheme: dark)";
  const read = (): ChromeTheme => {
    try {
      return window.matchMedia(query).matches ? "dark" : "light";
    } catch {
      return "light";
    }
  };
  const [theme, setTheme] = useState<ChromeTheme>(read);

  useEffect(() => {
    let media: MediaQueryList | undefined;
    try {
      media = window.matchMedia(query);
    } catch {
      return;
    }
    const onChange = () => setTheme(media?.matches ? "dark" : "light");
    media.addEventListener?.("change", onChange);
    return () => media?.removeEventListener?.("change", onChange);
  }, []);

  return theme;
}

export function storedTheme(): ChromeTheme | undefined {
  const value = readStored(STORAGE_KEYS.appearance);
  return value === "dark" || value === "light" ? value : undefined;
}
