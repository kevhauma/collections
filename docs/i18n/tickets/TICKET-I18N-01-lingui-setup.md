# TICKET-I18N-01: Lingui setup and locale resolution

- **Area:** i18n
- **Released in:** _unreleased_
- **Traceability:** [ADR 0002](../../adr/0002-lingui-explicit-ids.md), [research/lingui-rsc.md](../../research/lingui-rsc.md), [technical-design.md § Stack](../../technical-design.md#stack)

## User story

As a Dutch- or English-speaking user, I want the app in my language, so I can use it comfortably. As the developer,
I want every Lingui touchpoint behind one seam, so switching i18n libraries later stays cheap.

## Description

Configures Lingui (explicit ids, minimal JSON catalogs, NL + EN), resolves the locale per request, and provides the
three integration points: server components, client components and server actions.

## Current situation (as-is)

- Project scaffold with request context (TICKET-PLAT-02) and a `settings.default_locale` column
  (TICKET-PLAT-03). No i18n.

## Desired result (to-be)

- `lingui.config.ts`: locales `en` and `nl`, source locale `en`, catalogs at `src/i18n/locales/{locale}.json`,
  format `@lingui/format-json` with `style: "minimal"`.
- `@lingui/vite-plugin` with `macroTransform: true` (or the fallback the spike settled on).
- `src/i18n/` is the seam:
  - `resolveLocale({ cookie, acceptLanguage, defaultLocale })`: a pure function. Order: valid cookie →
    best `Accept-Language` match (q-values respected, `nl-BE` → `nl`) → default.
  - `getI18n(locale)`: cached, loaded `i18n` instances, one per locale.
  - A root server component helper that calls `setI18n` per request.
  - `ClientI18nProvider`: a client component wrapping `I18nProvider`, fed with locale and messages from the server.
  - `actionI18n()`: returns the `i18n` instance for the current request's locale, for use inside server actions,
    where `setI18n` doesn't reach (Lingui #2615).
  - `formatNumber` / `formatDate`, thin `Intl` wrappers bound to the locale.
- The locale is resolved once per request and stored in the request context.
- `npm run i18n:extract` updates both catalogs.

## UI requirements

- None of its own. Every later UI string uses an explicit id with EN + NL text.

## Acceptance criteria

- [ ] A server component, a client component and a server action each render or return a translated string in
      both locales.
- [ ] An `Accept-Language: nl-BE,nl;q=0.9,en;q=0.8` request with no cookie gets Dutch. An unsupported language
      falls back to `settings.default_locale`.
- [ ] Message ids are explicit (`area.thing.action` style). No generated ids in the catalogs.
- [ ] A check (test or script in `npm test`) fails when any id is missing or empty in `nl.json` or `en.json`.
- [ ] Unit tests cover `resolveLocale`: valid cookie wins, invalid cookie ignored, q-value ordering, region subtag
      fallback, no header, unsupported only.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-PLAT-02 and TICKET-PLAT-03. If the spike (TICKET-PLAT-01) was a no-go for Lingui, implement the
  hand-rolled dictionary fallback from ADR 0002 with the same `src/i18n/` API.
- User-typed content (collection names, field labels, options) is never translated.
- Plurals are written as ICU messages. Note this in ADR 0002 if a revert to i18next is ever planned.
