import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { itemStatusSchema } from "../features/items/schema";
import { createCollection, getCollectionBySlug } from "./collections";
import { db } from "./connection";
import { createItem, deleteItem, getItem, listItems, updateItem, type ItemWrite } from "./items";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-items-"));
});

const setup = (slug: string) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  const values = (title: string) => ({ [titleFieldId]: title });
  const want = (title: string) => createItem(id, { status: "want", values: values(title) });
  const ranks = () => listItems(id, "want").map((item) => `${getItem(id, item.id)!.rank}:${String(item.title)}`);
  return { id, values, want, ranks };
};

describe("items repository", () => {
  it("creates a have with the default quantity 1 and no rank", () => {
    const { id, values } = setup("books");
    const input = itemStatusSchema.parse({ status: "have" });
    const itemId = createItem(id, { ...input, values: values("Dune") });
    expect(getItem(id, itemId)).toEqual({ id: itemId, status: "have", quantity: 1, rank: null, values: values("Dune") });
  });

  it("creates a want at the bottom (rank n+1)", () => {
    const { want, ranks } = setup("vinyl");
    ["A", "B", "C"].forEach(want);
    expect(ranks()).toEqual(["1:A", "2:B", "3:C"]);
  });

  it("want → have clears the rank, closes the gap and sets the quantity", () => {
    const { id, values, want, ranks } = setup("lego");
    const [, b] = ["A", "B", "C"].map(want);
    expect(updateItem(id, b!, { status: "have", quantity: 3, values: values("B") })).toBe(true);
    expect(getItem(id, b!)).toMatchObject({ status: "have", quantity: 3, rank: null });
    expect(ranks()).toEqual(["1:A", "2:C"]);
  });

  it("have → want puts it at the bottom with no quantity", () => {
    const { id, values, want, ranks } = setup("coins");
    ["A", "B"].forEach(want);
    const have = createItem(id, { status: "have", quantity: 2, values: values("C") });
    updateItem(id, have, { status: "want", values: values("C") });
    expect(getItem(id, have)).toMatchObject({ status: "want", quantity: null, rank: 3 });
    expect(ranks()).toEqual(["1:A", "2:B", "3:C"]);
  });

  it("a want that stays a want keeps its rank", () => {
    const { id, values, want, ranks } = setup("stamps");
    const [a] = ["A", "B"].map(want);
    updateItem(id, a!, { status: "want", values: values("A2") });
    expect(ranks()).toEqual(["1:A2", "2:B"]);
  });

  it("deleting a want leaves the remaining ranks dense 1..n", () => {
    const { id, want, ranks } = setup("cards");
    const [a, , c] = ["A", "B", "C", "D"].map(want);
    expect(deleteItem(id, a!)).toBe(true);
    expect(deleteItem(id, c!)).toBe(true);
    expect(ranks()).toEqual(["1:B", "2:D"]);
    expect(getItem(id, a!)).toBeUndefined();
  });

  it("never violates the CHECK constraint, whatever the transitions", () => {
    const { id, values } = setup("games");
    const writes: ItemWrite[] = [
      { status: "have", quantity: 1, values: values("X") },
      { status: "want", values: values("X") },
      { status: "want", values: values("X") },
      { status: "have", quantity: 9999, values: values("X") },
      { status: "have", quantity: 2, values: values("X") },
    ];
    const itemId = createItem(id, { status: "want", values: values("X") });
    writes.forEach((write) => expect(() => updateItem(id, itemId, write)).not.toThrow());
    // A tampered write carrying a rank or quantity for the wrong status is still placed by the repository.
    const tampered = { status: "want", quantity: 5, rank: 99, values: values("X") } as unknown as ItemWrite;
    expect(() => updateItem(id, itemId, tampered)).not.toThrow();
    expect(getItem(id, itemId)).toMatchObject({ status: "want", quantity: null, rank: 1 });
  });

  it("only touches items of the given collection", () => {
    const books = getCollectionBySlug("books")!;
    const vinyl = getCollectionBySlug("vinyl")!;
    const dune = listItems(books.id, "have")[0]!.id;
    expect(getItem(vinyl.id, dune)).toBeUndefined();
    expect(updateItem(vinyl.id, dune, { status: "want", values: {} })).toBe(false);
    expect(deleteItem(vinyl.id, dune)).toBe(false);
    expect(db().prepare("select status from items where id = ?").pluck().get(dune)).toBe("have");
  });
});
