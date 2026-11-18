import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithContext } from "../../context";
import { createCollection, getCollectionBySlug, listCollections, updateCollection } from "../../db/collections";
import { createField, listFields } from "../../db/fields";
import { countItems, createItem, getItem, listItems } from "../../db/items";
import { db } from "../../db/connection";
import { getWishItem, listWishlist } from "../../db/wishlist";
import { uploadsDir } from "../images/process";
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
  updateCollection(collection.id, { ...collection, isPublic: 1 });
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
      image: null,
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

describe("create_collection", () => {
  it("creates a private collection with its title field and returns it like get_collection", async () => {
    const created = await call("create_collection", { name: "Comics", slug: "comics" });
    expect(created).toMatchObject({ slug: "comics", name: "Comics", public: false, defaultView: "table" });
    expect((created as { fields: unknown[] }).fields).toEqual([expect.objectContaining({ label: "Title", title: true, required: true })]);
    expect(listCollections().map((collection) => collection.slug)).toContain("comics");
  });

  it("derives a free slug from the name when none is given", async () => {
    await call("create_collection", { name: "Board Games" });
    expect(await call("create_collection", { name: "Board Games" })).toMatchObject({ slug: "board-games-2" });
  });

  it("refuses a blank name and a malformed, reserved or taken slug with the form's messages", async () => {
    const count = () => listCollections().length;
    const before = count();
    await expect(call("create_collection", { name: " " })).rejects.toThrow("name: Enter a name of up to 100 characters.");
    await expect(call("create_collection", { name: "X", slug: "Bad Slug" })).rejects.toThrow(
      "slug: Use up to 60 lowercase letters, digits and single dashes.",
    );
    await expect(call("create_collection", { name: "X", slug: "admin" })).rejects.toThrow(
      "slug: This address is used by the app itself.",
    );
    const { slug } = setup();
    await expect(call("create_collection", { name: "X", slug })).rejects.toThrow(
      "slug: Another collection already uses this address.",
    );
    expect(count()).toBe(before + 1);
  });
});

describe("item images", () => {
  // Public IP literals, so publicFetch's lookup needs no DNS; fetch itself is stubbed.
  const png = sharp({ create: { width: 8, height: 8, channels: 3, background: "#d6312b" } }).png().toBuffer();
  const image = (body: BodyInit, type = "image/png", headers: Record<string, string> = {}) =>
    new Response(body, { headers: { "content-type": type, ...headers } });
  const stubFetch = (respond: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => respond(String(input), init));
  const uploads = () => (existsSync(uploadsDir()) ? readdirSync(uploadsDir()).sort() : []);
  // The two files behind an image path "/uploads/<id>.webp".
  const files = (path: string) => {
    const id = path.slice("/uploads/".length, -".webp".length);
    return [`${id}.webp`, `${id}.thumb.webp`];
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("create_item downloads imageUrl and returns its path", async () => {
    stubFetch(async () => image(await png));
    const { slug, collection, title } = setup();
    const created = (await call("create_item", {
      collection: slug,
      values: { [title]: "Blue Train" },
      imageUrl: "https://93.184.215.14/cover.png",
    })) as { id: number; image: string };
    expect(created.image).toMatch(/^\/uploads\/[0-9a-f-]+\.webp$/);
    expect(uploads()).toEqual(expect.arrayContaining(files(created.image)));
    expect(getItem(collection.id, created.id)?.image).toBe(created.image.slice("/uploads/".length, -".webp".length));
    expect(((await call("list_items", { collection: slug })) as Array<{ image: string }>)[0]!.image).toBe(created.image);
  });

  it("update_item replaces, keeps and removes the image, and refuses imageUrl with removeImage", async () => {
    stubFetch(async () => image(await png));
    const { slug, title } = setup();
    const url = "https://93.184.215.14/a.png";
    const { id, image: first } = (await call("create_item", { collection: slug, values: { [title]: "A" }, imageUrl: url })) as {
      id: number;
      image: string;
    };
    const { image: second } = (await call("update_item", { collection: slug, id, imageUrl: url })) as { image: string };
    expect(second).not.toBe(first);
    expect(uploads()).not.toEqual(expect.arrayContaining([files(first)[0]]));
    expect(uploads()).toEqual(expect.arrayContaining(files(second)));
    expect(await call("update_item", { collection: slug, id, values: { [title]: "B" } })).toMatchObject({ image: second });
    await expect(call("update_item", { collection: slug, id, imageUrl: url, removeImage: true })).rejects.toThrow(
      "Give imageUrl or removeImage, not both.",
    );
    expect(await call("update_item", { collection: slug, id, removeImage: true })).toMatchObject({ image: null });
    expect(uploads()).not.toEqual(expect.arrayContaining([files(second)[0]]));
  });

  it("refuses a bad or internal image, writing no item and leaving no files", async () => {
    const fetched = stubFetch((url, init) => {
      if (url.endsWith("/page")) return image("<html>", "text/html");
      if (url.endsWith("/huge.png")) return image("x", "image/png", { "content-length": String(16 * 1024 * 1024) });
      // What fetch does when the 15 s signal fires.
      if (url.endsWith("/slow.png")) throw new DOMException("The operation timed out.", "TimeoutError");
      // What fetch does with redirect: "error" when the server answers with a redirect.
      if (url.endsWith("/moved.png")) {
        if (init?.redirect === "error") throw new TypeError("fetch failed: redirect");
        return Response.redirect("http://127.0.0.1/secret.png", 302);
      }
      throw new Error(`unexpected ${url}`);
    });
    const { slug, collection, title } = setup();
    const before = uploads();
    const attempt = (imageUrl: string) => call("create_item", { collection: slug, values: { [title]: "X" }, imageUrl });
    await expect(attempt("https://93.184.215.14/page")).rejects.toThrow("imageUrl: This isn't an image that can be read.");
    await expect(attempt("https://93.184.215.14/huge.png")).rejects.toThrow("imageUrl: This image is too large (max 15 MB).");
    await expect(attempt("https://93.184.215.14/slow.png")).rejects.toThrow("imageUrl: Couldn't download an image");
    await expect(attempt("https://93.184.215.14/moved.png")).rejects.toThrow("imageUrl: Couldn't download an image");
    await expect(attempt("ftp://93.184.215.14/a.png")).rejects.toThrow("imageUrl: Couldn't download an image");
    const internal = ["http://127.0.0.1/a.png", "http://10.0.0.5/a.png", "http://192.168.1.2/a.png", "http://169.254.169.254/a.png", "http://localhost/a.png"];
    for (const url of internal) await expect(attempt(url)).rejects.toThrow("imageUrl: Couldn't download an image");
    const urls = fetched.mock.calls.map(([input]) => String(input));
    expect(urls).not.toEqual(expect.arrayContaining([expect.stringMatching(/127\.0\.0\.1|10\.0\.0\.5|192\.168|169\.254|localhost/)]));
    // The redirect was never followed: fetch was told to fail on one.
    expect(fetched.mock.calls.find(([input]) => String(input).endsWith("/moved.png"))?.[1]?.redirect).toBe("error");
    expect(countItems(collection.id).have).toBe(0);
    expect(uploads()).toEqual(before);
  });

  it("leaves an existing item and its image alone when the new image is refused", async () => {
    stubFetch(async (url) => (url.endsWith("/ok.png") ? image(await png) : image("<html>", "text/html")));
    const { slug, collection, title } = setup();
    const { id, image: kept } = (await call("create_item", {
      collection: slug,
      values: { [title]: "Kept" },
      imageUrl: "https://93.184.215.14/ok.png",
    })) as { id: number; image: string };
    const before = uploads();
    await expect(
      call("update_item", { collection: slug, id, values: { [title]: "Changed" }, imageUrl: "https://93.184.215.14/page" }),
    ).rejects.toThrow("imageUrl:");
    expect(getItem(collection.id, id)).toMatchObject({ values: { [title]: "Kept" } });
    expect(await call("get_item", { collection: slug, id })).toMatchObject({ image: kept });
    expect(uploads()).toEqual(before);
  });
});

describe("wishlist tools", () => {
  const png = sharp({ create: { width: 8, height: 8, channels: 3, background: "#2b6cd6" } }).png().toBuffer();
  const uploads = () => (existsSync(uploadsDir()) ? readdirSync(uploadsDir()).sort() : []);
  const titles = () => listWishlist(1).map((wish) => `${wish.rank}:${wish.title}`);
  const add = (title: string, extra: Record<string, unknown> = {}) =>
    call("create_wishlist_item", { title, ...extra }) as Promise<{ id: number; rank: number; image: string | null }>;

  beforeEach(() => {
    db().prepare("delete from wishlist_items").run();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates at the bottom without a rank, and at rank 2 with one, shifting the others", async () => {
    await add("Lamp");
    await add("Mug");
    expect(await add("Grinder", { rank: 2, price: "~€30–40", link: "https://shop.example/g" })).toMatchObject({
      rank: 2,
      title: "Grinder",
      price: "~€30–40",
      link: "https://shop.example/g",
      note: null,
      image: null,
    });
    const listed = (await call("list_wishlist")) as { public: boolean; items: Array<{ title: string; rank: number }> };
    expect(listed.public).toBe(false);
    expect(listed.items.map((item) => `${item.rank}:${item.title}`)).toEqual(["1:Lamp", "2:Grinder", "3:Mug"]);
  });

  it("updates only what is given, keeping the rank, and clears a value with \"\"", async () => {
    await add("Lamp");
    const { id } = await add("Mug", { link: "https://shop.example/mug", note: "Blue" });
    expect(await call("update_wishlist_item", { id, price: "€12" })).toMatchObject({
      id,
      title: "Mug",
      link: "https://shop.example/mug",
      note: "Blue",
      price: "€12",
      rank: 2,
    });
    expect(await call("update_wishlist_item", { id, note: "" })).toMatchObject({ note: null, price: "€12" });
    expect(await call("update_wishlist_item", { id, rank: 1 })).toMatchObject({ rank: 1 });
  });

  it("refuses an unknown id clearly", async () => {
    await expect(call("update_wishlist_item", { id: 999_999, price: "€1" })).rejects.toThrow(
      "No wishlist item has the id 999999. list_wishlist shows them.",
    );
    await expect(call("delete_wishlist_item", { id: 999_999 })).rejects.toThrow("No wishlist item has the id 999999");
    await expect(call("move_wishlist_item", { id: 999_999, rank: 1 })).rejects.toThrow("No wishlist item has the id 999999");
  });

  it("deletes an item, closing the gap and removing its image files", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(await png, { headers: { "content-type": "image/png" } }));
    await add("Lamp");
    const { id, image } = await add("Mug", { imageUrl: "https://93.184.215.14/mug.png" });
    await add("Grinder");
    const id_ = image!.slice("/uploads/".length, -".webp".length);
    expect(uploads()).toEqual(expect.arrayContaining([`${id_}.webp`, `${id_}.thumb.webp`]));
    expect(await call("delete_wishlist_item", { id })).toEqual({ deleted: id });
    expect(titles()).toEqual(["1:Lamp", "2:Grinder"]);
    expect(uploads()).not.toEqual(expect.arrayContaining([`${id_}.webp`]));
    expect(uploads()).not.toEqual(expect.arrayContaining([`${id_}.thumb.webp`]));
  });

  it("moves an item, clamping a rank past either end", async () => {
    await add("A");
    const { id } = await add("B");
    await add("C");
    expect(await call("move_wishlist_item", { id, rank: 99 })).toMatchObject({ rank: 3 });
    expect(titles()).toEqual(["1:A", "2:C", "3:B"]);
    expect(await call("move_wishlist_item", { id, rank: -4 })).toMatchObject({ rank: 1 });
    expect(titles()).toEqual(["1:B", "2:A", "3:C"]);
  });

  it("refuses a javascript: link, an empty title and a bad image URL with the form's messages, saving nothing", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("<html>", { headers: { "content-type": "text/html" } }));
    const { id } = await add("Kept", { link: "https://shop.example/kept" });
    const before = uploads();
    await expect(add("X", { link: "javascript:alert(1)" })).rejects.toThrow(
      "link: Enter a web address starting with http:// or https://.",
    );
    await expect(add("  ")).rejects.toThrow("title: Enter a title of up to 200 characters.");
    await expect(add("X", { imageUrl: "https://93.184.215.14/page" })).rejects.toThrow("imageUrl: This isn't an image that can be read.");
    await expect(add("X", { imageUrl: "http://127.0.0.1/a.png" })).rejects.toThrow("imageUrl: Couldn't download an image");
    const both = call("update_wishlist_item", { id, title: "", link: "javascript:x" });
    await expect(both).rejects.toThrow("title: Enter a title of up to 200 characters.");
    await expect(both).rejects.toThrow("link: Enter a web address starting with http:// or https://.");
    expect(titles()).toEqual(["1:Kept"]);
    expect(getWishItem(id)).toMatchObject({ title: "Kept", link: "https://shop.example/kept" });
    expect(uploads()).toEqual(before);
  });
});
