# TICKET-ITM-02: Create, edit and delete items

- **Area:** Items
- **Released in:** _unreleased_
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

- [ ] A form for a collection with all six field types renders and saves correctly.
- [ ] Invalid input re-renders with translated per-field errors and keeps what was typed.
- [ ] Creating a want puts it at the bottom. Switching it to `have` clears its rank and closes the gap. Switching
      back puts it at the bottom again.
- [ ] Deleting a want leaves the remaining ranks dense 1..n.
- [ ] Every write goes through `src/db/items.ts`. No SQL in route modules. Every action calls `requireAdmin()`.
- [ ] Unit tests on a temp DB cover: create have (default quantity 1), create want (rank n+1), want → have (gap
      closed, quantity set), have → want (bottom), delete want (gap closed), a CHECK violation is impossible through
      the repository.
- [ ] Live browser check: create, edit, switch status, delete, with JS on and off.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-ITM-01 and TICKET-COL-02.
- Reordering wants (move to rank r) is TICKET-ITM-03. Images are TICKET-ITM-04. The list views are TICKET-ITM-05.
  Until ITM-05 lands, a bare list of titles is enough to reach the edit form.
- No duplicate detection in v1.
