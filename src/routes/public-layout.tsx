import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { RouteError } from "./route-error";

// Frame for the visitor-facing pages. Server components only: entry.ssr also skips the bootstrap script for
// every route under this layout, so public pages ship no JavaScript (spike-results § 9). A phone-first column that
// widens on large screens, so a table with many fields fits (TICKET-UI-08).
export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 sm:px-8 xl:max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-x-6 pt-sq">
      <a href="/" className="inline-flex min-h-11 items-center font-hand text-4xl leading-none text-ink no-underline">
        <Trans id="app.name">Hoardr</Trans>
      </a>
      <div className="flex flex-wrap items-center gap-3">
        <LocaleSwitcher />
        <ThemeSwitcher />
      </div>
    </header>
    {/* The rule under main is the footer's top line. */}
    <main id="main" tabIndex={-1} className="ink-rule-dotted flex-1 py-sq focus-visible:outline-none">
      {children}
    </main>
    <footer className="py-4 text-sm text-pencil">
      <Trans id="app.name">Hoardr</Trans>
    </footer>
  </div>
);

export default function PublicLayout() {
  return <Outlet />;
}

export const ErrorBoundary = RouteError;
