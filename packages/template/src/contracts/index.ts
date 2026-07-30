/**
 * Contratos locais do produto.
 *
 * Três contratos coexistem no Design Space (§11): o de UI responde o que o
 * componente recebe e dispara, o de cenário responde o que torna a situação
 * reproduzível, e o de integração responde como outro sistema entrega dados.
 * Este arquivo é o terceiro — a forma dos dados do domínio, independente de
 * onde eles venham.
 */

export type RequestStatus = "draft" | "in-review" | "approved" | "rejected";

export type Requester = {
  id: string;
  name: string;
  department: string;
};

export type PurchaseRequest = {
  id: string;
  title: string;
  status: RequestStatus;
  /** Em centavos. Dinheiro em ponto flutuante é erro esperando data. */
  amountCents: number;
  requester: Requester;
  createdAt: string;
  /** Presente quando `status` é `rejected`. */
  rejectionReason?: string;
  /** Documentos anexados. Vazio é um estado legítimo, não um erro. */
  attachments: { id: string; name: string }[];
};

/** Forma dos dados que as telas deste produto recebem do adapter. */
export type RequestsData = {
  requests: PurchaseRequest[];
};

export function formatMoney(amountCents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );
}

export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
