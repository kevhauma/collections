# TICKET-WSH-04: Public `/wishlist` page

- **Area:** Wishlist
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** extends [technical-design.md § Routes: Public](../../technical-design.md#public-no-client-js) and
  [§ Slugs](../../technical-design.md#slugs), [TICKET-PUB-02](../../sharing/tickets/TICKET-PUB-02-public-collection-pages.md)

## User story

As a visitor, I want to open one wishlist link on my phone and see what the owner wants most, so I can pick a gift
without going through every collection.

## Description

The public page for the wishlist at `/wishlist`: the ranked loose items, laid out like a collection's public want
list. It returns 404 while the wishlist is private.

## Current situation (as-is)

- Public routes in [src/routes.ts](../../../src/routes.ts): `/` (home), `/setup` and `/:slug/:tab?`
  (public-collection). Static paths rank before `:slug`.
- [src/routes/public-collection.tsx](../../../src/routes/public-collection.tsx) renders the want tab with the views
  from [src/routes/item-views.tsx](../../../src/routes/item-views.tsx): rank, thumbnail (falling back to the
  collection's default item image, COL-08) and a title that links out (COL-09). Its `LinkPreview` writes the
  `og:title` / `og:image` tags.
- Reserved slugs are in `reservedSlugs` ([src/features/collections/slug.ts](../../../src/features/collections/slug.ts)):
  admin, setup, uploads, api, locale, theme, assets. `wishlist` isn't one, so a collection could take that slug
  today.

## Desired result (to-be)

- A static `/wishlist` route in the public layout, before `:slug/:tab?`. A server component with no client code.
- Private wishlist → 404, the same not-found page as a private collection.
- Public: the heading "Wishlist", then the items in rank order. Each shows the rank, the image, the title (a link to
  the item's link with `rel="noreferrer"` when there is one, plain text otherwise), price and note. It looks like the
  public want list; reuse its card and rank components rather than building a parallel set.
- `wishlist` joins `reservedSlugs`. A new migration renames an existing collection with slug `wishlist` to the first
  free `wishlist-N`, so it stays reachable under a new address.
- Open Graph: `og:title` "Wishlist" and `og:image` from the first ranked item with an image.
- No items → `EmptyState`. TICKET-WSH-06 later adds the collection reminders above the list and refines this.
- [technical-design.md](../../technical-design.md) § Routes: Public and § Slugs list the route and the reserved word.

## UI requirements

- Works without JavaScript and at 360 px. Rank order is obvious at a glance.
- An item without an image shows the same empty thumbnail a collection item gets when its collection has no default
  image.
- Explicit i18n ids (EN + NL) for the heading, empty state and OG text.

## Acceptance criteria

- [ ] With the wishlist private, `/wishlist` returns 404 and its HTML holds no wishlist content.
- [ ] Public, the items appear in rank order. A title with a link opens it (`rel="noreferrer"`); one without is plain
      text.
- [ ] Creating or renaming a collection to `wishlist` is refused as reserved. A DB with a `wishlist` collection
      migrates to `wishlist-2` (or the next free number), and that collection's pages work under the new slug.
- [ ] The page's OG tags name "Wishlist" and use the first item image.
- [ ] Persistence goes through `src/db/wishlist.ts`. The page ships no client components.
- [ ] Unit tests cover: the reserved slug in `slug.test.ts` / `validation.test.ts`, and the rename migration (with and
      without an existing `wishlist` collection, and with `wishlist-2` already taken).
- [ ] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off.
- [ ] Verified with the fallow skill.

## Notes

- Visitors can't claim items ("I'm getting this"), by decision. That's a separate ticket if a double gift ever happens.
- A wishlist-level default image is out of scope.
