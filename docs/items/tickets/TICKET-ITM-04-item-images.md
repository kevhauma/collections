# TICKET-ITM-04: Item images (upload or URL)

- **Area:** Items
- **Released in:** _unreleased_
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

- [ ] Uploading a JPEG/PNG/HEIC-from-phone stores two WebP files within the size bounds, correctly rotated.
- [ ] Pasting an image URL downloads and stores it. The stored page never references the original URL.
- [ ] A 20 MB upload or download is rejected without exhausting memory.
- [ ] Replacing or removing an image deletes the old files. Deleting an item or collection deletes its files.
- [ ] A failed DB write leaves no orphaned files.
- [ ] `/uploads/*` is served with immutable cache headers.
- [ ] Unit tests cover: `processImage` on a generated PNG fixture (two outputs, max dimensions, WebP format), a
      rotated EXIF fixture, URL validation (rejects `file:`, `ftp:`, `javascript:`), the download size limit (aborts
      on a stream over 15 MB), the content-type check.
- [ ] Live browser check of upload, URL, replace and remove.
- [ ] Verified with the fallow skill.
- [ ] `sharp` loads in the Docker runtime image (`docker build`, then one upload in the container). Moved here from
      TICKET-PLAT-04, which shipped before `sharp` was a dependency.

## Notes

- Needs TICKET-ITM-02.
- URL download is admin-only, so the server-side request risk (pointing it at internal addresses) is accepted, not
  mitigated.
- HEIC decoding depends on sharp's prebuilt libvips. If unsupported, show "unsupported format" and note it in the
  deploy docs.
- Images of private collections are unlisted, not access-controlled (random UUID names). Accepted in the design.
