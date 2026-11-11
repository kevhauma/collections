# TICKET-COL-01: Collection management (create, settings, delete)

- **Area:** Collections
- **Released in:** _unreleased_
- **Traceability:** [technical-design.md § Collection](../../technical-design.md#collection), [technical-design.md § Slugs](../../technical-design.md#slugs), [ADR 0005](../../adr/0005-plain-public-slugs.md)

## User story

As the admin, I want to create collections like "Vinyl" or "LEGO" and control their name, URL and visibility, so I
can organise anything I collect and decide what the world can see.

## Description

The admin dashboard listing collections, a create form, a settings page (name, slug, public toggle, default view)
and deletion. Each new collection gets its required title field.

## Current situation (as-is)

- `collections` and `fields` tables exist (TICKET-PLAT-03). `/admin` shows an empty dashboard behind login
  (TICKET-AUTH-02).

## Desired result (to-be)

- `src/db/collections.ts` repository: `list` (with have/want counts), `getBySlug`, `create`, `update`, `delete`.
  All SQL for collections lives here.
- `src/features/collections/slug.ts`:
  - `slugify(name)`: NFKD, strip diacritics, lowercase, non-alphanumerics → `-`, collapse and trim dashes. An empty
    result becomes `collection`.
  - `uniqueSlug(base, taken)`: appends `-2`, `-3`, … for generated slugs.
  - Reserved slugs: `admin`, `setup`, `uploads`, `api`, `locale`, `assets`.
- Create (`/admin/collections/new`):
  - inputs: name, optional slug
  - in one transaction, inserts the collection plus a title field (label "Title" in the admin's current locale,
    type `text`, required, public, position 1) and sets `title_field_id`
  - redirects to the collection
- Settings (`/admin/c/:slug/settings`):
  - name; slug (edited by hand, so a taken or reserved slug is a validation error, not auto-suffixed)
  - `is_public` (default off), `default_view` (`table` / `grid`)
  - a warning that changing the slug breaks links already shared
- Delete: a confirm dialog naming the collection. It cascades fields and items and deletes the items' image files
  once TICKET-ITM-04 exists.
- Dashboard (`/admin`): cards or rows with name, public badge, have/want counts, and links to items, fields and
  settings. Empty state with a "Create your first collection" action.

## UI requirements

- Dashboard, create form and settings form, built from `src/ui/`. The slug input shows the resulting public URL.
- A small client component may live-preview the slug from the name (admin only). The server still derives the slug
  when the field is empty.

## Acceptance criteria

- [ ] Creating "Magic: The Gathering" yields slug `magic-the-gathering` and a title field.
- [ ] Creating a second collection with the same name gets `-2`. Manually entering a taken or reserved slug shows a
      validation error.
- [ ] New collections are private. A private collection's public URL 404s (verified once TICKET-PUB-02 lands).
- [ ] Deleting a collection removes its fields and items (cascade) and, once TICKET-ITM-04 exists, its image files.
- [ ] Persistence goes through `src/db/collections.ts`. No SQL in route modules or components.
- [ ] Every action calls `requireAdmin()` and validates input with zod.
- [ ] Unit tests cover `slugify`: "Magic: The Gathering", "Café Ölé", leading and trailing symbols, emoji-only →
      `collection`, very long names truncated to 60 characters at a dash boundary. `uniqueSlug` suffixing and
      reserved-word handling are also covered.
- [ ] Live browser check of create, edit, toggle public and delete.
- [ ] Verified with the fallow skill.

## Notes

- Needs TICKET-AUTH-02 and TICKET-UI-02.
- The 60-character slug limit is a default chosen during ticketing.
- The title field's label is user content once created. It's not re-translated when the locale changes.
