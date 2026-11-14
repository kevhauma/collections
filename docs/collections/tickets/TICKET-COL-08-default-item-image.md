# TICKET-COL-08: Default image for items without one

- **Area:** Collections
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** [technical-design.md § Collection](../../technical-design.md#collection) (extends it), [TICKET-ITM-04](../../items/tickets/TICKET-ITM-04-item-images.md) and [TICKET-COL-06](./TICKET-COL-06-collection-picture.md) (the image pipeline and settings section it reuses)

## User story

As the admin, I want to set one fallback image per collection (a blank record sleeve, a generic LEGO box), so items
without their own photo still look like part of the collection instead of an empty post-it.

## Description

One optional "default item image" per collection, set in collection settings by upload or URL. It shows in place of
the blank post-it for every item of that collection that has no image.

## Current situation (as-is)

- `Thumbnail` in [src/routes/item-views.tsx](../../../src/routes/item-views.tsx) renders an empty coloured `PostIt`
  when `item.image` is null.
- A collection already has one image, its picture (`image` on `collections`, TICKET-COL-06), set through the image
  section in [src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx) with
  `ImageSection` ([src/routes/image-section.tsx](../../../src/routes/image-section.tsx)), `prepareFormImage`
  ([src/features/images/form.ts](../../../src/features/images/form.ts)) and `commitImage`
  ([src/features/images/change.ts](../../../src/features/images/change.ts)).
- Those inputs have fixed names (`image`, `imageUrl`, `removeImage`), so a second image on the same `<form>` would
  clash.
- `deleteCollection` returns the picture and item image ids for deletion; the export packs the collection picture and
  item images ([src/features/backup/export.ts](../../../src/features/backup/export.ts)).

## Desired result (to-be)

- A new numbered migration adds nullable `item_image TEXT` to `collections`. `Collection` carries
  `itemImage: string | null`.
- Collection settings get a "Default item image" section as its own `<form>` with its own intent. The shared image
  inputs then work unchanged: same limits (15 MB), formats, errors, and "no orphan files on a failed save".
  Replacing or removing it deletes the old files.
- `Thumbnail` shows the collection's default item image when the item has none, in table and grid, admin and public.
  It gets `alt=""`, because it isn't a picture of that item, and it doesn't open the enlarge dialog
  (TICKET-UI-08), which stays for the item's own picture.
- The item form's image preview stays empty for an item without its own image, so it's clear the item has no photo
  yet.
- Deleting a collection also deletes the default item image's files. The export carries it like the collection
  picture (`itemImage` in `data.json`, the file under `images/`).
- Link previews are unchanged: collection picture, else the first item's own image.

## UI requirements

- Settings: a "Default item image" section below the collection picture, the same layout as the picture section
  (preview, file input, URL, remove).
- In lists, an item showing the default image looks like any other thumbnail (same post-it, fastening, tilt).

## Acceptance criteria

- [ ] With a default item image set, items without an image show it in the table and grid on admin and public pages.
      Items with their own image are unchanged.
- [ ] Removing the default image brings the blank post-its back. Replacing it deletes the old files.
- [ ] Saving the collection's other settings or its picture leaves the default item image as it is, and the other way
      round.
- [ ] A failed save with a new default image chosen leaves no new files in `uploads/`.
- [ ] Deleting the collection deletes the default image's files.
- [ ] The export zip holds the default image under `images/`, referenced from `data.json`.
- [ ] Public pages still ship no client components.
- [ ] Persistence goes through `src/db/collections.ts`. The action calls `requireAdmin()` and validates with zod.
- [ ] Unit tests cover: the migration on a version-4 DB, setting/keeping/clearing `itemImage`, `deleteCollection`
      returning it, and the export including it (and leaving out a missing file).
- [ ] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of settings and both
      views, with and without a default image, at 360 px and desktop, light and dark, JS on and off.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-COL-06 (shipped) for the image section pattern. Otherwise independent, can ship any time.
- Other open COL tickets add migrations too. Whichever lands later takes the next number.
- One default per collection. A default per select option (e.g. per genre) is out of scope.
