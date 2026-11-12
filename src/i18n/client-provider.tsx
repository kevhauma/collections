"use client";
import { setupI18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useMemo, type ReactNode } from "react";

type ClientI18nProviderProps = { locale: string; messages: Messages; children: ReactNode };

// Gives client components <Trans> / useLingui. Locale and messages come from the root server component, so the
// whole catalog for the locale travels in the RSC payload (fine at this app's size, spike-results § 7).
export const ClientI18nProvider = ({ locale, messages, children }: ClientI18nProviderProps) => {
  const i18n = useMemo(() => setupI18n({ locale, messages: { [locale]: messages } }), [locale, messages]);
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
