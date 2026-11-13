import type { ReactNode } from "react";
import { cn } from "./cn";

type ErrorSummaryProps = { title: ReactNode; errors: Array<{ href: string; text: ReactNode }>; className?: string };

// Every invalid field of a failed save, at the top of the form, each linking to its control. Renders nothing when
// there are no errors. A correction, so it's drawn in red pen.
export const ErrorSummary = ({ title, errors, className }: ErrorSummaryProps) =>
  errors.length > 0 && (
    <div
      role="alert"
      className={cn("ink-outline grid gap-2 bg-paper p-4 text-red-pen [--ink-line:var(--color-red-pen)]", className)}
    >
      <p className="font-bold">{title}</p>
      <ul className="grid list-disc gap-1 pl-5">
        {errors.map((error) => (
          <li key={error.href}>
            <a href={error.href} className="font-bold text-red-pen">
              {error.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
