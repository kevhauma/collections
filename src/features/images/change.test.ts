import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { commitImage, imageSource, prepareImage, sourceInput } from "./change";
import { ImageError } from "./fetch";
import { processImage } from "./process";

let uploads: string;
beforeEach(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-change-"));
  uploads = join(process.env.DATA_DIR, "uploads");
});

const png = () => sharp({ create: { width: 40, height: 40, channels: 3, background: "#bfe8a6" } }).png().toBuffer();
const file = async (bytes: Buffer | string, name = "cover.png") =>
  new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name, { type: "image/png" });
const files = () => readdirSync(uploads).sort();

describe("imageSource", () => {
  it("prefers a chosen file over a URL, then the URL, then the remove box", async () => {
    const chosen = await file("x");
    expect(imageSource({ image: chosen, imageUrl: "https://a.b/c.png", removeImage: "on" })).toEqual({ file: chosen });
    expect(imageSource({ image: await file(""), imageUrl: " https://a.b/c.png " })).toEqual({ url: "https://a.b/c.png" });
    expect(imageSource({ image: await file(""), imageUrl: "  ", removeImage: "on" })).toBe("remove");
    expect(imageSource({ image: await file(""), imageUrl: "" })).toBeUndefined();
  });

  it("names the input an image came from", async () => {
    expect(sourceInput({ file: await file("x") })).toBe("image");
    expect(sourceInput({ url: "https://a.b/c.png" })).toBe("imageUrl");
  });
});

describe("prepareImage", () => {
  it("processes a chosen file into the uploads folder", async () => {
    const id = await prepareImage({ file: await file(await png()) });
    expect(files()).toEqual([`${id}.thumb.webp`, `${id}.webp`]);
  });

  it("refuses a file over 15 MB before reading it", async () => {
    const big = { size: 20 * 1024 * 1024, arrayBuffer: () => Promise.reject(new Error("read")) } as unknown as File;
    await expect(prepareImage({ file: big })).rejects.toEqual(new ImageError("tooLarge"));
  });

  it("keeps or removes without touching files", async () => {
    expect(await prepareImage(undefined)).toBeUndefined();
    expect(await prepareImage("remove")).toBeNull();
  });
});

describe("commitImage", () => {
  it("deletes the old image's files after a successful write", async () => {
    const old = await processImage(await png(), uploads);
    const replacement = await processImage(await png(), uploads);
    expect(await commitImage(replacement, old, () => "saved")).toBe("saved");
    expect(files()).toEqual([`${replacement}.thumb.webp`, `${replacement}.webp`]);
  });

  it("deletes the old files when the image is removed, and nothing when it's kept", async () => {
    const old = await processImage(await png(), uploads);
    await commitImage(undefined, old, () => undefined);
    expect(files()).toHaveLength(2);
    await commitImage(null, old, () => undefined);
    expect(files()).toEqual([]);
  });

  it("deletes the new files and keeps the old ones when the write fails", async () => {
    const old = await processImage(await png(), uploads);
    const replacement = await processImage(await png(), uploads);
    const failing = () => {
      throw new Error("CHECK constraint failed");
    };
    await expect(commitImage(replacement, old, failing)).rejects.toThrow("CHECK constraint failed");
    expect(files()).toEqual([`${old}.thumb.webp`, `${old}.webp`]);
  });
});
