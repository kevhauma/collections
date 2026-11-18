import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/connection";
import { createWishlist, getWishlist, updateWishlist } from "../db/wishlist";
import { loader } from "./public-wishlist-first";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-wishlist-first-"));
});
beforeEach(() => {
  db().prepare("delete from wishlists").run();
});

const publicList = (name: string, slug: string) => {
  const id = createWishlist(name, slug);
  updateWishlist(id, { ...getWishlist(id)!, isPublic: 1 });
};

// Where /wishlist sends a visitor, or "404".
const target = () => {
  try {
    return (loader() as Response).headers.get("Location");
  } catch (error) {
    return (error as { init?: { status?: number } }).init?.status === 404 ? "404" : error;
  }
};

describe("/wishlist", () => {
  it("answers 404 when no wishlist is public", () => {
    createWishlist("Secret", "secret");
    expect(target()).toBe("404");
  });

  it("redirects to the one public wishlist", () => {
    createWishlist("Secret", "secret");
    publicList("House", "house");
    expect(target()).toBe("/wishlist/house");
  });

  it("redirects to the first public wishlist by name when there are several", () => {
    publicList("house", "house");
    publicList("Birthday", "birthday");
    createWishlist("Abc private", "abc");
    expect(target()).toBe("/wishlist/birthday");
  });
});
