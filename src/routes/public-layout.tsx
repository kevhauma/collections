import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { LocaleSwitcher } from "./locale-switcher";
import { RouteError } from "./route-error";

// Frame for the visitor-facing pages. Server components only: entry.ssr also skips the bootstrap script for
// every route under this layout, so public pages ship no JavaScript (spike-results § 9).
export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 sm:px-8">
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
      <a href="/" className="font-hand text-4xl leading-none text-ink no-underline">
        <Trans id="app.name">Collections</Trans>
      </a>
      <LocaleSwitcher />
    </header>
    <main id="main" tabIndex={-1} className="flex-1 py-4 focus-visible:outline-none">
      {children}
    </main>
    <footer className="border-t border-dashed border-rule py-4 text-sm text-pencil">
      <Trans id="app.name">Collections</Trans>
    </footer>
  </div>
);

export default function PublicLayout() {
  return <Outlet />;
}

export const ErrorBoundary = RouteError;
