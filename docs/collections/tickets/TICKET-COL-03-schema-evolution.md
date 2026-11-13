# TICKET-COL-03: Field type changes and select-option edits

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Schema evolution](../../technical-design.md#schema-evolution)

## User story

As the admin, I want to change a field's type or rename and remove select options after I've entered items, so I can
fix my schema without retyping data or silently losing it.

## Description

Schema changes that rewrite item data, each with a preview of what will be converted or blanked before anything
changes.

## Current situation (as-is)

- Fields can be added, renamed, reordered and deleted (TICKET-COL-02), but a field's type and existing options are
  fixed. Items with values exist (TICKET-ITM-02).

## Desired result (to-be)

- `src/features/collections/convert.ts`: ~~`convertValue(value, fromType, toType, options?)`~~
  `convertValue(value, toType)` (the stored JSON type already says what a value was, and select options come from
  the converted values, so neither extra argument was needed) returns either `{ ok: value }` or `{ blank: true }`.
  Rules:
  - `→ text`: anything becomes its string form. Checkbox gives `"true"` / `"false"`.
  - `→ number`: trimmed; `,` or `.` as the decimal separator; must be finite.
  - `→ date`: an ISO `YYYY-MM-DD` that is a real date.
  - `→ checkbox`: `true/false/yes/no/ja/nee/1/0/on/off` (case-insensitive).
  - `→ url`: must parse as an `http:` / `https:` URL.
  - `→ select`: the string form becomes the value. The distinct converted values are added as the field's options.
    When no item has a value there's nothing to turn into an option, so that change is refused with a hint to add a
    new choice field instead (a choice field needs at least one option).
- Type change flow:
  1. The admin picks a new type.
  2. A preview page shows how many values convert and lists the items whose values would be blanked (title + old
     value).
  3. On confirm, one transaction re-runs the conversion (the data may have changed since the preview) and updates
     the field type and the values.
- Rename select option: `json_set` on items whose value equals the old option. The options list is updated in the
  same transaction.
- Remove select option: a preview lists the affected items. On confirm, their value is removed and the option
  dropped. The last option can't be removed, for the same reason.
- The title field may change type only between text-like types (`text`, `url`, `select`), so every item keeps a
  usable title.

## UI requirements

- A "Change type" action on each field row, opening the preview page. The page has a clear "N values will be
  cleared" summary and a danger-styled confirm button.
- Option list in the field edit form with inline rename and a remove button. Remove leads to the same preview
  pattern.

## Acceptance criteria

- [x] Changing text → number converts "12", "12,5" and "12.5" and blanks "abc". The preview lists exactly the
      blanked items. (test "changes text → number, converting 12 / 12,5 / 12.5 and blanking abc"; live: the preview
      of a Pressing field holding those four said "3 values convert. 1 value will be cleared." and listed only
      Pabc / abc)
- [x] Applying re-validates at apply time. An item edited between preview and confirm is converted on its current
      value. (`changeFieldType` runs the plan on the values it reads inside its transaction; test "converts on the
      values at apply time, not at preview time"; live: P12c5 changed to "xyz" after the preview was cleared on
      confirm, while the preview had shown it converting)
- [x] Renaming option "NM" to "Near Mint" updates only items whose value is exactly "NM". (test "renames an option
      and only the values exactly equal to it", where "nm" stays; live: LP → Long Play changed 11 values and the
      option list, EP → Extended Play with JS on changed 4; renaming to an existing option shows "Each option can
      appear only once.")
- [x] Removing an option blanks only matching items and drops the option. (test "removes an option, blanking only
      matching values, and keeps the last option"; live preview "4 items have this value. They will be cleared."
      with their titles)
- [x] Each change runs in one transaction. A failure leaves both the field and the items unchanged. (test "changes
      nothing when the write fails halfway": a write that throws after the field update leaves the type and every
      value as they were; rename and remove are single `db().transaction` calls)
- [x] Persistence goes through `src/db/fields.ts` / `src/db/items.ts`. Every action calls `requireAdmin()`. (all
      SQL is in `fields.ts` (`fieldValues`, `changeFieldType`, `itemsWithOption`, `renameOption`, `removeOption`);
      both new pages' actions are `collectionAction`, and the rename is an intent of the field editor's action.
      The title field only offers text-like types, and a forged `to=number` post answers 400)
- [x] Unit tests cover `convertValue` for every target type, with at least one success and one blank case each,
      plus checkbox words in NL and EN. Option rename and remove are tested on a temp DB.
      (`src/features/collections/convert.test.ts`, incl. `typeChangeProblem`; `src/db/fields.test.ts` § schema
      changes; `npm test` 629 passed)
- [x] Live browser check of a type change and an option rename. (no JS: the flows above as form posts. Orca at
      1440 px: the preview page with the count, the table of values that will be cleared, the export hint and the
      red-pen "Change type and clear 2 values"; at 360 px the option list (rename input, Rename, Remove) fits without
      sideways scroll; rename with JS on. Screens match the notebook direction)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings, after moving the option list's and removal page's conditions into small components)

## Notes

- Needs TICKET-COL-02 and TICKET-ITM-02.
- The export (TICKET-BAK-01) is the undo for destructive changes. The preview page links to it.
- Making a field required doesn't touch data (see design). Existing blanks remain until the item is next edited.
