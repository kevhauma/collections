import type { ReactNode } from "react";

type Tab = { href: string; label: ReactNode; current?: boolean };

// Tabs are plain links to separate URLs, so they work without JS. The current one is filled in with ink.
export const TabLinks = ({ label, tabs, className }: { label: string; tabs: Tab[]; className?: string }) => (
  <nav aria-label={label} className={className}>
    <ul className="flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <li key={tab.href}>
          <a
            href={tab.href}
            aria-current={tab.current ? "page" : undefined}
            className="ink-outline inline-flex min-h-10 items-center px-3.5 font-bold text-ink no-underline hover:bg-grid aria-[current=page]:bg-ink aria-[current=page]:text-paper aria-[current=page]:[--ink-echo:none]"
          >
            {tab.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
