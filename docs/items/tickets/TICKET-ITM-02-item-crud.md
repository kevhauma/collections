# TICKET-ITM-02: Create, edit and delete items

- **Area:** Items
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Item](../../technical-design.md#item), [technical-design.md § Want ranking](../../technical-design.md#want-ranking) (insert / remove rules), [ADR 0004](../../adr/0004-dense-integer-ranks.md)

## User story

As the admin, I want to add items to a collection through a form built from its fields, and mark each one as owned
(with how many) or wanted, so my collection and wish list stay up to date.

## Description

The item form (new and edit) rendered declaratively from field definitions, the save and delete actions, and the
rank bookkeeping that status changes require.

## Current situation (as-is)

- Collections, fields (TICKET-COL-02) and the item schema builder (TICKET-ITM-01) exist. The `items` table is empty
  and nothing writes to it.

## Desired result (to-be)

- `src/db/items.ts` repository: `get`, `create`, `update`, `delete`, plus rank bookkeeping:
  - `appendWant(collectionId)` returns n+1 (inserted at the bottom)
  - `closeRankGap(collectionId, rank)` shifts every rank above it down by one
  - status changes run inside the same transaction as the item write:
    - `have → want`: quantity null, rank = n+1
    - `want → have`: rank null, close the gap, quantity from the form
    - deleting a want closes the gap
- Form (`/admin/c/:slug/items/new`, `/admin/c/:slug/items/:id`):
  - one control per field in position order, chosen by a declarative `type → component` map: `text` → `Input`,
    `number` → `Input type=number step=any`, `date` → `Input type=date`, `select` → `Select`, `checkbox` →
    `Checkbox`, `url` → `Input type=url`
  - required fields are marked
  - status radio (`have` / `want`); quantity input shown only when `have` is selected, via CSS `:has()`, no JS
  - the new-item form preselects the tab you came from (`?status=want`)
- Save action: `requireAdmin()` → `parseItemForm` → repository. Errors re-render the form with per-field messages
  and preserve the entered values. Success redirects to the list tab matching the item's status.
- Delete: a confirm dialog, then repository delete (and image files once TICKET-ITM-04 exists).

## UI requirements

- Form built with `FormField`. Required fields are marked with an asterisk and a visually hidden "required".
- The error summary at the top of the form links to each invalid field.
- Works fully without JavaScript.

## Acceptance criteria

- [x] A form for a collection with all six field types renders and saves correctly. (`src/routes/admin-item.tsx`
      `controls` map; a "Vinyl" collection with text, number, date, select, checkbox and url fields saved "Kind of
      Blue" with all six values, and its edit form showed each one back: number 1959, date 1959-08-17, LP selected,
      checkbox checked, the URL)
- [x] Invalid input re-renders with translated per-field errors and keeps what was typed. (a post with a blank title,
      "abc", 2023-02-30, an unknown option, `javascript:x` and quantity 0 re-rendered with 6 `aria-invalid` controls,
      the red "Check these fields:" summary linking to each, and every typed value echoed; in Dutch with the `nl`
      locale cookie ("Controleer deze velden: … Vul dit in."). Same in Orca with JS on: Year 1971 and Want kept)
- [x] Creating a want puts it at the bottom. Switching it to `have` clears its rank and closes the gap. Switching
      back puts it at the bottom again. (live, DB read after each post: wants A#1 B#2 C#3 D#4 → B to have ×3 →
      A#1 C#2 D#3, B have ×3 → B back to want → B#4; in Orca a new want "Blue" landed at #4 then moved to Have ×2)
- [x] Deleting a want leaves the remaining ranks dense 1..n. (live: deleting A left C#1 D#2 B#3; in Orca deleting
      C through the dialog left D#1 B#2)
- [x] Every write goes through `src/db/items.ts`. No SQL in route modules. Every action calls `requireAdmin()`.
      (`grep "prepare(|db()"` finds nothing in `src/routes` or `src/features/items`; the item action is
      `collectionAction`, which calls `requireAdmin()` first: a delete post without a session answers 401, an unknown
      or malformed item id answers 404, and every repository statement is scoped to the collection (unit test)
- [x] Unit tests on a temp DB cover: create have (default quantity 1), create want (rank n+1), want → have (gap
      closed, quantity set), have → want (bottom), delete want (gap closed), a CHECK violation is impossible through
      the repository. (`src/db/items.test.ts`: those six cases, plus "a want that stays a want keeps its rank" and
      "only touches items of the given collection"; `npm test` 447 passed)
- [x] Live browser check: create, edit, switch status, delete, with JS on and off. (JS off: every flow as plain form
      posts against the dev server, answers 302 to the matching tab (`/admin/c/vinyl/want#item-2`, `…/vinyl#item-3`)
      or 200 with errors. JS on: Orca browser at 1440 px and 360 px: "+ Add item" from the Want tab preselects Want
      and hides "How many"; picking Have shows it (CSS `:has()`); the red-pen error summary; the delete dialog names
      the item. No console errors. Screens match the notebook direction: drawn boxes, red pen only for errors and
      Delete. The admin list is still a bare list of titles until TICKET-ITM-05)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings, after splitting the item action into `save` / `remove` intents and the form into small
      components to clear five CRAP findings)

## Notes

- Needs TICKET-ITM-01 and TICKET-COL-02.
- Reordering wants (move to rank r) is TICKET-ITM-03. Images are TICKET-ITM-04. The list views are TICKET-ITM-05.
  Until ITM-05 lands, a bare list of titles is enough to reach the edit form.
- No duplicate detection in v1.
