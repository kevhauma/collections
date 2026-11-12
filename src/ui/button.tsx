import { cva, type VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

const button = cva(
  "ink-outline inline-flex cursor-pointer items-center justify-center gap-1.5 font-bold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper [--ink-echo:none] hover:bg-ink-soft",
        secondary: "text-ink hover:bg-grid",
        ghost: "text-ink underline before:hidden after:hidden hover:bg-grid",
        danger: "text-red-pen [--ink-line:var(--color-red-pen)] hover:bg-red-pen/10",
      },
      size: {
        sm: "min-h-10 px-3 text-sm",
        md: "min-h-11 px-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof button>;

export const Button = ({ variant, size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) => (
  <button className={cn(button({ variant, size }), className)} {...props} />
);

export const LinkButton = ({ variant, size, className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonVariants) => (
  <a className={cn(button({ variant, size }), className)} {...props} />
);
