# TICKET-WSH-03: Admin wishlist page: list, form, image, reorder, public toggle

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** extends [technical-design.md § Routes: Admin](../../technical-design.md#admin),
  [TICKET-ITM-02](../../items/tickets/TICKET-ITM-02-item-crud.md), [TICKET-ITM-03](../../items/tickets/TICKET-ITM-03-want-ranking.md),
  [TICKET-ITM-04](../../items/tickets/TICKET-ITM-04-item-images.md)

## User story

As the admin, I want to add, edit, reorder and delete wishlist items and choose whether the wishlist is public, so I
can keep my general wishlist up to date from desktop or phone.

## Description

An admin "Wishlist" section with the ranked list, the item form (title, link, note, price, one image) and a public
toggle. It works like a collection's want tab, without the view switch, search, sort or filters.

## Current situation (as-is)

- [src/routes/admin-nav.tsx](../../../src/routes/admin-nav.tsx) has Collections, Export and Settings.
  [src/routes/admin-section.ts](../../../src/routes/admin-section.ts) maps a path to its section by prefix.
- The want tab of [src/routes/admin-collection.tsx](../../../src/routes/admin-collection.tsx) reorders by drag
  (`moveWantAction` in [src/routes/item-actions.ts](../../../src/routes/item-actions.ts), `SortableList` in
  [src/ui/sortable-list.tsx](../../../src/ui/sortable-list.tsx)) and by a typed rank posted to the route action, so it
  also works without JS.
- The item form in [src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx) uses `ImageSection` /
  `ImageField` and `prepareFormImage` / `commitImage` ([src/features/images/](../../../src/features/images/)) for an
  upload or a pasted URL. `removeImage` deletes the file.
- Collection settings have a public toggle with the `VisibilityBadge`.

## Desired result (to-be)

- Routes: `/admin/wishlist` (list and public toggle), `/admin/wishlist/items/new` and `/admin/wishlist/items/:id`
  (the form, with Delete). All call `requireAdmin()` and validate with the WSH-01 zod schema.
- "Wishlist" in the admin nav, between Collections and Export, and `sectionOf` maps `/admin/wishlist…` to it.
- The list shows rank, image thumbnail, title, price and the link's hostname, in rank order. Reorder by drag and by
  typing a rank, the same two paths as the want tab, through `moveWishItem`.
- The form: title, link, note (textarea), price, and the existing image field (upload or URL, remove). Saving a new
  item puts it at the bottom.
- Delete asks for confirmation, removes the row through `deleteWishItem` and then the image file.
- The public toggle sits on the list page with the same control and `VisibilityBadge` as a collection. It defaults to
  private.
- [technical-design.md § Routes: Admin](../../technical-design.md#admin) lists the new routes.

## UI requirements

- Reuse the want tab's look and the item form's components. No new UI primitives.
- An empty wishlist shows `EmptyState` with an "Add item" action.
- Every new string has an explicit i18n id (EN + NL). User-typed content isn't translated.

## Acceptance criteria

- [x] Adding three items lists them in the order added. Dragging the third to the top, or typing rank 1 on it with JS
      off, makes it #1 and shifts the others. (browser + production build, 2026-11-15: three items listed 1..3 in the order added; dragging Brass lamp's handle from #3 to the top in Orca saved and survived a reload as `1:Brass lamp | 2:Coffee grinder | 3:Wool blanket`; a no-JS form post `intent=move&itemId=3&rank=1` made Coffee grinder #1 and shifted the others. An emptied rank input is refused with 400 instead of jumping to the top)
- [x] Editing an item keeps its rank. Deleting #2 after a confirm leaves the rest as 1..n and removes its image file
      from the uploads folder. (editing Brass lamp's price kept it at #2; deleting #2 (Brass lamp, with an image) by posting the Delete dialog's `intent=delete` left ranks 1..2 and its `.webp` and `.thumb.webp` were gone from `uploads/`)
- [x] An image can be uploaded, pasted as a URL, replaced and removed, with the same limits and errors as item images. (same `ImageSection` / `prepareFormImage` as items: uploaded a PNG, replaced it with another upload, pasted an `/uploads/…webp` address, ticked Remove image (files deleted each time); an unreachable image address showed the item image error inline)
- [x] A `javascript:` link or an empty title is refused with an inline error, and nothing is saved. (posting an empty title and `javascript:alert(1)` showed both messages inline and in the error summary at 360 px, and the list was unchanged)
- [x] The public toggle flips the wishlist between private and public and shows the matching badge. (`intent=visibility` with and without `isPublic=on` switched the badge between Public and Private)
- [x] Every route and action calls `requireAdmin()` and validates with zod. Persistence goes through
      `src/db/wishlist.ts`. (`loader` and `action` of `admin-wishlist.tsx` and `admin-wishlist-item.tsx` and `moveWishItemAction` call `requireAdmin()` (no session: GET redirects to the login, POSTs get 401) and parse with `wishlistIntentSchema` / `wishSchema`; writes go through `saveWish` / `removeWish` → `src/db/wishlist.ts`)
- [x] Unit tests cover: `sectionOf` for `/admin/wishlist` and its subpaths, and the action's parsing of the form
      (including the rank move input). (`admin-section.test.ts` (`/admin/wishlist`, its item paths, `/admin/wishlists`, `/admin/c/wishlist`), `wishlistIntentSchema` cases in `src/features/wishlist/validation.test.ts`, `wishView` in `view.test.ts`)
- [x] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS on and off. (Orca, dark paper: the want tab's table (drag handles, rank inputs, post-it thumbnails, drawn rules) at 1440 px and 360 px with no page-wide horizontal scroll (scrollWidth 360); the form reuses the item form's card, fields, image post-it and Delete dialog. JS off checked with plain form posts against the production build. Light mode not checked separately: no new colours)
- [x] Verified with the fallow skill. (`fallow audit --base HEAD`: dead code 0, complexity 0, duplication 0, after unexporting `wishFieldIds` and splitting `WishFields` out of the form)

## Notes

- No grid/table switch, search, sort or filter, by decision. The list stays short.
- Received items are deleted, not archived.
- The MCP tools come in TICKET-WSH-07.
