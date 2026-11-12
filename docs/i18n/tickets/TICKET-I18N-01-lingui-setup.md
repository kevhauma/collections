# TICKET-I18N-01: Lingui setup and locale resolution

- **Area:** i18n
- **Released in:** [v1](../../releases/v1/overview.md)
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
  - `getI18n(locale)`: cached, loaded `i18n` instances, one per locale. ~~Exported~~ Module-private: nothing
    outside the seam needs it yet (`actionI18n()` covers actions).
  - A root server component helper that calls `setI18n` per request (`setupRequestI18n()`).
  - `ClientI18nProvider`: a client component wrapping `I18nProvider`, fed with locale and messages from the server.
  - `actionI18n()`: returns the `i18n` instance for the current request's locale, for use inside server actions,
    where `setI18n` doesn't reach (Lingui #2615).
  - `formatNumber` / `formatDate`, thin `Intl` wrappers bound to the locale.
- The locale is resolved once per request and stored in the request context.
- `npm run i18n:extract` updates both catalogs.

## UI requirements

- None of its own. Every later UI string uses an explicit id with EN + NL text.

## Acceptance criteria

- [x] A server component, a client component and a server action each render or return a translated string in
      both locales. (prod build, Chrome over CDP: `<title>`/`<h1>` "Collections" / "Verzamelingen" from
      `src/routes/root.tsx` and `home.tsx`; placeholder client component `src/routes/locale-check.tsx` renders its
      `<Trans>` hydrated; its action `home-actions.ts` returns "Translated by a server action." / "Vertaald door een
      serveractie.", with JS on and with JS off; also checked in dev mode)
- [x] An `Accept-Language: nl-BE,nl;q=0.9,en;q=0.8` request with no cookie gets Dutch. An unsupported language
      falls back to `settings.default_locale`. (curl against the prod build: that header → `lang="nl"`;
      `fr-FR` → `en`, and after `update settings set default_locale='nl'` → `nl`; cookie `locale=nl` beats
      `Accept-Language: en`; `locale=xx` is ignored)
- [x] Message ids are explicit (`area.thing.action` style). No generated ids in the catalogs. (`src/i18n/locales/*.json`
      after `npm run i18n:extract`; enforced by "uses explicit area.thing ids" in `src/i18n/catalogs.test.ts`)
- [x] A check (test or script in `npm test`) fails when any id is missing or empty in `nl.json` or `en.json`.
      (`src/i18n/catalogs.test.ts`: failed on the 4 freshly extracted empty NL messages, passed once translated.
      An id used in code but never extracted isn't caught; `i18n:extract` adds it to both catalogs)
- [x] Unit tests cover `resolveLocale`: valid cookie wins, invalid cookie ignored, q-value ordering, region subtag
      fallback, no header, unsupported only. (`src/i18n/locale.test.ts`, those six plus q=0 and an unusable stored
      default; `npm test` 40 passed)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD`: complexity 0, dupes 0; the only
      findings are `formatNumber` / `formatDate` in `src/i18n/index.ts`, shipped deliberately unreferenced per this
      ticket until the item views use them, not suppressed)

## Notes

- Built on Node 26.13.1 (installed with nvm on 2026-11-12): on 22.18 npm skipped Lingui's native binary. Locally,
  as in Docker, npm 11 needs `npm ci --ignore-scripts` (it otherwise runs node-gyp for better-sqlite3).
- Needs TICKET-PLAT-02 and TICKET-PLAT-03. If the spike (TICKET-PLAT-01) was a no-go for Lingui, implement the
  hand-rolled dictionary fallback from ADR 0002 with the same `src/i18n/` API.
- User-typed content (collection names, field labels, options) is never translated.
- Plurals are written as ICU messages. Note this in ADR 0002 if a revert to i18next is ever planned.
