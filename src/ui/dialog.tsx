import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

type DialogProps = { id: string; title: ReactNode; closeLabel: string; className?: string; children: ReactNode };

// Native <dialog> opened by invoker commands, no JS needed (spike-results § 10):
// <Button commandfor="confirm-delete" command="show-modal">…</Button>
export const Dialog = ({ id, title, closeLabel, className, children }: DialogProps) => (
  <dialog
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn(
      "ink-outline m-auto w-[min(32rem,calc(100vw-2rem))] overflow-visible bg-paper p-6 text-ink backdrop:bg-ink/25",
      className,
    )}
  >
    <div className="mb-4 flex items-start justify-between gap-4">
      <h2 id={`${id}-title`} className="font-hand text-4xl leading-none">
        {title}
      </h2>
      <Button variant="ghost" size="sm" commandfor={id} command="close" aria-label={closeLabel}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
          <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Button>
    </div>
    {children}
  </dialog>
);
