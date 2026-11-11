# Technical design

A self-hosted web app to manage collections of anything (vinyl records, LEGO, card decks, …) with
user-defined fields, and to share a **have** and **want** list per collection.

Decided in a design session on 2026-11-11. Build plan and tickets: [releases/v1/overview.md](releases/v1/overview.md).

## Scope

**One owner.** A single admin account manages everything. Everyone else is an anonymous, read-only visitor.

| v1 | v2 |
|---|---|
| First-run setup, admin login | Restore from export zip (empty instance only) |
| Collections with field editor and public toggle | Mapped CSV import (design still open, see [TICKET-IMP-01](import/tickets/TICKET-IMP-01-csv-import.md)) |
| Items: one image, `have` + quantity, `want` + rank | Catalog lookups (Discogs, Rebrickable, Scryfall) |
| Table and grid views, search / sort / filter | |
| Public index and public collection pages | |
| Full zip export (JSON + CSV + images) | |
| NL + EN UI | |

## Domain

### Collection

- A collection **is** its own schema: one level, no separate "type". Categorising inside a collection is done
  with a select field plus a filter.
- Has `name`, `slug`, `is_public` (default **off**), `default_view` (`table` | `grid`), and a `title_field_id`.

### Field

- Types: `text`, `number`, `date`, `select`, `checkbox`, `url`. Nothing nested.
- Each field has: `label`, `type`, `options` (select only: list of strings), `required`, `is_public` (default on),
  `position`.
- **Title field**: exactly one per collection, always required and always public. Created with the collection.
- `is_public = false` fields (e.g. purchase price, storage location) **never leave the server** on public routes.
  They are stripped at the query layer, not only hidden in the UI.

### Item

- `status`: `have` or `want`.
  - `have` carries `quantity` (integer ≥ 1, default 1). No rank.
  - `want` carries `rank` (dense integer, 1..n per collection). No quantity.
  - Enforced with a CHECK constraint.
- `values`: JSON object keyed by **field id**, so renaming a field touches no item data.
- One optional image.

### Want ranking

- Rank is per collection, dense integers 1..n, 1 = most wanted.
- Reorder by drag-and-drop **or** by typing a rank number; the other wants shift to make room. Both go through one
  transaction that renumbers.
- `have → want`: item joins at the **bottom** (rank n+1).
- `want → have`: rank is cleared and the gap closed.
- Deleting a want closes the gap.
- See [ADR 0004](adr/0004-dense-integer-ranks.md).

### Schema evolution

| Change | Behaviour |
|---|---|
| Rename field | Free: values are keyed by id. |
| Reorder fields | Free: changes column order and form order. |
| Delete field | Confirm, then remove the key from every item. The export is the undo. |
| Change field type | Preview: convert what parses, list values that would be blanked, apply on confirm. |
| Rename select option | Rewrite matching item values (one `json_set` UPDATE). |
| Remove select option | Preview affected items, blank those values on confirm. |
| Make a field required | Allowed; existing blank values stay until the item is next edited. |

### Slugs

- Generated from the name (`Magic: The Gathering` → `magic-the-gathering`), unique, editable.
- No redirect from an old slug: old shared links 404. Accepted for a personal app.
- Reserved: `admin`, `setup`, `uploads`, `api`, `locale`, `assets`.
- See [ADR 0005](adr/0005-plain-public-slugs.md).

## Routes

### Public (no client JS)

| Route | Shows |
|---|---|
| `/` | Index of public collections. |
| `/:slug` | The `have` tab of a public collection. |
| `/:slug/want` | The `want` tab, ordered by rank by default. |
| `POST /locale` | Sets the locale cookie and redirects back (works without JS). |

- Private or unknown collections return **404**, not a login prompt.
- View, search, sort and filter live in the query string and are handled on the server through GET forms:
  `?view=grid&q=blue&sort=<fieldId>&dir=desc&f.<fieldId>=<value>`.
- Public pages should ship essentially no client JS. Interactive primitives use native `<dialog>` and the
  Popover API.

### Admin

| Route | Purpose |
|---|---|
| `/setup` | Set the admin password. Works only while no admin exists, then 404s for good. |
| `/admin` | Login (unlinked from the public site), then dashboard: list of collections. |
| `/admin/collections/new` | Create a collection. |
| `/admin/c/:slug` | Items in table or grid view, have/want tabs, search / sort / filter, reorder wants. |
| `/admin/c/:slug/settings` | Name, slug, public toggle, default view, delete collection. |
| `/admin/c/:slug/fields` | Field editor. |
| `/admin/c/:slug/items/new`, `/admin/c/:slug/items/:id` | Item form. |
| `/admin/settings` | Default language for visitors. |
| `/admin/export` | Download the full export zip. |

Admin pages may use client components freely.

## Auth and security

- First-run `/setup` stores a password hash in `admin`. Hash with `node:crypto` `scrypt` and compare with
  `timingSafeEqual` (no native dependency).
- Sessions: random 32-byte token in an `httpOnly`, `SameSite=Lax`, `Secure` cookie; the DB stores its SHA-256 hash.
  30-day expiry, sliding.
- Login rate limit: 5 failed attempts per minute, in memory (single process).
- Lost password: `npm run reset-password` inside the container.
- Every server action re-checks the session. Actions are public HTTP endpoints even when nothing links to them.
- All action input is validated with zod on the server.
- Mutating requests check `Origin` matches the host, on top of `SameSite=Lax`.
- TLS is handled by the reverse proxy in front of the app. The `Secure` cookie requires HTTPS.

## Images

- Source: file upload (max 15 MB) **or** a pasted URL. URLs are downloaded once and stored like uploads (no
  hotlinking: links rot and leak visitor IPs).
- `sharp` produces `<uuid>.webp` (max 1000 px) and `<uuid>.thumb.webp` (max 300 px). The original is not kept.
- Served from `/uploads/`. Filenames are random UUIDs, so images of private collections are unlisted, not
  access-controlled. Accepted.
- Replacing or deleting an item's image deletes the old files.

## Export (backup)

`GET /admin/export` streams `collections-export-<date>.zip`:

```
data.json            # full backup: settings, collections, fields, items. The format v2 restore reads.
csv/<slug>.csv       # one human-readable file per collection, columns = field labels + status/quantity/rank/image
images/<file>.webp   # all images
```

Both `data.json` and the CSVs reference images by their path inside the zip (`images/<uuid>.webp`). `data.json`
carries a `version` number for v2 restore.

## Data model

```sql
admin(id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL)
sessions(token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)
settings(id INTEGER PRIMARY KEY CHECK (id = 1), default_locale TEXT NOT NULL DEFAULT 'en')
collections(id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
            is_public INTEGER NOT NULL DEFAULT 0, default_view TEXT NOT NULL DEFAULT 'table',
            title_field_id INTEGER, created_at, updated_at)
fields(id INTEGER PRIMARY KEY, collection_id INTEGER NOT NULL REFERENCES collections ON DELETE CASCADE,
       label TEXT NOT NULL, type TEXT NOT NULL, options_json TEXT, required INTEGER NOT NULL DEFAULT 0,
       is_public INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL)
items(id INTEGER PRIMARY KEY, collection_id INTEGER NOT NULL REFERENCES collections ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('have','want')),
      quantity INTEGER, rank INTEGER,
      values_json TEXT NOT NULL DEFAULT '{}', image TEXT, created_at, updated_at,
      CHECK ((status = 'have' AND quantity >= 1 AND rank IS NULL)
          OR (status = 'want' AND rank >= 1 AND quantity IS NULL)))
```

- Values in `values_json` are keyed by field id as a string: `{"12": "Kind of Blue", "13": 1959}`.
- Search uses `json_each(values_json)` restricted to text-like field ids. Sort uses
  `json_extract(values_json, '$."<id>"')`.

## Stack

| Concern | Choice |
|---|---|
| Rendering | React 19 Server Components via **React Router v8 RSC, data mode**, on **`@vitejs/plugin-rsc`**, served by **Express** through `@remix-run/node-fetch-server`. See [ADR 0001](adr/0001-rsc-react-router-vite.md). |
| Versions | **Exact pins** for `react`, `react-dom`, `react-server-dom-*`, `react-router`, `@vitejs/plugin-rsc`, `@lingui/*`. Everything in this layer is officially experimental. |
| Mutations | `'use server'` actions bound to `<form action>`, so they work before hydration. Client-invoked actions only where a form doesn't fit (dropping a dragged want), with `useOptimistic`. |
| Client components | Admin: allowed freely. Public: avoid. Drag-and-drop uses native HTML drag events, no `@dnd-kit`. |
| Database | `better-sqlite3`, plain SQL, numbered `.sql` migrations applied at startup. See [ADR 0003](adr/0003-plain-sql.md). |
| Validation | zod. Item schemas are built at runtime from a collection's field definitions by one function shared by server and client. |
| Styling | Tailwind (v4, `@tailwindcss/vite`). |
| UI library | Own components in `src/ui/`: native `<dialog>` / Popover API, variants with `cva` + `tailwind-merge`. No showcase page, no Storybook. |
| i18n | Lingui, explicit message ids, minimal JSON catalogs, NL + EN. Imports go through `src/i18n/` where possible. See [ADR 0002](adr/0002-lingui-explicit-ids.md). |
| Locale | Cookie → `Accept-Language` → `settings.default_locale`. No URL prefix. User-typed content (collection names, field labels, options) is not translated. |
| Images | `sharp`. |
| Zip | `yazl` for writing (v2 restore: `yauzl`, same author). CSV writing is a small hand-written RFC 4180 escaper. |
| Tests | vitest unit tests for most logic. No component tests unless asked. |
| Deploy | One Docker image (`node:*-slim`, glibc, for `sharp` and `better-sqlite3` prebuilds), one `/data` volume holding `db.sqlite` and `uploads/`. Behind your TLS reverse proxy. |

### i18n caveats (from [research](research/lingui-rsc.md))

- In server components call `setI18n` per request in the root server component (Lingui stores it in `React.cache`).
- `setI18n` does **not** reach server actions (Lingui issue #2615). Translated messages returned from actions use
  `i18n._(…)` on an instance built from the request's locale.
- Client components get an `I18nProvider` fed with the locale and messages from the server.

### Backups

The `/data` volume is covered by the server's own backups. The admin export zip is the portable backup.

## Parked

- **CSV import** (v2): mapping CSV columns to status/quantity/rank, duplicate detection (match field, skip or update),
  bad-row reporting, unmapped columns becoming new fields. Open questions live in [TICKET-IMP-01](import/tickets/TICKET-IMP-01-csv-import.md).

## Ticketing defaults

Chosen while writing tickets, not in the design session. Each one is flagged in its ticket, so change it there:

- Admin password minimum length 12 ([TICKET-AUTH-01](auth/tickets/TICKET-AUTH-01-first-run-setup.md)).
- The login rate limit is global, not per IP ([TICKET-AUTH-02](auth/tickets/TICKET-AUTH-02-login-and-sessions.md)).
- Slugs truncated to 60 characters ([TICKET-COL-01](collections/tickets/TICKET-COL-01-collection-management.md)).
- No pagination in v1. Grid cards show the title + the first two fields ([TICKET-ITM-05](items/tickets/TICKET-ITM-05-collection-views.md)).
- Export includes display-size images only; thumbnails are regenerated on restore ([TICKET-BAK-01](backup/tickets/TICKET-BAK-01-export-zip.md)).
