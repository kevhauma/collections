import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  listCollections,
  listPublic,
  listPublicPreviews,
  listWishlistReminders,
  listSlugs,
  setItemImage,
  updateCollection,
} from "./collections";
import { createField, deleteField, listFields } from "./fields";
import { createItem } from "./items";
import { db } from "./connection";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-repo-"));
});

const count = (table: string, collectionId: number) =>
  db().prepare(`select count(*) from ${table} where collection_id = ?`).pluck().get(collectionId);

describe("collections repository", () => {
  it("creates a private collection with its required, public title field", () => {
    createCollection("Magic: The Gathering", "magic-the-gathering", "Title");
    const collection = getCollectionBySlug("magic-the-gathering")!;
    expect(collection).toMatchObject({ name: "Magic: The Gathering", isPublic: 0, defaultView: "table" });
    const field = db().prepare("select * from fields where id = ?").get(collection.titleFieldId);
    expect(field).toMatchObject({
      collection_id: collection.id,
      label: "Title",
      type: "text",
      required: 1,
      is_public: 1,
      position: 1,
    });
  });

  it("refuses a duplicate slug and leaves no orphan field behind", () => {
    const fields = db().prepare("select count(*) from fields").pluck().get();
    expect(() => createCollection("Other", "magic-the-gathering", "Title")).toThrow(/UNIQUE/);
    expect(db().prepare("select count(*) from fields").pluck().get()).toBe(fields);
  });

  it("lists collections with have and want counts", () => {
    createCollection("Vinyl", "vinyl", "Title");
    const { id } = getCollectionBySlug("vinyl")!;
    const insert = db().prepare("insert into items (collection_id, status, quantity, rank) values (?, ?, ?, ?)");
    insert.run(id, "have", 3, null);
    insert.run(id, "have", 1, null);
    insert.run(id, "want", null, 1);
    expect(listCollections().find((c) => c.slug === "vinyl")).toMatchObject({ haveCount: 2, wantCount: 1 });
    expect(listSlugs()).toEqual(new Set(["magic-the-gathering", "vinyl"]));
  });

  it("updates name, slug, visibility, default view and default sort", () => {
    const { id } = getCollectionBySlug("vinyl")!;
    expect(getCollectionBySlug("vinyl")).toMatchObject({ defaultSort: null, defaultDir: "asc" });
    const settings = { name: "Records", slug: "records", isPublic: 1, defaultView: "grid", defaultSort: "created", defaultDir: "desc" } as const;
    expect(getCollectionBySlug("vinyl")?.showOnWishlist).toBe(1);
    updateCollection(id, { ...settings, titleLinkFieldId: null, showOnWishlist: 0 });
    expect(getCollectionBySlug("vinyl")).toBeUndefined();
    expect(getCollectionBySlug("records")).toMatchObject({
      id,
      name: "Records",
      isPublic: 1,
      defaultView: "grid",
      defaultSort: "created",
      defaultDir: "desc",
      showOnWishlist: 0,
    });
  });

  it("sets and clears the title link, and clears it when its field is deleted (TICKET-COL-09)", () => {
    createCollection("Comics", "comics", "Title");
    const comics = getCollectionBySlug("comics")!;
    expect(comics.titleLinkFieldId).toBeNull();
    createField(comics.id, { label: "Shop", type: "url", options: null, required: 0, isPublic: 1, prefix: null, suffix: null });
    const shop = listFields(comics.id).find((field) => field.label === "Shop")!;
    updateCollection(comics.id, { ...comics, titleLinkFieldId: shop.id });
    expect(getCollectionBySlug("comics")!.titleLinkFieldId).toBe(shop.id);
    updateCollection(comics.id, { ...comics, titleLinkFieldId: null });
    expect(getCollectionBySlug("comics")!.titleLinkFieldId).toBeNull();
    updateCollection(comics.id, { ...comics, titleLinkFieldId: shop.id });
    deleteField(comics.id, shop.id);
    expect(getCollectionBySlug("comics")!.titleLinkFieldId).toBeNull();
  });

  it("sets, keeps and clears the picture (TICKET-COL-06)", () => {
    createCollection("Lego", "lego", "Title");
    const lego = getCollectionBySlug("lego")!;
    expect(lego.image).toBeNull();
    updateCollection(lego.id, lego, "wall");
    expect(getCollectionBySlug("lego")!.image).toBe("wall");
    updateCollection(lego.id, { ...lego, name: "LEGO" });
    expect(getCollectionBySlug("lego")).toMatchObject({ name: "LEGO", image: "wall" });
    expect(listCollections().find((collection) => collection.id === lego.id)?.image).toBe("wall");
    updateCollection(lego.id, lego, null);
    expect(getCollectionBySlug("lego")!.image).toBeNull();
  });

  it("sets, keeps and clears the default item image (TICKET-COL-08)", () => {
    createCollection("Tins", "tins", "Title");
    const tins = getCollectionBySlug("tins")!;
    expect(tins.itemImage).toBeNull();
    setItemImage(tins.id, "blank-tin");
    expect(getCollectionBySlug("tins")!.itemImage).toBe("blank-tin");
    // Saving the other settings, or the picture, leaves it alone.
    updateCollection(tins.id, { ...tins, name: "Old tins" }, "tin-shelf");
    expect(getCollectionBySlug("tins")).toMatchObject({ name: "Old tins", image: "tin-shelf", itemImage: "blank-tin" });
    setItemImage(tins.id, null);
    expect(getCollectionBySlug("tins")).toMatchObject({ image: "tin-shelf", itemImage: null });
  });

  it("returns the picture with the item images when deleting a collection", () => {
    createCollection("Shelf", "shelf", "Title");
    const shelf = getCollectionBySlug("shelf")!;
    updateCollection(shelf.id, shelf, "shelf-photo");
    createItem(shelf.id, { status: "have", quantity: 1, values: { [shelf.titleFieldId]: "A" }, image: "item-photo" });
    createItem(shelf.id, { status: "have", quantity: 1, values: { [shelf.titleFieldId]: "B" } });
    setItemImage(shelf.id, "shelf-default");
    expect(deleteCollection(shelf.id).toSorted()).toEqual(["item-photo", "shelf-default", "shelf-photo"]);
  });

  it("deletes a collection with its fields and items", () => {
    const { id } = getCollectionBySlug("records")!;
    expect(count("items", id)).toBe(3);
    deleteCollection(id);
    expect(getCollectionBySlug("records")).toBeUndefined();
    expect(count("fields", id)).toBe(0);
    expect(count("items", id)).toBe(0);
  });
});

describe("listPublic", () => {
  it("lists only public collections, by name, with their have and want counts", () => {
    createCollection("Zines", "zines", "Title");
    createCollection("Art prints", "art-prints", "Title");
    createCollection("Diaries", "diaries", "Title");
    const zines = getCollectionBySlug("zines")!;
    const prints = getCollectionBySlug("art-prints")!;
    const diaries = getCollectionBySlug("diaries")!;
    [zines, prints].forEach((collection) => updateCollection(collection.id, { ...collection, isPublic: 1 }));
    createItem(zines.id, { status: "have", quantity: 2, values: {} });
    createItem(zines.id, { status: "want", values: {} });
    createItem(zines.id, { status: "want", values: {} });
    createItem(diaries.id, { status: "have", quantity: 1, values: {} });
    const listed = listPublic().filter((collection) => ["zines", "art-prints", "diaries"].includes(collection.slug));
    expect(listed.map(({ slug, haveCount, wantCount }) => [slug, haveCount, wantCount])).toEqual([
      ["art-prints", 0, 0],
      ["zines", 1, 2],
    ]);
    updateCollection(zines.id, { ...zines, isPublic: 0 });
    expect(listPublic().some((collection) => collection.slug === "zines")).toBe(false);
  });
});

describe("listPublicPreviews", () => {
  it("pictures the top-ranked wants and the newest haves of public collections only, skipping items without a picture", () => {
    const make = (slug: string, isPublic: 0 | 1) => {
      createCollection(slug, slug, "Title");
      const collection = getCollectionBySlug(slug)!;
      updateCollection(collection.id, { ...collection, isPublic });
      return collection;
    };
    const shown = make("p-shown", 1);
    const hidden = make("p-hidden", 0);
    const title = String(shown.titleFieldId);
    createItem(shown.id, { status: "want", values: { [title]: "First" }, image: "w1" });
    createItem(shown.id, { status: "want", values: {}, image: null });
    createItem(shown.id, { status: "want", values: {}, image: "w3" });
    createItem(shown.id, { status: "want", values: {}, image: "w4" });
    ["h1", "h2", "h3"].forEach((image) => createItem(shown.id, { status: "have", quantity: 1, values: {}, image }));
    createItem(hidden.id, { status: "want", values: {}, image: "secret" });
    const previews = listPublicPreviews(2).filter((preview) => [shown.id, hidden.id].includes(preview.collectionId));
    expect(previews.map(({ status, image, rank, title }) => [status, image, rank, title])).toEqual([
      ["have", "h3", null, null],
      ["have", "h2", null, null],
      ["want", "w1", 1, "First"],
      ["want", "w3", 3, null],
    ]);
  });
});

describe("listWishlistReminders", () => {
  it("lists public collections with wants that show on the wishlist, by name", () => {
    const make = (name: string, slug: string, isPublic: 0 | 1, wants: number) => {
      createCollection(name, slug, "Title");
      const collection = getCollectionBySlug(slug)!;
      updateCollection(collection.id, { ...collection, isPublic });
      Array.from({ length: wants }, () => createItem(collection.id, { status: "want", values: {} }));
      createItem(collection.id, { status: "have", quantity: 1, values: {} });
      return collection;
    };
    const slugs = ["r-lego", "r-books", "r-secret", "r-empty"];
    const reminded = () =>
      listWishlistReminders()
        .filter((collection) => slugs.includes(collection.slug))
        .map(({ slug, wantCount }) => [slug, wantCount]);
    const lego = make("Lego", "r-lego", 1, 3);
    make("Books", "r-books", 1, 1);
    make("Secret", "r-secret", 0, 2);
    make("Empty", "r-empty", 1, 0);
    expect(reminded()).toEqual([
      ["r-books", 1],
      ["r-lego", 3],
    ]);
    updateCollection(lego.id, { ...lego, isPublic: 1, showOnWishlist: 0 });
    expect(reminded()).toEqual([["r-books", 1]]);
    updateCollection(lego.id, { ...lego, isPublic: 1, showOnWishlist: 1 });
    expect(reminded()).toEqual([
      ["r-books", 1],
      ["r-lego", 3],
    ]);
  });
});
