# TICKET-COL-06: Collection picture

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Collection](../../technical-design.md#collection) (extends it), [TICKET-ITM-04](../../items/tickets/TICKET-ITM-04-item-images.md) (the image pipeline it reuses)

## User story

As the admin, I want to give a collection one picture of the whole thing (the shelf of records, the LEGO wall), so
visitors and I see the collection at a glance before scrolling through items.

## Description

One optional image per collection, set in the collection settings by upload or URL, shown on the collection cards and
at the top of the collection page. It reuses the item image pipeline as is.

## Current situation (as-is)

- A collection has `name`, `slug`, `is_public`, `default_view` and `title_field_id`, no image
  ([src/db/collections.ts](../../../src/db/collections.ts), [migrations/001-initial.sql](../../../migrations/001-initial.sql)).
- Items each have one image (TICKET-ITM-04): `imageSource` / `prepareImage` / `commitImage` in
  [src/features/images/change.ts](../../../src/features/images/change.ts), files written by `processImage` in
  [src/features/images/process.ts](../../../src/features/images/process.ts) (display size + thumbnail), and the
  client file input `ImageField` in [src/routes/image-field.tsx](../../../src/routes/image-field.tsx).
- The public index ([src/routes/home.tsx](../../../src/routes/home.tsx)) and the admin home
  ([src/routes/admin-home.tsx](../../../src/routes/admin-home.tsx)) show a text-only `Card` per collection.
- The public page's link preview uses the first item's image (`firstImage` in
  [src/routes/public-collection.tsx](../../../src/routes/public-collection.tsx)).
- Deleting a collection removes its items' image files
  ([src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx)); the export packs
  item images only ([src/features/backup/export.ts](../../../src/features/backup/export.ts)).

## Desired result (to-be)

- A new numbered migration adds nullable `image TEXT` to `collections` (the shipped migrations are not edited).
  `Collection` carries `image: string | null`.
- Collection settings get an image section: upload a file or give a URL, or remove the current picture. Same inputs,
  limits (15 MB), formats and error messages as the item form, through `imageSource`, `prepareImage` and
  `commitImage`, so a failed save leaves no orphan files and a replaced picture's files are deleted.
- Shown:
  - Public index and admin home: the thumbnail on each collection card.
  - Public collection page (have and want) and admin collection page: the display-size picture under the title.
  - Link preview: the collection picture when set, else the first item's image as today.
- Every `<img>` has the collection name as `alt`, `width`/`height` set, and `loading="lazy"` on the cards.
- A private collection's picture shows only in admin; its file is served from `/uploads` by a random id like item
  images, so the URL reveals nothing.
- Deleting a collection also deletes its picture's files, after the delete commits.
- Export: `data.json` gets `image` per collection (`images/<id>.webp` or `null`), the file goes into `images/`, and a
  missing file is left out the same way as for items.

## UI requirements

- Settings: an "Image" section with the current picture as a preview, `ImageField`, a URL input and a "Remove image"
  checkbox, like the item form.
- Cards: the thumbnail as a post-it pinned to the card (the notebook direction's photo treatment); cards without a
  picture look as they do today.
- Collection page: the picture as a larger post-it next to or under the scrawled title; it never pushes the item list
  below the fold at 360 px by more than the picture's own height.

## Acceptance criteria

- [x] Uploading a JPEG in settings shows it on the admin home card, the admin collection page and, for a public
      collection, the public index card and both public tabs.
      (Orca, prod build: a 900×600 JPEG uploaded in Shop's settings showed as the thumbnail on the admin home and
      public index cards and at display size on `/admin/c/shop`, `/shop` and `/shop/want`)
- [x] Setting a picture by URL works; a non-image URL and a file over 15 MB show the same errors as the item form.
      (`https://httpbin.org/image/jpeg` saved; `https://example.com/` gave "This isn't an image that can be read…" and a
      16 MB file "This image is too large (max 15 MB).", the same text as the item form for the same input, with JS
      (client check) and without (multipart post))
- [x] Replacing the picture deletes the old files; removing it deletes them and the cards fall back to text only.
      (by-URL replace left only the new id's two files in `uploads/`; `removeImage=on` set `image` to NULL, left 0
      files and the public index had no `<img>`)
- [x] A failing settings save (e.g. a taken slug) with a new picture chosen leaves no new files in `uploads/`.
      (slug `books` (taken) with a JPEG chosen → "Another collection already uses this address", `uploads/` file count
      unchanged: settings are parsed before `prepareFormImage`)
- [x] Deleting a collection deletes its picture's files along with its items' images.
      (Books with a picture deleted → its files gone; `collections.test.ts` › "returns the picture with the item
      images when deleting a collection")
- [x] A private collection's picture appears on no public page and in no public link preview.
      (private Books with a picture: `/` HTML has no trace of its id, `/books` is 404, so there is no preview either)
- [x] The public link preview uses the collection picture when set, else the first item's image.
      (`og:image` on `/shop` is the collection picture; `collection.image ?? firstImage(…)` in
      `public-collection.tsx`)
- [x] The export zip holds the collection picture under `images/`, referenced from `data.json`; CSVs unchanged.
      (zip: `images/<id>.webp` present, `data.json` Books `image: "images/<id>.webp"`, Shop `null`; CSV header
      unchanged; `export.test.ts` covers a present and a missing picture)
- [x] Public pages still ship no client components (the picture is plain `<img>`; `ImageField` is admin only).
      (`CollectionPicture` is a server component rendering `<img>`; `/` and `/shop` have no module script)
- [x] Persistence goes through `src/db/collections.ts`. The settings action calls `requireAdmin()` and validates with
      zod.
      (`updateCollection(id, settings, image)` and `deleteCollection` in `src/db/collections.ts`; the action runs through
      `collectionAction` (`requireAdmin()`) and `parseSettings`)
- [x] Unit tests cover: the migration on a version-1 DB, `updateCollection` setting and clearing the image,
      `deleteCollection` returning the collection picture with the item images, and the export including it (and
      leaving out a missing file).
      (`migrate.test.ts` › "004-collection-image", `collections.test.ts` › "sets, keeps and clears the picture" and
      "returns the picture with the item images…", `export.test.ts` round-trip)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of settings, both home
      pages and a collection page, with and without a picture, at 360 px and desktop, JS on and off.
      (Orca, 2026-11-13, at 360 px and the pane's 553 px max, light and dark: settings with the picture section,
      admin home and public index cards with and without a picture, collection pages. JS off = the multipart posts
      above. The picture is a pinned `PostIt`, lazy on cards; on the collection page it sits under the title and
      pushes the list down by its own height only)
- [x] Verified with the fallow skill.
      (`npx fallow@3.42.0 audit --base HEAD` → no issues, after splitting the settings action into `save` /
      `remove` / `saved` / `pictureRejected`)

## Notes

- Needs TICKET-COL-01 and TICKET-ITM-04 (shipped). The export part needs TICKET-BAK-01, which is built with one criterion still open.
- One picture only; a gallery is out of scope.
- Several open collection tickets (COL-04, COL-05) also add a migration; whichever lands later takes the next number.
- If dark mode (TICKET-UI-03) lands first, check the post-it treatment on dark paper here too.
