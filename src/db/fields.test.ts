import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "./collections";
import { db } from "./connection";
import {
  changeFieldType,
  countRatedAbove,
  createField,
  deleteField,
  fieldValues,
  itemsWithOption,
  listFields,
  moveField,
  removeOption,
  renameOption,
  updateField,
  type FieldType,
  type FieldValueRow,
} from "./fields";
import { createItem, getItem, updateItem } from "./items";
import { planTypeChange } from "../features/collections/convert";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-fields-"));
});

const setup = (slug: string) => {
  createCollection(slug, slug, "Title");
  const { id, titleFieldId } = getCollectionBySlug(slug)!;
  const add = (label: string) =>
    createField(id, { label, type: "text", options: null, required: 0, isPublic: 1, prefix: null, suffix: null });
  return { id, titleFieldId, add };
};

const byLabel = (collectionId: number, label: string) =>
  listFields(collectionId).find((field) => field.label === label)!;

const labels = (collectionId: number) => listFields(collectionId).map((field) => `${field.position}:${field.label}`);

describe("fields repository", () => {
  it("adds fields last and lists them in order with the title field marked", () => {
    const { id, add } = setup("vinyl");
    add("Artist");
    createField(id, { label: "Format", type: "select", options: ["LP", "EP"], required: 1, isPublic: 0, prefix: null, suffix: null });
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
    updateField(id, titleFieldId, { label: "Name", options: null, required: 0, isPublic: 0, prefix: null, suffix: null });
    expect(listFields(id)[0]).toMatchObject({ label: "Name", required: 1, isPublic: 1 });
  });

  it("only touches fields of the given collection", () => {
    const vinyl = getCollectionBySlug("vinyl")!;
    const coins = getCollectionBySlug("coins")!;
    const artist = byLabel(vinyl.id, "Artist");
    expect(deleteField(coins.id, artist.id)).toBe(false);
    updateField(coins.id, artist.id, { label: "Hacked", options: null, required: 1, isPublic: 0, prefix: null, suffix: null });
    expect(listFields(vinyl.id)[1]).toMatchObject({ label: "Artist", required: 0, isPublic: 1 });
  });
});

describe("schema changes that rewrite item data", () => {
  const plan = (toType: FieldType) => (rows: FieldValueRow[]) => planTypeChange(rows, toType);

  const setupWithItems = (slug: string, type: FieldType, options: string[] | null, values: unknown[]) => {
    const { id, titleFieldId } = setup(slug);
    createField(id, { label: "Grade", type, options, required: 0, isPublic: 1, prefix: null, suffix: null });
    const grade = byLabel(id, "Grade");
    const items = values.map((value, index) =>
      createItem(id, { status: "have", quantity: 1, values: { [titleFieldId]: `T${index}`, [grade.id]: value } }),
    );
    const valueOf = (itemId: number) => getItem(id, itemId)?.values[grade.id];
    return { id, titleFieldId, grade, items, valueOf };
  };

  it("gives a field changed to a rating 5 and ★, and clears them when it changes away", () => {
    const { id, grade, items, valueOf } = setupWithItems("type-rating", "number", null, [4, 6, 3.5]);
    expect(changeFieldType(id, grade.id, "rating", plan("rating"))).toBe(true);
    expect(items.map(valueOf)).toEqual([4, undefined, undefined]);
    expect(byLabel(id, "Grade")).toMatchObject({ type: "rating", ratingMax: 5, ratingSymbol: "★" });
    expect(changeFieldType(id, grade.id, "text", plan("text"))).toBe(true);
    expect(items.map(valueOf)).toEqual(["4", undefined, undefined]);
    expect(byLabel(id, "Grade")).toMatchObject({ type: "text", ratingMax: null, ratingSymbol: null });
  });

  describe("a rating's maximum (TICKET-COL-05)", () => {
    const rate = (slug: string, values: number[]) => {
      const { id, titleFieldId } = setup(slug);
      const config = { required: 0, isPublic: 1, prefix: null, suffix: null } as const;
      createField(id, { label: "Score", type: "rating", options: null, ...config, ratingMax: 10, ratingSymbol: "🍺" });
      const score = byLabel(id, "Score");
      values.forEach((value, index) =>
        createItem(id, { status: "have", quantity: 1, values: { [titleFieldId]: `T${index}`, [score.id]: value } }),
      );
      const lowerTo = (ratingMax: number) =>
        updateField(id, score.id, { label: "Score", options: null, ...config, ratingMax, ratingSymbol: "★" });
      return { id, score, lowerTo };
    };

    it("refuses lowering it below an item's rating, and counts those items", () => {
      const { id, score, lowerTo } = rate("rating-low", [7, 3]);
      expect(countRatedAbove(id, score.id, 5)).toBe(1);
      expect(lowerTo(5)).toBe(false);
      expect(byLabel(id, "Score")).toMatchObject({ ratingMax: 10, ratingSymbol: "🍺" });
    });

    it("lowers it when every rating fits, and raises it any time", () => {
      const { id, lowerTo } = rate("rating-fits", [5, 3]);
      expect(lowerTo(5)).toBe(true);
      expect(byLabel(id, "Score")).toMatchObject({ ratingMax: 5, ratingSymbol: "★" });
      expect(lowerTo(9)).toBe(true);
    });
  });

  it("keeps a prefix and suffix through number → text, and clears them going to date", () => {
    const { id, grade } = setupWithItems("type-affix", "number", null, [12]);
    updateField(id, grade.id, { label: "Grade", options: null, required: 0, isPublic: 1, prefix: "€", suffix: "excl." });
    expect(changeFieldType(id, grade.id, "text", plan("text"))).toBe(true);
    expect(byLabel(id, "Grade")).toMatchObject({ prefix: "€", suffix: "excl." });
    changeFieldType(id, grade.id, "number", plan("number"));
    expect(changeFieldType(id, grade.id, "date", plan("date"))).toBe(true);
    expect(byLabel(id, "Grade")).toMatchObject({ type: "date", prefix: null, suffix: null });
  });

  it("changes text → number, converting 12 / 12,5 / 12.5 and blanking abc", () => {
    const { id, grade, items, valueOf } = setupWithItems("type-number", "text", null, ["12", "12,5", "12.5", "abc"]);
    expect(planTypeChange(fieldValues(id, grade.id), "number").blanked.map((row) => row.title)).toEqual(["T3"]);
    expect(changeFieldType(id, grade.id, "number", plan("number"))).toBe(true);
    expect(items.map(valueOf)).toEqual([12, 12.5, 12.5, undefined]);
    expect(byLabel(id, "Grade").type).toBe("number");
  });

  it("converts on the values at apply time, not at preview time", () => {
    const { id, grade, items, valueOf, titleFieldId } = setupWithItems("type-late", "text", null, ["1", "abc"]);
    const preview = planTypeChange(fieldValues(id, grade.id), "number");
    expect(preview.blanked).toHaveLength(1);
    updateItem(id, items[1]!, { status: "have", quantity: 1, values: { [titleFieldId]: "T1", [grade.id]: "7" } });
    changeFieldType(id, grade.id, "number", plan("number"));
    expect(items.map(valueOf)).toEqual([1, 7]);
  });

  it("keeps booleans as booleans through a type change, and gives a choice field its values as options", () => {
    const { id, grade, items, valueOf } = setupWithItems("type-bool", "checkbox", null, [true, false]);
    expect(fieldValues(id, grade.id).map((row) => row.value)).toEqual([true, false]);
    changeFieldType(id, grade.id, "select", plan("select"));
    expect(items.map(valueOf)).toEqual(["true", "false"]);
    expect(byLabel(id, "Grade")).toMatchObject({ type: "select", options: ["false", "true"] });
  });

  it("changes nothing when the write fails halfway", () => {
    const { id, grade, items, valueOf } = setupWithItems("type-fail", "text", null, ["1", "2"]);
    // A BigInt can't be serialised, so the second item's write throws after the field was updated.
    const failing = () => ({ kept: [{ id: items[0]!, value: 1 }, { id: items[1]!, value: 2n }], blanked: [], options: null });
    expect(() => changeFieldType(id, grade.id, "number", failing)).toThrow();
    expect(byLabel(id, "Grade").type).toBe("text");
    expect(items.map(valueOf)).toEqual(["1", "2"]);
  });

  it("never moves the title field out of the text-like types", () => {
    const { id, titleFieldId } = setup("type-title");
    expect(changeFieldType(id, titleFieldId, "number", plan("number"))).toBe(false);
    expect(changeFieldType(id, titleFieldId, "url", plan("url"))).toBe(true);
    expect(listFields(id)[0]).toMatchObject({ type: "url", isTitle: 1 });
  });

  it("renames an option and only the values exactly equal to it", () => {
    const { id, grade, items, valueOf } = setupWithItems("rename", "select", ["NM", "VG"], ["NM", "VG", "NM"]);
    const notes = createItem(id, { status: "want", values: { [grade.id]: "nm" } });
    expect(renameOption(id, grade.id, "NM", "Near Mint")).toBe(true);
    expect([...items, notes].map(valueOf)).toEqual(["Near Mint", "VG", "Near Mint", "nm"]);
    expect(byLabel(id, "Grade").options).toEqual(["Near Mint", "VG"]);
    expect(renameOption(id, grade.id, "VG", "Near Mint")).toBe(false);
    expect(renameOption(id, grade.id, "Mint", "M")).toBe(false);
  });

  it("removes an option, blanking only matching values, and keeps the last option", () => {
    const { id, grade, items, valueOf } = setupWithItems("remove", "select", ["NM", "VG"], ["NM", "VG", "NM"]);
    expect(itemsWithOption(id, grade.id, "NM").map((row) => row.title)).toEqual(["T0", "T2"]);
    expect(removeOption(id, grade.id, "NM")).toBe(true);
    expect(items.map(valueOf)).toEqual([undefined, "VG", undefined]);
    expect(byLabel(id, "Grade").options).toEqual(["VG"]);
    expect(removeOption(id, grade.id, "VG")).toBe(false);
  });
});
