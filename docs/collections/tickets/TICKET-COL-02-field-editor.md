# TICKET-COL-02: Field editor

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Field](../../technical-design.md#field), [technical-design.md § Schema evolution](../../technical-design.md#schema-evolution) (rename, reorder, delete)

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

- [x] All six field types can be added. Labels unique per collection are enforced server-side. (`field-schema.test.ts`
      "accepts a … field" cases and "refuses a label another field has, ignoring case"; live: all six added by form
      post, `ARTIST` refused with "Another field already has this label.")
- [x] Reordering by drag and by buttons both persist, and positions stay dense 1..n. (`fields.test.ts` "moves a field
      and keeps positions dense 1..n"; live: ↑/↓ buttons with JS off and on, and a drag of the 6th row onto the 1st
      saved 1..6 through `moveFieldAction`. The drag was driven by dispatching real `DragEvent`s in Chromium, because
      Orca's `drag` command doesn't start an HTML5 drag; a hand drag with the mouse was not automated)
- [x] Deleting a field removes its key from every item in the same transaction. (`deleteField` in
      `src/db/fields.ts`; `fields.test.ts` "deletes a field, removes its key from every item and closes the gap";
      live: deleting Artist removed key `4` from both items, and the dialog said "2 items have a value…")
- [x] The title field cannot be deleted, made optional or made private, even through a crafted POST. (enforced in the
      SQL of `updateField` / `deleteField`; `fields.test.ts` "never deletes the title field…"; live: crafted edit only
      renamed it, crafted delete answered 400; the UI disables its delete button and toggles)
- [x] Persistence goes through `src/db/fields.ts`. Every action calls `requireAdmin()` and validates with zod.
      (the route action goes through `collectionAction`, which calls `requireAdmin()` first, then `parseNewField` /
      `parseFieldEdit` / zod id schemas; `moveFieldAction` calls `requireAdmin()` and parses with zod. Live: anonymous
      POST 401, malformed id or unknown intent 400. No `prepare(` outside `src/db` except older auth tests)
- [x] Unit tests cover: (`field-schema.test.ts`, `src/lib/order.test.ts`, `src/db/fields.test.ts`)
  - field-schema validation: duplicate label, select without options, duplicate options, options on a non-select
    field
  - `moveInList`: move up, move down, same position, out-of-range clamping
  - field delete removes the JSON key on a temp DB
- [x] Live browser check of add, edit, reorder (drag and buttons) and delete. (Orca browser at 1440 px and 360 px:
      field rows with type, title, required and private badges; the options box shows only for "Choice"; an edit form
      lists the current options; the delete dialog names the field and counts its values; ↑/↓ and the dialog delete
      persist. JS off via form posts, including an edit error that re-opens its `<details>`. Drag: see above. Screens
      match the notebook direction)
- [x] Verified with the fallow skill. (0 complexity findings, 0 duplicates after extracting `collectionAction`;
      `Textarea` is used again. Remaining dead code is from before: `table.tsx`, `popover.tsx`, `formatDate`)

## Notes

- Needs TICKET-COL-01.
- `moveInList` lives in a shared module (e.g. `src/lib/order.ts`) because ranks (ADR 0004) use the same algorithm.
