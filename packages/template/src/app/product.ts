import type { ProductDefinition } from "@brucesantos/design-space";

import { fixtures, modules, personas, rules, scenarios } from "./catalog.js";
import { contrastPairs } from "../tokens/contrast.js";
import { RequestList } from "../screens/RequestList.js";
import { RequestDetail } from "../screens/RequestDetail.js";

/**
 * A única coisa que o produto entrega ao motor.
 *
 * A especificação — módulos, jornadas, cenários, personas, fixtures e regras —
 * vive em `catalog.ts`, livre de React. Aqui ela é combinada com as telas que a
 * materializam. Ver o comentário de `catalog.ts` para o porquê da separação.
 */
export const productDefinition: ProductDefinition = {
  id: "template",
  name: "Design Space",
  tagline: "Template — troque por seu produto",

  modules,
  scenarios,
  personas,
  fixtures,
  rules,

  // Não existe rota para `/`: a raiz é o mapa de situações do motor.
  routes: [
    { path: "/requests", screen: RequestList },
    { path: "/requests/:id", screen: RequestDetail },
  ],

  // O motor é uma biblioteca já compilada e não consegue ler o ambiente de build
  // deste repositório. Quem tem acesso ao próprio build é o produto, então o
  // contexto vem daqui — sem isso o cabeçalho da revisão fica sem branch nem
  // commit, e é o commit que torna uma aprovação rastreável.
  deploy: {
    env: import.meta.env.VITE_VERCEL_ENV,
    branch: import.meta.env.VITE_VERCEL_GIT_COMMIT_REF,
    commit: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
  },

  theme: {
    contrastPairs,
    locales: ["pt-BR"],
  },

  // Fixture é o padrão (D-05). Um adapter remoto entra aqui como opção
  // explícita, com justificativa registrada em `docs/decisions/`.
  dataSources: { default: "fixtures" },
};
