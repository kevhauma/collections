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

- [x] Downloading produces a zip that opens in the OS. It contains `data.json`, one CSV per collection and the
      images. (production build: `GET /admin/export.zip` → 200 `application/zip`, `attachment;
      filename="collections-export-2026-11-13.zip"`, `no-store`; Windows `Expand-Archive` unpacks `data.json`,
      `csv/secret.csv`, `csv/vinyl.csv` and `images/<uuid>.webp`)
- [x] Every item's image path in `data.json` and the CSVs exists in the zip. (checked on the unpacked live export: 1
      image path, all present; an image whose file is gone gets `image: null` and is listed under `missingImages`,
      test "round-trips…")
- [ ] CSVs open correctly in Excel and LibreOffice with accented characters, commas, quotes and newlines intact.
      **Open for Excel, by decision (2026-11-13).** LibreOffice: correct (17 rows, 13 columns, `Café, "Olé"` with
      its line break and `– naïve` intact). Excel 16 reads the BOM, accents, quotes and line breaks correctly, but a
      double-click splits on Windows' list separator, which is `;` on the owner's machine, so every row lands in
      column A. A `sep=,` hint fixes the columns but makes Excel ignore the BOM and garble accents; a semicolon file
      opens perfectly there but breaks comma-separator systems. The owner chose to keep RFC 4180 commas as
      specified; in Excel, open the CSV through Data › From Text/CSV.
- [x] Private fields are included (this is the owner's backup). (live export: the private Paid and Condition fields
      and the 731.42 values are in `data.json` and the CSV; the round-trip test checks a private field)
- [x] Not reachable without an admin session. (`requireAdmin()` in the resource route's loader: without a session
      `GET /admin/export.zip` → 302 to `/admin`, no zip; the `/admin/export` page is guarded the same way)
- [x] Unit tests cover:
  - `toCsv`: commas, quotes, newlines, leading `=`/`+`/`-`/`@`, empty values, BOM (`src/features/backup/csv.test.ts`)
  - export round trip: build the zip in memory from a temp DB with fixtures, read it back with `yauzl` (dev
    dependency), and assert `data.json` matches the DB and the image files are present
    (`src/features/backup/export.test.ts`; `npm test` 671 passed)
- [x] Live browser check of the download. (Orca at 1440 px: the Export page, highlighted in the nav, explains the
      three parts and that restore comes later; "Download export" started a download named
      `collections-export-2026-11-13.zip`; no sideways scroll at 360 px (360 = 360). Screens match the notebook
      direction)
- [x] Verified with the fallow skill. (`npx fallow audit --base HEAD` → pass: 0 dead code, 0 duplicates, 0
      complexity findings; `yazl` is used at runtime and `yauzl` only by the test)

## Notes

- Needs TICKET-ITM-04.
- The `data.json` format is the contract for TICKET-BAK-02 (restore). Change it only by bumping `version`.
- The formula-injection prefix alters CSV cell text. That's fine because restore reads `data.json`, never the CSVs.
- Excel and the CSV delimiter (2026-11-13): see the open criterion. Kept as RFC 4180 commas by the owner's choice.
  Closing the criterion needs a different format decision (semicolons, a per-locale delimiter, or an .xlsx).
