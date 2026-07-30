import { describe, it } from "vitest";
import { assertContrastPairs } from "@brucesantos/design-space/testing";
import { contrastPairs } from "../src/tokens/contrast.js";

/**
 * Validação de contraste na origem (§6.1, "No token").
 *
 * Contraste é propriedade de par de cores. Verificar aqui resolve uma vez, em
 * vez de perseguir o mesmo problema em trinta telas — e falhar o build é o que
 * transforma "a gente arruma depois" em "não entra assim".
 */
describe("tokens", () => {
  it("todos os pares declarados atingem o alvo de contraste", () => {
    assertContrastPairs(contrastPairs);
  });
});
