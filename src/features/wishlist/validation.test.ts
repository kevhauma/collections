import { describe, expect, it } from "vitest";
import { runWithContext } from "../../context";
import { rejected } from "../collections/form";
import { wishErrors } from "./form";
import { parseWishlistSettings, wishMoveSchema, wishSchema } from "./validation";

const keysOf = (input: Record<string, unknown>) => {
  const parsed = wishSchema.safeParse(input);
  return parsed.success ? [] : parsed.error.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);
};

describe("wishSchema", () => {
  it("trims, and turns blank optional text into null", () => {
    expect(wishSchema.parse({ title: "  Lamp ", link: " ", note: "", price: " ~€30–40 " })).toEqual({
      title: "Lamp",
      link: null,
      note: null,
      price: "~€30–40",
    });
    expect(wishSchema.parse({ title: "Lamp" })).toEqual({ title: "Lamp", link: null, note: null, price: null });
  });

  it("accepts http and https links", () => {
    expect(wishSchema.parse({ title: "A", link: "https://shop.example/a" }).link).toBe("https://shop.example/a");
    expect(wishSchema.parse({ title: "A", link: "http://shop.example" }).link).toBe("http://shop.example");
  });

  it("rejects an empty or missing title", () => {
    expect(keysOf({ title: "   " })).toEqual(["title:title"]);
    expect(keysOf({})).toEqual(["title:title"]);
  });

  it("rejects a link that isn't http(s)", () => {
    expect(keysOf({ title: "A", link: "javascript:alert(1)" })).toEqual(["link:link"]);
    expect(keysOf({ title: "A", link: "ftp://example.com/a" })).toEqual(["link:link"]);
    expect(keysOf({ title: "A", link: "not a url" })).toEqual(["link:link"]);
  });

  it("rejects over-long text", () => {
    expect(
      keysOf({ title: "t".repeat(201), link: `https://e.com/${"a".repeat(2000)}`, note: "n".repeat(2001), price: "p".repeat(51) }),
    ).toEqual(["title:title", "link:link", "note:note", "price:price"]);
  });

  it("translates the keys into explicit messages", () => {
    const parsed = wishSchema.safeParse({ title: "", link: "javascript:x" });
    const errors = runWithContext({ request: new Request("http://localhost/"), locale: "en", setCookies: [] }, () =>
      wishErrors(parsed.error!),
    );
    expect(errors).toEqual({
      title: "Enter a title of up to 200 characters.",
      link: "Enter a web address starting with http:// or https://.",
    });
  });
});

describe("wishMoveSchema", () => {
  it("parses a typed rank move", () => {
    expect(wishMoveSchema.parse({ intent: "move", itemId: "12", rank: "1" })).toEqual({ itemId: 12, rank: 1 });
  });

  it("refuses a move without a whole-number rank or item", () => {
    expect(wishMoveSchema.safeParse({ itemId: "12", rank: "" }).success).toBe(false);
    expect(wishMoveSchema.safeParse({ itemId: "12", rank: "1.5" }).success).toBe(false);
    expect(wishMoveSchema.safeParse({ itemId: "x", rank: "1" }).success).toBe(false);
  });
});

describe("parseWishlistSettings", () => {
  const taken = new Set(["house"]);
  const issues = (form: Record<string, string>) => {
    const parsed = parseWishlistSettings(form, taken);
    return parsed.success ? [] : parsed.error.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);
  };

  it("trims name and slug and reads both checkboxes ticked", () => {
    expect(parseWishlistSettings({ name: " Birthday ", slug: " birthday ", isPublic: "on", showReminders: "on" }, taken)).toMatchObject({
      success: true,
      data: { name: "Birthday", slug: "birthday", isPublic: 1, showReminders: 1 },
    });
  });

  it("reads absent checkboxes as unticked", () => {
    expect(parseWishlistSettings({ name: "Birthday", slug: "birthday" }, taken)).toMatchObject({
      data: { isPublic: 0, showReminders: 0 },
    });
  });

  it("refuses an empty name, a malformed, reserved or taken slug, and a forged checkbox", () => {
    expect(issues({ name: " ", slug: "birthday" })).toEqual(["name:name"]);
    expect(issues({ name: "B", slug: "Birth Day" })).toEqual(["slug:format"]);
    expect(issues({ name: "B", slug: "admin" })).toEqual(["slug:reserved"]);
    expect(issues({ name: "B", slug: "house" })).toEqual(["slug:wishlistTaken"]);
    expect(issues({ name: "B", slug: "b", isPublic: "yes" }).length).toBe(1);
  });

  it("names the other wishlist in the taken message", () => {
    const parsed = parseWishlistSettings({ name: "B", slug: "house" }, taken);
    const errors = runWithContext({ request: new Request("http://localhost/"), locale: "en", setCookies: [] }, () =>
      rejected(parsed.error!, { name: "B", slug: "house" }).errors,
    );
    expect(errors).toEqual({ slug: "Another wishlist already uses this address." });
  });
});
