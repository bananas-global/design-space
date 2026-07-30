import type { ContrastPair } from "@brucesantos/design-space";

/**
 * Pares de contraste do produto.
 *
 * A lista é o contrato: um par que aparece na tela e não está aqui não é
 * verificado por ninguém. Manter em sincronia com `tokens.css` é trabalho de
 * quem muda token, e `tests/tokens.test.ts` é o que torna esse trabalho
 * obrigatório em vez de opcional.
 */
export const contrastPairs: ContrastPair[] = [
  { name: "texto principal sobre superfície", foreground: "#111827", background: "#ffffff" },
  { name: "texto principal sobre canvas", foreground: "#111827", background: "#f8fafc" },
  { name: "texto secundário sobre superfície", foreground: "#4b5563", background: "#ffffff" },
  { name: "marca sobre superfície", foreground: "#4338ca", background: "#ffffff" },
  { name: "branco sobre marca", foreground: "#ffffff", background: "#4338ca" },
  { name: "sucesso sobre fundo de sucesso", foreground: "#15803d", background: "#f0fdf4" },
  { name: "atenção sobre fundo de atenção", foreground: "#a16207", background: "#fefce8" },
  { name: "erro sobre fundo de erro", foreground: "#b91c1c", background: "#fef2f2" },
];
