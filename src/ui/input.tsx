import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

// The drawn box sits on a wrapper (inputs can't carry pseudo-elements); className goes to the wrapper, the rest
// to the control. An aria-invalid control turns its box red.
const box =
  "ink-outline flex min-h-11 items-center bg-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-ink has-focus-visible:outline-dashed has-aria-invalid:[--ink-line:var(--color-red-pen)]";
const control = "w-full bg-transparent px-3 text-ink placeholder:text-pencil focus-visible:outline-none";

const Box = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn(box, className)}>{children}</span>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <Box className={className}>
    <input className={cn(control, "min-h-11")} {...props} />
  </Box>
);

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <Box className={cn("items-stretch", className)}>
    <textarea className={cn(control, "min-h-24 resize-y py-2")} {...props} />
  </Box>
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <Box className={className}>
    <select className={cn(control, "min-h-11 cursor-pointer appearance-none pr-9")} {...props} />
    <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute right-3 size-4">
      <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </Box>
);
