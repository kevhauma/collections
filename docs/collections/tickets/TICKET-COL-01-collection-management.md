# TICKET-COL-01: Collection management (create, settings, delete)

- **Area:** Collections
- **Released in:** [v1](../../releases/v1/overview.md)
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

- [x] Creating "Magic: The Gathering" yields slug `magic-the-gathering` and a title field. (`collections.test.ts`
      "creates a private collection with its required, public title field"; live: POST /admin/collections/new →
      302 `/admin/c/magic-the-gathering`, DB title field `Title`/text/required/public/position 1, `Titel` with the
      nl locale)
- [x] Creating a second collection with the same name gets `-2`. Manually entering a taken or reserved slug shows a
      validation error. (`validation.test.ts` parseCreate cases; live: second create → `magic-the-gathering-2`, typed
      `magic-the-gathering` / `admin` on create and settings show "Another collection already uses this address." /
      "This address is used by the app itself.", red outline in the browser)
- [x] New collections are private. A private collection's public URL 404s (verified once TICKET-PUB-02 lands).
      (`collections.test.ts` asserts `isPublic: 0`; dashboard shows the pencil "Private" badge; `/magic-the-gathering`
      answers 404 today through the catch-all route. Re-check against the real public route in TICKET-PUB-02)
- [x] Deleting a collection removes its fields and items (cascade) and, once TICKET-ITM-04 exists, its image files.
      (`collections.test.ts` "deletes a collection with its fields and items"; live: deleting `mtg` with one item left
      0 items and no fields for it. Image files: `deleteCollection` carries a `shortcut:` for TICKET-ITM-04)
- [x] Persistence goes through `src/db/collections.ts`. No SQL in route modules or components. (grep for
      `prepare(` / `.exec(` in `src/routes` and `src/features/collections` finds nothing)
- [x] Every action calls `requireAdmin()` and validates input with zod. (`admin-collection-new.tsx` and
      `admin-collection-settings.tsx`: loader and action call `requireAdmin()`, then `parseCreate` / `parseSettings`
      in `src/features/collections/validation.ts`; live: anonymous POSTs to both answer 401)
- [x] Unit tests cover `slugify`: "Magic: The Gathering", "Café Ölé", leading and trailing symbols, emoji-only →
      `collection`, very long names truncated to 60 characters at a dash boundary. `uniqueSlug` suffixing and
      reserved-word handling are also covered. (`src/features/collections/slug.test.ts`: 13 cases, including a
      suffix that stays within 60 characters)
- [x] Live browser check of create, edit, toggle public and delete. (Orca browser, JS on, desktop 1440 px and
      360 px: dashboard cards, live slug preview `…/cafe-ole-vinyl`, settings edit moving to `/admin/c/vinyl/settings`
      with public + grid kept, "Saved.", delete dialog naming "Vinyl", back to /admin. JS off via plain form posts:
      the same flows answer 302/200. That check found and fixed a crash: after a form post RSC renders with
      `loaderData: null`, so the pages read the collection from `params`. Screens match the notebook direction)
- [x] Verified with the fallow skill. (0 complexity findings, 0 duplicates. Dead code: `src/ui/table.tsx`,
      `src/ui/popover.tsx` and `Textarea` became unreferenced when the placeholder dashboard went; they're kept on
      purpose for the ITM tickets. `formatDate` and the `action` duplicate-export were already reported before)

## Notes

- Needs TICKET-AUTH-02 and TICKET-UI-02.
- The 60-character slug limit is a default chosen during ticketing.
- The title field's label is user content once created. It's not re-translated when the locale changes.
