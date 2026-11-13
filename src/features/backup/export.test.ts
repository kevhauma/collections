import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import yauzl from "yauzl";
import type { ZipFile } from "yazl";
import { createCollection, getCollectionBySlug, updateCollection } from "../../db/collections";
import { readSnapshot } from "../../db/export";
import { createField, listFields } from "../../db/fields";
import { createItem } from "../../db/items";
import { setDefaultLocale } from "../../db/settings";
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
  createCollection("Books", "books", "Title");
  const books = getCollectionBySlug("books")!;
  updateCollection(books.id, books, "lost-cover");
  return { vinyl, image, cover, ids: { title: title!, paid: paid!, signed: signed! } };
};

describe("buildExport", () => {
  it("round-trips: data.json matches the DB, CSVs are written, and every referenced image is in the zip", async () => {
    const { image, cover, ids } = await setup();
    const now = new Date("2026-11-13T10:00:00Z");
    const files = await unzip(await bytesOf(buildExport(readSnapshot(), uploads, now)));

    expect([...files.keys()].sort()).toEqual(
      ["csv/books.csv", "csv/vinyl.csv", "data.json", `images/${cover}.webp`, `images/${image}.webp`].sort(),
    );
    const data = JSON.parse(files.get("data.json")!.toString());
    expect(data).toMatchObject({ version: 1, exportedAt: "2026-11-13T10:00:00.000Z", settings: { defaultLocale: "nl" } });
    expect(data.missingImages.toSorted()).toEqual(["gone", "lost-cover"]);
    const [books, vinyl] = data.collections;
    expect(books).toMatchObject({ slug: "books", fields: [{ label: "Title" }], items: [], image: null });
    expect(vinyl).toMatchObject({ slug: "vinyl", name: "Vinyl", isPublic: true, defaultView: "grid", image: `images/${cover}.webp` });
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
    expect(exportFilename(new Date("2026-11-13T23:30:00Z"))).toBe("collections-export-2026-11-13.zip");
  });
});
