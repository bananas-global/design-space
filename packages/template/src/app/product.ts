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
  //
  // Sem hospedagem os três chegam vazios e o motor trata como desenvolvimento
  // local, que é um caso suportado. Ver `vite.config.ts` para a origem dos
  // valores e `hosting/` para ligar um provedor.
  deploy: {
    env: import.meta.env.VITE_DEPLOY_ENV,
    branch: import.meta.env.VITE_DEPLOY_BRANCH,
    commit: import.meta.env.VITE_DEPLOY_COMMIT,
  },

  theme: {
    contrastPairs,
    locales: ["pt-BR"],

    // O chrome do motor vem em português. Se o time do cliente revisa em outro
    // idioma, sobrescreva por grupo — o que não for declarado fica no padrão.
    // Ver `DEFAULT_LABELS` no motor para a lista completa.
    //
    // labels: {
    //   status: { approved: "Approved", "in-review": "In review" },
    //   topbar: { copyLink: "Copy link" },
    // },
  },

  // Fixture é o padrão (D-05). Um adapter remoto entra aqui como opção
  // explícita, com justificativa registrada em `docs/decisions/`.
  dataSources: { default: "fixtures" },
};
