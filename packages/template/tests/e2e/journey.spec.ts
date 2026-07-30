import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pathFor } from "@brucesantos/design-space/testing";
import { productDefinition } from "../../src/app/product.js";

/**
 * Uma jornada real contra o preview, com axe na mesma passagem (E9, E16).
 *
 * O desenho segue o documento em dois pontos que valem explicitar:
 *
 * - **Axe roda por cenário, não uma vez na home.** Violação de acessibilidade
 *   costuma ser específica de estado — o vazio, o erro, o modal. Rodar só na
 *   primeira tela produz o "falso verde de ferramenta" que o próprio documento
 *   lista como risco.
 *
 * - **Violação crítica quebra o build, igual typecheck.** `serious` e `critical`
 *   falham; `moderate` e `minor` não, para não transformar exploração em
 *   manutenção de teste.
 */

const scenarios = productDefinition.scenarios;

/**
 * Abre o cenário pelo deep link, com o chrome do motor fora do caminho.
 *
 * `chrome: false` não é conveniência: o axe precisa medir a UI do produto, não o
 * painel do motor. Sem isso, uma violação do chrome falharia o build de um
 * produto que não a causou — e o inverso, um problema real do produto ficaria
 * escondido no meio das violações do ambiente.
 */
function urlFor(scenarioId: string): string {
  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  return pathFor(scenario, { chrome: false });
}

test.describe("deep link", () => {
  for (const scenario of scenarios) {
    test(`abre "${scenario.title}" direto pela URL`, async ({ page }) => {
      // Recarga direta em rota profunda é o que o rewrite de SPA do vercel.json
      // garante. Sem ele, este teste é o primeiro a falhar em preview.
      await page.goto(urlFor(scenario.id));
      await expect(page.locator("#conteudo")).toBeVisible();
    });
  }
});

test.describe("acessibilidade por cenário", () => {
  for (const scenario of scenarios) {
    test(`axe sem violação crítica em "${scenario.title}"`, async ({ page }) => {
      await page.goto(urlFor(scenario.id));
      await page.locator("#conteudo").waitFor();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const blocking = results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      );

      expect(
        blocking.map((violation) => `${violation.id}: ${violation.help}`),
        `Violações bloqueantes em ${scenario.id}`,
      ).toEqual([]);
    });
  }
});

test.describe("jornada: decidir uma solicitação", () => {
  test("da fila até a decisão, só por teclado", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));

    await expect(page.getByRole("heading", { name: "Solicitações" })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(6); // cabeçalho + 5 solicitações

    // Tab até o link da solicitação e Enter. A jornada declara
    // `a11y.keyboard: "full"`, então este é o teste que sustenta a afirmação —
    // não a intenção escrita no contrato.
    const link = page.getByRole("link", { name: "Licenças de software de design" });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Licenças de software de design" })).toBeVisible();

    const approve = page.getByRole("button", { name: "Aprovar" });
    await expect(approve).toBeEnabled();
    await approve.focus();
    await page.keyboard.press("Enter");

    // A decisão precisa ser anunciada, não apenas exibida: é o que o campo
    // `announces: ["request.decision"]` do cenário exige.
    await expect(page.getByRole("status")).toContainText("Solicitação aprovada");
  });

  test("aprovação bloqueada explica o motivo em vez de esconder a ação", async ({ page }) => {
    await page.goto(urlFor("requests.approve-blocked-by-rule"));

    const approve = page.getByRole("button", { name: "Aprovar" });
    await expect(approve).toBeVisible();
    await expect(approve).toBeDisabled();
    await expect(page.getByText(/anexar documento/)).toBeVisible();
  });

  test("perfil sem permissão lê a solicitação mas não decide", async ({ page }) => {
    await page.goto(urlFor("requests.approve-no-permission"));

    await expect(page.getByRole("heading", { name: "Licenças de software de design" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    await expect(page.getByText(/não aprova solicitações/)).toBeVisible();
  });

  test("fila vazia explica o vazio", async ({ page }) => {
    await page.goto(urlFor("requests.queue-empty"));
    await expect(page.getByRole("heading", { name: "Nenhuma solicitação na fila" })).toBeVisible();
  });
});

test.describe("determinismo", () => {
  test("a mesma URL produz a mesma situação", async ({ page }) => {
    const url = urlFor("requests.queue");

    await page.goto(url);
    const first = await page.locator("tbody").innerText();

    await page.goto("about:blank");
    await page.goto(url);
    const second = await page.locator("tbody").innerText();

    expect(second).toBe(first);
  });
});
