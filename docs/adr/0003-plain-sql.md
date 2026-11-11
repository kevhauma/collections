# 0003: Plain SQL on better-sqlite3, no ORM

Status: accepted (2026-11-11)

## Context

About six tables, one process, self-hosted. The learning budget goes to RSC, not an ORM. Most of the interesting
data is in `items.values_json`, which an ORM can't type anyway because its shape is user-defined.

## Decision

- `better-sqlite3` (synchronous, fast, transactions as plain functions) with hand-written SQL.
- Migrations: numbered files `migrations/NNN-name.sql`, applied in order at startup inside a transaction, tracked
  with `PRAGMA user_version`.
- Pragmas at open: `journal_mode = WAL`, `foreign_keys = ON`.
- JSON values are queried with SQLite's built-in `json_extract`, `json_each`, `json_set`, `json_remove`.

## Consequences

- No generated types for rows. Small row types are written by hand next to the queries in `src/db/`.
- Queries that build dynamic `ORDER BY` / filter clauses from field ids must only interpolate **validated integer
  field ids** that belong to the collection. Values always go through parameters.
- `better-sqlite3` is a native module: the Docker image uses a glibc base (`node:*-slim`).
