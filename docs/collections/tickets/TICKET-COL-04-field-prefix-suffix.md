# TICKET-COL-04: Field prefix and suffix

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Field](../../technical-design.md#field) (extends it)

## User story

As the admin, I want to give a field an optional prefix and suffix (like "€" or "cm"), so values read with their unit
everywhere without me typing the unit into every item.

## Description

Two optional, display-only texts per field, shown around a field's value in the item views, the public pages and the
item form. Stored values don't change, so sorting, search and conversions keep working on the plain value.

## Current situation (as-is)

- A field has `label`, `type`, `options`, `required`, `is_public` and `position`
  ([src/db/fields.ts](../../../src/db/fields.ts), [migrations/001-initial.sql](../../../migrations/001-initial.sql)).
  There is nowhere to put a unit, so the admin either types "12 cm" into a text field (losing number sort) or keeps
  the unit only in the label.
- Values are rendered by `valueRenderers` / `FieldValue` in
  [src/routes/item-views.tsx](../../../src/routes/item-views.tsx), shared by the admin and public table and grid.
- The item form builds its controls in `controls` in [src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx).
- The field editor parses new fields and edits in
  [src/features/collections/field-schema.ts](../../../src/features/collections/field-schema.ts)
  (`parseNewField`, `parseFieldEdit`).

## Desired result (to-be)

- New migration `migrations/002-field-affixes.sql` adds nullable `prefix TEXT` and `suffix TEXT` to `fields`. The
  shipped `001-initial.sql` is not edited.
- `Field` carries `prefix: string | null` and `suffix: string | null`. Empty input is stored as `NULL`.
- Both are optional, trimmed, at most 20 characters, and allowed on `text`, `number` and `select` fields. Dates,
  checkboxes and URLs have no prefix or suffix.
- `FieldValue` renders `prefix value suffix`, joined by a non-breaking space, only when the value is non-blank. A
  blank value shows nothing (no lone "€").
- The item form shows the prefix and suffix as static text beside the input, not inside the value.
- Prefix and suffix are user-typed content: never translated.
- A type change (TICKET-COL-03) to a type that doesn't allow them clears both in the same transaction.
- Search, sort, filter and the CSV export use the raw value, unchanged. `data.json` in the export includes `prefix` and
  `suffix` per field, so a v2 restore can bring them back.
- The title field may have them too.

## UI requirements

- Field editor: "Prefix" and "Suffix" inputs in the add-field and edit-field forms, shown only for types that allow
  them (and always present without JS, ignored server-side for other types).
- Item table, grid cards and public pages: the value shows with its prefix/suffix.
- Item form: prefix before and suffix after the input, visually tied to it, read by screen readers as part of the
  label (e.g. via `aria-describedby`).

## Acceptance criteria

- [x] Migration 002 adds `prefix` and `suffix` to `fields`. Existing fields read back with both `null`. (migration test
      on a DB at version 1) (`migrations/002-field-affixes.sql`; `src/db/migrate.test.ts` › "002-field-affixes › adds
      prefix and suffix, null for fields that already exist")
- [x] A number field with prefix "€" and suffix "excl." shows "€ 12,5 excl." in the table, grid and public page; a
      blank value shows nothing. (Orca, prod build: admin table and grid "€ 12.5 excl." in EN, public `/shop?view=grid`
      "€ 12,5 excl." in NL; the item without a price shows an empty cell. `FieldValue` in `src/routes/item-views.tsx`)
- [x] A field without prefix or suffix renders exactly as today. (`affixes()` returns empty strings, `affixes.test.ts`;
      Title and Bought cells unchanged in the browser)
- [x] Prefix or suffix over 20 characters is rejected with a field error in EN and NL; whitespace-only becomes `null`.
      (`field-schema.test.ts` › "prefix and suffix"; `fields.error.affix` in `en.json`/`nl.json`; a 21-character
      prefix posted to the add form showed "Keep it to 20 characters or fewer.")
- [x] Prefix/suffix posted for a date, checkbox or URL field is ignored (stored as `null`). (`field-schema.test.ts` ›
      "ignores them on a date/checkbox/url field"; a date field posted with prefix "€" stored `NULL`)
- [x] Changing a number field with a suffix to date clears the suffix; changing it to text keeps it.
      (`fields.test.ts` › "keeps a prefix and suffix through number → text, and clears them going to date";
      `changeFieldType` in `src/db/fields.ts`)
- [x] Sorting a number field with a suffix still sorts numerically; searching "€" doesn't match on the prefix.
      (`items.test.ts`: Year and Format carry affixes in the fixture, the numeric sort test passes, "never matches a
      search on a prefix or suffix"; browser: Price desc gives 12.5, 9, blank; `?q=€` gives no rows)
- [x] The CSV export holds raw values; `data.json` fields include `prefix` and `suffix`. (`export.test.ts` round-trip:
      Paid has "€"/"excl.", the CSV cell stays `12.5`)
- [x] A private field's prefix/suffix never reach a public route (they travel with the field, which is stripped).
      (private "Cost" with prefix "€": the public `/shop` HTML has no "Cost" and no "€ 3"; `itemView` filters fields)
- [x] Persistence goes through `src/db/fields.ts`. Every action calls `requireAdmin()` and validates with zod.
      (`createField`/`updateField` via the existing `collectionAction` intents; `parseNewField`/`parseFieldEdit`)
- [x] Unit tests cover: parsing (trim, empty → null, too long, disallowed type ignored), `FieldValue` with prefix only,
      suffix only, both, blank value, and the type-change clear on a temp DB. (`FieldValue` can't load in vitest
      (Lingui macros), so its logic lives in `src/features/collections/affixes.ts`, tested in `affixes.test.ts`:
      prefix only, suffix only, both, none, and `isBlank`)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the field editor,
      item form and table at 360 px and desktop. (Orca, prod build, 2026-11-13: field editor and item form at 360 px,
      table and grid at the pane's full width (553 px; the pane can't go wider). Prefix/suffix inputs show for text,
      number, select only (`:has()`, checked per type); the item form's `aria-describedby` names the prefix and suffix
      spans. Existing `Input`/`FormField`, no new colours)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → no issues, after splitting `EditAffixes` out
      of `EditField` for complexity)

## Notes

- Needs TICKET-COL-02 (field editor) and TICKET-ITM-05 (views), both shipped. Independent, can ship any time.
- Display-only on purpose: putting the unit in the value would break number sort and type conversions.
- The 20-character cap and the allowed types (text, number, select) are choices in this ticket; widen them here if a
  real case needs it.
