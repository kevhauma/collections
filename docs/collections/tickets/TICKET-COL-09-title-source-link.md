# TICKET-COL-09: Link the title to a URL field (source link)

- **Area:** Collections
- **Released in:** _unreleased_
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

- [ ] With "Title links to: Shop link" set on a collection, a want with a shop link has a clickable title on its
      public page that opens that URL. A want without one shows plain text.
- [ ] In admin, clicking the title still opens the edit page, and the "↗" next to it opens the source.
- [ ] Making the link field private removes the links from public pages. Its URLs appear nowhere in public HTML.
- [ ] Deleting the link field, or changing its type away from `url`, turns the titles back into plain text without
      an error.
- [ ] A forged `titleLinkFieldId` (a non-URL field, another collection's field) is rejected.
- [ ] Persistence goes through `src/db/collections.ts`. The action calls `requireAdmin()` and validates with zod.
- [ ] Unit tests cover: the migration on a version-4 DB, setting/clearing the link field, `ON DELETE SET NULL` when the
      field is deleted, and the validation rejecting non-URL and foreign fields.
- [ ] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the have and want
      tabs (table and grid), admin and public, at 360 px and desktop, JS on and off.
- [ ] Verified with the fallow skill.

## Notes

- Independent, can ship any time.
- Other open COL tickets add migrations too. Whichever lands later takes the next number.
- Admin keeps the title as the edit link on purpose: making it the source link would leave no obvious way to open an
  item. Revisit if the "↗" feels too small in use.
- One link field per collection. Choosing it per status (have vs want) is out of scope.
