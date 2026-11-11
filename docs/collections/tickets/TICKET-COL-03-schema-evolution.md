# TICKET-COL-03: Field type changes and select-option edits

- **Area:** Collections
- **Released in:** _unreleased_
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

- `src/features/collections/convert.ts`: `convertValue(value, fromType, toType, options?)` returns either
  `{ ok: value }` or `{ blank: true }`. Rules:
  - `→ text`: anything becomes its string form. Checkbox gives `"true"` / `"false"`.
  - `→ number`: trimmed; `,` or `.` as the decimal separator; must be finite.
  - `→ date`: an ISO `YYYY-MM-DD` that is a real date.
  - `→ checkbox`: `true/false/yes/no/ja/nee/1/0/on/off` (case-insensitive).
  - `→ url`: must parse as an `http:` / `https:` URL.
  - `→ select`: the string form becomes the value. The distinct converted values are added as the field's options.
- Type change flow:
  1. The admin picks a new type.
  2. A preview page shows how many values convert and lists the items whose values would be blanked (title + old
     value).
  3. On confirm, one transaction re-runs the conversion (the data may have changed since the preview) and updates
     the field type and the values.
- Rename select option: `json_set` on items whose value equals the old option. The options list is updated in the
  same transaction.
- Remove select option: a preview lists the affected items. On confirm, their value is removed and the option
  dropped.
- The title field may change type only between text-like types (`text`, `url`, `select`), so every item keeps a
  usable title.

## UI requirements

- A "Change type" action on each field row, opening the preview page. The page has a clear "N values will be
  cleared" summary and a danger-styled confirm button.
- Option list in the field edit form with inline rename and a remove button. Remove leads to the same preview
  pattern.

## Acceptance criteria

- [ ] Changing text → number converts "12", "12,5" and "12.5" and blanks "abc". The preview lists exactly the
      blanked items.
- [ ] Applying re-validates at apply time. An item edited between preview and confirm is converted on its current
      value.
- [ ] Renaming option "NM" to "Near Mint" updates only items whose value is exactly "NM".
- [ ] Removing an option blanks only matching items and drops the option.
- [ ] Each change runs in one transaction. A failure leaves both the field and the items unchanged.
- [ ] Persistence goes through `src/db/fields.ts` / `src/db/items.ts`. Every action calls `requireAdmin()`.
- [ ] Unit tests cover `convertValue` for every target type, with at least one success and one blank case each,
      plus checkbox words in NL and EN. Option rename and remove are tested on a temp DB.
- [ ] Live browser check of a type change and an option rename.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-COL-02 and TICKET-ITM-02.
- The export (TICKET-BAK-01) is the undo for destructive changes. The preview page links to it.
- Making a field required doesn't touch data (see design). Existing blanks remain until the item is next edited.
