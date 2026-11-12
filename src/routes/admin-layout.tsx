import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Outlet, redirect } from "react-router";
import { adminExists } from "../db/admin";
import { setupRequestI18n } from "../i18n";
import { ClientI18nProvider } from "../i18n/client-provider";
import { AdminNav } from "./admin-nav";
import { RouteError } from "./route-error";

// Frame for the owner's pages. Admin may use client components, so it provides the client i18n context here
// (never in the public layout).
export const Layout = ({ children }: { children: ReactNode }) => {
  const { locale, messages } = setupRequestI18n();
  return (
    <ClientI18nProvider locale={locale} messages={messages}>
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-8">
        <header className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <a href="/admin" className="font-hand text-4xl leading-none text-ink no-underline">
            <Trans id="app.name">Collections</Trans>
          </a>
          <AdminNav />
          {/* TICKET-AUTH-02: logout button, TICKET-I18N-02: locale switcher. Both go here, pushed right. */}
          <div className="flex items-center gap-3 sm:ml-auto" />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 py-4 focus-visible:outline-none">
          {children}
        </main>
      </div>
    </ClientI18nProvider>
  );
};

// Until first-run setup has run there is nothing to log in to, so send the owner to the unlinked /setup page.
export const loader = () => {
  if (!adminExists()) throw redirect("/setup");
  return null;
};

export default function AdminLayout() {
  return <Outlet />;
}

export const ErrorBoundary = RouteError;
