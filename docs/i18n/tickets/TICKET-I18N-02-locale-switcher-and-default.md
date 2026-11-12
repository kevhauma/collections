# TICKET-I18N-02: Locale switcher and default locale setting

- **Area:** i18n
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes) (`POST /locale`, `/admin/settings`), [ADR 0002](../../adr/0002-lingui-explicit-ids.md)

## User story

As a visitor, I want to switch between Dutch and English, so I can read the lists in my language even if my browser
says otherwise. As the admin, I want to choose the default language, so visitors with an unsupported browser
language get the one I prefer.

## Description

A no-JS language switcher in both layouts, and an admin settings page holding the default locale.

## Current situation (as-is)

- Locale is resolved from cookie / `Accept-Language` / default (TICKET-I18N-01), but nothing sets the cookie and the
  default is fixed at `en`.
- Layouts have a switcher slot (TICKET-UI-02). Admin auth exists (TICKET-AUTH-02).

## Desired result (to-be)

- `LocaleSwitcher`: a `<form method="post" action="/locale">` with one button per locale. The current locale is
  marked with `aria-pressed`.
- `POST /locale`:
  - validates the locale against the supported list
  - sets cookie `locale` (1 year, `SameSite=Lax`, `Path=/`)
  - redirects (303) back to the `Referer` path only if it is same-origin, else to `/`
- `/admin/settings` page with a "Default language" select, saved by a ~~server action~~ route action (a plain form
  with `actionData` for the success state, like setup and login; no client code needed) to `settings.default_locale`.

## UI requirements

- Switcher in the public and admin headers. The labels are the language names in their own language ("English",
  "Nederlands").
- Settings page uses `FormField` + `Select`, with a success state after saving.

## Acceptance criteria

- [x] Switching language works with JavaScript disabled and returns to the same page. (Chrome over CDP, JS off: on
      `/` and on `/nope?x=1` (the 404) at 360 px, "Nederlands" → same URL in Dutch with `aria-pressed` moved; on
      `/admin/settings` at desktop width with JS off and with JS on, both directions. curl: 303 to the Referer's path
      and query, with `locale=nl; Path=/; Max-Age=31536000; SameSite=Lax`)
- [x] An invalid locale value is rejected (400) and sets no cookie. (`locale=fr` and a missing field → 400 with no
      `Set-Cookie`)
- [x] A cross-origin or absolute `Referer` never causes an off-site redirect. (curl: `Referer: https://evil.example/…`
      → `Location: /`; `…//evil.example` → `/evil.example`; no Referer → `/`; a cross-origin POST is already 403.
      `safeRedirectTarget` in `src/lib/redirect.ts`)
- [x] The default locale setting is admin-only. The action re-checks the session. (`/admin/settings` without a session:
      GET → 302 `/admin`, POST → 401. Both the loader and the action call `requireAdmin()`. A bad value → 400. After
      saving `nl`, an `Accept-Language: fr` visitor gets `lang="nl"`)
- [x] Unit tests cover the redirect-target function: same-origin path kept, absolute URL to another host rejected,
      protocol-relative `//evil` rejected, missing referer → `/`. (`src/lib/redirect.test.ts`: those four plus another
      scheme, empty, unparseable and a `//` path; `npm test` 126 passed)
- [x] Live browser check of the switcher in both layouts. (screenshots: the public header at 360 px with
      "Nederlands" highlighted, the admin header at desktop width with the language pair beside "Log out", "Settings"
      highlighted in the nav, and the settings card showing "Saved." Both match the notebook direction)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass; the impeccable detector found
      nothing)

## Notes

- Needs TICKET-I18N-01, TICKET-UI-02 and TICKET-AUTH-02.
