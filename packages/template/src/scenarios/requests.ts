import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do módulo de solicitações.
 *
 * Seis situações, não seis telas: a fila cheia, a fila vazia, a decisão
 * permitida, a decisão bloqueada por regra e a decisão bloqueada por permissão.
 * A última é a que costuma faltar em protótipo, e é a que a engenharia mais
 * pergunta.
 */
export const scenarios: Scenario[] = [
  {
    id: "requests.imported-reference",
    title: "Referência importada ainda não validada",
    intent: "Preservar material trazido do sistema existente sem tratá-lo como trabalho ativo.",
    route: "/requests/REQ-2041",
    persona: "approver",
    fixture: "requests-standard",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "ported",
    expected: ["A referência continua acessível por deep link enquanto aguarda validação."],
    tags: ["importado"],
  },
  {
    id: "requests.queue",
    title: "Fila de solicitações",
    intent: "Ver o estado geral da fila e escolher o que decidir primeiro.",
    route: "/requests",
    persona: "approver",
    fixture: "requests-standard",
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: [],
      notes: "Tabela com cabeçalhos de linha e coluna; a situação nunca é comunicada só por cor.",
    },
    status: "in-review",
    actions: ["Abrir uma solicitação"],
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
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: ["A tela explica por que está vazia e o que faz aparecer conteúdo."],
    tags: ["vazio"],
  },
  {
    id: "requests.approve-allowed",
    title: "Aprovação permitida",
    intent: "Confirmar que a decisão é anunciada, e não apenas exibida.",
    route: "/requests/REQ-2042",
    persona: "approver",
    fixture: "requests-standard",
    rules: ["approval-requires-attachment"],
    a11y: { keyboard: "full", contrast: "AA", announces: ["request.decision"] },
    status: "in-review",
    preconditions: ["Solicitação em análise, com documento anexado."],
    actions: ["Aprovar", "Recusar", "Voltar para a fila"],
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
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["request.decision"],
      notes: "O motivo do bloqueio é associado ao botão por aria-describedby.",
    },
    status: "in-review",
    preconditions: ["Solicitação acima de R$ 5.000,00 sem documento anexado."],
    expected: [
      "O botão Aprovar está desabilitado.",
      "O motivo aparece na tela e é associado ao botão para leitor de tela.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "requests.approve-no-permission",
    title: "Sem permissão para decidir",
    intent: "Definir o que um solicitante vê ao abrir o link de uma solicitação.",
    route: "/requests/REQ-2042",
    persona: "requester",
    fixture: "requests-standard",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "in-review",
    expected: [
      "As ações de decisão aparecem desabilitadas, com o motivo.",
      "Nenhum dado da solicitação é escondido: a restrição é de ação, não de leitura.",
    ],
    tags: ["permissão", "exceção"],
  },
];
