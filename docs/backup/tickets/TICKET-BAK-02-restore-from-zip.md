# TICKET-BAK-02: Restore from export zip (v2)

- **Area:** Backup
- **Released in:** _unreleased_ (planned for v2)
- **Traceability:** [technical-design.md § Scope](../../technical-design.md#scope) (v2), [technical-design.md § Export (backup)](../../technical-design.md#export-backup)

## User story

As the owner moving to a new server or recovering from disaster, I want to restore a full export zip into a fresh
instance, so my backup is actually usable.

## Description

Upload an export zip on an empty instance and recreate every collection, field, item and image from `data.json`.
There is no merge logic: restore is refused if any collection exists.

## Current situation (as-is)

- Export produces `data.json` version 1 plus images (TICKET-BAK-01). Nothing can read it back.

## Desired result (to-be)

- `/admin/restore`, linked from the export page only while the instance has no collections:
  - upload input for the zip (size cap from an env var, default 2 GB, streamed to a temp file, never buffered in
    memory)
- Restore action:
  1. Open the zip with `yauzl` and parse `data.json` with a zod schema for `version: 1`. Unknown versions are
     rejected.
  2. Accept only entries named `data.json`, `csv/*.csv` (ignored) and `images/<uuid>.webp`. Any other path,
     including `..`, absolute paths or symlinks, is rejected (zip-slip).
  3. In one transaction, insert collections, fields and items. **Remap field ids**: new ids are assigned, so every
     item's `values` keys and every `title_field_id` are rewritten through an old→new id map. Ranks are re-densified
     per collection.
  4. Images are run through `processImage` (TICKET-ITM-04), which re-encodes them and regenerates thumbnails. New
     UUIDs are assigned and item image references are remapped.
  5. If anything fails: roll back the transaction, delete every file written during this attempt, and report the
     reason.
- Settings (`default_locale`) are restored too. The admin password is not part of the export and stays as set
  during setup.

## UI requirements

- A restore page with a clear warning ("only works on an empty instance"), the upload, a progress indicator (the
  client component may show upload progress), and a result summary (N collections, N items, N images restored).

## Acceptance criteria

- [ ] Export → fresh instance → restore reproduces the same collections, fields (labels, types, options, order,
      flags), items (values, status, quantity, rank) and images.
- [ ] Restore is refused (and the page hidden) when any collection exists.
- [ ] A zip containing `../evil` or an unexpected path is rejected with nothing written.
- [ ] A corrupt `data.json` or an unknown `version` is rejected with a readable error.
- [ ] A failure mid-restore leaves the DB and `uploads/` exactly as before.
- [ ] Unit tests cover: zod parsing of a v1 fixture, field id remapping (values keys and title field), rank
      re-densifying, zip-slip rejection, and a full export → restore round trip on temp dirs comparing the
      resulting data.
- [ ] Live browser check of a restore on a fresh container.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-BAK-01. Planned for v2.
- Merging into a non-empty instance is out of scope, by decision.
