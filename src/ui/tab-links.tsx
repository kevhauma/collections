import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const link = cva("inline-flex min-h-10 items-center font-bold text-ink no-underline", {
  variants: {
    variant: {
      // Drawn tabs; the current one is filled in with ink (Have / Want).
      tabs: "ink-outline px-3.5 hover:bg-grid aria-[current=page]:bg-ink aria-[current=page]:text-paper aria-[current=page]:[--ink-echo:none]",
      // Plain links; the current one is run over with the highlighter (app sections, collections).
      nav: "px-3 hover:underline aria-[current=page]:highlighted",
    },
  },
  defaultVariants: { variant: "tabs" },
});

type Tab = { href: string; label: ReactNode; current?: boolean };

type TabLinksProps = VariantProps<typeof link> & { label: string; tabs: Tab[]; className?: string };

// Tabs are plain links to separate URLs, so they work without JS.
export const TabLinks = ({ label, tabs, variant, className }: TabLinksProps) => (
  <nav aria-label={label} className={className}>
    <ul className="flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <li key={tab.href}>
          <a href={tab.href} aria-current={tab.current ? "page" : undefined} className={link({ variant })}>
            {tab.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
