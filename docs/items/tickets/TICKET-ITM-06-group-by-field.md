# TICKET-ITM-06: Group the item list by a field, in collapsible groups

- **Area:** Items
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** [technical-design.md § Routes](../../technical-design.md#routes), extends [TICKET-ITM-05](./TICKET-ITM-05-collection-views.md) (search, sort, filter)

## User story

As the admin or a visitor, I want to group a collection's items by a field (vinyl by genre, LEGO by theme) into
groups I can fold open and shut, so I can browse a large collection one section at a time.

## Description

A "Group by" control next to the filters that splits the list into one collapsible group per value of the chosen
field. For a text field such as genre, a comma-separated value (`Jazz, Soul`) puts the item in each of those groups.

## Current situation (as-is)

- The list state lives in the query string, parsed by `parseListParams` in
  [src/features/items/list-params.ts](../../../src/features/items/list-params.ts): `view`, `q`, `sort`, `dir` and
  `f.<fieldId>` filters. Only `select` and `checkbox` fields can filter (`filterValues`).
- `itemView` in [src/features/items/view.ts](../../../src/features/items/view.ts) returns one flat, sorted list from
  `listItems` ([src/db/items.ts](../../../src/db/items.ts)).
- `ItemTable` / `ItemGrid` in [src/routes/item-views.tsx](../../../src/routes/item-views.tsx) render that one list.
  The filter controls are in [src/routes/item-toolbar.tsx](../../../src/routes/item-toolbar.tsx), and the page
  wrapper is [src/routes/collection-items.tsx](../../../src/routes/collection-items.tsx).
- A text field is stored as one string, so "Jazz, Soul" can't be told apart from a single value today.

## Desired result (to-be)

- A new list param `group=<fieldId>`, parsed like `sort`: only the collection's own groupable fields count (`select`,
  `checkbox` and `text`, but not the title field), and private fields are left out on public pages. An invalid value
  is dropped and the list shows ungrouped. `listQuery` keeps it in the URL, and `switchTab` carries it over.
- A pure `groupItems(items, field)` in `src/features/items/` splits the already sorted and filtered list:
  - `text`: split on commas, trim each part, drop empty ones, merge case-insensitively (the first spelling seen names
    the group). An item with several values shows in each of its groups.
  - `select`: one group per option, in option order. `checkbox`: "Yes" then "No".
  - Items without a value go into a "No <field label>" group, shown last.
  - Text groups sort alphabetically (locale-aware). Items keep the current sort inside each group.
- Each group renders as `<details open>` with a `<summary>` showing the value and its item count. That makes it
  collapsible without JS, so it works on public pages. Inside, the group uses the current view (table or grid).
- While grouped, want drag-to-reorder is off (`draggable: false`), because a row's position no longer is its rank.
  The rank inputs still work.
- Search and filters apply first, so groups only hold matching items, and empty groups don't show.

## UI requirements

- Toolbar: a "Group by" select ("No grouping" plus the groupable fields) next to the filters, in the same form, so it
  works without JS.
- Group headers read as section headings in the notebook style. They have a visible open/closed marker and a large
  enough tap target at 360 px. The table repeats its column headers per group, or uses one sticky header, whichever
  stays readable at 360 px.
- An item that appears in several groups looks the same in each.

## Acceptance criteria

- [x] On Vinyl, grouping by Genre with items "Jazz, Soul", "jazz" and "Rock" gives the groups Jazz (2), Rock (1) and
      Soul (1). The first item shows under both Jazz and Soul. (Scratch instance, 2026-11-14, a text field "Style"
      with "Jazz, Soul", "jazz", "Rock", "", "Soul, Rock": `/vinyl?group=11` showed Jazz · 2 [Kind of Blue, A Love
      Supreme], Rock · 2, Soul · 2 [Kind of Blue, Revolver], No Style · 1; Kind of Blue is in Jazz and Soul. Test
      "merges values case-insensitively under the first spelling seen, and puts an item in each of its groups".)
- [x] Items with an empty genre appear in a last "No Genre" group. (Pet Sounds, with no Style, in a last "No Style"
      group; test "puts items without a value in a last group".)
- [x] Each group folds open and shut with JS off, on admin and public pages. (`Fold` in `src/ui/fold.tsx` is a native
      `<details open>`. Headless Chrome with scripts disabled, on `/vinyl?group=11` and the admin grid: clicking the
      Rock heading shut it, clicking again opened it.)
- [x] Grouping works with search, filters, sorting, both views and both tabs. The URL holds `group=<id>` and survives
      a tab switch. (`/vinyl?group=11&q=blue` gave Jazz 1, Rock 1, Soul 1; table and grid, have and want, admin and
      public all grouped; the tab links carried `?group=…`; Apply with Group by chosen and JS off loaded
      `…&group=11…`. Test "stays in the URL and carries over to the other tab".)
- [x] `group` with a private field id on a public page, another collection's field id, or junk shows the ungrouped
      list and leaks nothing. (Style made private: `/vinyl?group=11` rendered no groups and none of its values;
      `group=999` and `group=abc` ungrouped. Test "drops a private field on a public page, another collection's
      field and junk".)
- [x] On a grouped want tab there are no drag handles. Rank inputs still reorder. (`reorderable` turns `draggable`
      off when `group` is set. Admin want tab grouped: 0 handles, 3 rank inputs; setting Rumours to 1 saved and the
      page came back grouped. Test "turns dragging off on a grouped want tab, keeping the rank inputs".)
- [x] Public pages still ship no client components. (Grouping and `Fold` are server-rendered; the grouped public page
      has no module script.)
- [x] Unit tests cover `groupItems`: comma splitting and trimming, case-insensitive merging, an item in several groups,
      the no-value group last, select option order, checkbox yes/no, and sort order kept inside a group. They also
      cover `parseListParams` for valid, private, foreign and junk `group` values. (`src/features/items/group.test.ts`,
      6 cases; `list-params.test.ts` "group", 4 cases.)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of grouped table and grid,
      admin and public, at 360 px and desktop, light and dark, JS on and off. (Orca: scrawled group headings with a
      drawn chevron and faded-ink count, each group repeating its table headers, at 360 px light and 1440 px dark;
      folds and headings start and end on grid lines. At 360 px the first build widened the page to 1029 px, fixed by
      `min-w-0` on the fold so each table scrolls inside itself. An item in several groups gets scoped row and dialog
      ids, so the page has no duplicate ids.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: no issues in 14 changed files.)

## Notes

- Needs TICKET-ITM-05 (shipped). Otherwise independent, can ship any time.
- Grouping happens in memory on the already filtered list. That's fine at personal-collection sizes; move it to SQL
  (`json_each` over the split values) only if lists get large.
- Comma splitting applies to every text field when it's the grouping field. A field whose values contain commas that
  aren't separators (e.g. "Crosby, Stills & Nash") would split wrongly. If that bites, add a per-field "several
  values" flag in its own ticket.
- Filtering on one comma-separated value (`f.<genre>=Jazz`) and a per-collection default grouping are left out. Each
  is a small follow-up.
