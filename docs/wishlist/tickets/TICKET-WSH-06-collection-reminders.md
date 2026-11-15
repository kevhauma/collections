# TICKET-WSH-06: Collection want-list reminders on the wishlist, with a per-collection opt-out

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** extends [technical-design.md § Collection](../../technical-design.md#collection) and
  [§ Routes: Public](../../technical-design.md#public-no-client-js), [TICKET-COL-01](../../collections/tickets/TICKET-COL-01-collection-management.md)

## User story

As a visitor on the wishlist, I want to be reminded that the owner also keeps want lists per collection, so I can
look there too without the wishlist being swamped by every collection want.

## Description

Above the ranked loose items, the wishlist shows a small card for each public collection with wants, linking to that
collection's want tab. Collection wants are usually too many for a wishlist, so the cards point to them instead of
listing them. Each collection can opt out.

## Current situation (as-is)

- `listPublic()` in [src/db/collections.ts](../../../src/db/collections.ts) returns public collections with their
  have and want counts and picture. The home page ([src/routes/home.tsx](../../../src/routes/home.tsx)) renders them
  with `CollectionPicture`.
- Collection settings ([src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx))
  hold name, slug, public toggle, default view and sort, title link and default item image.
- The public wishlist page (TICKET-WSH-04) shows only loose items.

## Desired result (to-be)

- A new numbered migration adds `collections.show_on_wishlist INTEGER NOT NULL DEFAULT 1`. `Collection` carries
  `showOnWishlist`.
- Collection settings get a "Show on wishlist" checkbox, on by default, validated by the existing settings zod schema.
- The wishlist page shows a reminder section **above** the ranked items, with a short heading (e.g. "More wants in
  my collections"). It has one small card per collection that is public, has `show_on_wishlist = 1` and at least one
  want. Each card shows the picture, name and want count, and links to `/<slug>/want`.
- The cards come from the same query as `listPublic()` (filtered), not a second copy of it.
- Empty states: no loose items but reminders → only the reminders. Neither → `EmptyState`.
- Private collections never appear, so private names stay off the page.
- The export (TICKET-BAK-01 / WSH-02) carries `showOnWishlist` with the collection, since it's part of `Collection`.

## UI requirements

- The reminder cards are smaller than the item cards and read as "there's more over there". They don't compete with
  item #1.
- Works without JavaScript and at 360 px. Explicit i18n ids (EN + NL) for the heading, the checkbox label and its help
  text.

## Acceptance criteria

- [x] A public collection with 3 wants appears as a reminder with count 3, linking to its want tab. A public
      collection with 0 wants doesn't. (production build, 2026-11-15: public Lego with 3 wants showed a reminder "Want · 3" linking `/lego/want`; public Gifts with 0 wants had none)
- [x] Unticking "Show on wishlist" removes that collection's reminder. Ticking it brings it back. (posting the settings without `showOnWishlist` removed Lego's reminder, posting it with `showOnWishlist=on` brought it back and the checkbox renders checked)
- [x] A private collection never appears, and its name isn't in the wishlist HTML. (private Secret with 3 wants: no reminder, and `secret` occurs 0 times (case-insensitive) in the `/wishlist` HTML; `listWishlistReminders` filters `listPublic()`)
- [x] The reminders sit above the ranked items. With no loose items they still show; with neither, `EmptyState` does. ("More wants in my collections" comes before the first item in the HTML; with the items removed only the reminders showed, and with no reminders either the empty state did)
- [x] Persistence goes through `src/db/collections.ts`. The settings action calls `requireAdmin()` and validates with
      zod. (`listWishlistReminders` and `updateCollection` (now writing `show_on_wishlist`); the settings action keeps `requireAdmin()` via `collectionAction` and parses the checkbox in `parseSettings`)
- [x] Unit tests cover: the migration on the previous version, the reminder query (public / private, with and without
      wants, opted out), and the settings parsing of the checkbox (ticked, unticked, absent). (`011-show-on-wishlist` in `migrate.test.ts`, `listWishlistReminders` in `collections.test.ts` (public / private, with and without wants, opted out and back in), Show on wishlist ticked / absent / forged in `validation.test.ts`, `showOnWishlist: true` in the export test)
- [x] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off. (Orca, dark paper: ink-tab cards with the collection picture on a small clipped post-it (when it has one) and a "Want · n"
      button, one column at 360 px (no page-wide scroll) and two at desktop width, clearly lighter than the item post-its below; the settings checkbox with its hint under Public at 360 px. JS off: server HTML with no module script; the settings form is a plain post)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD`: dead code 0, complexity 0, duplication 0)

## Notes

- Automatic with opt-out, by decision. No manual picking of collections and no ordering of reminders: they follow the
  home page's order (by name).
- Featuring single collection items on the wishlist is out of scope.
