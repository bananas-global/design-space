import type { Rule } from "@brucesantos/design-space";
import type { PurchaseRequest } from "../contracts/index.js";

/**
 * Regras do domínio de solicitações.
 *
 * Ficam separadas da UI porque regra é o que a engenharia precisa traduzir para
 * o stack real, e porque teste de regra roda em milissegundos — não precisa de
 * navegador, não precisa de tela.
 */
export const rules: Rule[] = [
  {
    id: "approval-requires-attachment",
    statement: "Solicitação acima de R$ 5.000,00 só pode ser aprovada com documento anexado.",
    rationale:
      "Auditoria exige comprovação para valores relevantes. O limite é do processo, não do sistema.",
    source: "src/rules/requests.ts",
  },
  {
    id: "rejection-requires-reason",
    statement: "Recusa exige justificativa.",
    rationale: "Sem motivo registrado, o solicitante refaz o mesmo pedido e o ciclo se repete.",
    source: "src/rules/requests.ts",
  },
];

export const HIGH_VALUE_THRESHOLD_CENTS = 500_000;

/** Implementação da regra `approval-requires-attachment`. */
export function canApprove(
  request: PurchaseRequest,
  permissions: string[],
): { allowed: boolean; reason?: string } {
  if (!permissions.includes("requests.approve")) {
    return { allowed: false, reason: "Seu perfil não aprova solicitações." };
  }
  if (request.status !== "in-review") {
    return { allowed: false, reason: "Só solicitações em análise podem ser aprovadas." };
  }
  if (request.amountCents > HIGH_VALUE_THRESHOLD_CENTS && request.attachments.length === 0) {
    return {
      allowed: false,
      reason: "Acima de R$ 5.000,00 é necessário anexar documento antes de aprovar.",
    };
  }
  return { allowed: true };
}
