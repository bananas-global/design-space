/**
 * Componentes locais do produto.
 *
 * Exclusivos deste repositório de propósito (D-02). Se um deles parecer genérico
 * o suficiente para virar pacote, a resposta padrão continua sendo não: reuso de
 * UI é decisão local, e promover componente para o motor porque duas telas
 * pareceram semelhantes é como o motor vira contaminado por UI de cliente.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { RequestStatus } from "../contracts/index.js";

/* ------------------------------------------------------------------ botão */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  /**
   * Motivo pelo qual a ação está indisponível. Quando presente, o botão fica
   * desabilitado e o motivo é anunciado — em vez de simplesmente sumir.
   *
   * Ação que desaparece sem explicação é a forma mais comum de tornar uma regra
   * de negócio invisível: o usuário conclui que o sistema está quebrado.
   */
  unavailableReason?: string;
};

export function Button({
  variant = "secondary",
  unavailableReason,
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-ink-100 bg-surface text-ink-900 hover:bg-ink-50",
    ghost: "text-ink-700 hover:bg-ink-50",
  } as const;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={`${base} ${styles[variant]}`}
        disabled={props.disabled || Boolean(unavailableReason)}
        aria-describedby={unavailableReason ? `${props.id ?? "action"}-reason` : undefined}
        {...props}
      >
        {children}
      </button>
      {unavailableReason && (
        <span id={`${props.id ?? "action"}-reason`} className="text-xs text-ink-500">
          {unavailableReason}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ status */

const STATUS_STYLES: Record<RequestStatus, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-ink-50 text-ink-700" },
  "in-review": { label: "Em análise", className: "bg-warn-50 text-warn-700" },
  approved: { label: "Aprovada", className: "bg-ok-50 text-ok-600" },
  rejected: { label: "Recusada", className: "bg-err-50 text-err-600" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = STATUS_STYLES[status];
  // A cor não é o único portador do significado: o rótulo textual está sempre
  // presente. Status comunicado só por cor falha 1.4.1 e falha qualquer pessoa
  // olhando uma captura de tela em preto e branco.
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------- card */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-ink-100 bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ estados base */

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="text-center">
      <h2 className="m-0 text-base font-semibold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-500">{description}</p>
    </Card>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    // `role="alert"` porque falha de carregamento precisa ser anunciada, não só
    // exibida. É o mesmo raciocínio do campo `announces` do contrato de cenário.
    <Card className="border-err-600/30 bg-err-50">
      <div role="alert">
        <h2 className="m-0 text-base font-semibold text-err-600">Não foi possível carregar</h2>
        <p className="mt-2 text-sm text-ink-700">{message}</p>
      </div>
    </Card>
  );
}

export function LoadingState({ label = "Carregando solicitações" }: { label?: string }) {
  return (
    <Card>
      <p className="m-0 text-sm text-ink-500" role="status">
        {label}…
      </p>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-12 animate-pulse rounded-lg bg-ink-50" />
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- app shell */

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full">
      {/* Pular para o conteúdo é o primeiro elemento focável da página. Sem ele,
          navegação por teclado obriga a atravessar o cabeçalho em cada tela. */}
      <a
        href="#conteudo"
        className="sr-only rounded-lg bg-brand-600 px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-ink-100 bg-surface px-6 py-5">
        <h1 className="m-0 text-xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </header>

      <main id="conteudo" className="px-6 py-6">
        {children}
      </main>
    </div>
  );
}
