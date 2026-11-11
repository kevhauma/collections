# TICKET-AUTH-02: Admin login, sessions and request guards

- **Area:** Auth
- **Released in:** _unreleased_
- **Traceability:** [design.md § Auth and security](../../design.md#auth-and-security)

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
  throws an unauthorized error from actions. Every admin route and **every** admin server action calls it.
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
- `TRUST_PROXY` is honoured so `req.secure` and `req.ip` are correct behind the reverse proxy.

## UI requirements

- Login card with one password field (`autocomplete="current-password"`) and a generic error ("Wrong password")
  that leaks nothing.
- Logout button in `AdminLayout`.

## Acceptance criteria

- [ ] Admin routes and actions are unreachable without a valid session. A direct POST to an admin action without a
      cookie fails.
- [ ] After 5 wrong passwords within a minute, the 6th attempt is refused even with the right password, and the
      next minute works again.
- [ ] Logging out invalidates the session server-side. Replaying the old cookie fails.
- [ ] A cross-origin POST is rejected with 403.
- [ ] Login and logout work with JavaScript disabled.
- [ ] Unit tests cover: rate limiter window (5 allowed, 6th blocked, reset after 60 s with fake timers), session
      expiry and renewal threshold, token hashing (the DB never stores the raw token), Origin check (match, mismatch,
      absent header).
- [ ] Live browser check of login, a protected page, and logout.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-AUTH-01.
- The global limiter can let someone lock the admin out for a minute at a time. That's acceptable for a single-owner
  app and much simpler than per-IP tracking.
- "Remember me" is not offered: every session lasts 30 days, sliding.
