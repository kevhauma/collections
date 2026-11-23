import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "../../db/collections";
import { db } from "../../db/connection";
import { createField, listFields } from "../../db/fields";
import { createItem } from "../../db/items";
import { priceAmount, wishlistSuggestions } from "./suggestions";

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

// A public collection shown on the wishlist, with a priced want item per `prices` entry. Returns its title field id so
// a test can read item titles out of the returned values.
const seed = (slug: string, prices: Array<number | string>, { public: isPublic = true, priceAffix = true } = {}) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  createField(id, { type: "number", label: "Price", options: null, required: 0, isPublic: 1, prefix: priceAffix ? "€" : null, suffix: null });
  const priceFieldId = listFields(id).find((field) => field.label === "Price")!.id;
  prices.forEach((price, index) =>
    createItem(id, { status: "want", values: { [titleFieldId]: `${slug}-${index}`, [priceFieldId]: price } }),
  );
  db().prepare("update collections set is_public = ?, show_on_wishlist = 1 where id = ?").run(isPublic ? 1 : 0, id);
  return titleFieldId;
};

const titles = (group: { titleFieldId: number; items: Array<{ values: Record<string, unknown> }> }) =>
  group.items.map((item) => String(item.values[group.titleFieldId]));

describe("wishlistSuggestions", () => {
  it("groups in-budget wants by collection", () => {
    seed("a", [10, 50, 500]);
    seed("b", [40]);
    const groups = wishlistSuggestions(20, 100);
    expect(groups.map((group) => [group.slug, titles(group)])).toEqual([
      ["a", ["a-1"]],
      ["b", ["b-0"]],
    ]);
  });

  it("returns every match, oldest first, so the page can reveal the rest", () => {
    seed("many", [50, 50, 50]);
    const group = wishlistSuggestions(0, 100)[0]!;
    expect(titles(group)).toEqual(["many-0", "many-1", "many-2"]);
  });

  it("treats null bounds as open-ended", () => {
    seed("a", [5, 9000]);
    const group = wishlistSuggestions(null, null)[0]!;
    expect(group.items).toHaveLength(2);
  });

  it("exposes only the collection's public fields", () => {
    const titleFieldId = seed("a", [50]);
    const group = wishlistSuggestions(0, 100)[0]!;
    expect(group.fields.every((field) => field.isPublic === 1)).toBe(true);
    expect(group.fields.some((field) => field.id === titleFieldId)).toBe(true);
  });

  it("skips private collections and, under a budget, those without a price field", () => {
    seed("hidden", [50], { public: false });
    seed("unpriced", [50], { priceAffix: false });
    expect(wishlistSuggestions(0, 100)).toEqual([]);
  });
});
