import type { ControlGroup, Scenario } from "@brucesantos/design-space";

/**
 * Controles da fila, por componente.
 *
 * Cada controle é uma dimensão de variação que se combina com as outras: três
 * quantidades de linhas × quatro situações × dois avisos são 24 combinações sem
 * 24 cenários. Na URL, só o que difere do padrão vai como `c.<id>=<valor>`.
 */
export const queueControls: ControlGroup[] = [
  {
    id: "table",
    title: "Tabela de solicitações",
    note: "Quantas linhas a fila mostra e de qual situação.",
    controls: [
      {
        id: "rows",
        label: "Linhas",
        options: [
          { value: "all", label: "Todas" },
          { value: "one", label: "Uma" },
          { value: "none", label: "Nenhuma" },
        ],
      },
      {
        id: "status",
        label: "Situação",
        description: "Filtra a fila pela situação da solicitação.",
        options: [
          { value: "all", label: "Todas as situações" },
          { value: "in-review", label: "Em análise" },
          { value: "approved", label: "Aprovadas" },
          { value: "rejected", label: "Recusadas" },
        ],
      },
    ],
  },
  {
    id: "notice",
    title: "Aviso da fila · Status",
    component: "feedback.status",
    note: "Faixa acima da tabela. O botão Dispensar da própria tela volta este controle para Nenhum.",
    controls: [
      {
        id: "notice",
        label: "Aviso",
        options: [
          { value: "none", label: "Nenhum" },
          { value: "overdue", label: "Prazo vencendo" },
        ],
      },
    ],
  },
];

/**
 * Cenários de solicitações.
 *
 * Na fila (`/requests`), os cenários são atalhos para combinações dos
 * controles: a fila do dia a dia e a fila vazia. O detalhe (`/requests/:id`)
 * não tem controles, e os três cenários dele são as situações de decisão:
 * permitida, bloqueada por regra e bloqueada por permissão. A última é a que
 * costuma faltar em protótipo, e é a que a engenharia mais pergunta.
 *
 * `components` lista o que cada tela usa do catálogo: é o que aparece em
 * "Componentes usados" e na tabela do "Copiar para o PR".
 */
export const scenarios: Scenario[] = [
  {
    id: "requests.queue",
    title: "Fila de solicitações",
    intent: "Ver o estado geral da fila e escolher o que decidir primeiro.",
    route: "/requests",
    persona: "approver",
    fixture: "requests-standard",
    actions: ["Abrir uma solicitação"],
    components: ["feedback.status"],
    expected: [
      "As cinco solicitações aparecem com valor, solicitante e situação.",
      "A situação tem rótulo textual, não só cor.",
    ],
    tags: ["lista", "sucesso"],
  },
  {
    id: "requests.queue-empty",
    title: "Fila vazia",
    intent: "Verificar se o primeiro acesso explica o que fazer, em vez de parecer defeito.",
    route: "/requests",
    persona: "approver",
    fixture: "requests-standard",
    controls: { rows: "none" },
    expected: ["A tela explica por que está vazia e o que faz aparecer conteúdo."],
    components: ["feedback.status"],
    tags: ["vazio"],
  },
  {
    id: "requests.approve-allowed",
    title: "Aprovação permitida",
    intent: "Confirmar que a decisão tem retorno visível na tela.",
    route: "/requests/REQ-2042",
    persona: "approver",
    fixture: "requests-standard",
    rules: ["approval-requires-attachment"],
    preconditions: ["Solicitação em análise, com documento anexado."],
    actions: ["Aprovar", "Recusar", "Voltar para a fila"],
    components: ["actions.buttons", "feedback.status"],
    expected: [
      "O botão Aprovar está habilitado.",
      "Ao aprovar, o resultado é anunciado por região de status.",
    ],
    tags: ["decisão", "sucesso"],
  },
  {
    id: "requests.approve-blocked-by-rule",
    title: "Aprovação bloqueada por falta de documento",
    intent:
      "Verificar se a regra de negócio fica legível na tela, em vez de a ação simplesmente sumir.",
    route: "/requests/REQ-2043",
    persona: "approver",
    fixture: "requests-high-value-no-doc",
    rules: ["approval-requires-attachment"],
    preconditions: ["Solicitação acima de R$ 5.000,00 sem documento anexado."],
    expected: [
      "O botão Aprovar está desabilitado.",
      "O motivo aparece na tela e é associado ao botão para leitor de tela.",
    ],
    components: ["actions.buttons", "feedback.status"],
    tags: ["exceção", "regra"],
  },
  {
    id: "requests.approve-no-permission",
    title: "Sem permissão para decidir",
    intent: "Definir o que um solicitante vê ao abrir o link de uma solicitação.",
    route: "/requests/REQ-2042",
    persona: "requester",
    fixture: "requests-standard",
    expected: [
      "As ações de decisão aparecem desabilitadas, com o motivo.",
      "Nenhum dado da solicitação é escondido: a restrição é de ação, não de leitura.",
    ],
    components: ["actions.buttons", "feedback.status"],
    tags: ["permissão", "exceção"],
  },
];
