# TICKET-IMP-01: CSV import with column mapping (v2, needs design)

- **Area:** Import
- **Released in:** _unreleased_ (planned for v2)
- **Traceability:** [design.md § Parked](../../design.md#parked)

## User story

As the admin, I want to upload a CSV (e.g. a Discogs or Rebrickable export) and map its columns onto my collection's
fields, so I can fill a collection in minutes instead of typing hundreds of items.

## Description

Upload a CSV to a collection, map each column to a field (or a new field, or ignore it), preview, and import valid
rows. **The design session deliberately postponed the behaviour decisions.** Run a short design session (the
grilling skill) on the open questions below before implementation, then rewrite the to-be and acceptance criteria.

## Current situation (as-is)

- Items can only be created one at a time through the form (TICKET-ITM-02).
- `buildValuesSchema` (TICKET-ITM-01) can validate a row against a collection's fields.
- `convertValue` parsers (TICKET-COL-03) can coerce loose strings.

## Desired result (to-be)

Settled so far:

- Entry point: an "Import CSV" action on a collection in admin.
- A column mapper (admin client component): each CSV column → an existing field, `status`, `quantity`, `rank`, or
  ignore.
- Uses a CSV parsing library (parsing, unlike writing, isn't worth hand-rolling).

Open questions, with the starting proposals from the design session:

1. **Status, quantity, rank**: mappable targets, or one "import all as have / all as want" choice?
   *Proposal: mappable, defaulting to "all as have" when no status column is mapped.*
2. **Duplicates**: what is a match (title field, or a field the admin picks), and on a match do we skip or update?
   *Proposal: the admin picks the match field (title by default) and chooses skip or update. Never silently
   duplicate.*
3. **Bad values** (e.g. "abc" in a number field): reject the row and report it, or import it with the value blank?
   *Proposal: reject the row and list it (row number + reason) in a summary. Import the rest.*
4. **Unmapped columns**: drop them, or offer "create a new field from this column"?
   *Proposal: one-click "create as new text field".*
5. Not yet discussed: encoding detection (UTF-8 vs Windows-1252), delimiter detection (`,` vs `;`, common in NL
   locales), a max file size or row count, and whether an import can be undone (e.g. tagging items with an
   import id).

## UI requirements

- To be defined after the design session: upload step, mapping step with a preview of the first rows, result
  summary.

## Acceptance criteria

- [ ] Design session held. Open questions 1–5 answered and recorded in this ticket and in `design.md`.
- [ ] To-be and acceptance criteria rewritten from the answers before implementation starts.

## Notes

- Needs TICKET-ITM-01, TICKET-COL-02 and TICKET-COL-03. Planned for v2.
- Mapping presets per source (Discogs, Rebrickable) would pair well with TICKET-IMP-02.
