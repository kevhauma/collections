# TICKET-ITM-01: Item schema builder

- **Area:** Items
- **Released in:** _unreleased_
- **Traceability:** [design.md § Item](../../design.md#item), [design.md § Stack](../../design.md#stack) (Validation row)

## User story

As the developer, I want one function that turns a collection's field definitions into a zod schema, so item
validation is identical on the server, in the admin form, and later in the CSV import.

## Description

A pure module that builds item validation from field definitions and parses form data into a typed item input. It
contains no UI and no DB access.

## Current situation (as-is)

- Field definitions exist (TICKET-COL-02). No item validation exists.

## Desired result (to-be)

- `src/features/items/schema.ts`:
  - `buildValuesSchema(fields)`: a zod object keyed by field id (string). Per type:
    - `text`: trimmed, max 2000 characters
    - `number`: accepts a number or a numeric string (`,` or `.` decimal), finite
    - `date`: `YYYY-MM-DD` and a real date
    - `select`: one of the field's options
    - `checkbox`: boolean; from form data, `"on"` → true, absent → false
    - `url`: an `http:` / `https:` URL
  - Required fields must be non-empty. For optional fields an empty string becomes absent, so the key is omitted
    from `values_json`.
  - Unknown keys are stripped. Keys of deleted fields are ignored.
  - `itemStatusSchema`: a discriminated union, either `{ status: 'have', quantity: int 1..9999 (default 1) }` or
    `{ status: 'want' }`. Rank is never accepted from the item form; ranking is TICKET-ITM-03.
  - `parseItemForm(formData, fields)`: reads `f.<fieldId>` inputs plus `status` / `quantity` and returns
    `{ success, data } | { success: false, errors }`.
- Validation messages are i18n ids (e.g. `validation.required`, `validation.number`), never raw zod English. The
  caller translates them (server actions through `actionI18n()`).

## UI requirements

- None (pure logic). TICKET-ITM-02 renders the errors.

## Acceptance criteria

- [ ] One schema module is imported by both server actions and (optionally) admin client components, with no
      server-only imports inside.
- [ ] Every error maps to an i18n id that exists in both catalogs.
- [ ] Unit tests cover, per type, a valid value, an invalid value and an empty value (required vs optional). They
      also cover: quantity bounds and default, unknown keys stripped, values for deleted fields ignored, checkbox
      absent → false, `"12,5"` → 12.5.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-COL-02 (field definition types).
- TICKET-COL-03's `convertValue` is deliberately more lenient: it converts existing data rather than validating new
  input. Share the low-level parsers (number, date, URL) between the two.
- TICKET-IMP-01 (CSV import) will reuse `buildValuesSchema` per row.
