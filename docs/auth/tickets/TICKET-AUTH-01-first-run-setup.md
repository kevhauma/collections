# TICKET-AUTH-01: First-run setup

- **Area:** Auth
- **Released in:** [v1](../../releases/v1/overview.md)
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
  - ~~inside one transaction, re-checks that no admin exists, then inserts it~~ inserts the `id = 1` row with one
    atomic `INSERT … ON CONFLICT (id) DO NOTHING` (`src/db/admin.ts`): the losing request sees 0 changes and gets
    the 404. Same guarantee, one statement
  - creates a session (TICKET-AUTH-02's helper; until that lands, redirect to `/admin`)
  - redirects to `/admin`

## UI requirements

- A centered card with two password fields (`autocomplete="new-password"`), a short explanation that this is the
  admin password, and inline validation errors.
- Strings are translated.

## Acceptance criteria

- [x] On a fresh instance `/setup` shows the form. After a successful submit it returns 404 forever. (prod build:
      fresh `/admin` → 302 `/setup` → 200 form; after setup, GET and POST `/setup` → 404, `/admin` → 200)
- [x] Two concurrent setup submissions create exactly one admin row. (two parallel curl POSTs against the prod
      server → one 302 `/admin`, one 404, `select … from admin` → 1 row; unit test "two concurrent setups through
      separate connections leave exactly one row" in `src/db/admin.test.ts`)
- [x] The password is never logged or stored in plain text. The DB holds only the `scrypt$…` string. (admin row
      `scrypt$131072$8$1$…`; grep for the password over `db.sqlite*` and the server log → 0 hits. Nothing in the
      action logs its input, and the form never echoes a password back)
- [x] The form works with JavaScript disabled. (Chrome over CDP with script execution disabled: typed a short
      password → inline "Gebruik minstens 12 tekens." on `setup-password` with `aria-invalid`; valid password →
      lands on `/admin`; revisiting `/setup` → "Pagina niet gevonden". `/setup` is a route action under the JS-free
      public layout)
- [x] Unit tests cover: hash/verify round trip, wrong password fails, tampered hash string fails cleanly (no throw),
      two hashes of the same password differ (salt). (`src/features/auth/password.test.ts`: those four, with seven
      tampering cases including an `N` beyond the 256 MB memory cap; `npm test` 81 passed)
- [x] Live browser check of the setup flow. (Chrome at 1440 and 360 px, NL: centred drawn card with an ink tab,
      two `new-password` fields, the red error box and message at 360 px. Screenshots match the notebook direction)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass; the impeccable detector found
      nothing)

## Notes

- Needs TICKET-PLAT-03, TICKET-UI-02 and TICKET-I18N-01.
- Nothing links to `/setup`. Until setup runs, `/admin` redirects to `/setup` so the owner can find it.
- The 12-character minimum is a default chosen during ticketing, not a design-session decision. Adjust if wanted.
