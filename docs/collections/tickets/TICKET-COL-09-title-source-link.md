# TICKET-COL-09: Link the title to a URL field (source link)

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** [technical-design.md § Collection](../../technical-design.md#collection) (extends it, next to `title_field_id`), [TICKET-ITM-05](../../items/tickets/TICKET-ITM-05-collection-views.md) (the views it changes)

## User story

As the admin, I want to tie one URL field to the title so the title opens that link, so I and visitors can jump
straight to where an item comes from, mainly on the want list ("where do I buy this?").

## Description

A per-collection "Title links to" setting that picks one of the collection's URL fields. When an item has a value
there, its title becomes a link to it on the public pages. In admin it gets a small source link next to the title.

## Current situation (as-is)

- A collection points at its title field through `title_field_id`
  ([src/db/collections.ts](../../../src/db/collections.ts)). There is no link between fields.
- `Title` in [src/routes/item-views.tsx](../../../src/routes/item-views.tsx) renders the title as a link to the edit
  page in admin and as plain text on public pages.
- A `url` field shows as its own column with the hostname as link text (`valueRenderers.url`). Values are checked to
  be http(s) on save (`isHttpUrl` in [src/features/items/schema.ts](../../../src/features/items/schema.ts)).
- In the grid only the title and the first two other fields show, so a URL field further down can't be clicked at all.

## Desired result (to-be)

- A new numbered migration adds `title_link_field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL` to
  `collections`. `Collection` carries `titleLinkFieldId: number | null`.
- Collection settings get a "Title links to" select: "Nothing" plus the collection's `url` fields. zod checks the id
  is a `url` field of this collection.
- Rendering, in table and grid, when the item has a value in that field:
  - Public: the title is an `<a href>` to the URL with `rel="noreferrer"`.
  - Admin: the title still opens the edit page. A small "↗" link right after it opens the source, with an accessible
    label like "Source of <title>".
- The link is only used while the field is still type `url` and, on public pages, public. A field turned private or
  changed to another type gives a plain title, and it never shows on a public page.
- The URL field's own column stays where it is; hiding it is up to the field's visibility as today.

## UI requirements

- Public titles that link look like the app's other links (the ink underline). Titles without a value look as today.
- The admin "↗" link is small, is a large enough tap target at 360 px, and sits on the title line in table and grid.
- Settings: the select sits under the collection's default view (or default sort, if TICKET-COL-07 is in), with
  explicit i18n ids (EN + NL).

## Acceptance criteria

- [x] With "Title links to: Shop link" set on a collection, a want with a shop link has a clickable title on its
      public page that opens that URL. A want without one shows plain text. (Scratch instance, 2026-11-14, "Title
      links to: Discogs" saved in settings: on `/vinyl/want` in table and grid, What's Going On and Blue link to their
      discogs.com URLs with `rel="noreferrer"`; Rumours, without a value, is plain text. `Title` / `sourceOf` in
      `src/routes/item-views.tsx`.)
- [x] In admin, clicking the title still opens the edit page, and the "↗" next to it opens the source. (Same list in
      admin, table and grid: title → `/admin/c/vinyl/items/<id>`, then a "↗" labelled "Source of <title>" → the
      URL; 24×24 px at 360 px.)
- [x] Making the link field private removes the links from public pages. Its URLs appear nowhere in public HTML.
      (Discogs made private: `discogs` occurs 0 times in the public want table, want grid and have HTML; admin keeps
      its 2 "↗" links. The link field is resolved from the viewer's own fields, and `publicOnly` strips the values.)
- [x] Deleting the link field, or changing its type away from `url`, turns the titles back into plain text without
      an error. (Discogs changed to text: no title links to it on public or admin pages; deleted:
      `title_link_field_id` went to null and the pages rendered with plain titles.)
- [x] A forged `titleLinkFieldId` (a non-URL field, another collection's field) is rejected. (`parseSettings` takes
      only "" or the collection's url field ids; tests "refuses a title link to a non-url field, another
      collection's field or junk". Live: the form posted with the text Title field's id saved nothing.)
- [x] Persistence goes through `src/db/collections.ts`. The action calls `requireAdmin()` and validates with zod.
      (`updateCollection` writes `title_link_field_id`; the settings action is `collectionAction` with
      `requireAdmin()` and the zod `parseSettings`.)
- [x] Unit tests cover: the migration on a version-4 DB, setting/clearing the link field, `ON DELETE SET NULL` when the
      field is deleted, and the validation rejecting non-URL and foreign fields. (`migrate.test.ts` "007-title-link"
      on a version-6 DB, since 005 and 006 shipped meanwhile; `collections.test.ts` "sets and clears the title link,
      and clears it when its field is deleted"; `validation.test.ts` "reads the title link" and "refuses a title link
      …".)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the have and want
      tabs (table and grid), admin and public, at 360 px and desktop, JS on and off. (Orca at 1440 px and 360 px:
      public titles carry the ink underline, the admin "↗" sits on the title line without one. Headless Chrome with
      scripts disabled: choosing Discogs and saving said "Saved.", and the public want titles linked out. DESIGN.md
      tables section and technical-design § Collection describe it.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: no issues in 14 changed files.)

## Notes

- Independent, can ship any time.
- Other open COL tickets add migrations too. Whichever lands later takes the next number.
- Admin keeps the title as the edit link on purpose: making it the source link would leave no obvious way to open an
  item. Revisit if the "↗" feels too small in use.
- One link field per collection. Choosing it per status (have vs want) is out of scope.
