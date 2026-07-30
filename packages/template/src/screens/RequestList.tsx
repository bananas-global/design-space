import type { ScreenProps } from "@brucesantos/design-space";
import type { RequestsData } from "../contracts/index.js";
import { formatDate, formatMoney } from "../contracts/index.js";
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

  const requests = (data as RequestsData | null)?.requests ?? [];

  if (requests.length === 0) {
    return wrap(
      <EmptyState
        title="Nenhuma solicitação na fila"
        description="Quando alguém registrar uma solicitação, ela aparece aqui para análise."
      />,
    );
  }

  return wrap(
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
    </Card>,
  );
}

function wrap(children: React.ReactNode) {
  return (
    <AppShell title="Solicitações" subtitle="Fila de análise e decisão">
      {children}
    </AppShell>
  );
}
