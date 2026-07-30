import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type { RequestsData } from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
import { canApprove } from "../rules/requests.js";
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "../components/primitives.js";

/**
 * Detalhe da solicitação, com a decisão.
 *
 * É a tela onde a regra de negócio fica visível: a ação de aprovar não
 * desaparece quando está bloqueada, ela explica o porquê. Essa escolha está
 * registrada em `docs/decisions/0003-acao-bloqueada-explica-o-motivo.md`.
 */
export function RequestDetail({ params, context }: ScreenProps) {
  const { data, isLoading, error, permissions, locale } = context;
  const [decision, setDecision] = useState<"approved" | "rejected" | undefined>();

  if (isLoading) return wrap(<LoadingState label="Carregando solicitação" />);
  if (error) return wrap(<ErrorState message={error.message} />);

  const requests = (data as RequestsData | null)?.requests ?? [];
  const request = requests.find((item) => item.id === params.id) ?? requests[0];

  if (!request) {
    return wrap(
      <EmptyState
        title="Solicitação não encontrada"
        description={`Nenhuma solicitação com o identificador ${params.id ?? "informado"} nesta fila.`}
      />,
    );
  }

  const approval = canApprove(request, permissions);
  const effectiveStatus = decision ?? request.status;

  return wrap(
    <div className="mx-auto grid max-w-3xl gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold text-ink-900">{request.title}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {request.id} · aberta em {formatDate(request.createdAt, locale)} por{" "}
              {request.requester.name} ({request.requester.department})
            </p>
          </div>
          <StatusBadge status={effectiveStatus} />
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-ink-500">Valor</dt>
          <dd className="m-0 font-medium tabular-nums text-ink-900">
            {formatMoney(request.amountCents, locale)}
          </dd>
          <dt className="text-ink-500">Documentos</dt>
          <dd className="m-0 text-ink-700">
            {request.attachments.length === 0
              ? "Nenhum documento anexado"
              : request.attachments.map((file) => file.name).join(", ")}
          </dd>
        </dl>

        {request.rejectionReason && (
          <p className="mt-4 rounded-lg bg-err-50 p-3 text-sm text-ink-700">
            <strong className="font-semibold text-err-600">Motivo da recusa:</strong>{" "}
            {request.rejectionReason}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-ink-500">Decisão</h3>

        {/* `aria-live` porque o resultado da decisão é um dos eventos que o
            contrato do cenário exige que sejam anunciados. Mudar o badge no
            canto da tela não é anúncio: é mudança silenciosa para quem usa
            leitor de tela. */}
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-700">
          {decision === "approved" && "Solicitação aprovada."}
          {decision === "rejected" && "Solicitação recusada."}
        </p>

        <div className="mt-3 flex flex-wrap items-start gap-3">
          <Button
            id="approve"
            variant="primary"
            unavailableReason={approval.allowed ? undefined : approval.reason}
            onClick={() => setDecision("approved")}
          >
            Aprovar
          </Button>
          <Button
            id="reject"
            unavailableReason={
              permissions.includes("requests.reject")
                ? undefined
                : "Seu perfil não recusa solicitações."
            }
            onClick={() => setDecision("rejected")}
          >
            Recusar
          </Button>
          <Button variant="ghost" onClick={() => context.navigate("/requests")}>
            Voltar para a fila
          </Button>
        </div>
      </Card>
    </div>,
  );
}

function wrap(children: React.ReactNode) {
  return (
    <AppShell title="Solicitação" subtitle="Detalhe e decisão">
      {children}
    </AppShell>
  );
}
