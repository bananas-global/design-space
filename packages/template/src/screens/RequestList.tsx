import type { ScreenProps } from "@brucesantos/design-space";
import type { PurchaseRequest, RequestsData } from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
import { standardList } from "../fixtures/requests.js";
import {
  AppShell,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from "../components/primitives.js";

/**
 * Fila de solicitações.
 *
 * A tela responde os cinco estados que o motor pode entregar — carregando,
 * erro, vazio, sucesso e sem permissão — porque é isso que separa especificação
 * executável de mockup. Um handoff que só mostra o caminho felizmente é onde a
 * engenharia inventa o resto.
 *
 * Os controles da tela (`context.controls`, declarados em `queueControls`)
 * recortam a lista: quantas linhas, de qual situação, e se o aviso de prazo
 * aparece. Sem cenário, a tela usa a fila sintética do dia a dia.
 */
export function RequestList({ context }: ScreenProps) {
  const { data, isLoading, error, can, locale } = context;

  if (isLoading) return wrap(<LoadingState />);
  if (error) return wrap(<ErrorState message={error.message} />);

  if (!can("requests.read")) {
    return wrap(
      <EmptyState
        title="Você não tem acesso a esta fila"
        description="Seu perfil não inclui a permissão de leitura de solicitações. Fale com quem administra os acessos."
      />,
    );
  }

  const source =
    data === undefined && !context.scenario ? standardList : ((data as RequestsData | null)?.requests ?? []);
  const requests = applyControls(source, context.controls);
  const filtered = (context.controls.rows ?? "all") !== "all" || (context.controls.status ?? "all") !== "all";
  const notice =
    context.controls.notice === "overdue" ? (
      <div
        role="status"
        className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-warn-50 px-4 py-3 text-sm text-ink-700"
      >
        <span>Duas solicitações estão perto do prazo de decisão.</span>
        <button
          type="button"
          className="text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
          onClick={() => context.setControl("notice", "none")}
        >
          Dispensar
        </button>
      </div>
    ) : null;

  if (requests.length === 0) {
    return wrap(
      <>
        {notice}
        <EmptyState
          title="Nenhuma solicitação na fila"
          description="Quando alguém registrar uma solicitação, ela aparece aqui para análise."
          action={
            filtered ? (
              <button
                type="button"
                className="text-sm font-medium text-brand-600 underline-offset-2 hover:underline"
                onClick={() => {
                  // Duas mudanças seguidas no mesmo clique: o motor acumula as
                  // duas numa URL só (0.9.1). `context.setControls` faz o mesmo
                  // numa chamada.
                  context.setControl("rows", "all");
                  context.setControl("status", "all");
                }}
              >
                Mostrar a fila inteira
              </button>
            ) : undefined
          }
        />
      </>,
    );
  }

  return wrap(
    <>
    {notice}
    <Card className="p-0">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Solicitações aguardando decisão</caption>
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            <th scope="col" className="px-5 py-3 font-semibold">
              Solicitação
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Solicitante
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Valor
            </th>
            <th scope="col" className="px-5 py-3 font-semibold">
              Situação
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-b border-ink-50 last:border-0">
              <th scope="row" className="px-5 py-4 text-left font-normal">
                <a
                  href={`/requests/${request.id}`}
                  className="font-medium text-brand-600 underline-offset-2 hover:underline"
                  onClick={(event) => {
                    // Navegação interna sem recarregar. O `href` real fica no
                    // markup de propósito: é o que permite abrir em nova aba e é
                    // o que um leitor de tela anuncia como link.
                    event.preventDefault();
                    context.navigate(`/requests/${request.id}`);
                  }}
                >
                  {request.title}
                </a>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {request.id} · {formatDate(request.createdAt, locale)}
                </span>
              </th>
              <td className="px-5 py-4 text-ink-700">
                {request.requester.name}
                <span className="block text-xs text-ink-500">{request.requester.department}</span>
              </td>
              <td className="px-5 py-4 tabular-nums text-ink-900">
                {formatMoney(request.amountCents, locale)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={request.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
    </>,
  );
}

/** Recorta a fila pelos controles da tela. */
function applyControls(requests: PurchaseRequest[], controls: Record<string, string>): PurchaseRequest[] {
  const status = controls.status ?? "all";
  const filtered = status === "all" ? requests : requests.filter((request) => request.status === status);
  if (controls.rows === "none") return [];
  if (controls.rows === "one") return filtered.slice(0, 1);
  return filtered;
}

function wrap(children: React.ReactNode) {
  return (
    <AppShell title="Solicitações" subtitle="Fila de análise e decisão">
      {children}
    </AppShell>
  );
}
