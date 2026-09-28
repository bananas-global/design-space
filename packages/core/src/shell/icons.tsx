/**
 * Ícones do chrome: traço simples, `currentColor`, 16px. Sem texto, sem cor.
 * Todo ícone é decorativo; o nome acessível fica no botão que o contém.
 */

import type { ReactNode } from "react";

export type IconName =
  | "mobile"
  | "tablet"
  | "desktop"
  | "fit"
  | "rotate"
  | "minus"
  | "plus"
  | "link"
  | "check"
  | "fullscreen"
  | "sun"
  | "moon"
  | "panel"
  | "alert"
  | "chevron"
  | "search"
  | "copy";

const PATHS: Record<IconName, ReactNode> = {
  mobile: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  tablet: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  desktop: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
      <path d="M8.5 20.5h7M12 16.5v4" />
    </>
  ),
  fit: <path d="M3 12h7M3 12l3-3M3 12l3 3M21 12h-7M21 12l-3-3M21 12l-3 3" />,
  rotate: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M5 12h14M12 5v14" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  fullscreen: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="ds-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
