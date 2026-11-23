import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "../../db/collections";
import { db } from "../../db/connection";
import { createField, listFields } from "../../db/fields";
import { createItem } from "../../db/items";
import { priceAmount, priceSuggestions } from "./suggestions";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-suggestions-"));
});

// Fields and items cascade with their collection.
beforeEach(() => {
  db().prepare("delete from collections").run();
});

describe("priceAmount", () => {
  it("reads the number out of a formatted price and rejects what has none", () => {
    expect(priceAmount(12.5)).toBe(12.5);
    expect(priceAmount("€30")).toBe(30);
    expect(priceAmount("1,299.00")).toBe(1299);
    expect(priceAmount(null)).toBeNull();
    expect(priceAmount("free")).toBeNull();
  });
});

// A public collection shown on the wishlist, with a priced want item.
const seed = (slug: string, price: number | string, { public: isPublic = true, priceAffix = true } = {}) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  createField(id, { type: "number", label: "Price", options: null, required: 0, isPublic: 1, prefix: priceAffix ? "€" : null, suffix: null });
  const priceFieldId = listFields(id).find((field) => field.label === "Price")!.id;
  createItem(id, { status: "want", values: { [titleFieldId]: `${slug}-want`, [priceFieldId]: price } });
  db().prepare("update collections set is_public = ?, show_on_wishlist = 1 where id = ?").run(isPublic ? 1 : 0, id);
  return id;
};

describe("priceSuggestions", () => {
  it("keeps only priced want items inside the range, across the shown collections", () => {
    seed("cheap", 10);
    seed("fits", 50);
    seed("dear", 500);
    const names = priceSuggestions(20, 100, 50).map((suggestion) => suggestion.name);
    expect(names).toEqual(["fits-want"]);
  });

  it("treats null bounds as open-ended", () => {
    seed("a", 5);
    seed("b", 9000);
    expect(priceSuggestions(null, null, 50)).toHaveLength(2);
    expect(priceSuggestions(1000, null, 50).map((s) => s.name)).toEqual(["b-want"]);
  });

  it("ignores private collections and collections with no price field", () => {
    seed("hidden", 50, { public: false });
    seed("unpriced", 50, { priceAffix: false });
    expect(priceSuggestions(0, 100, 50)).toEqual([]);
  });

  it("caps the result at the limit", () => {
    seed("one", 50);
    seed("two", 50);
    seed("three", 50);
    expect(priceSuggestions(0, 100, 2)).toHaveLength(2);
  });
});
