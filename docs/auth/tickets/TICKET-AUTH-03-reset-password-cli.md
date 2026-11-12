# TICKET-AUTH-03: Password reset CLI

- **Area:** Auth
- **Released in:** _unreleased_
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

- [ ] After a reset, the old password fails, the new one works, and existing sessions are logged out.
- [ ] Running it on an instance without an admin creates the admin, so `/setup` then returns 404.
- [ ] Too short or mismatched input exits non-zero and changes nothing.
- [ ] The password never appears in shell history or the process list (no `--password=` argument).
- [ ] Works inside the Docker image.
- [ ] Unit test covers the core `resetPassword(db, password)` function: updates the hash, clears sessions, rejects
      a short password.

## Notes

- Needs TICKET-AUTH-02. Documenting the command needs TICKET-PLAT-04.
- The runtime image copies only what the server loads (see the `Dockerfile`). Add a `COPY` for `scripts/` (and anything
  the script imports) so `docker compose exec collections npm run reset-password`, as `docs/platform/deploy.md`
  documents it, works inside the container.
