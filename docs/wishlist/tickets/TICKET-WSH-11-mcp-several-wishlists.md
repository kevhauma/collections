# TICKET-WSH-11: MCP tools for several wishlists

- **Area:** Wishlist
- **Released in:** [v1](../../releases/v1/overview.md)
- **Type:** Feature
- **Traceability:** changes [technical-design.md § API](../../technical-design.md#api-ticket-mcp-01-adr-0006); revises
  [TICKET-WSH-07](./TICKET-WSH-07-wishlist-mcp-tools.md)

## User story

As the admin talking to an AI agent, I want it to see all my wishlists and add to the right one, so "put this on my
birthday list" works.

## Description

The wishlist tools learn about several wishlists: a tool to list them, one to create one, and a `wishlist` argument
where a tool needs to know which list. Tools that take an item id keep working as they are.

## Current situation (as-is)

- [src/features/mcp/tools.ts](../../../src/features/mcp/tools.ts) has `list_wishlist` (the one list and its public
  flag), `create_wishlist_item`, `update_wishlist_item`, `delete_wishlist_item` and `move_wishlist_item`, all on the
  single wishlist.
- `create_collection` is the pattern for creating with a generated slug; visibility stays admin-UI only.

## Desired result (to-be)

- `list_wishlists`: every wishlist by name with `slug`, `name`, `public`, `showReminders` and item count. Read-only.
- `create_wishlist`: a name; private, reminders off, slug from `uniqueSlug`. Returns the new wishlist.
- `list_wishlist` takes `wishlist` (a slug) and returns that wishlist's items in rank order.
- `create_wishlist_item` takes `wishlist` (a slug), required.
- `update_wishlist_item`, `delete_wishlist_item`, `move_wishlist_item` keep taking an item id; ranks move within that
  item's wishlist. Their output carries the item's wishlist slug.
- An unknown slug is refused with a message pointing to `list_wishlists`.
- No tools for deleting a wishlist or changing its visibility or reminders: admin UI only, like collections.

## UI requirements

- None.

## Acceptance criteria

- [x] `list_wishlists` lists two wishlists by name with their flags and counts. (`src/features/mcp/tools.test.ts`
      "lists every wishlist by name with its flags and item count")
- [x] `create_wishlist` "Birthday" makes a private wishlist `birthday`; again gives `birthday-2`. (test "creates a
      private wishlist without reminders, with a unique slug from the name", through `addWishlist`, the admin form's
      code)
- [x] `create_wishlist_item` on `birthday` lands at the bottom of that list only; an unknown slug is refused with a
      message naming `list_wishlists`. (test "adds to the bottom of the named wishlist only, and refuses an unknown
      slug": `No wishlist has the slug "nope". list_wishlists shows them.`, for `list_wishlist` too)
- [x] `move_wishlist_item` renumbers only inside the item's own wishlist. (test "moves an item only within its own
      wishlist"; the output carries `wishlist: "birthday"`)
- [x] Unit tests in `src/features/mcp/tools.test.ts` cover the cases above. (Plus `api.test.ts` over HTTP with a
      Bearer token, now passing `wishlist`; `npm test` 1111 passed)
- [x] Verified with the fallow skill and the coding-conventions skill. (`fallow audit --base HEAD`: dead code 0,
      complexity 0, duplication 0; the interim `firstWishlist()` from TICKET-WSH-08 is gone)

## Notes

- Needs TICKET-WSH-08. Independent of TICKET-WSH-09 and TICKET-WSH-10.
- Breaking for an agent that called `list_wishlist` without arguments: it now gets told to pass a slug. Accepted for a
  personal app.
