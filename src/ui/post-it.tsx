import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "./cn";

// The frame for item images (and notes): a square post-it, slightly turned, pinned or taped to the page.
// A real photo goes in as a child (`<img className="size-full object-cover">`); the padding keeps the paper visible.
// The single grid cell is pinned to the content box, so a `size-full` photo of any shape fills it instead of
// stretching the post-it.
const postIt = cva(
  "postit-corner relative grid shrink-0 grid-cols-[100%] grid-rows-[100%] place-items-center bg-(--postit) p-1.5 shadow-postit",
  {
    variants: {
      color: {
        yellow: "[--postit:var(--color-postit-yellow)]",
        pink: "[--postit:var(--color-postit-pink)]",
        blue: "[--postit:var(--color-postit-blue)]",
        green: "[--postit:var(--color-postit-green)]",
      },
      tilt: { left: "-rotate-3", right: "rotate-2", none: "" },
      size: { sm: "size-14", md: "size-20", lg: "size-44 p-4" },
    },
    defaultVariants: { color: "yellow", tilt: "left", size: "sm" },
  },
);

const fastenings = {
  pin: (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 left-1/2 z-10 size-3 -translate-x-1/2 rounded-full bg-red-pen shadow-pin"
    />
  ),
  tape: (
    <span
      aria-hidden="true"
      className="absolute -top-2 left-1/2 z-10 h-3.5 w-11 -translate-x-1/2 rotate-4 border border-ink/15 bg-paper/60"
    />
  ),
  none: null,
};

type PostItProps = VariantProps<typeof postIt> & {
  fastening?: keyof typeof fastenings;
  className?: string;
  children?: ReactNode;
};

export const PostIt = ({ color, tilt, size, fastening = "pin", className, children }: PostItProps) => (
  <span className={cn(postIt({ color, tilt, size }), className)}>
    {fastenings[fastening]}
    {children}
  </span>
);
