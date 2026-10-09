/**
 * Protocolo entre o chrome e o quadro.
 *
 * A UI do produto roda dentro de um `<iframe>` da mesma origem e do mesmo
 * bundle, aberto com `ds-frame=1`. Duas razões, as duas concretas:
 *
 * 1. **Isolamento de CSS nos dois sentidos.** O preflight e o `body` do produto
 *    não alcançam o chrome, e o chrome não alcança o produto.
 * 2. **Viewport real.** A largura do quadro é a largura da janela que o produto
 *    enxerga, então `@media` funciona como em produção.
 *
 * Os dois documentos conversam só por `postMessage`, e cada lado só aceita
 * mensagem da mesma origem **e** da janela esperada — o pai aceita do próprio
 * quadro, o quadro aceita do próprio pai. Qualquer outra coisa é ignorada.
 */

import { PARAM } from "../controls/params.js";

/** Parâmetro que põe `<DesignSpace>` em modo quadro. */
export const FRAME_PARAM = "ds-frame";

/** Atributo do `<iframe>` do chrome. Serve de seletor para testes. */
export const FRAME_ATTRIBUTE = "data-ds-frame";

/**
 * Parâmetros que só o chrome lê. Ficam fora do endereço do quadro: trocar zoom
 * ou tema do chrome não é assunto da UI do produto.
 */
export const CHROME_ONLY_PARAMS: readonly string[] = [
  PARAM.chromeTheme,
  PARAM.chrome,
  PARAM.inspector,
  PARAM.panelTab,
  PARAM.zoom,
  PARAM.rotated,
];

/**
 * Atalhos do chrome que o quadro repassa: revisão limpa (Shift+C), busca da
 * lateral (Cmd/Ctrl+K) e filtro do painel (Cmd/Ctrl+F).
 */
export type FrameShortcut = "C" | "K" | "F";

export type FrameMessage =
  /** Quadro → pai: montou, neste endereço. */
  | { ds: 1; type: "ready"; url: string }
  /** Quadro → pai: a UI do produto navegou. */
  | { ds: 1; type: "navigate"; url: string; replace: boolean }
  /** Quadro → pai: atalho do chrome pressionado com o foco dentro do quadro. */
  | { ds: 1; type: "shortcut"; key: FrameShortcut }
  /** Pai → quadro: novo estado, sem recarregar. */
  | { ds: 1; type: "location"; url: string };

/**
 * Endereço do quadro para um estado do chrome: mesmo caminho, mesma query sem os
 * parâmetros do chrome, e `ds-frame=1` no fim. Determinística: o pai e o quadro
 * chegam à mesma string para o mesmo estado, e é isso que evita recarga à toa.
 */
export function toFrameUrl(path: string, search: string): string {
  const params = new URLSearchParams(search);
  for (const name of CHROME_ONLY_PARAMS) params.delete(name);
  params.delete(FRAME_PARAM);
  params.set(FRAME_PARAM, "1");
  return `${path || "/"}?${params.toString()}`;
}

/**
 * Endereço para abrir o quadro sozinho, numa janela própria. É o caminho para
 * ferramenta de captura que lê só o documento de cima e não entra no `<iframe>`.
 *
 * Parte do endereço que o quadro está mostrando de fato (`frameHref`), porque a
 * UI do produto pode ter navegado dentro dele; sem esse endereço — quadro ainda
 * em `about:blank`, em outra origem ou inacessível —, parte do estado do pai.
 * Nos dois casos sai pelo `toFrameUrl`: sem os parâmetros do chrome e com
 * `ds-frame=1`, mesmo que uma navegação completa do quadro o tenha perdido.
 *
 * O viewport também fica de fora. Na janela própria a largura é a da janela, e
 * sem o parâmetro o quadro cai em "Ajustar": `context.viewport` e `@media`
 * contam a mesma história. Com `viewport=mobile` numa janela larga, a tela que
 * decide pelo contexto mostraria celular esticado.
 */
export function standaloneFrameUrl(
  frameHref: string | undefined,
  origin: string,
  fallback: { path: string; search: string },
): string {
  let { path, search } = fallback;
  if (frameHref) {
    try {
      // `about:blank` tem origem "null", então também cai no pai.
      const shown = new URL(frameHref);
      if (shown.origin === origin) ({ pathname: path, search } = shown);
    } catch {
      // Endereço inválido: fica com o do pai.
    }
  }
  const params = new URLSearchParams(search);
  params.delete(PARAM.viewport);
  params.delete(PARAM.customWidth);
  return toFrameUrl(path, `?${params.toString()}`);
}

/** Caminho e query de um endereço do quadro, sem o parâmetro de modo. */
export function fromFrameUrl(url: string): { path: string; search: string } {
  const parsed = new URL(url, "http://design-space.invalid");
  parsed.searchParams.delete(FRAME_PARAM);
  const query = parsed.searchParams.toString();
  return { path: parsed.pathname || "/", search: query ? `?${query}` : "" };
}

/**
 * O que obriga a trocar o `src` do quadro: outra tela (caminho) ou outro
 * componente. O resto — variação, persona, rede, dados — vai por mensagem.
 */
export function frameKey(url: string): string {
  const parsed = new URL(url, "http://design-space.invalid");
  return `${parsed.pathname}|${parsed.searchParams.get(PARAM.component) ?? ""}`;
}

/**
 * Query do quadro com os parâmetros do chrome que estavam no pai. Uma navegação
 * iniciada pelo produto não pode desligar o painel nem trocar o zoom.
 */
export function mergeChromeParams(frameSearch: string, parentSearch: string): string {
  const next = new URLSearchParams(frameSearch);
  const parent = new URLSearchParams(parentSearch);
  next.delete(FRAME_PARAM);
  for (const name of CHROME_ONLY_PARAMS) {
    next.delete(name);
    const value = parent.get(name);
    if (value !== null) next.set(name, value);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}

function isFrameMessage(data: unknown): data is FrameMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as Partial<FrameMessage>;
  if (message.ds !== 1 || typeof message.type !== "string") return false;
  switch (message.type) {
    case "ready":
    case "location":
      return typeof (message as { url?: unknown }).url === "string";
    case "navigate":
      return typeof (message as { url?: unknown }).url === "string";
    case "shortcut":
      return ["C", "K", "F"].includes((message as { key?: unknown }).key as string);
    default:
      return false;
  }
}

/**
 * Aceita uma mensagem só quando vem da mesma origem e da janela esperada, e tem
 * a forma do protocolo. Qualquer outra — extensão, outro iframe, outra aba —
 * devolve `undefined`.
 */
export function acceptFrameMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  expected: { origin: string; source: MessageEventSource | null | undefined },
): FrameMessage | undefined {
  if (event.origin !== expected.origin) return undefined;
  if (!expected.source || event.source !== expected.source) return undefined;
  return isFrameMessage(event.data) ? event.data : undefined;
}

/** Envia para a outra janela, sempre restrito à própria origem. */
export function postFrameMessage(
  target: Window | null | undefined,
  message: FrameMessage,
  origin: string,
): void {
  try {
    target?.postMessage(message, origin);
  } catch {
    // Janela fechada ou em outra origem: nada a sincronizar.
  }
}

/**
 * `true` quando este documento é o quadro: pedido pela URL ou carregado dentro
 * do `<iframe>` do chrome. O segundo caso cobre uma navegação completa dentro do
 * quadro que perdeu o parâmetro — sem ele, o chrome renderizaria dentro de si.
 */
export function isFrameMode(win: Window | undefined = typeof window === "undefined" ? undefined : window): boolean {
  if (!win) return false;
  if (new URLSearchParams(win.location.search).get(FRAME_PARAM) === "1") return true;
  try {
    return Boolean(win.frameElement?.hasAttribute(FRAME_ATTRIBUTE));
  } catch {
    return false;
  }
}
