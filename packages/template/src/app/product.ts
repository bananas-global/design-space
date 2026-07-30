import type { ProductDefinition } from "@brucesantos/design-space";

import { personas } from "../personas/index.js";
import { fixtures } from "../fixtures/requests.js";
import { rules } from "../rules/requests.js";
import { scenarios } from "../scenarios/requests.js";
import { contrastPairs } from "../tokens/contrast.js";
import { RequestList } from "../screens/RequestList.js";
import { RequestDetail } from "../screens/RequestDetail.js";

/**
 * A única coisa que o produto entrega ao motor.
 *
 * Comece por aqui ao trocar de produto: módulos e cenários usam o vocabulário do
 * cliente, e é esse vocabulário que a navegação e a busca expõem para PO e
 * negócio.
 */
export const productDefinition: ProductDefinition = {
  id: "template",
  name: "Design Space",
  tagline: "Template — troque por seu produto",

  modules: [
    {
      id: "requests",
      name: "Solicitações",
      description: "Registro, análise e decisão de solicitações de compra.",
      flows: [
        {
          id: "decide-request",
          title: "Decidir uma solicitação",
          description: "Da fila até a decisão, com as duas ramificações de bloqueio.",
          steps: [
            { scenario: "requests.queue", label: "Escolher na fila" },
            {
              scenario: "requests.approve-allowed",
              label: "Analisar e decidir",
              decision: "A solicitação atende à regra de documentação?",
              branches: {
                "Falta documento": "requests.approve-blocked-by-rule",
                "Perfil sem permissão": "requests.approve-no-permission",
              },
            },
          ],
        },
      ],
    },
  ],

  scenarios,
  personas,
  fixtures,
  rules,

  // Não existe rota para `/`: a raiz é o mapa de situações do motor.
  routes: [
    { path: "/requests", screen: RequestList },
    { path: "/requests/:id", screen: RequestDetail },
  ],

  theme: {
    contrastPairs,
    locales: ["pt-BR"],
  },

  // Fixture é o padrão (D-05). Um adapter remoto entra aqui como opção
  // explícita, com justificativa registrada em `docs/decisions/`.
  dataSources: { default: "fixtures" },
};
