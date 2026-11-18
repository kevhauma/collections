# TICKET-WSH-09: Admin pages for several wishlists

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** changes [technical-design.md § Routes: Admin](../../technical-design.md#admin); revises
  [TICKET-WSH-03](./TICKET-WSH-03-admin-wishlist.md); mirrors [TICKET-COL-01](../../collections/tickets/TICKET-COL-01-collection-management.md)

## User story

As the admin, I want to create, rename, publish and delete wishlists and manage each one's items, so I can run
several lists side by side from desktop or phone.

## Description

The admin "Wishlist" section becomes a list of wishlists with a "New wishlist" form. Each wishlist gets the page
WSH-03 built (ranked items, drag or typed rank, item form) plus a settings page for name, slug, public, reminders and
delete, laid out like a collection's settings.

## Current situation (as-is)

- `/admin/wishlist` ([src/routes/admin-wishlist.tsx](../../../src/routes/admin-wishlist.tsx)) shows the one wishlist
  with its public toggle. Items live at `/admin/wishlist/items/new|:id`
  ([src/routes/admin-wishlist-item.tsx](../../../src/routes/admin-wishlist-item.tsx)), saved through
  [src/features/wishlist/wish-changes.ts](../../../src/features/wishlist/wish-changes.ts).
- Drag-and-drop calls `moveWishItemAction` in [src/routes/item-actions.ts](../../../src/routes/item-actions.ts).
- Collections have the pattern to copy: `/admin/collections/new`
  ([src/routes/admin-collection-new.tsx](../../../src/routes/admin-collection-new.tsx)), `/admin/c/:slug`, and
  `/admin/c/:slug/settings` ([src/routes/admin-collection-settings.tsx](../../../src/routes/admin-collection-settings.tsx))
  with name, slug, public toggle and delete.
- [src/routes/admin-nav.tsx](../../../src/routes/admin-nav.tsx) links "Wishlist";
  [src/routes/admin-section.ts](../../../src/routes/admin-section.ts) maps `/admin/wishlist` to that section.

## Desired result (to-be)

- `/admin/wishlists`: the wishlists by name, each with its visibility badge and item count, linking to its page, and
  a "New wishlist" button. Empty state with that button when there are none.
- `/admin/wishlists/new`: a name; the slug is generated with `uniqueSlug` among wishlist slugs. Redirects to the new
  wishlist's page.
- `/admin/w/:slug`: today's admin wishlist page for that wishlist (ranked table, drag, typed rank, "+ Add item"), its
  name as the heading, and a link to its settings. Unknown slug → 404.
- `/admin/w/:slug/items/new` and `/admin/w/:slug/items/:id`: today's item form. An item id from another wishlist → 404.
- `/admin/w/:slug/settings`: name, slug (validated like a collection slug, unique among wishlists), "Public: anyone
  with the link can see it", "Show my collections' want lists on this wishlist" (TICKET-WSH-06's reminders), and
  Delete behind a confirm dialog that names the item count. Delete removes the items' image files and redirects to
  `/admin/wishlists`.
- The nav item reads "Wishlists" and links to `/admin/wishlists`; the section covers `/admin/wishlists` and
  `/admin/w/`. The old `/admin/wishlist` routes go.
- The drag action and the typed-rank form check the item belongs to the wishlist in the URL.
- Every action calls `requireAdmin()` and validates with zod.

## UI requirements

- The wishlists list reads like the admin collection list. Settings reuse the collection settings' cards and
  `DeleteDialog`.
- Works without JavaScript (typed rank, plain form posts) and at 360 px. Explicit i18n ids (EN + NL) for every new
  string.

## Acceptance criteria

- [x] Creating "Birthday" makes a private wishlist at `/admin/w/birthday`; a second "Birthday" gets `birthday-2`.
      (production build, 2026-11-18: two posts to `/admin/wishlists/new` redirected to `/admin/w/birthday` and
      `/admin/w/birthday-2`, both "Private"; `addWishlist` in `src/features/wishlist/wish-changes.ts`)
- [x] Items added, edited, reordered and deleted on one wishlist never show up on or change another. (production
      build: three items on `birthday`, one on `birthday-2`; a typed-rank post, an edit, a delete and a JS drag in Orca
      on `birthday` left `birthday-2` at its one item; per-wishlist ranks also in `src/db/wishlist.test.ts`)
- [x] Posting a move or an edit for an item of wishlist A to wishlist B's URL is refused (400 or 404). (move → 400,
      edit and GET → 404, `/items/04` → 404; `requireWish` in `src/features/wishlist/require-wishlist.ts`,
      `moveWishItem(wishlistId, …)` for both the route action and `moveWishItemAction`)
- [x] Renaming and changing the slug moves the admin pages to the new slug; a taken or reserved-pattern slug is
      refused with a message. (rename to Verjaardag / `verjaardag` redirected to `/admin/w/verjaardag/settings`, the
      old slug 404s; `birthday-2` → "Another wishlist already uses this address.", `Bad Slug` → the format message.
      ~~`admin` → "This address is used by the app itself."~~ Fixed in TICKET-WSH-10: the collections' reserved list
      refused the migrated wishlist's own slug `wishlist`, so wishlist slugs now skip it, as TICKET-WSH-08 says; they
      live under `/wishlist/`)
- [x] The public and reminders checkboxes save (ticked, unticked). (both ticked, then both unticked: the inputs
      rendered `checked` and then not, with "Saved.")
- [x] Deleting a wishlist removes it, its items and their image files. (`birthday-2` with an uploaded image: delete
      redirected to `/admin/wishlists`, its page 404s, `uploads/` went from 2 files to 0; `removeWishlist`)
- [x] Persistence goes through `src/db/wishlist.ts`; every action calls `requireAdmin()` and validates with zod.
      (`wishlistAction` and the new-wishlist action call `requireAdmin()`; `parseCreate`, `parseWishlistSettings`,
      `wishMoveSchema`, `wishSchema`, and `moveSchema` in `item-actions.ts`)
- [x] Unit tests cover: the settings parsing (name, slug, both checkboxes ticked / absent), the move-scope check, and
      the admin section mapping for the new paths. (`src/features/wishlist/validation.test.ts` "parseWishlistSettings";
      `src/db/wishlist.test.ts` "refuses to move an unknown item, or one of another wishlist";
      `src/routes/admin-section.test.ts` `/admin/wishlists`, `/admin/w/…`)
- [x] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS off. (Orca, dark
      paper: the wishlists list uses the collection list's card (now the shared `AdminListCard`) at 1440 px; the
      wishlist page (shared `AdminPageHeading`, want-tab table) and settings (name/slug with a `/wishlist/<slug>`
      preview, two checkboxes, Delete card, dialog "It and its 2 items will be gone") at 360 px, page scrollWidth 360.
      JS off: every flow above was run as plain form posts with curl against the production build)
- [x] Verified with the fallow skill and the coding-conventions skill. (`fallow audit --base HEAD`: dead code 0,
      complexity 0, duplication 0 after extracting `src/routes/admin-parts.tsx`)

## Notes

- Needs TICKET-WSH-08. Until TICKET-WSH-10 lands, the public page still shows the first wishlist.
- No reordering of wishlists themselves and no moving items between them (see TICKET-WSH-08).
