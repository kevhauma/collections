import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "./collections";
import { db } from "./connection";
import { createField, deleteField, listFields, moveField, updateField } from "./fields";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-fields-"));
});

const setup = (slug: string) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  const add = (label: string) =>
    createField(id, { label, type: "text", options: null, required: 0, isPublic: 1 });
  return { id, titleFieldId, add };
};

const byLabel = (collectionId: number, label: string) =>
  listFields(collectionId).find((field) => field.label === label)!;

const labels = (collectionId: number) => listFields(collectionId).map((field) => `${field.position}:${field.label}`);

describe("fields repository", () => {
  it("adds fields last and lists them in order with the title field marked", () => {
    const { id, add } = setup("vinyl");
    add("Artist");
    createField(id, { label: "Format", type: "select", options: ["LP", "EP"], required: 1, isPublic: 0 });
    expect(labels(id)).toEqual(["1:Title", "2:Artist", "3:Format"]);
    expect(listFields(id)[0]).toMatchObject({ isTitle: 1, required: 1, isPublic: 1 });
    expect(listFields(id)[2]).toMatchObject({ type: "select", options: ["LP", "EP"], required: 1, isPublic: 0 });
  });

  it("moves a field and keeps positions dense 1..n", () => {
    const { id, add } = setup("lego");
    ["A", "B", "C"].forEach(add);
    const c = listFields(id).find((field) => field.label === "C")!;
    moveField(id, c.id, 1);
    expect(labels(id)).toEqual(["1:C", "2:Title", "3:A", "4:B"]);
    moveField(id, c.id, 99);
    expect(labels(id)).toEqual(["1:Title", "2:A", "3:B", "4:C"]);
  });

  it("deletes a field, removes its key from every item and closes the gap", () => {
    const { id, titleFieldId, add } = setup("books");
    ["Author", "Year"].forEach(add);
    const author = byLabel(id, "Author");
    const year = byLabel(id, "Year");
    const insert = db().prepare("insert into items (collection_id, status, quantity, values_json) values (?, 'have', 1, ?)");
    insert.run(id, JSON.stringify({ [titleFieldId]: "Dune", [author.id]: "Herbert", [year.id]: 1965 }));
    insert.run(id, JSON.stringify({ [titleFieldId]: "Emma", [author.id]: "" }));
    expect(byLabel(id, "Author").valueCount).toBe(1);

    expect(deleteField(id, author.id)).toBe(true);
    const values = db().prepare("select values_json from items where collection_id = ?").pluck().all(id) as string[];
    expect(values.map((json) => JSON.parse(json))).toEqual([
      { [titleFieldId]: "Dune", [year.id]: 1965 },
      { [titleFieldId]: "Emma" },
    ]);
    expect(labels(id)).toEqual(["1:Title", "2:Year"]);
  });

  it("never deletes the title field or makes it optional or private", () => {
    const { id, titleFieldId } = setup("coins");
    expect(deleteField(id, titleFieldId)).toBe(false);
    updateField(id, titleFieldId, { label: "Name", options: null, required: 0, isPublic: 0 });
    expect(listFields(id)[0]).toMatchObject({ label: "Name", required: 1, isPublic: 1 });
  });

  it("only touches fields of the given collection", () => {
    const vinyl = getCollectionBySlug("vinyl")!;
    const coins = getCollectionBySlug("coins")!;
    const artist = byLabel(vinyl.id, "Artist");
    expect(deleteField(coins.id, artist.id)).toBe(false);
    updateField(coins.id, artist.id, { label: "Hacked", options: null, required: 1, isPublic: 0 });
    expect(listFields(vinyl.id)[1]).toMatchObject({ label: "Artist", required: 0, isPublic: 1 });
  });
});
