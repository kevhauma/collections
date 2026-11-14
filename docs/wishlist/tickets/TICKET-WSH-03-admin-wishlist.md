# TICKET-WSH-03: Admin wishlist page: list, form, image, reorder, public toggle

- **Area:** Wishlist
- **Released in:** _unreleased_
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

- [ ] Adding three items lists them in the order added. Dragging the third to the top, or typing rank 1 on it with JS
      off, makes it #1 and shifts the others.
- [ ] Editing an item keeps its rank. Deleting #2 after a confirm leaves the rest as 1..n and removes its image file
      from the uploads folder.
- [ ] An image can be uploaded, pasted as a URL, replaced and removed, with the same limits and errors as item images.
- [ ] A `javascript:` link or an empty title is refused with an inline error, and nothing is saved.
- [ ] The public toggle flips the wishlist between private and public and shows the matching badge.
- [ ] Every route and action calls `requireAdmin()` and validates with zod. Persistence goes through
      `src/db/wishlist.ts`.
- [ ] Unit tests cover: `sectionOf` for `/admin/wishlist` and its subpaths, and the action's parsing of the form
      (including the rank move input).
- [ ] UI follows the design direction in `DESIGN.md`; live browser check at 360 px and desktop, JS on and off.
- [ ] Verified with the fallow skill.

## Notes

- No grid/table switch, search, sort or filter, by decision. The list stays short.
- Received items are deleted, not archived.
- The MCP tools come in TICKET-WSH-07.
