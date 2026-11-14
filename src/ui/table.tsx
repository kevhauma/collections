import type { ReactNode, TdHTMLAttributes } from "react";
import { cn } from "./cn";
import { HoverMark } from "./hover-mark";

// Rows ruled with drawn dotted pencil lines (ink-rule-dotted), the header with a drawn ink line; numerals stay tabular so columns of numbers line up.
export const Table = ({ className, children }: { className?: string; children: ReactNode }) => (
  // The bottom padding holds the last row's rule, which hangs past the table, so it never adds a vertical scrollbar.
  <div className="overflow-x-auto pb-sq-half">
    <table className={cn("w-full border-collapse text-left tabular-nums", className)}>{children}</table>
  </div>
);

type SortDirection = "ascending" | "descending" | "none";

const arrows: Record<SortDirection, string> = {
  ascending: "M8 13V3M4 7l4-4 4 4",
  descending: "M8 3v10M4 9l4 4 4-4",
  none: "M5 6l3-3 3 3M5 10l3 3 3-3",
};

type ThProps = { className?: string; children: ReactNode; sort?: { href: string; direction: SortDirection } };

// A sortable header is a plain link (works without JS); aria-sort tells assistive tech the current order.
export const Th = ({ className, children, sort }: ThProps) => (
  <th
    scope="col"
    aria-sort={sort?.direction}
    className={cn("ink-rule px-2 py-sq-half align-bottom font-bold", className)}
  >
    {sort ? (
      <a href={sort.href} className="relative inline-flex min-h-11 items-center gap-1 align-top text-ink no-underline hover:ink-underline">
        {children}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
          <path d={arrows[sort.direction]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <HoverMark />
      </a>
    ) : (
      <span className="inline-flex min-h-11 items-center align-top">{children}</span>
    )}
  </th>
);

export const Td = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("ink-rule-dotted px-2 pt-sq align-top", className)} {...props} />
);
