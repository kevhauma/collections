import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "../features/collections/slug";
import { db } from "./connection";
import {
  createWishItem,
  createWishlist,
  deleteWishItem,
  deleteWishlist,
  getWishItem,
  getWishlist,
  getWishlistBySlug,
  listWishlist,
  listWishlists,
  listWishlistSlugs,
  moveWishItem,
  updateWishItem,
  updateWishlist,
} from "./wishlist";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-wishlist-"));
});

// Two empty wishlists for every test: `a` (the migrated one) and `b`.
let a: number;
let b: number;
beforeEach(() => {
  db().prepare("delete from wishlists where id <> 1").run();
  db().prepare("delete from wishlist_items").run();
  a = 1;
  b = createWishlist("Birthday", "birthday");
});

const add = (title: string, image: string | null = null, wishlistId = a) =>
  createWishItem(wishlistId, { title, link: null, note: null, price: null, image });
const ranks = (wishlistId = a) => listWishlist(wishlistId).map((item) => `${item.rank}:${item.title}`);
const idOf = (title: string, wishlistId = a) => listWishlist(wishlistId).find((item) => item.title === title)!.id;

describe("wishlist items", () => {
  it("appends a new item at the bottom (rank n+1) of its own wishlist", () => {
    ["A", "B", "C"].forEach((title) => add(title));
    add("X", null, b);
    expect(ranks()).toEqual(["1:A", "2:B", "3:C"]);
    expect(ranks(b)).toEqual(["1:X"]);
  });

  it("moves an item up and down, shifting the others", () => {
    ["A", "B", "C", "D"].forEach((title) => add(title));
    expect(moveWishItem(a, idOf("D"), 2)).toBe(true);
    expect(ranks()).toEqual(["1:A", "2:D", "3:B", "4:C"]);
    moveWishItem(a, idOf("A"), 3);
    expect(ranks()).toEqual(["1:D", "2:B", "3:A", "4:C"]);
  });

  it("clamps a rank beyond the end to the bottom and below 1 to the top, inside its wishlist", () => {
    ["A", "B", "C"].forEach((title) => add(title));
    ["X", "Y", "Z", "W"].forEach((title) => add(title, null, b));
    moveWishItem(a, idOf("A"), 99);
    expect(ranks()).toEqual(["1:B", "2:C", "3:A"]);
    moveWishItem(a, idOf("C"), -5);
    expect(ranks()).toEqual(["1:C", "2:B", "3:A"]);
    expect(ranks(b)).toEqual(["1:X", "2:Y", "3:Z", "4:W"]);
  });

  it("refuses to move an unknown item, or one of another wishlist", () => {
    ["A", "B"].forEach((title) => add(title));
    add("X", null, b);
    expect(moveWishItem(a, 999_999, 1)).toBe(false);
    expect(moveWishItem(b, idOf("B"), 1)).toBe(false);
    expect(moveWishItem(a, idOf("X", b), 1)).toBe(false);
    expect(ranks()).toEqual(["1:A", "2:B"]);
    expect(ranks(b)).toEqual(["1:X"]);
  });

  it("keeps the rank and the image on an update without an image", () => {
    ["A", "B"].forEach((title) => add(title, "img-b"));
    const id = idOf("B");
    expect(updateWishItem(id, { title: "B2", link: "https://example.com", note: "n", price: "€25" })).toBe(true);
    expect(getWishItem(id)).toEqual({
      id,
      wishlistId: a,
      title: "B2",
      link: "https://example.com",
      note: "n",
      price: "€25",
      image: "img-b",
      rank: 2,
    });
    updateWishItem(id, { title: "B2", link: null, note: null, price: null, image: null });
    expect(getWishItem(id)?.image).toBeNull();
    expect(updateWishItem(999_999, { title: "X", link: null, note: null, price: null })).toBe(false);
  });

  it("deletes an item, closes the gap in its wishlist only and returns its image", () => {
    add("A");
    add("B", "img-b");
    add("C");
    ["X", "Y", "Z"].forEach((title) => add(title, null, b));
    expect(deleteWishItem(idOf("B"))).toBe("img-b");
    expect(ranks()).toEqual(["1:A", "2:C"]);
    expect(deleteWishItem(idOf("A"))).toBeNull();
    expect(ranks()).toEqual(["1:C"]);
    expect(ranks(b)).toEqual(["1:X", "2:Y", "3:Z"]);
  });

  it("changes nothing for an unknown id", () => {
    ["A", "B"].forEach((title) => add(title));
    expect(deleteWishItem(999_999)).toBeNull();
    expect(ranks()).toEqual(["1:A", "2:B"]);
  });

  it("keeps both wishlists dense 1..n through 300 random appends, moves and deletes across them", () => {
    // A seeded generator, so a failure replays the same sequence.
    let seed = 7;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const all = () => [...listWishlist(a), ...listWishlist(b)].map((item) => item.id);
    const pick = () => getWishItem(all()[random(all().length)]!)!;
    const steps = [
      () => add("w", null, a),
      () => add("w", null, b),
      () => {
        const wish = all().length > 0 && pick();
        return wish && moveWishItem(wish.wishlistId, wish.id, random(all().length + 4) - 1);
      },
      () => all().length > 0 && deleteWishItem(pick().id),
    ];
    const dense = (wishlistId: number) => {
      const current = listWishlist(wishlistId).map((item) => item.rank);
      expect(current).toEqual(current.map((_, index) => index + 1));
    };
    for (let step = 0; step < 300; step++) {
      steps[random(steps.length)]!();
      dense(a);
      dense(b);
    }
    expect(listWishlist(a).length).toBeGreaterThan(1);
    expect(listWishlist(b).length).toBeGreaterThan(1);
  });
});

describe("wishlists", () => {
  it("creates a private wishlist without reminders, found by id and slug", () => {
    expect(getWishlist(b)).toEqual({ id: b, name: "Birthday", slug: "birthday", isPublic: 0, showReminders: 0 });
    expect(getWishlistBySlug("birthday")?.id).toBe(b);
    expect(getWishlistBySlug("nope")).toBeUndefined();
  });

  it("lists wishlists by name, case-insensitive, with item count and the first image by rank", () => {
    createWishlist("apples", "apples");
    add("A");
    add("B", "img-b");
    add("C", "img-c");
    expect(listWishlists().map(({ name, itemCount, image }) => ({ name, itemCount, image }))).toEqual([
      { name: "apples", itemCount: 0, image: null },
      { name: "Birthday", itemCount: 0, image: null },
      { name: "Wishlist", itemCount: 3, image: "img-b" },
    ]);
  });

  it("refuses a taken slug; uniqueSlug gives a free one", () => {
    expect(() => createWishlist("Birthday", "birthday")).toThrow(/UNIQUE/);
    const slug = uniqueSlug(slugify("Birthday"), listWishlistSlugs());
    expect(slug).toBe("birthday-2");
    expect(getWishlist(createWishlist("Birthday", slug))?.slug).toBe("birthday-2");
  });

  it("updates name, slug and both flags", () => {
    updateWishlist(b, { name: "House", slug: "house", isPublic: 1, showReminders: 1 });
    expect(getWishlist(b)).toEqual({ id: b, name: "House", slug: "house", isPublic: 1, showReminders: 1 });
    updateWishlist(b, { name: "House", slug: "house", isPublic: 0, showReminders: 0 });
    expect(getWishlist(b)).toMatchObject({ isPublic: 0, showReminders: 0 });
  });

  it("deletes a wishlist with its items, returning their image ids, and leaves the others alone", () => {
    add("A", "img-a");
    add("X", "img-x", b);
    add("Y", null, b);
    add("Z", "img-z", b);
    expect(deleteWishlist(b).toSorted()).toEqual(["img-x", "img-z"]);
    expect(getWishlist(b)).toBeUndefined();
    expect(listWishlist(b)).toEqual([]);
    expect(ranks()).toEqual(["1:A"]);
  });
});
