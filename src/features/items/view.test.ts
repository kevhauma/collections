import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "../../db/collections";
import { createField, listFields } from "../../db/fields";
import { createItem, moveWant } from "../../db/items";
import { itemView } from "./view";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-view-"));
});

// Vinyl with a public Format choice and a private Paid price and Condition choice.
const setup = () => {
  createCollection("Vinyl", "vinyl", "Title");
  const collection = getCollectionBySlug("vinyl")!;
  createField(collection.id, { label: "Format", type: "select", options: ["LP", "EP"], required: 0, isPublic: 1, prefix: null, suffix: null });
  createField(collection.id, { label: "Paid", type: "number", options: null, required: 0, isPublic: 0, prefix: null, suffix: null });
  createField(collection.id, { label: "Condition", type: "select", options: ["Mint", "Worn"], required: 0, isPublic: 0, prefix: null, suffix: null });
  const id = Object.fromEntries(listFields(collection.id).map((field) => [field.label, String(field.id)]));
  const item = (status: "have" | "want", title: string, format: string, paid: number, condition: string) =>
    createItem(collection.id, {
      ...(status === "have" ? { status, quantity: 1 } : { status }),
      values: { [id.Title!]: title, [id.Format!]: format, [id.Paid!]: paid, [id.Condition!]: condition },
    });
  item("have", "Kind of Blue", "LP", 31.5, "Mint");
  item("have", "Blue Train", "EP", 77.25, "Worn");
  const giant = item("want", "Giant Steps", "LP", 0, "Mint");
  item("want", "Moanin'", "EP", 0, "Worn");
  moveWant(collection.id, giant, 2);
  return { collection, id };
};

let vinyl: ReturnType<typeof setup>;
beforeAll(() => {
  vinyl = setup();
});

const titles = (view: ReturnType<typeof itemView>) => view.items.map((item) => item.values[vinyl.id.Title!]);

describe("itemView for visitors (publicOnly)", () => {
  it("hands the view only public fields, and items without private keys", () => {
    const view = itemView(vinyl.collection, "have", new URLSearchParams(), { publicOnly: true });
    expect(view.fields.map((field) => field.label)).toEqual(["Title", "Format"]);
    expect(view.items).toHaveLength(2);
    for (const item of view.items) {
      expect(Object.keys(item.values).sort()).toEqual([vinyl.id.Title, vinyl.id.Format].sort());
    }
    expect(JSON.stringify(view)).not.toMatch(/77\.25|31\.5|Mint|Worn|Paid|Condition/);
  });

  it("never searches, sorts or filters on a private field", () => {
    const search = (query: string) => itemView(vinyl.collection, "have", new URLSearchParams(query), { publicOnly: true });
    expect(titles(search("q=Worn"))).toEqual([]);
    expect(titles(search(`f.${vinyl.id.Condition}=Worn`))).toEqual(["Blue Train", "Kind of Blue"]);
    expect(search(`sort=${vinyl.id.Paid}`).list.sort).toBe(Number(vinyl.id.Title));
    expect(titles(search(`f.${vinyl.id.Format}=EP`))).toEqual(["Blue Train"]);
  });

  it("orders the want tab by rank", () => {
    const view = itemView(vinyl.collection, "want", new URLSearchParams(), { publicOnly: true });
    expect(view.items.map((item) => [item.rank, item.values[vinyl.id.Title!]])).toEqual([
      [1, "Moanin'"],
      [2, "Giant Steps"],
    ]);
  });

  it("gives the admin every field and value", () => {
    const view = itemView(vinyl.collection, "have", new URLSearchParams("q=Worn"));
    expect(view.fields).toHaveLength(4);
    expect(titles(view)).toEqual(["Blue Train"]);
  });
});
