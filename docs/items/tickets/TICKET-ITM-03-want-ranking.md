# TICKET-ITM-03: Reorder wants (drag or type a rank)

- **Area:** Items
- **Released in:** _unreleased_
- **Traceability:** [design.md § Want ranking](../../design.md#want-ranking), [ADR 0004](../../adr/0004-dense-integer-ranks.md)

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

- [ ] Typing 1 on the 5th want moves it to the top and shifts 1–4 down. Typing 99 moves it to the bottom (clamped).
- [ ] Dragging reorders instantly and persists. A forced server error reverts the optimistic order.
- [ ] Ranks stay dense 1..n after any sequence of moves, creates, deletes and status changes.
- [ ] Rank input reordering works with JavaScript disabled.
- [ ] Unit tests cover:
  - the pure move: up, down, same, clamp below 1, clamp above n
  - integration on a temp DB: 200 random moves, inserts and deletes, then assert ranks are exactly 1..n with no
    duplicates
- [ ] Live browser check of drag and rank input.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-ITM-02. The want tab list itself comes from TICKET-ITM-05; if ITM-05 isn't done yet, build the
  reorderable list first and let ITM-05 wrap it.
- No unique index on `(collection_id, rank)`, deliberately (see ADR 0004).
