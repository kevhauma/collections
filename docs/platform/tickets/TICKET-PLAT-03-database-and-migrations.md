# TICKET-PLAT-03: Database connection, migration runner and initial schema

- **Area:** Platform
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Data model](../../technical-design.md#data-model), [ADR 0003](../../adr/0003-plain-sql.md)

## User story

As the developer, I want the SQLite database opened, migrated and constrained at startup, so every feature reads and
writes a known schema whose invariants are enforced by the database itself.

## Description

Opens `DATA_DIR/db.sqlite` with `better-sqlite3`, applies numbered SQL migrations in order, and ships migration
`001-initial.sql` with the full v1 schema from the design.

## Current situation (as-is)

- Project skeleton from TICKET-PLAT-02, with no database.

## Desired result (to-be)

- ~~`src/db/index.ts`~~ `src/db/connection.ts` (kept from the scaffold, approved 2026-11-12) opens the database (creating `DATA_DIR` if missing) with `journal_mode = WAL` and
  `foreign_keys = ON`, and exports the connection.
- `src/db/migrate.ts` reads `migrations/NNN-*.sql` in numeric order and applies each one above
  `PRAGMA user_version` inside its own transaction, then bumps `user_version`. Runs at server startup before
  listening. A failing migration aborts startup.
- `migrations/001-initial.sql` creates `admin`, `sessions`, `settings` (seeded with `default_locale = 'en'`),
  `collections`, `fields` and `items` exactly as in the design, including:
  - the `items` status/quantity/rank CHECK constraint, ~~exactly as designed~~ with `coalesce(quantity, 0)` /
    `coalesce(rank, 0)`: the designed `quantity >= 1` is NULL for a NULL quantity and CHECK only rejects FALSE, so a
    `have` without a quantity slipped through (design doc updated)
  - `ON DELETE CASCADE` from fields and items to collections
  - indexes on `items(collection_id, status, rank)` and `fields(collection_id, position)`
- Hand-written row types next to the queries ~~here~~: this ticket has no queries, so the first row types arrive
  with the feature repositories. Feature repositories (`src/db/<feature>.ts`) are added by their own
  tickets.

## UI requirements

- None.

## Acceptance criteria

- [x] Starting the server on an empty `DATA_DIR` creates `db.sqlite` at `user_version = 1`. (live: `node src/server.ts --prod` and dev mode on a fresh temp `DATA_DIR` → `db.sqlite` with all six tables, `user_version=1`, `/healthz` 200; startup calls `initDb()` in `src/server.ts` before `listen`)
- [x] Restarting applies nothing (idempotent). (live restart on the same `DATA_DIR` → still `user_version=1`; test "applies nothing on a rerun")
- [x] A migration that fails rolls back and leaves `user_version` unchanged, and the server refuses to start. (live: a temporary `migrations/002-broken.sql` → `SqliteError: no such table: nope`, exit 1, no `Listening` line, `user_version` still 1 and no table `x`; test "rolls back a failing migration…")
- [x] Inserting a `have` item with a rank, or a `want` item with a quantity, is rejected by the CHECK constraint. (`src/db/migrate.test.ts` "items CHECK constraint": also rejects missing/zero quantity or rank and unknown status)
- [x] Deleting a collection cascades to its fields and items. (test "cascades a collection delete to its fields and items"; `foreign_keys = ON` asserted in "creates db.sqlite at user_version 1…")
- [x] Unit tests (temp DB file per test) cover: ordered application, idempotent rerun, rollback on failure,
      CHECK constraint rejections, cascade delete. (`src/db/migrate.test.ts`, temp dir per test; `npm test` 27 passed)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → pass: dead-code 0, complexity 0, dupes 0)

## Notes

- Needs TICKET-PLAT-02.
- Rule from here on: **never edit a shipped migration**. Every schema change is a new numbered file.
- The migrations folder is read from `./migrations` relative to the working directory: the Docker image
  (TICKET-PLAT-04) must copy it.
- `values_json` keys are field ids as strings (`{"12": "Kind of Blue"}`).
