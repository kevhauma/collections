# TICKET-I18N-02: Locale switcher and default locale setting

- **Area:** i18n
- **Released in:** _unreleased_
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
- `/admin/settings` page with a "Default language" select, saved by a server action to `settings.default_locale`.

## UI requirements

- Switcher in the public and admin headers. The labels are the language names in their own language ("English",
  "Nederlands").
- Settings page uses `FormField` + `Select`, with a success state after saving.

## Acceptance criteria

- [ ] Switching language works with JavaScript disabled and returns to the same page.
- [ ] An invalid locale value is rejected (400) and sets no cookie.
- [ ] A cross-origin or absolute `Referer` never causes an off-site redirect.
- [ ] The default locale setting is admin-only. The action re-checks the session.
- [ ] Unit tests cover the redirect-target function: same-origin path kept, absolute URL to another host rejected,
      protocol-relative `//evil` rejected, missing referer → `/`.
- [ ] Live browser check of the switcher in both layouts.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-I18N-01, TICKET-UI-02 and TICKET-AUTH-02.
