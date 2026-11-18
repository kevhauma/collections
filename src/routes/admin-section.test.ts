import { describe, expect, it } from "vitest";
import { sectionOf } from "./admin-section";

describe("sectionOf", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/c/vinyl/items/3", "/admin"],
    ["/admin/collections/new", "/admin"],
    ["/admin/export", "/admin/export"],
    ["/admin/settings", "/admin/settings"],
    ["/admin/settings/", "/admin/settings"],
    ["/admin/c/settings-and-more", "/admin"],
    ["/admin/exports", "/admin"],
    ["/admin/wishlists", "/admin/wishlists"],
    ["/admin/wishlists/new", "/admin/wishlists"],
    ["/admin/w/birthday", "/admin/wishlists"],
    ["/admin/w/birthday/items/new", "/admin/wishlists"],
    ["/admin/w/birthday/items/4", "/admin/wishlists"],
    ["/admin/w/birthday/settings", "/admin/wishlists"],
    ["/admin/wishlist", "/admin"],
    ["/admin/wishlistsx", "/admin"],
    ["/admin/wx", "/admin"],
    ["/admin/c/wishlist", "/admin"],
    ["/admin/c/w", "/admin"],
  ])("%s → %s", (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });
});
