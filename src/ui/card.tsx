import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "./cn";

// A drawn module on the page. Its heading is a scrap of coloured paper stuck over the top edge.
const tab = cva(
  "absolute -top-3 left-3 z-10 -rotate-[1.5deg] rounded-scrap px-3 text-sm font-bold tracking-wide text-paper uppercase",
  { variants: { tone: { red: "bg-red-pen", ink: "bg-ink" } }, defaultVariants: { tone: "red" } },
);

type CardProps = VariantProps<typeof tab> & { heading?: ReactNode; className?: string; children: ReactNode };

export const Card = ({ heading, tone, className, children }: CardProps) => (
  <section className={cn("ink-outline bg-paper/60 px-4 pt-7 pb-4", className)}>
    {heading && <h2 className={tab({ tone })}>{heading}</h2>}
    {children}
  </section>
);
