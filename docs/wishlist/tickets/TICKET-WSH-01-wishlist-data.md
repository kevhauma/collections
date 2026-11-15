# TICKET-WSH-01: Wishlist table and repository, with dense ranks

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** new; extends [technical-design.md § Data model](../../technical-design.md#data-model) and
  [§ Want ranking](../../technical-design.md#want-ranking), [ADR 0004](../../adr/0004-dense-integer-ranks.md)

## User story

As the admin, I want to store wants that belong to no collection, in a ranked order, so I can keep one general
wishlist next to my collections.

## Description

The data layer for the wishlist: a `wishlist_items` table with fixed fields, a public flag for the wishlist as a whole,
and a repository that ranks items exactly like collection wants. No UI yet; the next tickets build on it.

## Current situation (as-is)

- Wants exist only as items inside a collection: `items.status = 'want'` with a dense `rank` per collection
  ([src/db/items.ts](../../../src/db/items.ts): `appendWant`, `closeRankGap`, `moveWant`).
- Item values are free-form per collection (`values_json` keyed by field id). Nothing stores a want without a
  collection.
- The single `settings` row ([src/db/settings.ts](../../../src/db/settings.ts)) holds only `default_locale`.
- Item validation lives in [src/features/items/schema.ts](../../../src/features/items/schema.ts) (`isHttpUrl` for URLs).

## Desired result (to-be)

- A new numbered migration (next free number, `009` today) adds:
  - `wishlist_items(id INTEGER PRIMARY KEY, title TEXT NOT NULL, link TEXT, note TEXT, price TEXT, image TEXT,
    rank INTEGER NOT NULL CHECK (rank >= 1), created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT
    (unixepoch()))`
  - `settings.wishlist_public INTEGER NOT NULL DEFAULT 0`: the wishlist starts private.
- A repository `src/db/wishlist.ts` with all wishlist SQL:
  - `listWishlist()` ordered by rank, `getWishItem(id)`.
  - `createWishItem(input)` appends at the bottom (rank n+1).
  - `updateWishItem(id, input)` keeps the rank.
  - `deleteWishItem(id)` closes the gap and returns the removed item's image, so the caller can delete the file.
  - `moveWishItem(id, toRank)` with the same clamping and single-transaction renumbering as `moveWant`.
  - `isWishlistPublic()` / `setWishlistPublic(flag)`.
- Ranking reuses `moveWant`'s logic. If the renumbering SQL can be shared between `items` and `wishlist_items` without
  bending either, extract it; don't copy it.
- A zod schema for a wishlist item in `src/features/wishlist/`: title required and trimmed, link optional and http(s)
  only (`isHttpUrl`), note and price optional free text, each with a maximum length.
- [technical-design.md](../../technical-design.md) gets a § Wishlist (domain), the table in § Data model, and the
  settings column.

## UI requirements

- None. The validation error messages get explicit i18n ids (EN + NL) now, so the form in TICKET-WSH-03 can use them.

## Acceptance criteria

- [x] The migration applies on a database at the current version and leaves existing data untouched. ([migrations/009-wishlist.sql](../../../migrations/009-wishlist.sql); `009-wishlist` in `src/db/migrate.test.ts` keeps a collection and the default locale)
- [x] A new item gets rank n+1. Moving an item to rank k shifts the others; a rank beyond the end clamps to the
      bottom and below 1 to the top. Deleting an item closes the gap. Ranks stay dense 1..n after every operation.
      (`src/db/wishlist.test.ts`: append, move up/down, clamp, delete, 200-step random sequence)
- [x] `deleteWishItem` returns the image id of the item it deleted (or null), and an unknown id changes nothing.
      ("deletes an item, closes the gap and returns its image", "changes nothing for an unknown id")
- [x] The wishlist is private on a fresh database, and `setWishlistPublic` toggles it. ("starts private and toggles
      public"; migration test reads `wishlist_public = 0`)
- [x] Validation rejects an empty title, a non-http(s) link (`javascript:`, `ftp:`) and over-long text, with explicit
      error ids. (`wishSchema` in `src/features/wishlist/validation.ts`, messages `wishlist.error.*` in `form.ts`, EN + NL;
      `validation.test.ts`)
- [x] Persistence goes through `src/db/wishlist.ts`. No SQL anywhere else. (the only new SQL is in that file and the
      migration. Ranking shares `moveInList`; the renumbering SQL stays per table, as its scope differs: per collection and
      status for items, the whole table here)
- [x] Unit tests cover: the migration on a version-8 DB, append, move (up, down, clamped both ends), delete closing the
      gap, a random sequence of operations keeping ranks dense (like the `moveWant` property test in
      `items.test.ts`), the public flag, and the validation cases above. (`src/db/wishlist.test.ts`,
      `src/features/wishlist/validation.test.ts`, `009-wishlist` in `migrate.test.ts`)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD`: dead code 0, complexity 0, duplication 0. The
      repository and `wishErrors` have no app caller yet; WSH-02/03 use them)

## Notes

- Fixed fields by decision: title, link, note, price, image and rank ("priority"). Wishlist items have no user-defined
  fields and nothing private: everything shows on the public page.
- Price is free text ("€25", "~€30–40"). Nothing sorts or sums it.
- An item you receive is deleted. There is no "received" state and no move into a collection.
- Other open tickets add migrations too. Whichever lands later takes the next number.
