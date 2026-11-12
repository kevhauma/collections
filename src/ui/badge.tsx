import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "./cn";

const badge = cva("ink-outline inline-flex items-center gap-1 px-2.5 text-sm font-bold [--ink-echo:none]", {
  variants: {
    variant: {
      outline: "text-ink",
      highlight: "highlighted text-ink",
      pencil: "text-pencil [--ink-line:var(--color-pencil)]",
    },
  },
  defaultVariants: { variant: "outline" },
});

type BadgeProps = VariantProps<typeof badge> & { className?: string; children: ReactNode };

export const Badge = ({ variant, className, children }: BadgeProps) => (
  <span className={cn(badge({ variant }), className)}>{children}</span>
);
