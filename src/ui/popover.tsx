import type { ReactNode } from "react";
import { cn } from "./cn";

// Native Popover API, no JS needed. Open it with <Button popoverTarget="sort-menu">…</Button>; light dismiss and
// Escape come from the browser.
export const Popover = ({ id, className, children }: { id: string; className?: string; children: ReactNode }) => (
  <div
    id={id}
    popover="auto"
    className={cn("ink-outline popover-anchored overflow-visible bg-paper p-3 text-ink shadow-postit", className)}
  >
    {children}
  </div>
);
