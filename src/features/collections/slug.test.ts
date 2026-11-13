import { describe, expect, it } from "vitest";
import { maxSlugLength, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Magic: The Gathering", "magic-the-gathering"],
    ["Café Ölé", "cafe-ole"],
    ["  --!!Vinyl records??--  ", "vinyl-records"],
    ["🎲🃏", "collection"],
    ["", "collection"],
    ["LEGO   Star Wars", "lego-star-wars"],
  ])("%j → %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("truncates very long names to 60 characters at a dash boundary", () => {
    const slug = slugify("The Complete Collection of Every Single Vintage Board Game Ever Made Anywhere");
    expect(slug).toBe("the-complete-collection-of-every-single-vintage-board-game");
    expect(slug.length).toBeLessThanOrEqual(maxSlugLength);
  });

  it("keeps a word that ends exactly at the limit", () => {
    expect(slugify(`${"a".repeat(55)} bcde fgh`)).toBe(`${"a".repeat(55)}-bcde`);
  });

  it("hard-cuts a single word longer than the limit", () => {
    expect(slugify("x".repeat(80))).toBe("x".repeat(maxSlugLength));
  });
});

describe("uniqueSlug", () => {
  it("keeps a free slug", () => {
    expect(uniqueSlug("vinyl", new Set(["lego"]))).toBe("vinyl");
  });

  it("appends -2, -3, … to a taken slug", () => {
    expect(uniqueSlug("vinyl", new Set(["vinyl"]))).toBe("vinyl-2");
    expect(uniqueSlug("vinyl", new Set(["vinyl", "vinyl-2"]))).toBe("vinyl-3");
  });

  it("treats reserved words as taken", () => {
    expect(uniqueSlug("admin", new Set())).toBe("admin-2");
    expect(uniqueSlug("assets", new Set(["assets-2"]))).toBe("assets-3");
  });

  it("stays within the limit when it adds a suffix", () => {
    const base = `${"a".repeat(30)}-${"b".repeat(29)}`;
    expect(base.length).toBe(maxSlugLength);
    expect(uniqueSlug(base, new Set([base]))).toBe(`${"a".repeat(30)}-2`);
  });
});
