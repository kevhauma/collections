import type { ReactNode } from "react";
import { cn } from "./cn";

// A flag's edge, drawn as four strokes that run past each other at the corners, like the ink-outline box.
const flagEdge = "M1.8 5.6L22.2 5.4M21.8 5L22 19M22.3 18.6L1.9 18.5M2.3 18.9L2.2 5.1";

// Small pen sketches on a 24-unit grid (TICKET-UI-04): ink is currentColor, red pen and paper come from the tokens.
const drawings = {
  "flag-en": (
    <>
      <rect x="2" y="5.5" width="20" height="13" className="fill-paper" />
      <rect x="2" y="5.5" width="20" height="13" className="fill-ink/20" />
      <path d="M2.5 6l19 12M21.5 6l-19 12" strokeWidth="1.4" />
      <path d="M12 5.6v12.8M2.2 12h19.6" strokeWidth="2.8" className="stroke-red-pen" />
      <path d={flagEdge} />
    </>
  ),
  "flag-nl": (
    <>
      <rect x="2" y="5.5" width="20" height="13" className="fill-paper" />
      <path
        d="M3.2 6.4L4.3 9.3L5.4 6.4L6.5 9.3L7.6 6.4L8.7 9.3L9.8 6.4L10.9 9.3L12 6.4L13.1 9.3L14.2 6.4L15.3 9.3L16.4 6.4L17.5 9.3L18.6 6.4L19.7 9.3L20.8 6.4"
        strokeWidth="1.3"
        className="stroke-red-pen"
      />
      <path
        d="M3.2 14.8L4.3 17.6L5.4 14.8L6.5 17.6L7.6 14.8L8.7 17.6L9.8 14.8L10.9 17.6L12 14.8L13.1 17.6L14.2 14.8L15.3 17.6L16.4 14.8L17.5 17.6L18.6 14.8L19.7 17.6L20.8 14.8"
        strokeWidth="1.3"
      />
      <path d={flagEdge} />
    </>
  ),
  // Half day, half night: the right half hatched in.
  system: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5v15M14 4.8v14.4M16 5.6v12.8M18 7.5v9" strokeWidth="1.1" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 2.6v3M12 18.6v2.8M2.6 12h3M18.5 12h2.9M5.3 5.3l2.1 2.1M16.7 16.7l2 2M18.7 5.3l-2.1 2.1M7.3 16.7l-2 2" />
    </>
  ),
  dark: (
    <>
      <path d="M20 13.6A8 8 0 1 1 10.4 4a6.3 6.3 0 0 0 9.6 9.6z" />
      <path d="M18 3.4v3M16.5 4.9h3" strokeWidth="1.2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type InkIconName = keyof typeof drawings;

// Decorative: the control that holds it carries the name (aria-label and title), so the SVG is hidden from
// assistive tech. The strokes wobble through the shared #ink-wobble filter (InkDefs).
export const InkIcon = ({ name, className }: { name: InkIconName; className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("size-6 overflow-visible", className)}
  >
    <g filter="url(#ink-wobble)">{drawings[name]}</g>
  </svg>
);
