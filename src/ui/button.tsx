import { cva, type VariantProps } from "class-variance-authority";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { HoverMark, type Mark } from "./hover-mark";

const button = cva(
  "ink-outline inline-flex cursor-pointer items-center justify-center gap-1.5 font-bold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:highlighted",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper [--ink-echo:none] hover:bg-ink-soft",
        secondary: "text-ink",
        ghost: "text-ink before:hidden after:hidden",
        danger: "text-red-pen [--ink-line:var(--color-red-pen)] hover:bg-red-pen/10",
      },
      size: {
        sm: "min-h-10 px-3 text-sm",
        md: "min-h-11 px-4",
        // A square 44px target for an icon; give the button an aria-label.
        icon: "size-11",
      },
    },
    // A ghost is an underlined word; an icon has no words to underline.
    compoundVariants: [{ variant: "ghost", size: ["sm", "md"], className: "ink-underline" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

// `mark="cross"` for a control that deletes: hovering scribbles an X over it instead of circling it. It's set per
// control, not by `danger`, because not every danger action deletes (revoking an app doesn't).
type ButtonVariants = VariantProps<typeof button> & { mark?: Mark };

export const Button = ({
  variant,
  size,
  mark,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants) => (
  <button className={cn(button({ variant, size }), className)} {...props}>
    {children}
    <HoverMark mark={mark} />
  </button>
);

export const LinkButton = ({
  variant,
  size,
  mark,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonVariants) => (
  <a className={cn(button({ variant, size }), className)} {...props}>
    {children}
    <HoverMark mark={mark} />
  </a>
);
