# TICKET-WSH-10: Public pages and home cards for several wishlists

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** changes [technical-design.md § Routes: Public](../../technical-design.md#public-no-client-js);
  revises [TICKET-WSH-04](./TICKET-WSH-04-public-wishlist-page.md), [TICKET-WSH-05](./TICKET-WSH-05-wishlist-on-home.md)
  and [TICKET-WSH-06](./TICKET-WSH-06-collection-reminders.md)

## User story

As a visitor, I want to see each of the owner's public wishlists on its own page and find them all on the home page,
so I can pick the list that fits the occasion.

## Description

Each public wishlist gets its own page at `/wishlist/<slug>`, and the home page shows one card per public wishlist
above the collections. The collection reminders show only on wishlists that have them switched on. The old
`/wishlist` address keeps working by redirecting.

## Current situation (as-is)

- `/wishlist` ([src/routes/public-wishlist.tsx](../../../src/routes/public-wishlist.tsx)) shows the one wishlist,
  404 while private, with the reminders from `listWishlistReminders()`
  ([src/db/collections.ts](../../../src/db/collections.ts)) above the items.
- The home page ([src/routes/home.tsx](../../../src/routes/home.tsx)) shows one full-width `WishlistCard` linking to
  `/wishlist` while it's public.
- `wishlist` is a reserved collection slug ([src/features/collections/slug.ts](../../../src/features/collections/slug.ts)),
  so a collection can't shadow `/wishlist/...`.

## Desired result (to-be)

- `/wishlist/:slug`: that wishlist's page, as `/wishlist` is today, headed by the wishlist's name. A private or
  unknown wishlist answers 404, like a private collection.
- The reminder section shows only when that wishlist has `show_reminders` on.
- `/wishlist`: redirects (302) to the first public wishlist by name; 404 when none is public.
- Home: one full-width card per public wishlist, by name, above the collection cards, each showing its name, first
  image and item count and linking to its page. "Nothing shared yet" only when no wishlist and no collection is public.
- The item post-its' admin links (`itemsBase`) point to the wishlist's admin item route from TICKET-WSH-09.
- Private wishlists are never read on public pages, so their names stay out of the HTML.

## UI requirements

- The cards keep today's `WishlistCard` look. Several of them stack full width; the home page stays readable with
  three.
- Server components only, no JS shipped. 360 px and desktop. Explicit i18n ids (EN + NL) for anything new.

## Acceptance criteria

- [x] Two public wishlists show as two cards on home, each linking to its own page with its own items in rank order.
      (production build, 2026-11-18: home links `/wishlist/verjaardag` and `/wishlist/wishlist` above the Vinyl card;
      `/wishlist/verjaardag` shows Brass lamp then Rug, as ranked in admin)
- [x] A private wishlist has no card, its page answers 404, and its name isn't in the home page HTML. ("Secret
      plans": `/wishlist/secret-plans` → 404, `grep -c Secret` on the home HTML → 0; `listPublicWishlists` /
      `getPublicWishlist` filter `is_public = 1` in SQL)
- [x] Reminders show on a wishlist with reminders on and not on one with them off. (`wishlist` with reminders on
      shows "More wants in my collections" with `/vinyl/want`; `verjaardag` with them off doesn't)
- [x] `/wishlist` redirects to the first public wishlist by name, and answers 404 when none is public. (302 with
      `location: /wishlist/verjaardag` (Verjaardag < Wishlist); 404 before either was public;
      [public-wishlist-first.tsx](../../../src/routes/public-wishlist-first.tsx))
- [x] Empty states: a public wishlist with no items and no reminders shows `EmptyState`; home with nothing public shows
      "Nothing shared yet". (`wishlist` with no items and reminders off: "Nothing on the wishlist yet"; home before
      anything was public: "Nothing shared yet")
- [x] Persistence goes through `src/db/wishlist.ts` and `src/db/collections.ts`. (`listPublicWishlists`,
      `getPublicWishlist`, `listWishlist`, `listWishlistReminders`)
- [x] Unit tests cover: the public listing (public / private, ordering) and the `/wishlist` redirect target (none,
      one, several). (`src/db/wishlist.test.ts` "lists only public wishlists, by name, …";
      `src/routes/public-wishlist-first.test.ts`: 404, one, first by name of several)
- [x] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off. (Orca, dark
      paper: two full-width red-tab wishlist cards stacked above the collection grid at 1440 px and 360 px, page
      scrollWidth 360; each card's links sit in a `nav` named after the wishlist. JS off: the wishlist page's server
      HTML has no module script)
- [x] Verified with the fallow skill and the coding-conventions skill. (`fallow audit --base HEAD`: no dead code,
      complexity or duplication findings)

## Notes

- Needs TICKET-WSH-08 and TICKET-WSH-09.
- Links shared to the old `/wishlist` keep working through the redirect.
