# TICKET-ITM-03: Reorder wants (drag or type a rank)

- **Area:** Items
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Want ranking](../../technical-design.md#want-ranking), [ADR 0004](../../adr/0004-dense-integer-ranks.md)

## User story

As the admin, I want to put my wants in priority order by dragging them or typing a position, so the people I share
the list with know what I want most.

## Description

Reordering the want list: a rank number input per row (keyboard- and no-JS-friendly), plus drag-and-drop with
optimistic updates. Both use one transactional move.

## Current situation (as-is)

- Wants get rank n+1 on creation, and gaps close on removal (TICKET-ITM-02). Nothing can move a want to another
  rank.
- `moveInList` exists in the shared order module (TICKET-COL-02).

## Desired result (to-be)

- `src/db/items.ts` `moveWant(collectionId, itemId, toRank)`, in one transaction:
  1. clamp `toRank` to 1..n
  2. if moving up, shift `[to, from)` +1; if moving down, shift `(from, to]` −1
  3. set the item's rank
  4. if `from === to`, do nothing
- Action `moveWantAction(itemId, toRank)`: `requireAdmin()`, zod-validated integers, and the item must be a want in
  this collection.
- On the admin want tab, when sorted by rank:
  - each row shows its rank in a small number input inside its own form; changing it and pressing Enter submits,
    no JS needed
  - a drag handle on each row; the list is a client component using native HTML drag events and `useOptimistic` to
    reorder instantly, then calls `moveWantAction`; on failure the order reverts and an error shows
- When the want tab is sorted by another field, the rank inputs and drag handles are hidden, because the visual
  order doesn't match rank.

## UI requirements

- The drag handle has `aria-hidden`, since the rank input is the accessible control. The rank input's label reads
  e.g. "Priority of {title}".
- Drop target indicator while dragging.
- Works on touch devices through the rank input. Touch drag is not required.

## Acceptance criteria

- [x] Typing 1 on the 5th want moves it to the top and shifts 1–4 down. Typing 99 moves it to the bottom (clamped).
      (test "moves the 5th want to the top, and clamps 99 to the bottom"; live without JS: G typed 1 → G, D, B, E, F;
      D typed 99 from `?view=grid` → bottom, redirect back to `/admin/c/vinyl/want?view=grid#item-5`)
- [x] Dragging reorders instantly and persists. A forced server error reverts the optimistic order. (Orca at 1440 px
      with a real mouse drag: the dragged row fades, the drop target gets the highlighter, D moved from #5 to #1 and
      every rank input renumbered after the save. Forced error: a want deleted behind the page's back, then dragged:
      `moveWantAction` threw, the order fell back to the server's and "Couldn't save the new order. Try again."
      showed in red pen)
- [x] Ranks stay dense 1..n after any sequence of moves, creates, deletes and status changes. (test "keeps ranks dense
      1..n through 200 random moves, inserts, deletes and status changes", checking after every step)
- [x] Rank input reordering works with JavaScript disabled. (each rank input is its own `<form method="post">` to the
      list route's `action`; plain posts moved G and D as above; a have, a malformed id and a post without a session
      are refused with 400 / 400 / 401. With JS on, typing 1 for B and pressing Enter gave B, E, D, G)
- [x] Unit tests cover:
  - the pure move: up, down, same, clamp below 1, clamp above n (`moveInList` in `src/lib/order.test.ts`, which
    `moveWant` reuses as ADR 0004 asks)
  - integration on a temp DB: 200 random moves, inserts and deletes, then assert ranks are exactly 1..n with no
    duplicates (`src/db/items.test.ts` § moveWant, seeded; `npm test` 508 passed)
- [x] Live browser check of drag and rank input. (see above. Inputs and handles show only on the want tab sorted by
      rank; sorted by title neither shows. Drag handles also hide when the rows aren't the whole ascending rank order
      (a search, a filter or descending), because a row's position must equal its rank; the rank inputs stay. Grid
      view gets the same inputs and handles. The drag handle is `aria-hidden`; the input is labelled
      "Priority of {title}")
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0 complexity
      findings, after moving the "can it be reordered" rule into the tested `reorderable` and splitting the table
      header out)

## Notes

- Needs TICKET-ITM-02. The want tab list itself comes from TICKET-ITM-05; if ITM-05 isn't done yet, build the
  reorderable list first and let ITM-05 wrap it.
- No unique index on `(collection_id, rank)`, deliberately (see ADR 0004).
