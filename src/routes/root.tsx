import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { getCookie } from "../context";
import { forcedTheme, themeCookie } from "../lib/theme";
import { setupRequestI18n } from "../i18n";
import { InkDefs } from "../ui/ink-defs";
import { LinkButton } from "../ui/button";
import { RouteError } from "./route-error";
import "../ui/styles.css";

// The document. It renders no client components: public pages stay JS-free, and the admin layout adds the
// client i18n provider itself. Pages render their own <title>; React hoists it into <head>. A forced theme is on
// <html> in the server HTML, so a reload never flashes the device's theme first (TICKET-UI-03).
export const Layout = ({ children }: { children: ReactNode }) => {
  const { locale } = setupRequestI18n();
  return (
    <html lang={locale} data-theme={forcedTheme(getCookie(themeCookie))}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {/* First focusable element: off-screen until it gets keyboard focus. */}
        <div className="fixed top-2 left-2 z-50 -translate-y-[200%] focus-within:translate-y-0">
          <LinkButton href="#main" variant="primary">
            <Trans id="shell.skipToContent">Skip to content</Trans>
          </LinkButton>
        </div>
        <InkDefs />
        {children}
      </body>
    </html>
  );
};

export default function Root() {
  return <Outlet />;
}

// Last resort, for errors in the layouts themselves; page errors are caught inside their layout's frame.
export const ErrorBoundary = RouteError;
