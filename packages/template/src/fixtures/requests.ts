import type { Fixture } from "@brucesantos/design-space";
import type { PurchaseRequest, RequestsData } from "../contracts/index.js";

/**
 * Fixtures sintéticas e determinísticas.
 *
 * Duas regras: nenhum dado copiado de produção, e nenhuma data ou id gerado em
 * runtime. `new Date()` aqui faria a mesma URL produzir telas diferentes a cada
 * dia, quebrando o critério de determinismo — e transformando qualquer
 * regressão visual em falso positivo.
 */

function request(overrides: Partial<PurchaseRequest> & Pick<PurchaseRequest, "id">): PurchaseRequest {
  return {
    title: "Compra de material de escritório",
    status: "in-review",
    amountCents: 128_000,
    requester: { id: "u-1", name: "Ana Moreira", department: "Operações" },
    createdAt: "2026-03-12T14:00:00.000Z",
    attachments: [],
    ...overrides,
  };
}

const standardList: PurchaseRequest[] = [
  request({ id: "REQ-2041" }),
  request({
    id: "REQ-2042",
    title: "Licenças de software de design",
    amountCents: 742_000,
    attachments: [{ id: "a-1", name: "orcamento-figma.pdf" }],
    requester: { id: "u-2", name: "Caio Ribeiro", department: "Design" },
  }),
  request({
    id: "REQ-2043",
    title: "Reforma da sala de reunião",
    amountCents: 1_950_000,
    attachments: [],
    requester: { id: "u-3", name: "Marina Lopes", department: "Facilities" },
  }),
  request({
    id: "REQ-2044",
    title: "Treinamento de acessibilidade",
    status: "approved",
    amountCents: 320_000,
    attachments: [{ id: "a-2", name: "proposta-treinamento.pdf" }],
    requester: { id: "u-4", name: "Júlia Prado", department: "Pessoas" },
  }),
  request({
    id: "REQ-2045",
    title: "Assinatura de banco de imagens",
    status: "rejected",
    amountCents: 89_000,
    rejectionReason: "Já existe contrato ativo com fornecedor equivalente até dezembro.",
    requester: { id: "u-5", name: "Pedro Antunes", department: "Marketing" },
  }),
];

export const fixtures: Fixture<RequestsData>[] = [
  {
    id: "requests-standard",
    label: "Fila com cinco solicitações",
    description: "Mistura de análise, aprovada e recusada. É a fila do dia a dia.",
    data: { requests: standardList },
  },
  {
    id: "requests-empty",
    label: "Fila vazia",
    description: "Primeiro acesso, ou fila zerada. Estado vazio é situação, não erro.",
    data: { requests: [] },
  },
  {
    id: "requests-high-value-no-doc",
    label: "Solicitação de alto valor sem documento",
    description:
      "Materializa a regra `approval-requires-attachment`: aprovação bloqueada por falta de anexo.",
    data: {
      requests: [
        request({ id: "REQ-2043", title: "Reforma da sala de reunião", amountCents: 1_950_000 }),
      ],
    },
  },
];
