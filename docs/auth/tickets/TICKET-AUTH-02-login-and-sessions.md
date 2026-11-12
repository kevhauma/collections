# TICKET-AUTH-02: Admin login, sessions and request guards

- **Area:** Auth
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Auth and security](../../technical-design.md#auth-and-security)

## User story

As the admin, I want to log in at an unlinked `/admin` and stay logged in on my devices, so I can manage collections
while visitors only ever see public pages.

## Description

Login, logout, DB-backed sessions, the `requireAdmin` guard used by every admin route and action, login rate
limiting, and an Origin check on mutating requests.

## Current situation (as-is)

- An admin row and password helpers exist (TICKET-AUTH-01). The `sessions` table exists (TICKET-PLAT-03).
  Nothing authenticates requests.

## Desired result (to-be)

- `src/features/auth/session.ts`:
  - `createSession()`: 32 random bytes, base64url, sent as cookie `sid` (`HttpOnly`, `SameSite=Lax`, `Secure`
    unless running on plain-http localhost in dev, `Path=/`). The DB stores the SHA-256 of the token and
    `expires_at` = now + 30 days.
  - `getSession()`: looks up by token hash. It renews `expires_at` only when fewer than 15 days remain, which
    avoids a write on every request.
  - `destroySession()`.
  - Expired rows are deleted on startup and on each login.
- `requireAdmin()` reads the session from the request context. It redirects to `/admin` (login) from routes and
  throws an unauthorized error from actions. (Built as: a `GET` without a session gets the redirect, any other method
  a thrown `Response` 401. It must be a real `Response`: React Router re-renders the page with 200 for anything else
  thrown from a server action.) Every admin route and **every** admin server action calls it.
- `/admin`:
  - if no admin exists → redirect to `/setup`
  - if not logged in → login form
  - otherwise → dashboard (filled by TICKET-COL-01)
- Login action:
  - a global in-memory limiter allows 5 failed attempts per rolling minute, then returns "too many attempts, try
    again in a minute" without checking the password
  - a successful login creates a session and redirects to `/admin`
- Logout action (button in the admin header) deletes the session and clears the cookie.
- Express middleware rejects `POST` / `PUT` / `PATCH` / `DELETE` with 403 when an `Origin` header is present and
  doesn't match the host.
- `TRUST_PROXY` is honoured so ~~`req.secure` and `req.ip` are~~ the scheme and host are correct behind the reverse
  proxy: Express's `req.host` for the Origin check, and node-fetch-server's `trustProxy` so `request.url` (used for
  the cookie's `Secure` flag) carries the forwarded scheme. The app never reads the client IP: the limiter is global.

## UI requirements

- Login card with one password field (`autocomplete="current-password"`) and a generic error ("Wrong password")
  that leaks nothing.
- Logout button in `AdminLayout`.

## Acceptance criteria

- [x] Admin routes and actions are unreachable without a valid session. A direct POST to an admin action without a
      cookie fails. (prod build: `/admin` without a cookie shows only the login, no nav or dashboard. Re-posting the
      placeholder server action's no-JS form fields: no cookie → 401, forged `sid` → 401, valid cookie → 200 with
      its result. `requireAdmin()` in `src/features/auth/guard.ts`)
- [x] After 5 wrong passwords within a minute, the 6th attempt is refused even with the right password, and the
      next minute works again. (curl against the prod server: 5 × "Wrong password.", then the right password →
      "Too many attempts. Try again in a minute."; 61 s later the right password → 302 logged in)
- [x] Logging out invalidates the session server-side. Replaying the old cookie fails. (`POST /admin/logout` → 302
      `/admin` with `sid=; Max-Age=0`; `sessions` table → 0 rows; replaying the old cookie → login page on `/admin`
      and 401 on the action)
- [x] A cross-origin POST is rejected with 403. (`Origin: https://evil.example` → 403, locally and in the Docker
      image; same-origin → 200. With `TRUST_PROXY=1`, a request forwarded for `collections.example.org` passes and gets
      a `Secure` cookie; without it the same forwarded headers are ignored → 403)
- [x] Login and logout work with JavaScript disabled. (Chrome over CDP with JS off and with JS on: wrong password →
      inline "Wrong password."; right password → dashboard with nav, "Log out" and a `sid` cookie; Log out → login
      form, cookie gone)
- [x] Unit tests cover: rate limiter window (5 allowed, 6th blocked, reset after 60 s with fake timers), session
      expiry and renewal threshold, token hashing (the DB never stores the raw token), Origin check (match, mismatch,
      absent header). (`src/features/auth/rate-limit.test.ts`, `session.test.ts` (also the `Secure` rule and purging
      expired rows), `src/lib/origin.test.ts`; `npm test` 107 passed, three runs in a row)
- [x] Live browser check of login, a protected page, and logout. (Chrome at 360 px with JS off and 1440 px with JS
      on: login card with the red error box, the dashboard header with the highlighted section and "Log out".
      Screenshots match the notebook direction)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass, after adding `action` to the
      route-module contract names in `.fallowrc.json` `ignoreExports`; the impeccable detector found nothing)

## Notes

- Needs TICKET-AUTH-01.
- The global limiter can let someone lock the admin out for a minute at a time. That's acceptable for a single-owner
  app and much simpler than per-IP tracking.
- "Remember me" is not offered: every session lasts 30 days, sliding.
