import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "./connection";
import {
  createWishItem,
  deleteWishItem,
  getWishItem,
  isWishlistPublic,
  listWishlist,
  moveWishItem,
  setWishlistPublic,
  updateWishItem,
} from "./wishlist";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-wishlist-"));
});
beforeEach(() => {
  db().prepare("delete from wishlist_items").run();
});

const add = (title: string, image: string | null = null) => createWishItem({ title, link: null, note: null, price: null, image });
const ranks = () => listWishlist().map((item) => `${item.rank}:${item.title}`);
const idOf = (title: string) => listWishlist().find((item) => item.title === title)!.id;

describe("wishlist repository", () => {
  it("appends a new item at the bottom (rank n+1)", () => {
    ["A", "B", "C"].forEach((title) => add(title));
    expect(ranks()).toEqual(["1:A", "2:B", "3:C"]);
  });

  it("moves an item up and down, shifting the others", () => {
    ["A", "B", "C", "D"].forEach((title) => add(title));
    expect(moveWishItem(idOf("D"), 2)).toBe(true);
    expect(ranks()).toEqual(["1:A", "2:D", "3:B", "4:C"]);
    moveWishItem(idOf("A"), 3);
    expect(ranks()).toEqual(["1:D", "2:B", "3:A", "4:C"]);
  });

  it("clamps a rank beyond the end to the bottom and below 1 to the top", () => {
    ["A", "B", "C"].forEach((title) => add(title));
    moveWishItem(idOf("A"), 99);
    expect(ranks()).toEqual(["1:B", "2:C", "3:A"]);
    moveWishItem(idOf("C"), -5);
    expect(ranks()).toEqual(["1:C", "2:B", "3:A"]);
  });

  it("refuses to move an unknown item", () => {
    add("A");
    expect(moveWishItem(999_999, 1)).toBe(false);
    expect(ranks()).toEqual(["1:A"]);
  });

  it("keeps the rank and the image on an update without an image", () => {
    ["A", "B"].forEach((title) => add(title, "img-b"));
    const id = idOf("B");
    expect(updateWishItem(id, { title: "B2", link: "https://example.com", note: "n", price: "€25" })).toBe(true);
    expect(getWishItem(id)).toEqual({ id, title: "B2", link: "https://example.com", note: "n", price: "€25", image: "img-b", rank: 2 });
    updateWishItem(id, { title: "B2", link: null, note: null, price: null, image: null });
    expect(getWishItem(id)?.image).toBeNull();
    expect(updateWishItem(999_999, { title: "X", link: null, note: null, price: null })).toBe(false);
  });

  it("deletes an item, closes the gap and returns its image", () => {
    add("A");
    add("B", "img-b");
    add("C");
    expect(deleteWishItem(idOf("B"))).toBe("img-b");
    expect(ranks()).toEqual(["1:A", "2:C"]);
    expect(deleteWishItem(idOf("A"))).toBeNull();
    expect(ranks()).toEqual(["1:C"]);
  });

  it("changes nothing for an unknown id", () => {
    ["A", "B"].forEach((title) => add(title));
    expect(deleteWishItem(999_999)).toBeNull();
    expect(ranks()).toEqual(["1:A", "2:B"]);
  });

  it("keeps ranks dense 1..n through 200 random appends, moves and deletes", () => {
    // A seeded generator, so a failure replays the same sequence.
    let seed = 7;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const ids = () => listWishlist().map((item) => item.id);
    const pick = () => ids()[random(ids().length)]!;
    const steps = [
      () => add("w"),
      () => add("w"),
      () => ids().length > 0 && moveWishItem(pick(), random(ids().length + 4) - 1),
      () => ids().length > 0 && deleteWishItem(pick()),
    ];
    for (let step = 0; step < 200; step++) {
      steps[random(steps.length)]!();
      const current = listWishlist().map((item) => item.rank);
      expect(current).toEqual(current.map((_, index) => index + 1));
    }
    expect(ids().length).toBeGreaterThan(3);
  });

  it("starts private and toggles public", () => {
    expect(isWishlistPublic()).toBe(false);
    setWishlistPublic(true);
    expect(isWishlistPublic()).toBe(true);
    setWishlistPublic(false);
    expect(isWishlistPublic()).toBe(false);
  });
});
