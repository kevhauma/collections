# TICKET-ITM-05: Collection views: table, grid, search, sort, filter

- **Area:** Items
- **Released in:** [v1](../../releases/v1/overview.md)
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

- [x] Searching "blue" finds items with "Blue" in any text/url/select field and doesn't match field ids or
      number/date values. (`listItems` searches `json_each` keys in a subquery of the collection's text/url/select
      field ids; test "searches text, url and select values case-insensitively, never field ids, numbers or dates";
      live `?q=blue` → Blue, Blue Train, Kind of Blue)
- [x] Sorting by a number field orders 9 before 10. Empty values sort last in both directions. (test "sorts numbers
      numerically and text case-insensitively, with empty values last both ways"; live `?sort=2` → 9, 10, 1958, 1959,
      1971, then the item without a year, and `dir=desc` keeps it last)
- [x] Filtering by a select option and a checkbox combines (AND) correctly. (test "combines a select and a checkbox
      filter with AND", including an item saved before the checkbox existed counting as "no"; live `?f.4=LP&f.5=yes`
      → Giant Steps, Kind of Blue)
- [x] A foreign or private field id in `sort` / `f.*` is ignored, and with `publicOnly` the private field is never
      searched. (`parseListParams` only knows the collection's own fields and drops private ones when `publicOnly`;
      `listItems` also re-checks them against the public field ids and limits the search scope to `is_public` fields.
      Tests "drops a foreign field id…", "drops a private field for sort and filter when publicOnly", "with
      publicOnly, strips private keys and never searches, sorts or filters on a private field"; live
      `?sort=999&f.999=x&view=nope` renders the default list)
- [x] Changing view keeps `q` / `sort` / filters. The URL alone reproduces the page. (`listQuery` / `switchTab` tests,
      including a round trip; live in Orca: Search "blue" + Signed Yes → Grid link → `?view=grid&q=blue&f.5=yes` with
      both controls still filled; the Want tab link carries `?view=grid&q=blue` and takes its own rank sort)
- [x] Everything works with JavaScript disabled. (the toolbar is a GET form and the view toggle, tabs and sort
      headers are plain links; fetching the exact URL the form submits returns the filtered rows as HTML, and an
      unknown tab answers 404)
- [x] Persistence goes through `src/db/items.ts`. No SQL in route modules. (`grep "prepare(|db()"` finds nothing in
      `src/routes` or `src/features/items`. Field ids are bound as parameters, never interpolated: as strings, since
      better-sqlite3 binds numbers as REAL and `'$."' || 3.0` is the wrong path)
- [x] Unit tests cover:
  - `parseListParams`: valid params; a foreign field id dropped; a private field dropped when `publicOnly`;
    `rank` sort rejected on the have tab; overlong `q` truncated or rejected
    (`src/features/items/list-params.test.ts`; overlong `q` is truncated to 200)
  - `listItems` on a temp DB: search scope, LIKE wildcard escaping (`%` and `_` in `q`), numeric vs text sort,
    nulls last, combined filters, private keys stripped with `publicOnly` (`src/db/items.test.ts` § listItems;
    `npm test` 498 passed)
- [x] Live browser check of both views, search, sort and filters at 360 px and desktop. (Orca at 1440 px: table with
      sortable headers (Title ↑, `aria-sort`), Yes for ticked checkboxes, dates as "Aug 17, 1959", years ungrouped,
      blank post-it thumbnails; grid of post-its with title, ×2 quantities and two fields. At 360 px: toolbar wraps,
      the table scrolls inside its box (610 px in 328 px) while the page doesn't (360 = 360), the grid has 2 columns
      with red ranks on the want post-its. Screens match the notebook direction. Thumbnails stay blank post-its
      until TICKET-ITM-04, which adds the image with `loading="lazy"` and the title as `alt`)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings, after moving the toolbar's filter value helper into `list-params.ts` as `filterInput`)

## Notes

- Needs TICKET-ITM-02. Thumbnails need TICKET-ITM-04 (show a placeholder until then).
- shortcut: no pagination in v1, all matching items render at once. Upgrade to keyset pagination when a collection
  exceeds about 1,000 items or the page feels slow. Not a design-session decision; flagged during ticketing.
- Which fields appear on grid cards (title + first two) is a ticketing default. A per-field "show on card" flag is a
  possible later ticket.
