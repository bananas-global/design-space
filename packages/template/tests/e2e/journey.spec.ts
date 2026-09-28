import { expect, test } from "@playwright/test";
import { pathFor } from "@brucesantos/design-space/testing";
// Importa o catálogo, não a `ProductDefinition`: o Playwright carrega os testes
// com esbuild puro, sem os plugins do Vite, e um `import.meta.env` na cadeia
// derruba a suíte antes do primeiro teste. Ver `src/app/catalog.ts`.
import { scenarios as catalogScenarios } from "../../src/app/catalog.js";

/**
 * Jornadas reais contra o preview: deep link de cada cenário, o fluxo de decisão
 * e o determinismo da URL.
 */

const scenarios = catalogScenarios;

/**
 * Abre o cenário pelo deep link, com o chrome do motor fora do caminho.
 *
 * `chrome: false` mantém a asserção sobre a UI do produto, sem o painel do motor
 * disputando seletores como `role="status"` ou títulos de seção.
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

test.describe("jornada: decidir uma solicitação", () => {
  test("da fila até a decisão, só por teclado", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));

    await expect(page.getByRole("heading", { name: "Solicitações" })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(6); // cabeçalho + 5 solicitações

    // Foco no link da solicitação e Enter: a jornada inteira funciona sem mouse.
    const link = page.getByRole("link", { name: "Licenças de software de design" });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Licenças de software de design" })).toBeVisible();

    const approve = page.getByRole("button", { name: "Aprovar" });
    await expect(approve).toBeEnabled();
    await approve.focus();
    await page.keyboard.press("Enter");

    // O resultado da decisão aparece na região de status da tela.
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
