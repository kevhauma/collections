# TICKET-ITM-05: Collection views: table, grid, search, sort, filter

- **Area:** Items
- **Released in:** _unreleased_
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes), [technical-design.md § Data model](../../technical-design.md#data-model) (search/sort notes), [ADR 0003](../../adr/0003-plain-sql.md)

## User story

As the admin, I want to browse a collection as a table or a cover grid, and search, sort and filter it, so I can find
any item quickly even in a large collection.

## Description

The admin item list with have/want tabs, table and grid views, and server-side search, sort and filter, all driven
by the URL. The query layer and the view components are built to be reused read-only by the public pages
(TICKET-PUB-02).

## Current situation (as-is)

- Items exist with values, status and images (TICKET-ITM-02, TICKET-ITM-04). There is no real list view.

## Desired result (to-be)

- `src/features/items/list-params.ts`: `parseListParams(searchParams, fields, { publicOnly })`, zod-validated:
  - `view`: `table` / `grid`, default = the collection's `default_view`
  - `q`: at most 200 characters
  - `sort`: `rank` (want tab only), `created`, or a field id **belonging to this collection**
  - `dir`: `asc` / `desc`
  - `f.<fieldId>`: filters, only for `select` (equals option) and `checkbox` (`yes` / `no`) fields
  - when `publicOnly`, private fields are rejected for sort, filter **and** search, so public visitors can't probe
    hidden values
  - invalid params are dropped, never an error page
- `src/db/items.ts` `listItems({ collectionId, status, q, sort, dir, filters, publicOnly })`:
  - search: `EXISTS (SELECT 1 FROM json_each(values_json) WHERE key IN (<text/url/select field ids>) AND value LIKE ? ESCAPE '\')`,
    case-insensitive
  - sort: `json_extract(values_json, '$."<id>"')` with nulls last. Numbers sort numerically and text uses
    `COLLATE NOCASE`. Field ids are interpolated only after validation; values always go through parameters.
  - want tab default sort: `rank asc`. Have tab default: title asc.
  - `publicOnly`: private field keys are stripped from each returned row's values before leaving the repository
- Routes: `/admin/c/:slug` (have) and `/admin/c/:slug/want`, using `TabLinks` with counts.
- `ItemTable`: thumbnail, columns per field in position order, quantity (have) or rank (want), sortable headers as
  links (`aria-sort`).
- `ItemGrid`: cards with thumbnail (or placeholder), title, and the first two non-title fields.
- Toolbar: a GET form with search input, one filter control per select/checkbox field, a view toggle (links) and a
  reset link. Works without JS.
- Both components take a `mode: 'admin' | 'public'`. Admin adds edit links and the reorder controls from
  TICKET-ITM-03; public renders read-only.
- Empty states: "No items yet" (with an add button in admin) vs "No items match your search" (with a reset link).

## UI requirements

- Table scrolls horizontally inside its container on narrow screens, never the page.
- Grid: responsive columns (2 at 360 px, more on wider screens), lazy-loaded thumbnails (`loading="lazy"`), item title
  as `alt`.
- The active sort, filters and search stay visible and are preserved when switching view or tab.

## Acceptance criteria

- [ ] Searching "blue" finds items with "Blue" in any text/url/select field and doesn't match field ids or
      number/date values.
- [ ] Sorting by a number field orders 9 before 10. Empty values sort last in both directions.
- [ ] Filtering by a select option and a checkbox combines (AND) correctly.
- [ ] A foreign or private field id in `sort` / `f.*` is ignored, and with `publicOnly` the private field is never
      searched.
- [ ] Changing view keeps `q` / `sort` / filters. The URL alone reproduces the page.
- [ ] Everything works with JavaScript disabled.
- [ ] Persistence goes through `src/db/items.ts`. No SQL in route modules.
- [ ] Unit tests cover:
  - `parseListParams`: valid params; a foreign field id dropped; a private field dropped when `publicOnly`;
    `rank` sort rejected on the have tab; overlong `q` truncated or rejected
  - `listItems` on a temp DB: search scope, LIKE wildcard escaping (`%` and `_` in `q`), numeric vs text sort,
    nulls last, combined filters, private keys stripped with `publicOnly`
- [ ] Live browser check of both views, search, sort and filters at 360 px and desktop.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-ITM-02. Thumbnails need TICKET-ITM-04 (show a placeholder until then).
- shortcut: no pagination in v1, all matching items render at once. Upgrade to keyset pagination when a collection
  exceeds about 1,000 items or the page feels slow. Not a design-session decision; flagged during ticketing.
- Which fields appear on grid cards (title + first two) is a ticketing default. A per-field "show on card" flag is a
  possible later ticket.
