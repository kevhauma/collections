import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  listCollections,
  listSlugs,
  updateCollection,
} from "./collections";
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

  it("updates name, slug, visibility and default view", () => {
    const { id } = getCollectionBySlug("vinyl")!;
    updateCollection(id, { name: "Records", slug: "records", isPublic: 1, defaultView: "grid" });
    expect(getCollectionBySlug("vinyl")).toBeUndefined();
    expect(getCollectionBySlug("records")).toMatchObject({ id, name: "Records", isPublic: 1, defaultView: "grid" });
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
