import { expect, test, type Frame, type Page } from "@playwright/test";
import { FRAME_SELECTOR, pathFor } from "@brucesantos/design-space/testing";
// Importa o catálogo, não a `ProductDefinition`: o Playwright carrega os testes
// com esbuild puro, sem os plugins do Vite, e um `import.meta.env` na cadeia
// derruba a suíte antes do primeiro teste. Ver `src/app/catalog.ts`.
import { scenarios as catalogScenarios } from "../../src/app/catalog.js";

/**
 * Jornadas reais contra o preview.
 *
 * Desde a 0.8 a UI do produto roda num `<iframe>` dentro do chrome do motor.
 * Asserção sobre a UI do produto passa por `page.frameLocator(FRAME_SELECTOR)`;
 * asserção sobre o chrome (lista de telas, painel, URL) fica em `page`.
 */

const scenarios = catalogScenarios;

function urlFor(scenarioId: string, overrides: Parameters<typeof pathFor>[1] = {}): string {
  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  return pathFor(scenario, overrides);
}

const app = (page: Page) => page.frameLocator(FRAME_SELECTOR);

async function frameOf(page: Page): Promise<Frame> {
  const handle = await page.locator(FRAME_SELECTOR).elementHandle();
  const frame = await handle?.contentFrame();
  if (!frame) throw new Error("Quadro do produto não encontrado.");
  return frame;
}

test.describe("deep link", () => {
  for (const scenario of scenarios) {
    test(`abre "${scenario.title}" direto pela URL`, async ({ page }) => {
      // Recarga direta em rota profunda é o que o rewrite de SPA do host
      // garante. Sem ele, este teste é o primeiro a falhar em preview.
      await page.goto(urlFor(scenario.id));
      await expect(app(page).locator("#conteudo")).toBeVisible();
    });
  }
});

test.describe("jornada: decidir uma solicitação", () => {
  test("da fila até a decisão, só por teclado", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));
    const ui = app(page);

    await expect(ui.getByRole("heading", { name: "Solicitações" })).toBeVisible();
    await expect(ui.getByRole("row")).toHaveCount(6); // cabeçalho + 5 solicitações

    // Foco no link da solicitação e Enter: a jornada inteira funciona sem mouse.
    const link = ui.getByRole("link", { name: "Licenças de software de design" });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(ui.getByRole("heading", { name: "Licenças de software de design" })).toBeVisible();
    // A navegação feita dentro do quadro vira a URL do chrome.
    await expect(page).toHaveURL(/\/requests\/REQ-2042\?/);
    await expect(page.locator(".ds-sidebar [aria-current='true'] .ds-item__title")).toHaveText(
      "Detalhe da solicitação",
    );

    const approve = ui.getByRole("button", { name: "Aprovar" });
    await expect(approve).toBeEnabled();
    await approve.focus();
    await page.keyboard.press("Enter");

    // O resultado da decisão aparece na região de status da tela.
    await expect(ui.getByRole("status")).toContainText("Solicitação aprovada");
  });

  test("aprovação bloqueada explica o motivo em vez de esconder a ação", async ({ page }) => {
    await page.goto(urlFor("requests.approve-blocked-by-rule"));
    const ui = app(page);

    const approve = ui.getByRole("button", { name: "Aprovar" });
    await expect(approve).toBeVisible();
    await expect(approve).toBeDisabled();
    await expect(ui.getByText(/anexar documento/)).toBeVisible();
  });

  test("perfil sem permissão lê a solicitação mas não decide", async ({ page }) => {
    await page.goto(urlFor("requests.approve-no-permission"));
    const ui = app(page);

    await expect(ui.getByRole("heading", { name: "Licenças de software de design" })).toBeVisible();
    await expect(ui.getByRole("button", { name: "Aprovar" })).toBeDisabled();
    await expect(ui.getByText(/não aprova solicitações/)).toBeVisible();
  });

  test("fila vazia explica o vazio", async ({ page }) => {
    await page.goto(urlFor("requests.queue-empty"));
    await expect(app(page).getByRole("heading", { name: "Nenhuma solicitação na fila" })).toBeVisible();
  });
});

test.describe("determinismo", () => {
  test("a mesma URL produz a mesma situação", async ({ page }) => {
    const url = urlFor("requests.queue");

    await page.goto(url);
    const first = await app(page).locator("tbody").innerText();

    await page.goto("about:blank");
    await page.goto(url);
    const second = await app(page).locator("tbody").innerText();

    expect(second).toBe(first);
  });
});

test.describe("chrome", () => {
  test("a raiz abre a primeira tela na primeira variação", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/requests\?scenario=requests\.queue/);
    await expect(page.locator(".ds-topbar")).toContainText("Design Space");
    await expect(page.getByRole("tab", { name: /Screens/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Components/ })).toBeVisible();
    await expect(app(page).getByRole("heading", { name: "Solicitações" })).toBeVisible();
  });

  test("trocar de variação não recarrega o quadro", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));
    await expect(app(page).getByRole("row")).toHaveCount(6);
    const frame = await frameOf(page);
    await frame.evaluate(() => {
      (window as unknown as { __marker: number }).__marker = 1;
    });

    await page.locator(".ds-panel").getByRole("button", { name: /Fila vazia/ }).click();
    await expect(page).toHaveURL(/scenario=requests\.queue-empty/);
    await expect(app(page).getByRole("heading", { name: "Nenhuma solicitação na fila" })).toBeVisible();
    expect(await frame.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);

    // Estado de rede também chega por mensagem.
    await page.locator(".ds-panel select").nth(1).selectOption("error");
    await expect(app(page).getByRole("alert")).toContainText("Não foi possível carregar");
    expect(await frame.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  });

  test("o viewport é a largura real da janela do produto: media queries funcionam", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));
    await page.getByRole("button", { name: "Mobile" }).click();
    await expect(page).toHaveURL(/viewport=mobile/);

    const frame = await frameOf(page);
    await expect.poll(() => frame.evaluate(() => window.innerWidth)).toBe(375);
    const header = app(page).locator("header").first();
    await expect(header).toHaveCSS("padding-left", "16px");

    await page.getByRole("button", { name: "Desktop" }).click();
    await expect.poll(() => frame.evaluate(() => window.innerWidth)).toBe(1280);
    await expect(header).toHaveCSS("padding-left", "32px");
  });

  test("o chrome fica íntegro com o CSS global do produto no mesmo bundle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(urlFor("requests.queue"));

    const root = page.locator(".ds-root");
    await expect(root).toHaveAttribute("data-appearance", "light");
    await expect(root).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(root).toHaveCSS("color", "rgb(10, 10, 10)");
    await expect(root).toHaveCSS("font-size", "13px");
    await expect(page.locator(".ds-sidebar input")).toHaveCSS("border-top-width", "1px");

    // E o quadro não recebe nada do chrome: só o produto, com o fundo dele.
    const frame = await frameOf(page);
    expect(await frame.evaluate(() => document.querySelectorAll("[class*='ds-']").length)).toBe(0);
    expect(await frame.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      "rgb(248, 250, 252)",
    );
  });

  test("o tema do chrome segue o sistema e a troca é lembrada", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(urlFor("requests.queue"));
    const root = page.locator(".ds-root");
    await expect(root).toHaveAttribute("data-appearance", "dark");
    await expect(root).toHaveCSS("background-color", "rgb(10, 10, 10)");

    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(root).toHaveAttribute("data-appearance", "light");
    await page.goto(urlFor("requests.queue"));
    await expect(root).toHaveAttribute("data-appearance", "light");
  });

  test("revisão limpa esconde o chrome com Shift+C e volta pelo botão", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));
    await page.keyboard.press("Shift+C");
    await expect(page.locator(".ds-topbar")).toHaveCount(0);
    await expect(page).toHaveURL(/chrome=0/);
    await expect(app(page).getByRole("heading", { name: "Solicitações" })).toBeVisible();

    await page.getByRole("button", { name: /Show chrome/ }).click();
    await expect(page.locator(".ds-topbar")).toBeVisible();
  });

  test("busca sem acento acha o componente e as informações mostram a origem", async ({ page }) => {
    await page.goto(urlFor("requests.queue"));
    await page.keyboard.press("ControlOrMeta+K");
    await page.keyboard.type("botoes");
    await page.getByRole("tab", { name: /Components/ }).click();
    await page.locator(".ds-sidebar").getByRole("button", { name: "Botões" }).click();

    await expect(page).toHaveURL(/component=actions\.buttons/);
    await expect(app(page).getByRole("button", { name: "Confirmar" })).toBeVisible();

    await page.getByRole("tab", { name: "Information" }).click();
    const panel = page.locator(".ds-panel");
    await expect(panel).toContainText("src/components/primitives.tsx → Button");
    await panel.getByRole("button", { name: "Detalhe da solicitação" }).click();
    await expect(page).toHaveURL(/\/requests\/REQ-2042\?scenario=requests\.approve-allowed/);
  });

  test("Copiar para o PR gera o markdown da tela", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(urlFor("requests.queue", { panelTab: "info" }));
    await page.getByRole("button", { name: "Copy for PR" }).click();

    const markdown = await page.evaluate(() => navigator.clipboard.readText());
    expect(markdown).toContain("## Fila de solicitações");
    expect(markdown).toMatch(/\[Fila vazia\]\(http:\/\/localhost:\d+\/requests\?scenario=requests\.queue-empty/);
    expect(markdown).toContain("| Status (`feedback.status`) | `src/components/primitives.tsx → StatusBadge` |");
    expect(markdown).toContain("A tela explica por que está vazia");
  });
});
