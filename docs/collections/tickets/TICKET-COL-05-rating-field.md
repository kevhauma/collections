# TICKET-COL-05: Rating field

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Field](../../technical-design.md#field) (new type), [technical-design.md § Schema evolution](../../technical-design.md#schema-evolution)

## User story

As the admin, I want a rating field with my own maximum and symbol (like 5 ★ or 10 🍺), so I can score items at a
glance and sort by how much I like them.

## Description

A seventh field type, `rating`: a whole number from 1 to the field's maximum, shown as a row of symbols. The maximum
and the symbol are set per field in the field editor.

## Current situation (as-is)

- Field types are `text`, `number`, `date`, `select`, `checkbox`, `url` (`fieldTypes` in
  [src/db/fields.ts](../../../src/db/fields.ts)). Per-field config is only `options_json`, for select.
- A rating today is a number field (no range, shown as a bare number) or a select with options "1".."5" (sorts as
  text, so "10" comes before "2").
- Each type has an entry in: the item schema ([src/features/items/schema.ts](../../../src/features/items/schema.ts)),
  the converters ([src/features/collections/convert.ts](../../../src/features/collections/convert.ts)), the field
  parser ([src/features/collections/field-schema.ts](../../../src/features/collections/field-schema.ts)), the form
  controls ([src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx)), the renderers
  ([src/routes/item-views.tsx](../../../src/routes/item-views.tsx)) and the type labels
  ([src/routes/field-rows.tsx](../../../src/routes/field-rows.tsx)). All are `Record<FieldType, …>`, so the compiler
  points at every place a new type must reach.

## Desired result (to-be)

- `rating` added to `fieldTypes`. A new numbered migration adds nullable `rating_max INTEGER` and
  `rating_symbol TEXT` to `fields` (the shipped migrations are not edited). Both are `null` for every other type.
- Field config, set when adding the field and editable later:
  - **Max:** a whole number from 2 to 10, default 5.
  - **Symbol:** exactly one character as the user sees it (one grapheme, so emoji like 🍺 or ❤️ count as one), default
    `★`. User-typed, never translated.
- Stored value: a JSON integer from 1 to max. No rating is a blank value, as for every other type. No half ratings.
- Item validation: an integer within 1..max, else an error in EN and NL.
- Display: `max` symbols, the first `value` drawn in ink, the rest faded (e.g. ★★★★☆ as the same symbol, two
  shades), with the text "4 of 5" for screen readers. A blank value shows nothing.
- Sort: numeric (the stored value is a number). Search skips it, like numbers.
- Lowering the max is refused while any item holds a higher value. The error says how many items, so the admin can
  re-rate them first. Raising it is always allowed.
- Changing the symbol touches no item data.
- Type changes (TICKET-COL-03):
  - `→ rating`: an integer value from 1 to 5 converts; anything else blanks. The field gets max 5 and `★`, changeable
    afterwards.
  - `rating →`: number keeps the value, text and select get its string form ("4"), other types follow the existing
    rules. `rating_max` and `rating_symbol` are cleared in the same transaction.
- The title field can't be a rating (it stays text-like).
- Export: `data.json` fields include `ratingMax` and `ratingSymbol`; CSV cells hold the plain number.
- Public pages show it like any field and respect `is_public`.

## UI requirements

- Field editor: "Rating" in the type list; "Maximum" (number input) and "Symbol" (short text input) shown for that
  type, with the defaults filled in.
- Item form: a radio group in a `fieldset` with the field label as `legend`: one radio per value drawn as symbols,
  plus "No rating" to clear it. Works without JS, with the keyboard (arrow keys), and announces "3 of 5".
- Table, grid card and public pages: the row of symbols.

## Acceptance criteria

- [x] A rating field with max 10 and `🍺` saves, and an item rated 7 shows seven ink and three faded 🍺 in the table,
      grid and public page. (Orca, prod build: "Score" added through the field editor stored `rating_max` 10 and 🍺;
      Lamp rated 7 renders `role="img"` "7 of 10" with 7 ink + 3 faded symbols in the admin table, the public table
      and the public grid; `Rating` in `src/ui/rating.tsx`)
- [x] Max outside 2..10, a non-integer max, an empty symbol and a two-character symbol are rejected with field errors
      in EN and NL; `❤️` and `🍺` are accepted as one symbol. (`field-schema.test.ts` › "rating config"; ids
      `fields.error.ratingMax` / `fields.error.ratingSymbol` in both catalogs; browser: max 11 + "ab" showed both
      errors under their inputs)
- [x] Item values 0, max + 1, 2.5 and "abc" are rejected; a blank value saves as no rating. (`schema.test.ts` ›
      "rating values"; no-JS multipart posts of 0, 11, 2.5 and abc each answered "Pick one of the ratings.")
- [x] Sorting by the rating orders 2 before 10, ascending and descending. (`items.test.ts` › "sorts a rating
      numerically"; browser `?sort=6`: Table 2, Lamp 7, Chair 10 and the reverse)
- [x] Lowering max from 10 to 5 with an item at 7 is refused, naming one item; with all items ≤ 5 it saves.
      (`fields.test.ts` › "a rating's maximum"; `updateField` refuses in its own `where`, so it holds under a
      concurrent edit. Browser: "2 items are rated above 5. Re-rate them first.", then with one left "1 item heeft een
      score boven 5…" (NL), then saved after re-rating)
- [x] Changing number → rating converts 1..5 and blanks 0, 6 and 3.5, shown in the preview; rating → number keeps the
      values; rating → text gives "4". (`convert.test.ts`; `fields.test.ts` › "gives a field changed to a rating 5 and
      ★"; preview of Height → Rating: "1 value converts. 2 values will be cleared." listing 40 and 90)
- [x] Private rating fields never reach a public route, config included. (Score made private: `/shop`, grid, want
      and `/` HTML contain no "Score", no 🍺 and no `ratingMax`)
- [x] Persistence goes through `src/db/fields.ts` / `src/db/items.ts`. Every action calls `requireAdmin()` and
      validates with zod. (`createField`, `updateField`, `countRatedAbove`, `changeFieldType`; existing
      `collectionAction` routes; `parseNewField` / `parseFieldEdit` / `buildValuesSchema`)
- [x] Unit tests cover: the field parser (defaults, max bounds, grapheme count of the symbol), the item schema
      (bounds, non-integer, blank), `convertValue` to and from `rating`, the lower-max refusal on a temp DB, and the
      migration on a version-1 DB. (`field-schema.test.ts`, `schema.test.ts`, `convert.test.ts`, `fields.test.ts`,
      `migrate.test.ts` › "003-field-rating")
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the field editor,
      the item form (keyboard and JS off) and the table at 360 px and desktop. (Orca, 2026-11-13, 360 px and the pane's
      553 px max: radios named "1 of 10" … "10 of 10", ArrowDown ×7 from "No rating" selects 7 with the dashed focus
      ring; JS off = plain multipart posts. Ten symbols overflowed a grid card at 360 px, fixed with `wrap-anywhere`;
      page `scrollWidth` 360. Ink/faded via opacity, no new colours)
- [x] Verified with the fallow skill. (`npx fallow@3.42.0 audit --base HEAD` → no issues, after unexporting
      `graphemeCount` and splitting `GroupError` / `textOf` out for complexity)

## Notes

- Needs TICKET-COL-03 (type changes), shipped. Independent, can ship any time. If TICKET-COL-04 (prefix/suffix) ships
  first, rating is not one of its allowed types; if both are in flight, whichever lands second takes the next
  migration number.
- Grapheme count via `Intl.Segmenter`, already in the platform; no dependency.
- Left out: filtering by rating (e.g. "3 and up"), half ratings, a different symbol for empty. Each can be its own
  ticket.
- The 2..10 range and the refuse-don't-clamp rule for lowering max are choices in this ticket.
