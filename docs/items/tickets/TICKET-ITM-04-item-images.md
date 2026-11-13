# TICKET-ITM-04: Item images (upload or URL)

- **Area:** Items
- **Released in:** [v1](../../releases/v1/overview.md)
- **Traceability:** [technical-design.md § Images](../../technical-design.md#images)

## User story

As the admin, I want to attach a photo or cover image to an item, by uploading a file or pasting an image URL, so my
collection and shared lists are visual.

## Description

One image per item: upload or download from a URL, resized with `sharp` into a display size and a thumbnail, stored
in the data volume, and cleaned up when replaced or deleted.

## Current situation (as-is)

- Items can be created and edited (TICKET-ITM-02). `items.image` exists but is unused. Multipart handling in server
  actions was explored in the spike (TICKET-PLAT-01).

## Desired result (to-be)

- `src/features/images/process.ts`: `processImage(input: Buffer | stream)`:
  - `sharp().rotate()` to apply EXIF orientation
  - writes `<uuid>.webp` (fit inside 1000×1000, quality 80) and `<uuid>.thumb.webp` (fit inside 300×300) to
    `DATA_DIR/uploads/`
  - metadata (EXIF, GPS) stripped; sharp's default
  - returns the uuid
- `src/features/images/fetch.ts`: `downloadImage(url)`:
  - only `http:` / `https:`
  - 15 s timeout
  - aborts once 15 MB have streamed
  - requires an `image/*` content type
- Item form additions: file input (`accept="image/*"`), image URL input, current thumbnail, "remove image" checkbox.
  If both a file and a URL are given, the file wins.
- Save flow:
  1. process the new image to files first
  2. update the DB in a transaction
  3. delete the old files after commit
  4. if the DB write fails, delete the new files
- Upload cap: 15 MB, enforced while parsing (per the spike's finding), before the whole body is buffered.
- Express serves `/uploads` with `Cache-Control: public, max-age=31536000, immutable` (UUID names never change
  content).
- Item delete and collection delete (TICKET-COL-01) remove the image files.
- Admin client component: preview of the selected file via `URL.createObjectURL`.

## UI requirements

- Thumbnail in the form. Errors for "not an image", "too large (max 15 MB)" and "couldn't download that URL".
- `alt` text on displayed images is the item title.

## Acceptance criteria

- [x] Uploading a ~~JPEG/PNG/HEIC-from-phone~~ JPEG/PNG stores two WebP files within the size bounds, correctly
      rotated. HEIC is not decoded: the prebuilt sharp 0.35.5 / libvips 8.18.7 reads HEIF only as AVIF, so a HEIC file
      gets "This isn't an image that can be read…", as the Notes allow; noted in `docs/platform/deploy.md`. (live: a
      2400×1600 JPEG with EXIF orientation 6 → `<uuid>.webp` 667×1000 and `<uuid>.thumb.webp` 200×300, upright, no
      EXIF; a PNG → 800×800. Tests "writes a display WebP and a thumbnail within their bounds", "applies the EXIF
      orientation and strips the metadata")
- [x] Pasting an image URL downloads and stores it. The stored page never references the original URL. (live: a
      1200×600 PNG from a local fixture server → 1000×500 and 300×150 WebP; the item form and list contain no
      reference to the fixture server, only `/uploads/<uuid>.thumb.webp`)
- [x] A 20 MB upload or download is rejected without exhausting memory. (upload: `entry.rsc` answers 413 on the
      declared Content-Length before React Router reads the body, and a chunked body errors once 16 MB have streamed
      (`src/lib/body-limit.test.ts`); with JS the form refuses the file before sending it: input cleared, "This image
      is too large (max 15 MB)." Download: refused on a Content-Length over 15 MB before reading, or cancelled once
      15 MB have streamed (tests "refuses a declared size over 15 MB before reading the body", "aborts an undeclared
      body once 15 MB have streamed"); live, a 20 MB URL showed the too-large message)
- [x] Replacing or removing an image deletes the old files. Deleting an item or collection deletes its files. (live,
      listing `uploads/` after each step: replace by URL, replace by file, "Remove image", deleting an item and
      deleting a collection each left only the current files; tests in `src/features/images/change.test.ts` and
      "returns a deleted collection's image ids")
- [x] A failed DB write leaves no orphaned files. (`commitImage` deletes the new files when the write throws; test
      "deletes the new files and keeps the old ones when the write fails". Values are validated before any image
      work, and failed image saves left `uploads/` unchanged live)
- [x] `/uploads/*` is served with immutable cache headers. (`Cache-Control: public, max-age=31536000, immutable`,
      `Content-Type: image/webp`, from the dev server and from the Docker container)
- [x] Unit tests cover: `processImage` on a generated PNG fixture (two outputs, max dimensions, WebP format), a
      rotated EXIF fixture, URL validation (rejects `file:`, `ftp:`, `javascript:`), the download size limit (aborts
      on a stream over 15 MB), the content-type check. (`src/features/images/{process,fetch,change,shared}.test.ts`,
      `src/lib/body-limit.test.ts`; `npm test` 554 passed)
- [x] Live browser check of upload, URL, replace and remove. (no JS: multipart posts for upload, URL, file-wins-over-
      URL, replace, remove and the four error messages, each shown on its input and in the summary. JS on, Orca at
      1440 px: choosing a file previews it on a taped post-it, saving shows the thumbnail in the table, `alt` = title,
      `loading="lazy"`. That check found and fixed a bug: a portrait photo overflowed its post-it, so `PostIt` now
      pins its grid cell to the box)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings, after moving the chosen-file check into the tested `checkChosenFile`)
- [x] `sharp` loads in the Docker runtime image (`docker build`, then one upload in the container). Moved here from
      TICKET-PLAT-04, which shipped before `sharp` was a dependency. (`docker build` succeeded; in the container
      `require('sharp')` reports libvips 8.18.7, and one upload through the app wrote `<uuid>.webp` and
      `<uuid>.thumb.webp` to `/data/uploads`)

## Notes

- Needs TICKET-ITM-02.
- URL download is admin-only, so the server-side request risk (pointing it at internal addresses) is accepted, not
  mitigated.
- HEIC decoding depends on sharp's prebuilt libvips. If unsupported, show "unsupported format" and note it in the
  deploy docs.
- Images of private collections are unlisted, not access-controlled (random UUID names). Accepted in the design.
