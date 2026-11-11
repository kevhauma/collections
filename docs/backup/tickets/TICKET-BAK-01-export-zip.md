# TICKET-BAK-01: Full export as zip

- **Area:** Backup
- **Released in:** _unreleased_
- **Traceability:** [technical-design.md § Export (backup)](../../technical-design.md#export-backup)

## User story

As the admin, I want to download everything (collections, fields, items and images) as one zip, so I have a portable
backup and can open my data in a spreadsheet.

## Description

An admin export page whose download streams a zip containing `data.json` (the restorable full backup), one CSV per
collection, and all images.

## Current situation (as-is)

- All data lives in SQLite and `DATA_DIR/uploads` (TICKET-PLAT-03, TICKET-ITM-04). The only backup is the volume.

## Desired result (to-be)

- `/admin/export` page with a short explanation and a download link to a resource route `GET /admin/export.zip`
  (requires an admin session).
- The resource route streams `collections-export-YYYY-MM-DD.zip` with `yazl`:
  - `data.json` contains:

    ```json
    { "version": 1, "exportedAt": "…",
      "settings": { "defaultLocale": "nl" },
      "collections": [ { "slug": "…", "name": "…", "isPublic": true, "defaultView": "grid", "titleFieldId": 12,
                         "fields": [ { "id": 12, "label": "…", "type": "text", "options": null,
                                       "required": true, "isPublic": true, "position": 1 } ],
                         "items": [ { "status": "want", "quantity": null, "rank": 1,
                                      "values": { "12": "…" }, "image": "images/<uuid>.webp",
                                      "createdAt": "…", "updatedAt": "…" } ] } ] }
    ```

  - `csv/<slug>.csv`, one per collection:
    - columns: field labels in position order, then `status`, `quantity`, `rank`, `image`
    - UTF-8 with BOM (so Excel reads accents), RFC 4180 quoting, values formatted plainly (checkbox
      `true`/`false`, dates ISO)
    - cells starting with `=`, `+`, `-` or `@` are prefixed with `'` (CSV formula injection)
  - `images/<uuid>.webp`: the display-size file of every referenced image. Thumbnails are not exported; restore
    regenerates them.
- All DB reads for one export happen inside a single read transaction for a consistent snapshot. Missing image files
  are skipped and listed in `data.json` under `"missingImages"`.
- `src/features/backup/csv.ts`: a small `toCsv(rows)` with escaping. No CSV dependency.

## UI requirements

- An "Export" nav item in `AdminLayout`. The page explains what's in the zip and that restore arrives in a later
  version.

## Acceptance criteria

- [ ] Downloading produces a zip that opens in the OS. It contains `data.json`, one CSV per collection and the
      images.
- [ ] Every item's image path in `data.json` and the CSVs exists in the zip.
- [ ] CSVs open correctly in Excel and LibreOffice with accented characters, commas, quotes and newlines intact.
- [ ] Private fields are included (this is the owner's backup).
- [ ] Not reachable without an admin session.
- [ ] Unit tests cover:
  - `toCsv`: commas, quotes, newlines, leading `=`/`+`/`-`/`@`, empty values, BOM
  - export round trip: build the zip in memory from a temp DB with fixtures, read it back with `yauzl` (dev
    dependency), and assert `data.json` matches the DB and the image files are present
- [ ] Live browser check of the download.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-ITM-04.
- The `data.json` format is the contract for TICKET-BAK-02 (restore). Change it only by bumping `version`.
- The formula-injection prefix alters CSV cell text. That's fine because restore reads `data.json`, never the CSVs.
