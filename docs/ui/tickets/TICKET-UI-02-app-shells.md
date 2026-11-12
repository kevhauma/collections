# TICKET-UI-02: App shells and error pages

- **Area:** UI
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes)

## User story

As a visitor or the admin, I want consistent page frames and clear error pages, so I always know where I am and what
went wrong.

## Description

The root document, the public layout, the admin layout, and the 404 and error pages, built from `src/ui/`
components.

## Current situation (as-is)

- UI primitives from TICKET-UI-01 and i18n from TICKET-I18N-01. The only route is a placeholder.

## Desired result (to-be)

- Root document: `<html lang={locale}>`, stylesheet, `<title>` per route, skip link to `<main>`. Each page renders
  its own `<title>` (React hoists it into `<head>`).
- `PublicLayout`: header (app name linking to `/`, slot for the locale switcher), `<main>`, minimal footer.
- `AdminLayout`: header with nav (Collections, Export, Settings), slots for logout and the locale switcher, and
  `<main>`.
- Not-found page rendered with HTTP **404** for unknown routes. Collection routes reuse it for private or unknown
  slugs.
- Error page rendered with HTTP 500. It shows no stack traces in production.

## UI requirements

- The admin nav marks the active section (`aria-current`).
- Layouts are responsive from 360 px.
- All shell strings are translated (explicit ids, EN + NL).

## Acceptance criteria

- [x] Unknown routes return status 404 with the not-found page (checked with `curl -I`). (prod build: `curl -I /nope`
      → `HTTP/1.1 404`; `/nope` and `/admin/nope` render "Page not found" / "Pagina niet gevonden" in the public
      frame. `src/routes/not-found.tsx` throws `data(null, { status: 404 })`, and collection routes reuse the page
      the same way)
- [x] A thrown error in a route returns status 500 with the error page and no stack trace in production.
      (temporary `/boom` and `/admin/boom` routes throwing `Error("SECRET-STACK-MARKER")` while rendering, removed
      after the check: both 500 with "Something went wrong", marker absent from the HTML. `RouteError` never prints
      the error, in any environment)
- [x] `<html lang>` matches the resolved locale. (curl with `Accept-Language: en` → `lang="en"` on `/`, `/admin`,
      the 404 and the 500 page; Chrome with `nl` → Dutch shell)
- [x] The skip link is the first focusable element and moves focus to `<main>`. (Chrome, `/` and `/admin`: first
      Tab focuses `#main` "Naar de inhoud", which slides into view; Enter moves focus to `MAIN#main`)
- [x] The public layout contains no client components. (`src/routes/public-layout.tsx`, `home.tsx`,
      `not-found.tsx` and `route-error.tsx` are server components; `entry.ssr.tsx` also skips the bootstrap script
      under the `public` route, so the page doesn't hydrate (checked in Chrome). Caveat: plugin-rsc still emits
      `modulepreload` hints for React Router's own client runtime, so browsers download about 350 KB of JS that never
      runs. Recorded in spike-results § 9 and on TICKET-PUB-02)
- [x] Live browser check of both layouts at 360 px and desktop width. (prod build, Chrome over CDP at 1440 and
      360 px, NL: public home, admin placeholder and 404 screenshots match the notebook direction, no horizontal
      scroll at 360 px. The admin nav highlights "Verzamelingen" with `aria-current="page"` on `/admin`;
      `sectionOf` is unit-tested for export and settings, which have no routes yet)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass. `Layout` / `ErrorBoundary` /
      `loader` are React Router's route-module contract, so `.fallowrc.json` `ignoreExports` covers them for
      `src/routes/*.tsx` instead of reporting them as duplicate exports. The impeccable detector also found nothing)

## Notes

- Needs TICKET-UI-01 and TICKET-I18N-01.
- The logout button is added by TICKET-AUTH-02 and the locale switcher by TICKET-I18N-02. This ticket leaves their
  slots.
- The app name is a fixed translated string. Making it a setting is out of scope.
