import { defineConfig, devices } from "@playwright/test";
import { devPort } from "./dev-port.js";

/**
 * Playwright aponta direto para a URL do preview.
 *
 * Isso é consequência de D-11: como o preview é público, não há proteção de
 * acesso, então não há segredo de bypass, header de automação nem shareable link
 * a emitir e revogar. Quando existe hospedagem, o workflow de deploy passa a URL
 * publicada em `PREVIEW_URL`.
 *
 * Sem `PREVIEW_URL` — inclusive num projeto sem hospedagem nenhuma — compila o
 * produto e serve o build com `vite preview`. Mesmo teste, mesma jornada, e o
 * mesmo artefato que seria publicado.
 *
 * Três escolhas aqui não são óbvias:
 *
 * 1. **Build, não dev server.** O dev server do Vite compila cada módulo na
 *    primeira vez que alguém pede. Com `fullyParallel`, vários workers abrem a
 *    primeira página ao mesmo tempo, e algum `expect` passava dos 5s esperando a
 *    compilação: uma falha por execução, num teste diferente a cada vez. O build
 *    serve arquivo pronto, e o tempo de resposta não depende de quem chegou antes.
 *
 * 2. **Porta do preview, com `--strictPort`.** `devPort + 1`, a mesma de
 *    `pnpm preview`, para não disputar a porta com o `pnpm dev` que o designer
 *    deixou aberto. Sem `--strictPort`, uma porta ocupada faria o Vite subir na
 *    seguinte enquanto o Playwright continuaria falando com a ocupada.
 *
 * 3. **Nunca reaproveita servidor.** Um `pnpm preview` já aberto serve o build da
 *    última vez que alguém compilou, e a jornada passaria testando código velho.
 *    Se a porta estiver ocupada, o Playwright para com erro dizendo isso: feche
 *    o `pnpm preview` e rode de novo. O custo é um build por execução.
 */
const previewUrl = process.env.PREVIEW_URL;
const localUrl = `http://localhost:${devPort + 1}`;

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
        command: "pnpm build && pnpm preview --strictPort",
        url: localUrl,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
