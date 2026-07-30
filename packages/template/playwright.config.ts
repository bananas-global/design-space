import { defineConfig, devices } from "@playwright/test";
import { devPort } from "./dev-port.js";

/**
 * Playwright aponta direto para a URL do preview.
 *
 * Isso é consequência de D-11: como o preview é público, não há proteção de
 * acesso, então não há segredo de bypass, header de automação nem shareable link
 * a emitir e revogar. `PREVIEW_URL` chega pronta do gatilho `deployment_status`
 * no CI (§10.6).
 *
 * Sem `PREVIEW_URL`, sobe o dev server local — mesmo teste, mesma jornada.
 */
const previewUrl = process.env.PREVIEW_URL;
const localUrl = `http://localhost:${devPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: previewUrl ?? localUrl,
    trace: "on-first-retry",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: previewUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
