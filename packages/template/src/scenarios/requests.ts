import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários de solicitações.
 *
 * Cinco situações em duas telas. A fila (`/requests`) tem duas variações: cheia
 * e vazia. O detalhe (`/requests/:id`) tem três: decisão permitida, bloqueada
 * por regra e bloqueada por permissão. A última é a que costuma faltar em
 * protótipo, e é a que a engenharia mais pergunta.
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
    fixture: "requests-empty",
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
