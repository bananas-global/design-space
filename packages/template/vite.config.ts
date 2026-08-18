import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devPort } from "./dev-port.js";

/**
 * Configuração do Design Space.
 *
 * Duas coisas aqui não são detalhe de build e não devem ser removidas sem
 * decisão registrada:
 *
 * 1. **Variáveis de deployment.** Nome próprio, `VITE_DEPLOY_*`, e não o nome de
 *    um provedor: quem publica muda, o contrato com o motor não. É o que garante
 *    que o motor monte o link absoluto do cenário sem domínio hardcoded.
 *
 * 2. **Porta local estável.** O arquivo compartilhado `dev-port.js` mantém dev e
 *    preview previsíveis sem duplicar o número em scripts e configuração.
 */

/**
 * Contexto do deployment, injetado no código do produto.
 *
 * Vem de `build-info.json`, que o workflow de deploy grava — se houver um. Sem
 * hospedagem o arquivo não existe, o produto cai para os padrões locais e está
 * tudo certo: `pnpm setup:hosting none` é o estado inicial.
 *
 * Duas coisas explicam este desenho e não são óbvias:
 *
 * 1. Um arquivo lido aqui, em Node, é o único ponto que a ferramenta de deploy
 *    não toca. Passar por variável de shell ou por `.env` na raiz falhou na
 *    prática: a CLI da Vercel não repassa o ambiente do shell ao build do Vite e
 *    sobrescreve o `.env` com o arquivo que ela mesma gera. Outras ferramentas de
 *    deploy têm limitações parecidas, e o arquivo funciona em todas.
 *
 * 2. O `define` substitui **texto literal**. Funciona no código deste
 *    repositório, que escreve `import.meta.env.VITE_DEPLOY_ENV` por extenso, e
 *    não funciona dentro do motor, que é uma biblioteca já compilada e lê
 *    `import.meta.env` como objeto. Por isso o produto entrega o contexto ao
 *    motor pelo campo `deploy` da `ProductDefinition`, em `src/app/product.ts`.
 */
type BuildInfo = { env?: string; ref?: string; sha?: string };

function readBuildInfo(): BuildInfo {
  try {
    return JSON.parse(
      readFileSync(new URL("./build-info.json", import.meta.url), "utf8"),
    ) as BuildInfo;
  } catch {
    // Sem o arquivo — desenvolvimento local — o produto cai para os padrões.
    return {};
  }
}

const buildInfo = readBuildInfo();

const deployEnv = {
  "import.meta.env.VITE_DEPLOY_ENV": JSON.stringify(buildInfo.env ?? "development"),
  "import.meta.env.VITE_DEPLOY_BRANCH": JSON.stringify(buildInfo.ref ?? ""),
  "import.meta.env.VITE_DEPLOY_COMMIT": JSON.stringify(buildInfo.sha ?? ""),
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: deployEnv,
  server: { port: devPort, strictPort: false },
  preview: { port: devPort + 1, strictPort: false },
  build: { sourcemap: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
