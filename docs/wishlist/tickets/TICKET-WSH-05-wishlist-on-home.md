# TICKET-WSH-05: Wishlist card at the top of the public home page

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
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

- [x] Public wishlist with items: the card is first on `/`, shows the count, and its link opens `/wishlist`. (production build, 2026-11-15: `/` lists the Wishlist card before Gifts and Wl, its button reads "Wishlist · 3" and links `href="/wishlist"`)
- [x] Private wishlist: `/` shows no card and its HTML has no "wishlist" text or link. (`/` with a private wishlist and a public collection: no case-insensitive `wishlist` in the HTML apart from that collection's own `wishlist-2` slug; `home.tsx` doesn't read the items while private)
- [x] Public wishlist and no public collections: the card shows and the empty state doesn't. (the card showed and "Nothing shared yet" didn't; with neither public, only "Nothing shared yet" showed)
- [x] Persistence goes through `src/db/wishlist.ts`. The page ships no client components. (`isWishlistPublic` / `listWishlist`; `WishlistCard` is a server component in `home.tsx`, no client import)
- [x] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off. (Orca, dark paper: a red-tab `Card` across the full width above the two-column grid, the picture on a clipped post-it (the first item that has an image, as for the OG image) and a primary `LinkButton`, at 1440 px and 360 px (no page-wide scroll). JS off: the page is server HTML with no module script, as before)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD~1`: dead code 0, complexity 0, duplication 0, after splitting `Home` into
      `SharedCards` and `CollectionCard`; all four states rechecked on the rebuilt app)

## Notes

- A public wishlist with no loose items still shows the card, because it can carry collection reminders
  (TICKET-WSH-06).
