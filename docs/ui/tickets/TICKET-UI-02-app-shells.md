# TICKET-UI-02: App shells and error pages

- **Area:** UI
- **Released in:** _unreleased_
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

- Root document: `<html lang={locale}>`, stylesheet, `<title>` per route, skip link to `<main>`.
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

- [ ] Unknown routes return status 404 with the not-found page (checked with `curl -I`).
- [ ] A thrown error in a route returns status 500 with the error page and no stack trace in production.
- [ ] `<html lang>` matches the resolved locale.
- [ ] The skip link is the first focusable element and moves focus to `<main>`.
- [ ] The public layout contains no client components.
- [ ] Live browser check of both layouts at 360 px and desktop width.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-UI-01 and TICKET-I18N-01.
- The logout button is added by TICKET-AUTH-02 and the locale switcher by TICKET-I18N-02. This ticket leaves their
  slots.
- The app name is a fixed translated string. Making it a setting is out of scope.
