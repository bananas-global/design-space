import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devPort } from "./dev-port.js";

/**
 * Configuração do Design Space.
 *
 * Três coisas aqui não são detalhe de build e não devem ser removidas sem
 * decisão registrada:
 *
 * 1. **Source mapping** (`@react-dev-inspector/babel-plugin`). É requisito do
 *    `feedback-collector`, não opcional: em React 19 o fallback pelo fiber
 *    (`_debugSource`) não existe mais, então sem o plugin no bundler não há
 *    `arquivo:linha` — e sem `arquivo:linha` o coletor volta a produzir
 *    descrição visual, que é o que ele existe para substituir.
 *
 * 2. **Escopo do source mapping.** Ligado só em desenvolvimento por padrão. O
 *    plugin injeta os caminhos do repositório no HTML, e o preview é público
 *    (D-11): não é vazamento de dado, é exposição da estrutura do projeto.
 *    Ver `docs/decisions/0002-source-mapping-no-preview.md` para o raciocínio e
 *    para como ligar em preview quando a revisão justificar.
 *
 * 3. **Variáveis de deployment.** A Vercel publica o contexto como `VERCEL_*`
 *    no build. Mapear explicitamente para `VITE_VERCEL_*` é o que garante que o
 *    motor monte o link absoluto do cenário sem domínio hardcoded, sem depender
 *    de a exposição automática de variáveis de sistema estar ligada no projeto.
 */

const isDev = process.env.NODE_ENV !== "production";

// `1` liga o source mapping também no build de preview. Decisão consciente por
// projeto, não padrão.
const sourceMappingInBuild = process.env.DESIGN_SPACE_SOURCE_MAPPING === "1";

const deployEnv = {
  "import.meta.env.VITE_VERCEL_ENV": JSON.stringify(process.env.VERCEL_ENV ?? ""),
  "import.meta.env.VITE_VERCEL_URL": JSON.stringify(process.env.VERCEL_URL ?? ""),
  "import.meta.env.VITE_VERCEL_BRANCH_URL": JSON.stringify(process.env.VERCEL_BRANCH_URL ?? ""),
  "import.meta.env.VITE_VERCEL_GIT_COMMIT_REF": JSON.stringify(
    process.env.VERCEL_GIT_COMMIT_REF ?? "",
  ),
  "import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA": JSON.stringify(
    process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  ),
};

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: isDev || sourceMappingInBuild ? ["@react-dev-inspector/babel-plugin"] : [],
      },
    }),
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
