# Wishlist: overview

Prefix `WSH`. One general wishlist, not bound to a collection: a ranked list of loose wants, plus reminders that the
collections' want lists exist. Design: [technical-design.md § Want ranking](../technical-design.md#want-ranking) (the
ranking it copies), [§ Routes](../technical-design.md#routes).

- [x] [TICKET-WSH-01](./tickets/TICKET-WSH-01-wishlist-data.md): Wishlist table and repository, with dense ranks (new; extends § Data model, § Want ranking). Independent, can ship any time · v1
- [x] [TICKET-WSH-02](./tickets/TICKET-WSH-02-wishlist-in-export.md): Wishlist items and images in the export zip (extends § Export). Needs TICKET-WSH-01 · v1
- [x] [TICKET-WSH-03](./tickets/TICKET-WSH-03-admin-wishlist.md): Admin wishlist page: list, form, image, reorder, public toggle (extends § Routes: Admin). Needs TICKET-WSH-01 · v1
- [x] [TICKET-WSH-04](./tickets/TICKET-WSH-04-public-wishlist-page.md): Public `/wishlist` page (extends § Routes: Public, § Slugs). Needs TICKET-WSH-01, TICKET-WSH-03 · v1
- [x] [TICKET-WSH-05](./tickets/TICKET-WSH-05-wishlist-on-home.md): Wishlist card at the top of the public home page (extends § Routes: Public). Needs TICKET-WSH-04 · v1
- [ ] [TICKET-WSH-06](./tickets/TICKET-WSH-06-collection-reminders.md): Collection want-list reminders on the wishlist, with a per-collection opt-out (extends § Collection). Needs TICKET-WSH-04 · _unreleased_
- [ ] [TICKET-WSH-07](./tickets/TICKET-WSH-07-wishlist-mcp-tools.md): MCP tools for the wishlist (extends TICKET-MCP-01). Needs TICKET-WSH-01 · _unreleased_
