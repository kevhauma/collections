import type { ReactNode } from "react";
import { cn } from "./cn";

// A want's position, scrawled in red pen: the one place red marks a number rather than a correction.
export const Rank = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn("font-hand text-4xl leading-none text-red-pen tabular-nums", className)}>{children}</span>
);
