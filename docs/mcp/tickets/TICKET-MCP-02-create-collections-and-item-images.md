# TICKET-MCP-02: MCP tools to create collections and set item images from a URL

- **Area:** MCP
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** [technical-design.md § Auth and security](../../technical-design.md#auth-and-security), extends [TICKET-MCP-01](./TICKET-MCP-01-admin-mcp-server.md) (which left images out), reuses TICKET-COL-01 (create collection) and TICKET-ITM-04 (item images from a URL)

## User story

As the admin, I want my AI agent to create a new collection and give items a picture from an image URL, so I can set
up and fill a collection entirely by asking, without going back to the browser for those two steps.

## Description

Add a `create_collection` tool, and an image URL to `create_item` / `update_item` (plus a way to remove the image).
Both go through the same parsers and image pipeline as the admin UI. The image download, now triggered by an agent,
refuses internal addresses.

## Current situation (as-is)

- [src/features/mcp/tools.ts](../../../src/features/mcp/tools.ts) has `list_collections`, `get_collection`,
  `list_items`, `get_item`, `create_item`, `update_item`, `delete_item`, `move_want`, `create_field`,
  `update_field`. There's no way to create a collection, and items can't get an image: TICKET-MCP-01 left images out
  ("New tools … images are each their own ticket"). `itemOut` doesn't return the image either.
- The UI creates a collection in [src/routes/admin-collection-new.tsx](../../../src/routes/admin-collection-new.tsx):
  `parseCreate(form, listSlugs())` ([src/features/collections/validation.ts](../../../src/features/collections/validation.ts):
  name, slug format, reserved, taken), then `createCollection(name, slug, titleLabel)`
  ([src/db/collections.ts](../../../src/db/collections.ts)), with the title field's label translated from
  `collections.titleField` in the admin's language.
- Item images: [src/features/images/change.ts](../../../src/features/images/change.ts) `prepareImage({ url })` downloads
  via [src/features/images/fetch.ts](../../../src/features/images/fetch.ts) `downloadImage` (http(s) only, 15 s,
  `image/*`, 15 MB) and `processImage` writes the webp files; `saveItem`
  ([src/features/items/item-changes.ts](../../../src/features/items/item-changes.ts)) takes `image` (id / `null` to
  remove / `undefined` to keep) and `commitImage` cleans up old or orphaned files.
- `downloadImage` uses plain `fetch` and follows redirects. Internal addresses are an accepted risk because only the
  admin can paste a URL. An agent can be steered by content it reads (prompt injection), so through MCP that risk is
  no longer the admin's own choice.
- An internal-address guard already exists: `publicFetch` in [src/features/oauth/oauth.ts](../../../src/features/oauth/oauth.ts)
  (BlockList of loopback / private / link-local / CGNAT ranges), and `downloadImage` already takes a `fetcher`.

## Desired result (to-be)

### `create_collection`

- Input: `name` (required), `slug` (optional; when missing, derived as the UI does: `slugify` + `uniqueSlug` from
  [src/features/collections/slug.ts](../../../src/features/collections/slug.ts), or whatever the create form does
  today).
- Validated by `parseCreate` against `listSlugs()`: the same English messages for a blank name, bad format, reserved
  or taken slug, returned as a tool error.
- Writes through `createCollection` with the same translated title-field label (request locale "en" under MCP, so
  "Title").
- Returns the new collection as `get_collection` does (slug, name, public, defaultView, fields), so the agent can add
  fields straight after.
- The UI action and the tool share one function for parse + title label + create, instead of the tool copying the
  route's steps.

### Images on items

- `create_item` and `update_item` gain `imageUrl` (optional string): downloaded, checked and processed with
  `prepareImage({ url })`, then saved with the item through `saveItem` (so `commitImage` handles cleanup).
- `update_item` gains `removeImage: true` to clear the image; `imageUrl` together with `removeImage` is refused.
  Leaving both out keeps the current image.
- An `ImageError` becomes a tool error with a plain English reason (not an image / larger than 15 MB / couldn't
  download), from the existing `imageErrorText` messages. When the image fails, the item is not written.
- `itemOut` (so `get_item`, `list_items` and every write's result) includes `image`: the `imageUrl(id)` path, or
  `null`.
- Under MCP the download refuses internal addresses: `downloadImage` gets `publicFetch` as its fetcher, and redirects
  are not followed blindly (`redirect: "error"`, or each hop re-checked), since `publicFetch` checks only the first
  host. The admin UI's behaviour stays as it is unless a shared fix is simpler.
- Uploading image bytes directly (base64) is out of scope: URL only.

## UI requirements

- None. The UI's create-collection form and item image inputs behave as before.

## Acceptance criteria

- [x] `create_collection` with a valid name (and optional slug) creates the collection with its title field and
      returns it in the `get_collection` shape; it then shows in `list_collections` and in the admin UI. (`tools.test.ts`
      › "create_collection" › "creates a private collection with its title field …"; live over `POST /api/mcp`:
      `{"name":"Jazz Records"}` returned slug `jazz-records`, private, one required Title field; it opened at
      `/admin/c/jazz-records`.)
- [x] `create_collection` refuses a blank name, a malformed, reserved (e.g. `admin`) or taken slug with the same
      messages as the form; nothing is created. (`tools.test.ts` › "refuses a blank name and a malformed, reserved or
      taken slug …": the four form messages, collection count unchanged; live: slug `admin` → `isError` "slug: This
      address is used by the app itself.")
- [x] The UI create action and the tool use one shared create function; the route keeps working (redirect to the
      new collection, errors on the form). (`addCollection` in `src/features/collections/collection-changes.ts`, called
      by `admin-collection-new.tsx`'s action and the tool. Live form: "Stamps" with address `admin` showed "This
      address is used by the app itself" with both inputs kept; clearing the address redirected to `/admin/c/stamps`.)
- [x] `create_item` / `update_item` with an `imageUrl` to a public image store the processed webp and thumbnail and
      return `image: "/uploads/<id>.webp"`; the item's page and list show it. (`tools.test.ts` › "create_item downloads
      imageUrl and returns its path" checks both files and the stored id; live: `create_item` with
      `https://httpbin.org/image/png` returned `/uploads/0d821260-….webp`, `uploads/` held the `.webp` and `.thumb.webp`,
      and the admin list showed the picture on its post-it.)
- [x] `update_item` with a new `imageUrl` replaces the image and deletes the old files; `removeImage: true` clears it
      and deletes the files; neither given keeps it; both given is refused. (`tools.test.ts` › "update_item replaces,
      keeps and removes the image, and refuses imageUrl with removeImage".)
- [x] A URL that isn't http(s), isn't an image, is over 15 MB, times out, or resolves to an internal address
      (`127.0.0.1`, `10.x`, `192.168.x`, `localhost`, link-local), or redirects to one, is refused with a clear tool
      error; no item row changes and no files are left in `uploads/`. (`tools.test.ts` › "refuses a bad or internal
      image, writing no item and leaving no files" (ftp, HTML, declared 16 MB, a `TimeoutError`, a redirect, and
      127.0.0.1 / 10.0.0.5 / 192.168.1.2 / 169.254.169.254 / localhost, which never reach `fetch`; the redirecting
      URL was fetched with `redirect: "error"`, and removing that option fails the test) and "leaves an existing item
      and its image alone when the new image is refused". Live: `http://localhost:3123/healthz` and an httpbin
      redirect to 127.0.0.1 were both refused, no files added. Each says "imageUrl: " plus the form's message;
      internal addresses and redirects read "Couldn't download an image from that address.")
- [x] Every item result (`get_item`, `list_items`, writes) includes `image` (path or `null`). (`itemOut` in
      `tools.ts`; `tools.test.ts` › "get_item" expects `image: null`, the image tests read it from `create_item`,
      `update_item`, `list_items` and `get_item`.)
- [x] Tool descriptions say what each new argument does, and the tools appear in `tools/list`. (`imageUrl`,
      `removeImage`, `name` and `slug` carry `.describe()` texts and the tool descriptions mention them; live
      `tools/list` lists `create_collection` among the 11 tools.)
- [x] Unit tests (`tools.test.ts`, with a stub fetcher): "create_collection" creates with title field, derives a
      slug, refuses blank / reserved / taken; "create_item" with imageUrl saves the image; "update_item" replaces,
      removes, keeps, refuses imageUrl + removeImage; image errors (not an image, too large, internal address,
      redirect to internal) leave the item unchanged and no orphan files. (`describe("create_collection")` 3 cases,
      `describe("item images")` 4 cases; the global `fetch` is stubbed and public hosts are IP literals so the
      address check needs no DNS. `npm test`: 37 files, 924 tests passed.)
- [x] Live check with an MCP client (or the MCP inspector) against a running instance: create a collection, add a
      field, add an item with an image URL, see it in the admin UI. (Raw JSON-RPC over `POST /api/mcp` with a Bearer
      token minted in a scratch copy of the database, against `npm start`: `create_collection` "Jazz Records",
      `create_field` "Year", `create_item` "Blue Train" (1957) with an image URL; Orca browser showed it with its
      picture at `/admin/c/jazz-records`. Not run through Claude Code or the inspector.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 0 dead code, 0 complexity,
      0 duplication, no issues in the changed files.)

## Notes

- Needs TICKET-MCP-01 (the MCP server; shipped on main, still marked _unreleased_).
- `publicFetch` has a known DNS-rebinding shortcut (see its comment); this ticket inherits it, it doesn't fix it.
- Redirects are refused (`redirect: "error"`) rather than re-checked per hop, so an image URL that redirects (even
  to a public host) is refused; marked as a `shortcut:` in `tools.ts`.
- Collection settings (rename, public flag, default view, cover picture) and deleting collections stay out of scope;
  each would be its own ticket.
