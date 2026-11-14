# TICKET-WSH-05: Wishlist card at the top of the public home page

- **Area:** Wishlist
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** extends [technical-design.md § Routes: Public](../../technical-design.md#public-no-client-js),
  [TICKET-PUB-01](../../sharing/tickets/TICKET-PUB-01-public-index.md)

## User story

As a visitor on the home page, I want the wishlist to be the first thing I see, so I find the general wishlist
before the individual collections.

## Description

When the wishlist is public, the home page shows it as the first, emphasised card, linking to `/wishlist`, above the
collection cards.

## Current situation (as-is)

- [src/routes/home.tsx](../../../src/routes/home.tsx) lists `listPublic()` collections as `Card`s with the collection
  picture and Have / Want link buttons, or `EmptyState` "Nothing shared yet" when there are none.

## Desired result (to-be)

- Public wishlist: a card above the collection grid with the heading "Wishlist", the first item's image (if any), the
  number of items, and a link button to `/wishlist`.
- Visually emphasised over the collection cards: full width, above the grid.
- Private wishlist: no card, and nothing on the page hints that a wishlist exists.
- The "Nothing shared yet" empty state shows only when there's neither a public wishlist nor a public collection.

## UI requirements

- Reuse `Card`, `CollectionPicture` (or the same picture treatment) and `LinkButton`. No client code.
- Explicit i18n ids (EN + NL), e.g. "Wishlist", "Wishlist · {count}".

## Acceptance criteria

- [ ] Public wishlist with items: the card is first on `/`, shows the count, and its link opens `/wishlist`.
- [ ] Private wishlist: `/` shows no card and its HTML has no "wishlist" text or link.
- [ ] Public wishlist and no public collections: the card shows and the empty state doesn't.
- [ ] Persistence goes through `src/db/wishlist.ts`. The page ships no client components.
- [ ] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off.
- [ ] Verified with the fallow skill.

## Notes

- A public wishlist with no loose items still shows the card, because it can carry collection reminders
  (TICKET-WSH-06).
