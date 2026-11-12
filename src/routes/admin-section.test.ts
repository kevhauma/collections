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
  ])("%s → %s", (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });
});
