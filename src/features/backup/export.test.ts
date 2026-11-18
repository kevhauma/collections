import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import yauzl from "yauzl";
import type { ZipFile } from "yazl";
import { createCollection, getCollectionBySlug, setItemImage, updateCollection } from "../../db/collections";
import { readSnapshot } from "../../db/export";
import { createField, listFields } from "../../db/fields";
import { createItem } from "../../db/items";
import { setDefaultLocale } from "../../db/settings";
import { createWishItem, createWishlist, updateWishlist } from "../../db/wishlist";
import { processImage } from "../images/process";
import { buildExport, exportFilename } from "./export";

let uploads: string;

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-export-"));
  uploads = join(process.env.DATA_DIR, "uploads");
});

const bytesOf = (zip: ZipFile): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);
  });

// Every entry of a zip, by name.
const unzip = (buffer: Buffer): Promise<Map<string, Buffer>> =>
  new Promise((resolve, reject) => {
    const files = new Map<string, Buffer>();
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, archive) => {
      if (error) return reject(error);
      archive.on("entry", (entry: yauzl.Entry) =>
        archive.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => {
            files.set(entry.fileName, Buffer.concat(chunks));
            archive.readEntry();
          });
        }),
      );
      archive.on("end", () => resolve(files));
      archive.readEntry();
    });
  });

const setup = async () => {
  setDefaultLocale("nl");
  createCollection("Vinyl", "vinyl", "Title");
  const vinyl = getCollectionBySlug("vinyl")!;
  updateCollection(vinyl.id, { ...vinyl, isPublic: 1, defaultView: "grid" });
  createField(vinyl.id, { label: "Paid", type: "number", options: null, required: 0, isPublic: 0, prefix: "€", suffix: "excl." });
  createField(vinyl.id, { label: "Signed", type: "checkbox", options: null, required: 0, isPublic: 1, prefix: null, suffix: null });
  const [title, paid, signed] = listFields(vinyl.id).map((field) => String(field.id));
  const image = await processImage(
    await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#ffb3c7" } }).png().toBuffer(),
    uploads,
  );
  createItem(vinyl.id, {
    status: "have",
    quantity: 2,
    values: { [title!]: 'Café, "Olé"\nlive', [paid!]: 12.5, [signed!]: true },
    image,
  });
  createItem(vinyl.id, { status: "want", values: { [title!]: "=cmd|' /C calc'!A0", [signed!]: false }, image: "gone" });
  // Collection pictures (TICKET-COL-06): Vinyl's file exists, Books' is gone.
  const cover = await processImage(
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#1f3a93" } }).png().toBuffer(),
    uploads,
  );
  updateCollection(vinyl.id, { ...vinyl, isPublic: 1, defaultView: "grid" }, cover);
  // Default item images (TICKET-COL-08): Vinyl's file exists, Books' is gone.
  const sleeve = await processImage(
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#ffe66d" } }).png().toBuffer(),
    uploads,
  );
  setItemImage(vinyl.id, sleeve);
  createCollection("Books", "books", "Title");
  const books = getCollectionBySlug("books")!;
  updateCollection(books.id, books, "lost-cover");
  setItemImage(books.id, "lost-spine");
  // The wishlists (TICKET-WSH-02, TICKET-WSH-08): the migrated one, public, with one item with an image and one whose
  // image file is gone; a private second one with an image of its own.
  const lamp = await processImage(
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#7bd389" } }).png().toBuffer(),
    uploads,
  );
  updateWishlist(1, { name: "Wishlist", slug: "wishlist", isPublic: 1, showReminders: 1 });
  createWishItem(1, { title: "Lamp", link: "https://shop.example/lamp", note: 'Brass, "big" one', price: "€25", image: lamp });
  createWishItem(1, { title: "Mug", link: null, note: null, price: null, image: "lost-mug" });
  const cake = await processImage(
    await sharp({ create: { width: 400, height: 400, channels: 3, background: "#f4a261" } }).png().toBuffer(),
    uploads,
  );
  createWishItem(createWishlist("Birthday", "birthday"), { title: "Cake", link: null, note: null, price: null, image: cake });
  return { vinyl, image, cover, sleeve, lamp, cake, ids: { title: title!, paid: paid!, signed: signed! } };
};

describe("buildExport", () => {
  it("writes an empty wishlist with its flags and a header-only CSV", async () => {
    expect(readSnapshot().wishlists).toEqual([{ name: "Wishlist", slug: "wishlist", isPublic: 0, showReminders: 1, items: [] }]);
    const files = await unzip(await bytesOf(buildExport(readSnapshot(), uploads)));
    expect(JSON.parse(files.get("data.json")!.toString())).toMatchObject({
      version: 3,
      wishlists: [{ name: "Wishlist", slug: "wishlist", isPublic: false, showReminders: true, items: [] }],
    });
    expect(files.get("csv/_wishlist-wishlist.csv")!.toString("utf8")).toBe("﻿rank,title,link,note,price,image\r\n");
  });

  it("round-trips: data.json matches the DB, CSVs are written, and every referenced image is in the zip", async () => {
    const { image, cover, sleeve, lamp, cake, ids } = await setup();
    const now = new Date("2026-11-13T10:00:00Z");
    const files = await unzip(await bytesOf(buildExport(readSnapshot(), uploads, now)));

    expect([...files.keys()].sort()).toEqual(
      [
        "csv/_wishlist-birthday.csv",
        "csv/_wishlist-wishlist.csv",
        "csv/books.csv",
        "csv/vinyl.csv",
        "data.json",
        `images/${cover}.webp`,
        `images/${image}.webp`,
        `images/${sleeve}.webp`,
        `images/${lamp}.webp`,
        `images/${cake}.webp`,
      ].sort(),
    );
    const data = JSON.parse(files.get("data.json")!.toString());
    expect(data).toMatchObject({ version: 3, exportedAt: "2026-11-13T10:00:00.000Z", settings: { defaultLocale: "nl" } });
    expect(data.missingImages.toSorted()).toEqual(["gone", "lost-cover", "lost-mug", "lost-spine"]);
    const [birthday, wishlist] = data.wishlists;
    expect(birthday).toEqual({
      name: "Birthday",
      slug: "birthday",
      isPublic: false,
      showReminders: false,
      items: [expect.objectContaining({ title: "Cake", rank: 1, image: `images/${cake}.webp` })],
    });
    expect(wishlist).toEqual({
      name: "Wishlist",
      slug: "wishlist",
      isPublic: true,
      showReminders: true,
      items: [
        {
          title: "Lamp",
          link: "https://shop.example/lamp",
          note: 'Brass, "big" one',
          price: "€25",
          image: `images/${lamp}.webp`,
          rank: 1,
          createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        },
        expect.objectContaining({ title: "Mug", link: null, note: null, price: null, image: null, rank: 2 }),
      ],
    });
    expect(files.get("csv/_wishlist-birthday.csv")!.toString("utf8")).toContain(`1,Cake,,,,images/${cake}.webp`);
    expect(files.get("csv/_wishlist-wishlist.csv")!.toString("utf8")).toBe(
      "﻿rank,title,link,note,price,image\r\n" +
        `1,Lamp,https://shop.example/lamp,"Brass, ""big"" one",€25,images/${lamp}.webp\r\n` +
        "2,Mug,,,,\r\n",
    );
    const [books, vinyl] = data.collections;
    expect(books).toMatchObject({ slug: "books", fields: [{ label: "Title" }], items: [], image: null, itemImage: null });
    expect(vinyl).toMatchObject({
      slug: "vinyl",
      name: "Vinyl",
      isPublic: true,
      defaultView: "grid",
      image: `images/${cover}.webp`,
      itemImage: `images/${sleeve}.webp`,
      showOnWishlist: true,
    });
    type Exported = { label: string; isPublic: boolean; required: boolean; prefix: string | null; suffix: string | null };
    expect(vinyl.fields.map((field: Exported) => [field.label, field.isPublic, field.required, field.prefix, field.suffix])).toEqual([
      ["Title", true, true, null, null],
      ["Paid", false, false, "€", "excl."],
      ["Signed", true, false, null, null],
    ]);
    expect(vinyl.fields[1]).toMatchObject({ ratingMax: null, ratingSymbol: null });
    expect(vinyl.items).toEqual([
      {
        status: "have",
        quantity: 2,
        rank: null,
        values: { [ids.title]: 'Café, "Olé"\nlive', [ids.paid]: 12.5, [ids.signed]: true },
        image: `images/${image}.webp`,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
      expect.objectContaining({ status: "want", quantity: null, rank: 1, image: null }),
    ]);
    // Every image path in data.json is in the zip, and the image is the display size.
    for (const item of vinyl.items.filter((entry: { image: string | null }) => entry.image)) {
      expect(files.has(item.image)).toBe(true);
    }
    expect(await sharp(files.get(`images/${image}.webp`)!).metadata()).toMatchObject({ format: "webp", width: 1000 });

    const csv = files.get("csv/vinyl.csv")!.toString("utf8");
    expect(csv).toBe(
      "﻿Title,Paid,Signed,status,quantity,rank,image\r\n" +
        `"Café, ""Olé""\nlive",12.5,true,have,2,,images/${image}.webp\r\n` +
        "'=cmd|' /C calc'!A0,,false,want,,1,\r\n",
    );
  });

  it("names the file after the day", () => {
    expect(exportFilename(new Date("2026-11-13T23:30:00Z"))).toBe("hoardr-export-2026-11-13.zip");
  });
});
