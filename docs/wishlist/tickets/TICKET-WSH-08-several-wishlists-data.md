# TICKET-WSH-08: Several wishlists: table, repository and export

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** changes [technical-design.md § Wishlist](../../technical-design.md#wishlist), § Data model and
  [§ Export (backup)](../../technical-design.md#export-backup); revises [TICKET-WSH-01](./TICKET-WSH-01-wishlist-data.md)
  and [TICKET-WSH-02](./TICKET-WSH-02-wishlist-in-export.md)

## User story

As the admin, I want to keep several named wishlists (a birthday list, a list for the house), each ranked and
private or public on its own, so one list doesn't have to hold every kind of want.

## Description

The data layer for several wishlists: a `wishlists` table, each item belonging to one wishlist, ranks dense per
wishlist, and the export carrying them all. The existing wishlist and its items move into the first one, so nothing
is lost and nothing changes for visitors yet. The pages follow in TICKET-WSH-09..11.

## Current situation (as-is)

- One wishlist: [migrations/009-wishlist.sql](../../../migrations/009-wishlist.sql) adds `wishlist_items` (no owner
  column) and `settings.wishlist_public`.
- [src/db/wishlist.ts](../../../src/db/wishlist.ts) ranks across the whole table: `listWishlist`, `createWishItem`
  (rank n+1 of all items), `deleteWishItem` (closes the gap table-wide), `moveWishItem`, `isWishlistPublic` /
  `setWishlistPublic`.
- Whether the collection reminders show is implied: they show on the one wishlist
  ([src/routes/public-wishlist.tsx](../../../src/routes/public-wishlist.tsx), TICKET-WSH-06).
- The export ([src/db/export.ts](../../../src/db/export.ts), [src/features/backup/export.ts](../../../src/features/backup/export.ts))
  writes `version: 2` with one `wishlist` key (`isPublic`, `items`) and `csv/_wishlist.csv`.
- Collection slugs come from `slugify` / `uniqueSlug` in [src/features/collections/slug.ts](../../../src/features/collections/slug.ts).

## Desired result (to-be)

- A new numbered migration (next free number, `012` today):
  - `wishlists(id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, is_public INTEGER NOT NULL
    DEFAULT 0, show_reminders INTEGER NOT NULL DEFAULT 0, created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER
    DEFAULT (unixepoch()))`.
  - One row `Wishlist` / `wishlist`, taking `settings.wishlist_public` as `is_public` and `show_reminders = 1`, so the
    existing wishlist looks the same as before.
  - `wishlist_items` gets `wishlist_id INTEGER NOT NULL REFERENCES wishlists ON DELETE CASCADE`, every existing item
    in that row (a table rebuild: SQLite can't add a non-null foreign key column). Ranks stay as they are.
  - `settings.wishlist_public` is dropped.
- `src/db/wishlist.ts`:
  - `listWishlists()` by name (case-insensitive, like collections), with item count and the first image by rank.
  - `getWishlist(id)`, `getWishlistBySlug(slug)`, `createWishlist(name, slug)` (private, reminders off),
    `updateWishlist(id, { name, slug, isPublic, showReminders })`, `deleteWishlist(id)` returning its items' image ids
    so the caller can remove the files.
  - `listWishlist(wishlistId)`, `createWishItem(wishlistId, item)`: ranks are per wishlist. `deleteWishItem` and
    `moveWishItem` keep taking an item id and renumber only inside that item's wishlist. `WishItem` carries
    `wishlistId`.
  - `isWishlistPublic` / `setWishlistPublic` go; visibility is a wishlist column.
- Wishlist slugs: same `slugify` / `slugPattern` / `maxSlugLength` as collections, unique among wishlists only (they
  live under `/wishlist/`, so they can't clash with a collection). No reserved list.
- Until TICKET-WSH-09..11 land, the existing pages, home card and MCP tools work on the first wishlist by name, so the
  app keeps working between tickets.
- Export `version: 3`: `wishlists: [{ name, slug, isPublic, showReminders, items }]` replaces `wishlist`. One
  `csv/_wishlist-<slug>.csv` per wishlist replaces `csv/_wishlist.csv`. Images of every wishlist's items are in the zip.
- [TICKET-BAK-02](../../backup/tickets/TICKET-BAK-02-restore-from-zip.md) notes that restore reads versions 1, 2 and
  3: a version 2 `wishlist` restores as one wishlist `Wishlist` / `wishlist` with reminders on.
- [technical-design.md](../../technical-design.md): § Wishlist, § Data model and § Export updated.

## UI requirements

- None.

## Acceptance criteria

- [x] The migration applies on a version-11 database: a public wishlist with 3 items becomes one public wishlist
      `wishlist` with reminders on holding the same 3 items in the same order; collections are untouched.
      ([migrations/012-several-wishlists.sql](../../../migrations/012-several-wishlists.sql); `src/db/migrate.test.ts`
      "012-several-wishlists": moves a public wishlist's items, in order, …; keeps a private wishlist private)
- [x] Ranks are dense 1..n per wishlist: appending, moving (clamped both ends) and deleting in one wishlist never
      changes another's ranks. (`src/db/wishlist.test.ts` "wishlist items": appends … of its own wishlist; clamps …
      inside its wishlist; deletes an item, closes the gap in its wishlist only)
- [x] Deleting a wishlist deletes its items and returns their image ids; other wishlists keep theirs.
      (`deleteWishlist`; test "deletes a wishlist with its items, returning their image ids, …")
- [x] A second wishlist with a taken slug is refused by the unique constraint; the caller gets a free one from
      `uniqueSlug`. (test "refuses a taken slug; uniqueSlug gives a free one", with `listWishlistSlugs()`)
- [x] The export holds `version: 3`, every wishlist with its items and flags, one CSV per wishlist, and every
      wishlist item's image. (`src/features/backup/export.test.ts`: two wishlists, `csv/_wishlist-birthday.csv` and
      `csv/_wishlist-wishlist.csv`, both lists' images in the zip)
- [x] Existing pages and MCP tools still work against the migrated wishlist (existing tests pass, adjusted only for
      the new signatures). (Interim `firstWishlist()` in `src/db/wishlist.ts`; `npm test` 1073 passed, with
      `tools.test.ts` and `view.test.ts` changed only for `listWishlist(1)` / `wishlistId`; build green)
- [x] Persistence goes through `src/db/wishlist.ts`. No SQL anywhere else. (Plus the export's read in
      `src/db/export.ts`, as before)
- [x] Unit tests cover: the migration on a version-11 DB, per-wishlist ranking (including a random sequence across
      two wishlists keeping both dense), wishlist create / update / delete, and the version 3 export. (Tests named
      above; "keeps both wishlists dense 1..n through 300 random appends, moves and deletes across them")
- [x] Verified with the fallow skill and the coding-conventions skill. (`fallow audit --base HEAD`: no dead code or
      duplication; one complexity warning on the interim `admin-wishlist.tsx` action, which TICKET-WSH-09 replaces)

## Notes

- Wishlists are listed by name, like collections. No manual order.
- Moving an item from one wishlist to another is out of scope: delete it and add it again.
- `/wishlist/wishlist` is an odd address for the migrated list; the admin can rename it and change its slug in
  TICKET-WSH-09.
- Other open tickets add migrations too. Whichever lands later takes the next number.
