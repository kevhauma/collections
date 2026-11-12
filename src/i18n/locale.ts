// Pure locale logic, no Lingui: safe to import anywhere, including tests and the request context.
export const locales = ["en", "nl"] as const;
export type Locale = (typeof locales)[number];

const sourceLocale: Locale = "en";

// Set by the language switcher (TICKET-I18N-02).
export const localeCookie = "locale";

const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

// Accept-Language primary subtags, most preferred first: "nl-BE,nl;q=0.9,en;q=0.8" → ["nl", "nl", "en"].
// q=0 means "not acceptable", so those entries are dropped.
const preferredLanguages = (header: string): string[] =>
  header
    .split(",")
    .map((entry) => entry.trim().split(";"))
    .map(([tag = "", ...params]) => ({
      language: tag.split("-")[0]?.toLowerCase(),
      q: Number(params.find((param) => param.trim().startsWith("q="))?.trim().slice(2) ?? 1),
    }))
    .filter(({ q }) => q > 0)
    .toSorted((a, b) => b.q - a.q)
    .map(({ language = "" }) => language);

type ResolveLocaleInput = { cookie?: string; acceptLanguage?: string | null; defaultLocale: string };

// A valid cookie wins, then the best Accept-Language match, then the owner's default (settings.default_locale),
// and the source locale if even that is unusable.
export const resolveLocale = ({ cookie, acceptLanguage, defaultLocale }: ResolveLocaleInput): Locale =>
  [cookie, ...preferredLanguages(acceptLanguage ?? ""), defaultLocale].find(isLocale) ?? sourceLocale;
