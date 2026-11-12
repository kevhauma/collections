# TICKET-AUTH-03: Password reset CLI

- **Area:** Auth
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Auth and security](../../technical-design.md#auth-and-security)

## User story

As the owner who forgot the admin password, I want to reset it from a shell on my server, so I regain access without
keeping a recovery secret in environment variables.

## Description

A CLI script that sets a new admin password and logs out every session.

## Current situation (as-is)

- Password hashing (TICKET-AUTH-01) and sessions (TICKET-AUTH-02) exist. A lost password can only be fixed by
  editing the DB by hand.

## Desired result (to-be)

- `scripts/reset-password.ts`, run with plain `node` (the LTS strips TypeScript types natively, so no `tsx`
  dependency):
  - prompts twice for the new password without echoing it, or reads it from stdin when `--stdin` is passed (for
    scripted use)
  - applies the same validation as setup (at least 12 characters)
  - upserts the admin row's hash and deletes all rows in `sessions`
  - prints a one-line confirmation and exits 0, or exits non-zero with the reason
- `npm run reset-password` alias.
- `docs/platform/deploy.md` documents `docker exec -it <container> node scripts/reset-password.ts`.

## UI requirements

- None (CLI only).

## Acceptance criteria

- [x] After a reset, the old password fails, the new one works, and existing sessions are logged out. (against a
      running prod server: `npm run reset-password` → exit 0; the old cookie then gets the login page, the old password
      "Wrong password." (200), the new one 302; test "replaces the hash and logs out every session")
- [x] Running it on an instance without an admin creates the admin, so `/setup` then returns 404. (fresh Docker
      container: `/setup` 200 → reset → `/setup` 404 and login 302; test "creates the admin when setup never ran")
- [x] Too short or mismatched input exits non-zero and changes nothing. (mismatch, short and empty input each exit 1
      with the reason on stderr; the old password and old session keep working afterwards. Test "rejects a short
      password and changes nothing")
- [x] The password never appears in shell history or the process list (no `--password=` argument). (the script
      reads only the `--stdin` flag from argv. The password comes from hidden prompts (readline writing to a silent
      output; on a TTY readline switches to raw mode, so the terminal doesn't echo either) or from stdin. Not
      exercised on a real TTY here: the agent shell has none)
- [x] Works inside the Docker image. (`printf … | docker exec -i <c> npm run -s reset-password` and
      `… node scripts/reset-password.ts --stdin` both reset the password in a freshly built image, which stayed
      healthy. The runtime stage now copies all of `src/` and `scripts/`)
- [x] Unit test covers the core `resetPassword(db, password)` function: updates the hash, clears sessions, rejects
      a short password. (`src/features/auth/reset-password.test.ts`, 3 cases; `npm test` 110 passed. fallow audit →
      pass)

## Notes

- Needs TICKET-AUTH-02. Documenting the command needs TICKET-PLAT-04.
- The runtime image copies only what the server loads (see the `Dockerfile`). Add a `COPY` for `scripts/` (and anything
  the script imports) so `docker compose exec collections npm run reset-password`, as `docs/platform/deploy.md`
  documents it, works inside the container.
