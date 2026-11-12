// The i18n seam (ADR 0002): the only module that wires Lingui's runtime. Macros (`Trans`, `useLingui`, `msg`) are
// imported from `@lingui/*/macro` directly, with explicit ids.
import { setupI18n, type I18n, type Messages } from "@lingui/core";
import { setI18n } from "@lingui/react/server";
import { requestContext } from "../context";
import { locales, type Locale } from "./locale";
import { messages as en } from "./locales/en.json?lingui";
import { messages as nl } from "./locales/nl.json?lingui";

const catalogs: Record<Locale, Messages> = { en, nl };

// One loaded instance per locale for the life of the process; nothing activates them per request.
const instances = Object.fromEntries(
  locales.map((locale) => [locale, setupI18n({ locale, messages: { [locale]: catalogs[locale] } })]),
) as Record<Locale, I18n>;

const getI18n = (locale: Locale): I18n => instances[locale];

// Call once at the top of the root server component: server components below can then use <Trans> / useLingui.
// Returns what the root needs for <html lang> and the client provider.
export const setupRequestI18n = (): { locale: Locale; messages: Messages } => {
  const { locale } = requestContext();
  setI18n(getI18n(locale));
  return { locale, messages: catalogs[locale] };
};

// For 'use server' actions, which setI18n doesn't reach (Lingui #2615):
// actionI18n()._(msg({ id: "item.saved", message: `Saved ${title}` }))
export const actionI18n = (): I18n => getI18n(requestContext().locale);

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  new Intl.NumberFormat(requestContext().locale, options).format(value);

export const formatDate = (value: Date | number, options?: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(requestContext().locale, options).format(value);
