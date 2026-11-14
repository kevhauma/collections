import type { ReactNode } from "react";

// A section that folds open and shut without JS (native <details>, open to start): a scrawled heading with a drawn
// chevron that turns when open, and a quiet count. Used for the item list's groups (TICKET-ITM-06).
export const Fold = ({ title, count, children }: { title: ReactNode; count: string; children: ReactNode }) => (
  // min-w-0 and a shrinkable column, so a wide table scrolls inside its own scroller instead of widening the page.
  <details open className="group/fold grid min-w-0 grid-cols-[minmax(0,1fr)] gap-sq">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 transition-transform group-open/fold:rotate-90">
        <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-hand text-4xl leading-none">{title}</span>
      <span className="text-ink-soft">· {count}</span>
    </summary>
    {children}
  </details>
);
