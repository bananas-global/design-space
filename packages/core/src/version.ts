/** Nome e versão do pacote, gravados no build a partir do `package.json`. */
declare const __DS_VERSION__: string;

export const ENGINE_PACKAGE = "@brucesantos/design-space";
export const ENGINE_VERSION: string = typeof __DS_VERSION__ === "string" ? __DS_VERSION__ : "0.0.0";
