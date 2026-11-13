import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { itemStatusSchema } from "../features/items/schema";
import { createCollection, getCollectionBySlug } from "./collections";
import { createField, listFields, type FieldType } from "./fields";
import { db } from "./connection";
import {
  countItems,
  createItem,
  deleteItem,
  getItem,
  listItems,
  moveWant,
  updateItem,
  type ItemQuery,
  type ItemWrite,
} from "./items";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-items-"));
});

const setup = (slug: string) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  const values = (title: string) => ({ [titleFieldId]: title });
  const want = (title: string) => createItem(id, { status: "want", values: values(title) });
  const ranks = () =>
    listItems({ collectionId: id, status: "want", sort: "rank" }).map(
      (item) => `${item.rank}:${String(item.values[titleFieldId])}`,
    );
  return { id, titleFieldId, values, want, ranks };
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
    const dune = listItems({ collectionId: books.id, status: "have" })[0]!.id;
    expect(getItem(vinyl.id, dune)).toBeUndefined();
    expect(updateItem(vinyl.id, dune, { status: "want", values: {} })).toBe(false);
    expect(deleteItem(vinyl.id, dune)).toBe(false);
    expect(db().prepare("select status from items where id = ?").pluck().get(dune)).toBe("have");
  });
});

describe("listItems", () => {
  // Title (text), Artist (text), Year (number), Format (select), Signed (checkbox), Notes (private text), Released (date).
  const setupVinyl = () => {
    createCollection("Records", "records", "Title");
    const { id, titleFieldId } = getCollectionBySlug("records")!;
    const add = (label: string, type: FieldType, isPublic: 0 | 1 = 1) =>
      createField(id, { label, type, options: type === "select" ? ["LP", "EP"] : null, required: 0, isPublic });
    add("Artist", "text");
    add("Year", "number");
    add("Format", "select");
    add("Signed", "checkbox");
    add("Notes", "text", 0);
    add("Released", "date");
    const f = Object.fromEntries(listFields(id).map((field) => [field.label, String(field.id)]));
    const have = (values: Record<string, unknown>) =>
      createItem(id, {
        status: "have",
        quantity: 1,
        values: Object.fromEntries(Object.entries(values).map(([label, value]) => [f[label]!, value])),
      });
    have({ Title: "Kind of Blue", Artist: "Miles Davis", Year: 1959, Format: "LP", Signed: false });
    have({ Title: "Blue Train", Artist: "John Coltrane", Year: 10, Format: "EP", Signed: true, Released: "1957-09-15" });
    have({ Title: "Giant Steps", Artist: "Coltrane", Year: 9, Format: "LP", Signed: true, Notes: "blue sleeve" });
    have({ Title: "100% Pure_Jazz", Signed: false, Released: "2001-01-01" });
    have({ Title: "Moanin'", Artist: "Art Blakey" });
    return { id, titleFieldId, f };
  };
  let vinyl: ReturnType<typeof setupVinyl>;
  beforeAll(() => {
    vinyl = setupVinyl();
  });
  const titles = (query: Partial<ItemQuery>) =>
    listItems({ collectionId: vinyl.id, status: "have", ...query }).map((item) => item.values[vinyl.titleFieldId]);

  it("searches text, url and select values case-insensitively, never field ids, numbers or dates", () => {
    expect(titles({ q: "blue", sort: vinyl.titleFieldId })).toEqual(["Blue Train", "Giant Steps", "Kind of Blue"]);
    expect(titles({ q: "lp", sort: vinyl.titleFieldId })).toEqual(["Giant Steps", "Kind of Blue"]);
    expect(titles({ q: vinyl.f.Artist })).toEqual([]);
    expect(titles({ q: "1959" })).toEqual([]);
    expect(titles({ q: "1957" })).toEqual([]);
  });

  it("escapes LIKE wildcards in the search", () => {
    expect(titles({ q: "%" })).toEqual(["100% Pure_Jazz"]);
    expect(titles({ q: "e_j" })).toEqual(["100% Pure_Jazz"]);
    expect(titles({ q: "_" })).toEqual(["100% Pure_Jazz"]);
  });

  it("sorts numbers numerically and text case-insensitively, with empty values last both ways", () => {
    const year = Number(vinyl.f.Year);
    expect(titles({ sort: year })).toEqual(["Giant Steps", "Blue Train", "Kind of Blue", "100% Pure_Jazz", "Moanin'"]);
    expect(titles({ sort: year, dir: "desc" })).toEqual([
      "Kind of Blue",
      "Blue Train",
      "Giant Steps",
      "100% Pure_Jazz",
      "Moanin'",
    ]);
    expect(titles({ sort: Number(vinyl.f.Artist) }).slice(0, 4)).toEqual([
      "Moanin'",
      "Giant Steps",
      "Blue Train",
      "Kind of Blue",
    ]);
    expect(titles({ sort: Number(vinyl.f.Artist), dir: "desc" }).at(-1)).toBe("100% Pure_Jazz");
  });

  it("combines a select and a checkbox filter with AND", () => {
    const format = Number(vinyl.f.Format);
    const signed = Number(vinyl.f.Signed);
    const both = (value: boolean) => [
      { fieldId: format, value: "LP" },
      { fieldId: signed, value },
    ];
    expect(titles({ filters: both(true) })).toEqual(["Giant Steps"]);
    expect(titles({ filters: both(false) })).toEqual(["Kind of Blue"]);
    // An item saved before the checkbox existed counts as "no".
    expect(titles({ filters: [{ fieldId: signed, value: false }], sort: vinyl.titleFieldId })).toEqual([
      "100% Pure_Jazz",
      "Kind of Blue",
      "Moanin'",
    ]);
  });

  it("with publicOnly, strips private keys and never searches, sorts or filters on a private field", () => {
    const notes = vinyl.f.Notes!;
    const all = listItems({ collectionId: vinyl.id, status: "have", publicOnly: true });
    expect(all.some((item) => notes in item.values)).toBe(false);
    expect(all.find((item) => item.values[vinyl.titleFieldId] === "Giant Steps")?.values).not.toHaveProperty(notes);
    expect(titles({ q: "sleeve" })).toEqual(["Giant Steps"]);
    expect(titles({ q: "sleeve", publicOnly: true })).toEqual([]);
    expect(titles({ filters: [{ fieldId: Number(notes), value: "blue sleeve" }], publicOnly: true })).toHaveLength(5);
    expect(titles({ sort: Number(notes), publicOnly: true })).toEqual(titles({ sort: "created" }));
  });

  it("counts haves and wants", () => {
    expect(countItems(vinyl.id)).toEqual({ have: 5, want: 0 });
  });
});

describe("moveWant", () => {
  it("moves the 5th want to the top, and clamps 99 to the bottom", () => {
    const { id, want, ranks } = setup("moves");
    const [, b, , , e] = ["A", "B", "C", "D", "E"].map(want);
    expect(moveWant(id, e!, 1)).toBe(true);
    expect(ranks()).toEqual(["1:E", "2:A", "3:B", "4:C", "5:D"]);
    expect(moveWant(id, b!, 99)).toBe(true);
    expect(ranks()).toEqual(["1:E", "2:A", "3:C", "4:D", "5:B"]);
    expect(moveWant(id, b!, 0)).toBe(true);
    expect(ranks()).toEqual(["1:B", "2:E", "3:A", "4:C", "5:D"]);
  });

  it("refuses a have, or a want of another collection", () => {
    const { id, values } = setup("moves-2");
    const have = createItem(id, { status: "have", quantity: 1, values: values("H") });
    const other = getCollectionBySlug("moves")!;
    const foreign = listItems({ collectionId: other.id, status: "want", sort: "rank" })[0]!.id;
    expect(moveWant(id, have, 1)).toBe(false);
    expect(moveWant(id, foreign, 1)).toBe(false);
    expect(getItem(other.id, foreign)?.rank).toBe(1);
  });

  it("keeps ranks dense 1..n through 200 random moves, inserts, deletes and status changes", () => {
    const { id, values } = setup("random");
    // A seeded generator, so a failure replays the same sequence.
    let seed = 42;
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    const wantIds = () => listItems({ collectionId: id, status: "want" }).map((item) => item.id);
    const all = () => [...wantIds(), ...listItems({ collectionId: id, status: "have" }).map((item) => item.id)];
    const pick = (ids: number[]) => ids[random(ids.length)]!;
    const steps = [
      () => createItem(id, { status: "want", values: values("w") }),
      () => createItem(id, { status: "have", quantity: 1, values: values("h") }),
      () => wantIds().length > 0 && moveWant(id, pick(wantIds()), random(wantIds().length + 4) - 1),
      () => all().length > 0 && deleteItem(id, pick(all())),
      () => all().length > 0 && updateItem(id, pick(all()), { status: "want", values: values("s") }),
      () => all().length > 0 && updateItem(id, pick(all()), { status: "have", quantity: 2, values: values("s") }),
    ];
    for (let step = 0; step < 200; step++) {
      steps[random(steps.length)]!();
      const ranks = listItems({ collectionId: id, status: "want", sort: "rank" }).map((item) => item.rank);
      expect(ranks).toEqual(ranks.map((_, index) => index + 1));
    }
    expect(wantIds().length).toBeGreaterThan(3);
  });
});
