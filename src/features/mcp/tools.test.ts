import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { runWithContext } from "../../context";
import { createCollection, getCollectionBySlug, updateCollection } from "../../db/collections";
import { createField, listFields } from "../../db/fields";
import { countItems, createItem, getItem, listItems } from "../../db/items";
import { tools } from "./tools";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-mcp-tools-"));
});

type Tools = typeof tools;

// As the MCP server calls a tool: its input schema applies defaults, inside a request with the English locale.
const call = <N extends keyof Tools>(name: N, args: Record<string, unknown> = {}) =>
  runWithContext({ request: new Request("http://localhost/api/mcp"), locale: "en", setCookies: [] }, async () => {
    const tool = tools[name] as unknown as { input: { parse: (value: unknown) => unknown }; run: (args: unknown) => unknown };
    return tool.run(tool.input.parse(args)) as Promise<never>;
  });

let collections = 0;
// A collection with a title, a number "Price" (private) and a choice "Format".
const setup = () => {
  const slug = `records-${++collections}`;
  createCollection(`Records ${collections}`, slug, "Title");
  const collection = getCollectionBySlug(slug)!;
  updateCollection(collection.id, { name: collection.name, slug, isPublic: 1, defaultView: "table" });
  const base = { options: null, required: 0 as const, prefix: null, suffix: null };
  createField(collection.id, { ...base, label: "Price", type: "number", isPublic: 0, prefix: "€" });
  createField(collection.id, { ...base, label: "Format", type: "select", options: ["LP", "CD"], isPublic: 1 });
  const [title, price, format] = listFields(collection.id);
  return { slug, collection, title: title!.id, price: price!.id, format: format!.id };
};

describe("list_collections", () => {
  it("lists slug, name, public flag and counts", async () => {
    const { slug, collection, title } = setup();
    createItem(collection.id, { status: "want", values: { [title]: "Kind of Blue" } });
    expect(await call("list_collections")).toContainEqual({ slug, name: collection.name, public: true, have: 0, want: 1 });
  });
});

describe("get_collection", () => {
  it("returns the settings and fields, private ones included", async () => {
    const { slug, price } = setup();
    const result = (await call("get_collection", { collection: slug })) as { fields: Array<Record<string, unknown>> };
    expect(result).toMatchObject({ slug, public: true, defaultView: "table" });
    expect(result.fields.map((field) => field.label)).toEqual(["Title", "Price", "Format"]);
    expect(result.fields[1]).toMatchObject({ id: price, type: "number", public: false, prefix: "€", title: false });
  });

  it("refuses an unknown slug", async () => {
    await expect(call("get_collection", { collection: "nope" })).rejects.toThrow('No collection has the slug "nope"');
  });
});

describe("list_items", () => {
  it("searches, filters and sorts like the list page, private values included", async () => {
    const { slug, collection, title, price, format } = setup();
    createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Blue Train", [price]: 30, [format]: "LP" } });
    createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Blue Lines", [price]: 10, [format]: "CD" } });
    createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Giant Steps", [format]: "LP" } });
    const result = (await call("list_items", {
      collection: slug,
      q: "blue",
      sort: String(price),
      dir: "desc",
    })) as Array<{ values: Array<{ label: string; value: unknown }> }>;
    expect(result.map((item) => item.values.find((value) => value.label === "Title")?.value)).toEqual([
      "Blue Train",
      "Blue Lines",
    ]);
    expect(result[0]!.values).toContainEqual({ fieldId: price, label: "Price", value: 30 });
    const lps = (await call("list_items", { collection: slug, filters: { [format]: "LP" } })) as unknown[];
    expect(lps).toHaveLength(2);
  });
});

describe("get_item", () => {
  it("returns the values with field id and label", async () => {
    const { slug, collection, title, price } = setup();
    const id = createItem(collection.id, { status: "have", quantity: 2, values: { [title]: "Blue Train", [price]: 30 } });
    expect(await call("get_item", { collection: slug, id })).toEqual({
      id,
      status: "have",
      quantity: 2,
      rank: null,
      values: [
        { fieldId: title, label: "Title", value: "Blue Train" },
        { fieldId: price, label: "Price", value: 30 },
      ],
    });
  });

  it("refuses an item of another collection", async () => {
    const other = setup();
    const id = createItem(other.collection.id, { status: "have", quantity: 1, values: { [other.title]: "Elsewhere" } });
    await expect(call("get_item", { collection: setup().slug, id })).rejects.toThrow(`Item ${id} isn't in`);
  });
});

describe("create_item", () => {
  it("validates like the item form and saves", async () => {
    const { slug, collection, title, price } = setup();
    const created = (await call("create_item", { collection: slug, values: { [title]: "A Love Supreme", [price]: "12,5" } })) as {
      id: number;
    };
    expect(getItem(collection.id, created.id)).toMatchObject({ status: "have", quantity: 1, values: { [title]: "A Love Supreme", [price]: 12.5 } });
  });

  it("puts a want at the rank asked for", async () => {
    const { slug, collection, title } = setup();
    createItem(collection.id, { status: "want", values: { [title]: "First" } });
    const created = (await call("create_item", { collection: slug, status: "want", rank: 1, values: { [title]: "Top" } })) as {
      rank: number;
    };
    expect(created.rank).toBe(1);
    expect(listItems({ collectionId: collection.id, status: "want", sort: "rank" }).map((item) => item.values[title])).toEqual([
      "Top",
      "First",
    ]);
  });

  it("refuses an invalid value with the UI's message and writes nothing", async () => {
    const { slug, collection, title, price } = setup();
    await expect(call("create_item", { collection: slug, values: { [title]: "Kind of Blue", [price]: "abc" } })).rejects.toThrow(
      "Price: Enter a number, like 12 or 12,5.",
    );
    await expect(call("create_item", { collection: slug, values: {} })).rejects.toThrow("Title: Fill this in.");
    expect(countItems(collection.id)).toEqual({ have: 0, want: 0 });
  });

  it("refuses a value key that isn't a field id instead of dropping it", async () => {
    const { slug, collection, title } = setup();
    await expect(call("create_item", { collection: slug, values: { [title]: "X", Price: 3 } })).rejects.toThrow(
      "Unknown field ids: Price",
    );
    expect(countItems(collection.id).have).toBe(0);
  });
});

describe("update_item", () => {
  it("changes only what is given", async () => {
    const { slug, collection, title, price } = setup();
    const id = createItem(collection.id, { status: "have", quantity: 3, values: { [title]: "Blue Train", [price]: 30 } });
    await call("update_item", { collection: slug, id, values: { [price]: 25 } });
    expect(getItem(collection.id, id)).toMatchObject({ status: "have", quantity: 3, values: { [title]: "Blue Train", [price]: 25 } });
    await call("update_item", { collection: slug, id, status: "want", values: { [price]: null } });
    expect(getItem(collection.id, id)).toMatchObject({ status: "want", quantity: null, rank: 1, values: { [title]: "Blue Train" } });
  });

  it("refuses an option that isn't one of the field's", async () => {
    const { slug, collection, title, format } = setup();
    const id = createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Blue Train", [format]: "LP" } });
    await expect(call("update_item", { collection: slug, id, values: { [format]: "Tape" } })).rejects.toThrow(
      "Format: Pick one of the options.",
    );
    expect(getItem(collection.id, id)?.values[format]).toBe("LP");
  });
});

describe("delete_item", () => {
  it("deletes one item", async () => {
    const { slug, collection, title } = setup();
    const id = createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Gone" } });
    expect(await call("delete_item", { collection: slug, id })).toEqual({ deleted: id });
    expect(getItem(collection.id, id)).toBeUndefined();
  });

  it("refuses an unknown item", async () => {
    await expect(call("delete_item", { collection: setup().slug, id: 999_999 })).rejects.toThrow("Item 999999 isn't in");
  });
});

describe("move_want", () => {
  it("moves a want and shifts the others", async () => {
    const { slug, collection, title } = setup();
    const ids = ["A", "B", "C"].map((name) => createItem(collection.id, { status: "want", values: { [title]: name } }));
    await call("move_want", { collection: slug, id: ids[2], rank: 1 });
    expect(listItems({ collectionId: collection.id, status: "want", sort: "rank" }).map((item) => item.values[title])).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("refuses a have", async () => {
    const { slug, collection, title } = setup();
    const id = createItem(collection.id, { status: "have", quantity: 1, values: { [title]: "Owned" } });
    await expect(call("move_want", { collection: slug, id, rank: 1 })).rejects.toThrow(`Item ${id} isn't a want`);
  });
});

describe("create_field", () => {
  it("adds a field like the field form", async () => {
    const { slug, collection } = setup();
    const created = await call("create_field", { collection: slug, label: "Condition", type: "select", options: ["Mint", "Good"], public: false });
    expect(created).toMatchObject({ label: "Condition", type: "select", options: ["Mint", "Good"], public: false, required: false });
    expect(listFields(collection.id).at(-1)?.label).toBe("Condition");
  });

  it("refuses a taken label with the UI's message", async () => {
    const { slug, collection } = setup();
    await expect(call("create_field", { collection: slug, label: "price", type: "text" })).rejects.toThrow(
      "label: Another field already has this label.",
    );
    expect(listFields(collection.id)).toHaveLength(3);
  });
});

describe("update_field", () => {
  it("renames, makes public and adds options, keeping the rest", async () => {
    const { slug, collection, format } = setup();
    const updated = await call("update_field", { collection: slug, id: format, label: "Medium", addOptions: ["Tape"] });
    expect(updated).toMatchObject({ label: "Medium", options: ["LP", "CD", "Tape"], public: true, required: false });
    const priced = await call("update_field", { collection: slug, id: listFields(collection.id)[1]!.id, public: true });
    expect(priced).toMatchObject({ label: "Price", public: true, prefix: "€" });
  });

  it("refuses a duplicate option with the UI's message", async () => {
    const { slug, format } = setup();
    await expect(call("update_field", { collection: slug, id: format, addOptions: ["LP"] })).rejects.toThrow(
      "options: Each option can appear only once.",
    );
  });
});
