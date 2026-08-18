import type { ComponentPreview } from "@brucesantos/design-space";

import { Button, Card, StatusBadge } from "./primitives.js";

function ButtonPreview() {
  return (
    <main className="min-h-full bg-ink-50 p-8 text-ink-900">
      <h1 className="m-0 text-xl font-semibold">Botões</h1>
      <p className="mt-2 text-sm text-ink-500">Ações primárias, secundárias e indisponíveis.</p>
      <Card className="mt-6 flex flex-wrap items-start gap-4">
        <Button variant="primary">Confirmar</Button>
        <Button variant="secondary">Voltar</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button unavailableReason="Ação indisponível neste estado">Confirmar</Button>
      </Card>
    </main>
  );
}

function StatusPreview() {
  return (
    <main className="min-h-full bg-ink-50 p-8 text-ink-900">
      <h1 className="m-0 text-xl font-semibold">Status</h1>
      <p className="mt-2 text-sm text-ink-500">Rótulos preservam o significado sem depender só de cor.</p>
      <Card className="mt-6 flex flex-wrap items-center gap-3">
        <StatusBadge status="draft" />
        <StatusBadge status="in-review" />
        <StatusBadge status="approved" />
        <StatusBadge status="rejected" />
      </Card>
    </main>
  );
}

export const components: ComponentPreview[] = [
  {
    id: "actions.buttons",
    name: "Botões",
    group: "Ações",
    description: "Variações e indisponibilidade",
    preview: ButtonPreview,
  },
  {
    id: "feedback.status",
    name: "Status",
    group: "Feedback",
    description: "Estados comunicados por texto e cor",
    preview: StatusPreview,
  },
];
