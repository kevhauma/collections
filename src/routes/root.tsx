import { useLingui } from "@lingui/react/macro";
import { Outlet } from "react-router";
import { setupRequestI18n } from "../i18n";
import { ClientI18nProvider } from "../i18n/client-provider";
import { InkDefs } from "../ui/ink-defs";
import "../ui/styles.css";

// Document shell. TICKET-UI-02 replaces it with the real admin/public shells; the public one must not render
// ClientI18nProvider (a client component), so public pages ship no JS (spike-results § 9).
export default function Root() {
  const { locale, messages } = setupRequestI18n();
  const { t } = useLingui();
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{t({ id: "app.name", message: "Collections" })}</title>
      </head>
      <body>
        <InkDefs />
        <ClientI18nProvider locale={locale} messages={messages}>
          <Outlet />
        </ClientI18nProvider>
      </body>
    </html>
  );
}
