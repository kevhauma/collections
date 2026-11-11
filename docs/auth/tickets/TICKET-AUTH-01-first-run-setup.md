# TICKET-AUTH-01: First-run setup

- **Area:** Auth
- **Released in:** _unreleased_
- **Traceability:** [technical-design.md § Auth and security](../../technical-design.md#auth-and-security), [technical-design.md § Routes](../../technical-design.md#routes) (`/setup`)

## User story

As the owner launching the app for the first time, I want to set the admin password on a one-time setup page, so no
password has to live in config and nobody else can claim the instance afterwards.

## Description

An unlinked `/setup` route that works only while no admin exists, storing a scrypt hash of the chosen password.

## Current situation (as-is)

- The `admin` table exists (TICKET-PLAT-03) but is empty, and nothing writes to it.

## Desired result (to-be)

- `src/features/auth/password.ts`:
  - `hashPassword` with `node:crypto` `scrypt`, a random 16-byte salt, and a stored format of
    `scrypt$N$r$p$saltB64$hashB64`
  - `verifyPassword`, which compares with `timingSafeEqual`
- `GET /setup`: 404 if an admin row exists, otherwise a form with password and confirmation.
- Setup action:
  - validates (zod): at least 12 characters, confirmation matches
  - inside one transaction, re-checks that no admin exists, then inserts it
  - creates a session (TICKET-AUTH-02's helper; until that lands, redirect to `/admin`)
  - redirects to `/admin`

## UI requirements

- A centered card with two password fields (`autocomplete="new-password"`), a short explanation that this is the
  admin password, and inline validation errors.
- Strings are translated.

## Acceptance criteria

- [ ] On a fresh instance `/setup` shows the form. After a successful submit it returns 404 forever.
- [ ] Two concurrent setup submissions create exactly one admin row.
- [ ] The password is never logged or stored in plain text. The DB holds only the `scrypt$…` string.
- [ ] The form works with JavaScript disabled.
- [ ] Unit tests cover: hash/verify round trip, wrong password fails, tampered hash string fails cleanly (no throw),
      two hashes of the same password differ (salt).
- [ ] Live browser check of the setup flow.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-PLAT-03, TICKET-UI-02 and TICKET-I18N-01.
- Nothing links to `/setup`. Until setup runs, `/admin` redirects to `/setup` so the owner can find it.
- The 12-character minimum is a default chosen during ticketing, not a design-session decision. Adjust if wanted.
