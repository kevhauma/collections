# TICKET-COL-02: Field editor

- **Area:** Collections
- **Released in:** _unreleased_
- **Traceability:** [design.md § Field](../../design.md#field), [design.md § Schema evolution](../../design.md#schema-evolution) (rename, reorder, delete)

## User story

As the admin, I want to define the fields of each collection (artist and year for vinyl, set number and piece count
for LEGO), so every collection records exactly what matters for it.

## Description

The `/admin/c/:slug/fields` editor: add, edit, reorder and delete fields. It covers the simple schema changes.
Type changes and select-option edits that touch item data are TICKET-COL-03.

## Current situation (as-is)

- Collections exist with one title field (TICKET-COL-01). Nothing else can create fields.

## Desired result (to-be)

- `src/db/fields.ts` repository: `listByCollection` (ordered by position), `create`, `update`, `move`, `delete`.
- `src/features/collections/field-schema.ts`, the zod schema for a field definition:
  - label: 1–100 characters, unique per collection (case-insensitive)
  - type: one of `text`, `number`, `date`, `select`, `checkbox`, `url`
  - options: required and non-empty for `select`, trimmed, unique; absent for other types
  - `required`, `is_public`
- Add field: label, type, required, public, and options for select. New fields go last.
- Edit field:
  - label, `required` and `is_public` can always change
  - select options can be added here (rename and remove are TICKET-COL-03)
  - type is read-only in this ticket
- Reorder: drag-and-drop (client component, native drag events) **and** up/down buttons that work without JS.
  Both use the shared `moveInList` pure function also used for want ranks (TICKET-ITM-03 consumes it).
- Delete: a confirm dialog stating how many items have a value for this field. On confirm, one transaction runs
  `json_remove` of that key on every item and deletes the field.
- Title field: can be renamed; cannot be deleted, made optional or made private. The UI disables those controls,
  and the server enforces it.

## UI requirements

- A list of field rows: label, type badge, required and public indicators, edit / delete / move controls.
- An add-field form with conditional options input (shown for `select` via CSS `:has()`, no JS needed).
- Hint text explaining that private fields never appear on public pages.

## Acceptance criteria

- [ ] All six field types can be added. Labels unique per collection are enforced server-side.
- [ ] Reordering by drag and by buttons both persist, and positions stay dense 1..n.
- [ ] Deleting a field removes its key from every item in the same transaction.
- [ ] The title field cannot be deleted, made optional or made private, even through a crafted POST.
- [ ] Persistence goes through `src/db/fields.ts`. Every action calls `requireAdmin()` and validates with zod.
- [ ] Unit tests cover:
  - field-schema validation: duplicate label, select without options, duplicate options, options on a non-select
    field
  - `moveInList`: move up, move down, same position, out-of-range clamping
  - field delete removes the JSON key on a temp DB
- [ ] Live browser check of add, edit, reorder (drag and buttons) and delete.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-COL-01.
- `moveInList` lives in a shared module (e.g. `src/lib/order.ts`) because ranks (ADR 0004) use the same algorithm.
