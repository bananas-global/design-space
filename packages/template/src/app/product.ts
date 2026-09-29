import { EN_US_LABELS, type ProductDefinition } from "@brucesantos/design-space";

import { fixtures, personas, queueControls, rules, scenarios } from "./catalog.js";
import { RequestList } from "../screens/RequestList.js";
import { RequestDetail } from "../screens/RequestDetail.js";
import { components } from "../components/catalog.js";

/**
 * A única coisa que o produto entrega ao motor.
 *
 * A especificação — cenários, personas, fixtures e regras — vive em
 * `catalog.ts`, livre de React. Aqui ela é combinada com as telas que a
 * materializam. Ver o comentário de `catalog.ts` para o porquê da separação.
 */
export const productDefinition: ProductDefinition = {
  id: "template",
  name: "Design Space",

  scenarios,
  personas,
  fixtures,
  rules,
  components,

  // Cada rota é uma tela na lista de Telas, e `group` junta as telas de um
  // mesmo fluxo. Sem rota para `/`, a raiz abre a primeira tela.
  //
  // A fila mostra o modelo da 0.9: em vez de um cenário para cada combinação,
  // controles por componente que se combinam no painel Variações. A tela lê
  // `context.controls` e monta a lista; os cenários ficam como atalhos.
  routes: [
    {
      path: "/requests",
      screen: RequestList,
      name: "Fila de solicitações",
      description: "Solicitações aguardando análise e decisão.",
      group: "Solicitações",
      controls: queueControls,
      expected: [
        "A fila mostra solicitante, valor e situação de cada solicitação.",
        "Sem nenhuma linha, a tela explica o vazio em vez de parecer defeito.",
      ],
      components: ["feedback.status"],
    },
    {
      path: "/requests/:id",
      screen: RequestDetail,
      name: "Detalhe da solicitação",
      description: "Análise e decisão de uma solicitação.",
      group: "Solicitações",
      components: ["actions.buttons", "feedback.status"],
    },
  ],

  // O motor é uma biblioteca já compilada e não consegue ler o ambiente de build
  // deste repositório. Quem tem acesso ao próprio build é o produto, então o
  // contexto vem daqui — sem isso o cabeçalho da revisão fica sem branch nem
  // commit, e é o commit que torna uma revisão rastreável.
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
    locales: ["pt-BR"],
    labels: EN_US_LABELS,

    // O chrome é configurado em en-US com o dicionário completo do motor. Isso
    // é independente do locale da UI do produto, que neste exemplo é pt-BR.
  },

  // Fixture é o padrão (D-05). Um adapter remoto entra aqui como opção
  // explícita, com justificativa registrada em `docs/decisions/`.
  dataSources: { default: "fixtures" },
};
