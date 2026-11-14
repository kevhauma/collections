# TICKET-COL-07: Default sort per collection

- **Area:** Collections
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** [technical-design.md § Collection](../../technical-design.md#collection) (extends it, next to `default_view`), [TICKET-ITM-05](../../items/tickets/TICKET-ITM-05-collection-views.md) (the list params it changes)

## User story

As the admin, I want to choose how each collection is sorted when it opens (vinyl by artist, LEGO by set number), so I
and visitors see it in the order that makes sense without clicking a column every time.

## Description

A "Default sort" setting per collection: a field (or date added) plus a direction. It replaces the hard-coded
"title, ascending" default for the have tab, and URLs stay clean when the list is in its default order.

## Current situation (as-is)

- A collection stores `default_view` but no sort ([src/db/collections.ts](../../../src/db/collections.ts)).
- `defaultsOf` in [src/features/items/list-params.ts](../../../src/features/items/list-params.ts) hard-codes the
  default: `rank` on the want tab, the title field on the have tab, always `asc`. `listQuery` and `switchTab` compare
  against those defaults to leave them out of the URL.
- `itemView` in [src/features/items/view.ts](../../../src/features/items/view.ts) builds the `ListContext` from
  `collection.defaultView` and `collection.titleFieldId`.
- Settings: [src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx), validated by
  `parseSettings` in [src/features/collections/validation.ts](../../../src/features/collections/validation.ts).

## Desired result (to-be)

- A new numbered migration adds `default_sort TEXT` (null = title) and `default_dir TEXT NOT NULL DEFAULT 'asc'` to
  `collections`. The shipped migrations are not edited. `Collection` and `CollectionSettings` carry `defaultSort` and
  `defaultDir`.
- `default_sort` stores what the `sort` query param takes: `created` or a field id. On read it goes through the same
  `sortOf` check. A deleted field, or a field turned private (on public pages), falls back to the title, so nothing
  ever breaks.
- `ListContext` carries the collection's default sort and direction. `defaultsOf` uses them for the have tab. The want
  tab keeps `rank asc` as its default, because the rank is the want order.
- `listQuery` and `switchTab` keep working off `defaultsOf`, so the default order has no `sort`/`dir` in the URL, and
  a non-default sort still carries over between tabs.
- Settings get a "Default sort" select (title, date added, each field in position order) and an ascending/descending
  choice, validated with zod against the collection's own fields.

## UI requirements

- In collection settings, under "Default view": a select for the field and a two-option choice for the direction,
  labelled with explicit i18n ids (EN + NL).
- The have tab's column header shows the default sort as active (`aria-sort`) when no sort is in the URL.

## Acceptance criteria

- [ ] Setting "Artist, ascending" on Vinyl makes `/admin/c/vinyl` and `/vinyl` open sorted by artist, with no `sort`
      in the URL.
- [ ] Clicking another column still sorts by it. Clicking back to the default leaves the URL without `sort`/`dir`.
- [ ] The want tab still opens by rank, and dragging to reorder still works there.
- [ ] Deleting the default sort field, or making it private, falls back to title order (private: on public pages only)
      without an error.
- [ ] A forged `defaultSort` (another collection's field id, junk) is rejected by the settings action.
- [ ] Persistence goes through `src/db/collections.ts`. The action calls `requireAdmin()` and validates with zod.
- [ ] Unit tests cover: the migration on a version-4 DB, `parseListParams`/`listQuery` with a custom default (default
      left out of the URL, other sort kept), the fallback for a missing or private field, and `switchTab` between a
      custom-default have tab and the want tab.
- [ ] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of settings and both
      tabs at 360 px and desktop, JS on and off.
- [ ] Verified with the fallow skill.

## Notes

- Independent, can ship any time.
- Other open COL tickets add migrations too. Whichever lands later takes the next number.
- A separate default for the want tab is left out, since the rank already is its order. Add it only if someone asks.
