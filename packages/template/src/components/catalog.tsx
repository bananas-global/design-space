import type {
  ComponentPreview,
  ComponentPreviewProps,
} from "@brucesantos/design-space";

import { Button, Card, StatusBadge } from "./primitives.js";

type ButtonPreviewData = {
  state: "default" | "filled" | "empty" | "loading" | "error" | "disabled" | "long-content";
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
};

function ButtonPreview({ data }: ComponentPreviewProps<ButtonPreviewData>) {
  const content = data ?? {
    state: "default",
    title: "Botões",
    description: "Ações primárias e secundárias.",
    primaryLabel: "Confirmar",
    secondaryLabel: "Voltar",
  };

  return (
    <main className="min-h-full bg-ink-50 p-8 text-ink-900">
      <h1 className="m-0 text-xl font-semibold">{content.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{content.description}</p>
      <Card className="mt-6 flex flex-wrap items-start gap-4">
        {content.state === "loading" ? (
          <Button unavailableReason="Aguarde o carregamento">Carregando…</Button>
        ) : content.state === "error" ? (
          <Button variant="secondary">Tentar novamente</Button>
        ) : content.state === "empty" ? (
          <span className="text-sm text-ink-500">Nenhuma ação disponível.</span>
        ) : (
          <>
            <Button
              variant="primary"
              unavailableReason={content.state === "disabled" ? "Ação indisponível neste estado" : undefined}
            >
              {content.primaryLabel ?? "Confirmar"}
            </Button>
            {content.secondaryLabel && (
              <Button variant="secondary">{content.secondaryLabel}</Button>
            )}
          </>
        )}
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

const buttons: ComponentPreview<ButtonPreviewData> = {
    id: "actions.buttons",
    name: "Botões",
    group: "Ações",
    description: "Variações e indisponibilidade",
    preview: ButtonPreview,
    defaultFixture: "default",
    fixtures: [
      {
        id: "default",
        label: "Padrão",
        description: "Ações no estado inicial.",
        data: {
          state: "default",
          title: "Botões",
          description: "Ações primárias e secundárias.",
          primaryLabel: "Confirmar",
          secondaryLabel: "Voltar",
        },
      },
      {
        id: "filled",
        label: "Preenchido",
        data: () => ({
          state: "filled",
          title: "Ações preenchidas",
          description: "Conteúdo sintético completo e determinístico.",
          primaryLabel: "Salvar alterações",
          secondaryLabel: "Descartar",
        }),
      },
      {
        id: "empty",
        label: "Vazio",
        data: {
          state: "empty",
          title: "Sem ações",
          description: "O componente não recebeu ações para apresentar.",
        },
      },
      {
        id: "loading",
        label: "Carregando",
        data: {
          state: "loading",
          title: "Carregando ações",
          description: "A interação aguarda dados.",
        },
      },
      {
        id: "error",
        label: "Erro",
        data: {
          state: "error",
          title: "Não foi possível carregar",
          description: "A recuperação permanece disponível.",
        },
      },
      {
        id: "disabled",
        label: "Desabilitado",
        data: {
          state: "disabled",
          title: "Ação indisponível",
          description: "O motivo acompanha a ação.",
          primaryLabel: "Confirmar",
        },
      },
      {
        id: "long-content",
        label: "Conteúdo longo",
        data: {
          state: "long-content",
          title: "Ações com rótulos extensos para verificar quebra e largura",
          description:
            "Texto deliberadamente longo para verificar o comportamento do componente sem depender de conteúdo real.",
          primaryLabel: "Confirmar e continuar para a próxima etapa do processo",
          secondaryLabel: "Voltar sem salvar as alterações realizadas",
        },
      },
    ],
};

export const components: ComponentPreview<any>[] = [
  buttons,
  {
    id: "feedback.status",
    name: "Status",
    group: "Feedback",
    description: "Estados comunicados por texto e cor",
    preview: StatusPreview,
  },
];
