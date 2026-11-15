# TICKET-WSH-02: Wishlist items and images in the export zip

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** extends [technical-design.md § Export (backup)](../../technical-design.md#export-backup),
  [TICKET-BAK-01](../../backup/tickets/TICKET-BAK-01-export-zip.md)

## User story

As the admin, I want the export zip to include my wishlist, so a backup never loses it.

## Description

The export already holds everything about collections. This adds the wishlist items, their images and the
wishlist's public flag, so the zip stays a complete backup the day wishlist data exists.

## Current situation (as-is)

- `readSnapshot` in [src/db/export.ts](../../../src/db/export.ts) reads the default locale and every collection with
  its fields and items, in one read transaction.
- [src/features/backup/export.ts](../../../src/features/backup/export.ts) writes `data.json` (with `version = 1`),
  one `csv/<slug>.csv` per collection, and `images/<uuid>.webp` for the images it references.
- Wishlist items (TICKET-WSH-01) aren't read, so they'd be missing from the zip.

## Desired result (to-be)

- The snapshot gets `wishlist: { isPublic, items: [{ title, link, note, price, image, rank, createdAt, updatedAt }] }`,
  read in the same transaction.
- `data.json` carries it. `version` goes to 2, since the shape changed for the v2 restore
  ([TICKET-BAK-02](../../backup/tickets/TICKET-BAK-02-restore-from-zip.md) must read both).
- `csv/_wishlist.csv`: columns rank, title, link, note, price, image. The leading `_` can't occur in a slug
  (`slugPattern` in [src/features/collections/slug.ts](../../../src/features/collections/slug.ts)), so it never
  clashes with a collection's CSV.
- Wishlist images go into `images/` and are referenced by their path inside the zip, like collection images.
- [technical-design.md § Export](../../technical-design.md#export-backup) lists the new file and the `data.json` key.

## UI requirements

- None. The export page stays as it is.

## Acceptance criteria

- [x] An export with wishlist items holds them in `data.json` in rank order, a wishlist CSV, and each referenced
      image under `images/`. (`buildExport` in `src/features/backup/export.ts`; "round-trips…" in `export.test.ts` checks `data.wishlist`, `csv/_wishlist.csv` and `images/<lamp>.webp`)
- [x] An export with an empty wishlist still writes `wishlist` with `items: []` and the public flag. ("writes an empty wishlist with its public flag and a header-only CSV")
- [x] `data.json` reports `version: 2`. BAK-02's ticket notes that restore reads version 1 and 2. (`version = 2` in `export.ts`, asserted in both tests; BAK-02 § Current situation and step 1 updated)
- [x] Persistence goes through `src/db/export.ts` / `src/db/wishlist.ts`. (`readSnapshot` in `src/db/export.ts` reads the items in its read transaction and the flag via `isWishlistPublic`)
- [x] Unit tests cover: the snapshot with and without wishlist items, the CSV columns and escaping (a comma and a quote
      in a note), and the wishlist images being included. (`src/features/backup/export.test.ts`: both snapshots, the CSV with `"Brass, ""big"" one"`, the lamp image in the zip and a missing one under `missingImages`)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD`: dead code 0, complexity 0, duplication 0)

## Notes

- Comes straight after WSH-01, so there's never a release where wishlist data exists but isn't backed up.
- Restore itself stays in BAK-02 (v2).
