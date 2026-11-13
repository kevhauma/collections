import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ImageError } from "./fetch";
import { processImage, removeImage } from "./process";

const tempDir = () => mkdtempSync(join(tmpdir(), "collections-images-"));

// A solid 2400×1200 PNG: wider than both bounds, so both outputs are scaled down.
const png = () => sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#1f3a93" } }).png().toBuffer();

const metadataOf = (dir: string, file: string) => sharp(join(dir, file)).metadata();

describe("processImage", () => {
  it("writes a display WebP and a thumbnail within their bounds", async () => {
    const dir = tempDir();
    const id = await processImage(await png(), dir);
    expect(readdirSync(dir).sort()).toEqual([`${id}.thumb.webp`, `${id}.webp`]);
    expect(await metadataOf(dir, `${id}.webp`)).toMatchObject({ format: "webp", width: 1000, height: 500 });
    expect(await metadataOf(dir, `${id}.thumb.webp`)).toMatchObject({ format: "webp", width: 300, height: 150 });
  });

  it("applies the EXIF orientation and strips the metadata", async () => {
    const dir = tempDir();
    // 400×200 stored sideways: orientation 6 means "rotate 90° clockwise to display".
    const rotated = await sharp({ create: { width: 400, height: 200, channels: 3, background: "#d6312b" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const id = await processImage(rotated, dir);
    const display = await metadataOf(dir, `${id}.webp`);
    expect(display).toMatchObject({ width: 200, height: 400 });
    expect(display.orientation).toBeUndefined();
    expect(display.exif).toBeUndefined();
  });

  it("never enlarges a small image", async () => {
    const dir = tempDir();
    const small = await sharp({ create: { width: 120, height: 80, channels: 3, background: "#fff27a" } }).png().toBuffer();
    const id = await processImage(small, dir);
    expect(await metadataOf(dir, `${id}.webp`)).toMatchObject({ width: 120, height: 80 });
  });

  it("refuses bytes that aren't an image and leaves no files", async () => {
    const dir = tempDir();
    await expect(processImage(Buffer.from("<html>not an image</html>"), dir)).rejects.toEqual(new ImageError("notImage"));
    expect(readdirSync(dir)).toEqual([]);
  });

  it("removes both files of an image", async () => {
    const dir = tempDir();
    const id = await processImage(await png(), dir);
    await removeImage(id, dir);
    expect(existsSync(join(dir, `${id}.webp`))).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });
});
