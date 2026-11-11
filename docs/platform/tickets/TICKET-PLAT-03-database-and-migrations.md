# TICKET-PLAT-03: Database connection, migration runner and initial schema

- **Area:** Platform
- **Released in:** _unreleased_
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

- `src/db/index.ts` opens the database (creating `DATA_DIR` if missing) with `journal_mode = WAL` and
  `foreign_keys = ON`, and exports the connection.
- `src/db/migrate.ts` reads `migrations/NNN-*.sql` in numeric order and applies each one above
  `PRAGMA user_version` inside its own transaction, then bumps `user_version`. Runs at server startup before
  listening. A failing migration aborts startup.
- `migrations/001-initial.sql` creates `admin`, `sessions`, `settings` (seeded with `default_locale = 'en'`),
  `collections`, `fields` and `items` exactly as in the design, including:
  - the `items` status/quantity/rank CHECK constraint
  - `ON DELETE CASCADE` from fields and items to collections
  - indexes on `items(collection_id, status, rank)` and `fields(collection_id, position)`
- Hand-written row types next to the queries. Feature repositories (`src/db/<feature>.ts`) are added by their own
  tickets.

## UI requirements

- None.

## Acceptance criteria

- [ ] Starting the server on an empty `DATA_DIR` creates `db.sqlite` at `user_version = 1`.
- [ ] Restarting applies nothing (idempotent).
- [ ] A migration that fails rolls back and leaves `user_version` unchanged, and the server refuses to start.
- [ ] Inserting a `have` item with a rank, or a `want` item with a quantity, is rejected by the CHECK constraint.
- [ ] Deleting a collection cascades to its fields and items.
- [ ] Unit tests (temp DB file per test) cover: ordered application, idempotent rerun, rollback on failure,
      CHECK constraint rejections, cascade delete.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-PLAT-02.
- Rule from here on: **never edit a shipped migration**. Every schema change is a new numbered file.
- `values_json` keys are field ids as strings (`{"12": "Kind of Blue"}`).
