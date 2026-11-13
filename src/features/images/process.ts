import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { dataDir } from "../../lib/env";
import { ImageError } from "./fetch";

// Item images (TICKET-ITM-04): a display size and a thumbnail, as WebP, named by a random UUID. The original isn't
// kept, and sharp drops EXIF / GPS metadata unless asked to keep it.

const uploadsDir = (): string => join(dataDir(), "uploads");

const sizes = [
  { suffix: "", max: 1000 },
  { suffix: ".thumb", max: 300 },
] as const;

const filesOf = (id: string, dir: string) => sizes.map((size) => join(dir, `${id}${size.suffix}.webp`));

export const removeImage = async (id: string, dir = uploadsDir()): Promise<void> => {
  await Promise.all(filesOf(id, dir).map((file) => rm(file, { force: true })));
};

// Writes both sizes, rotated upright from EXIF, and returns the new image's id. Throws ImageError("notImage") for
// anything sharp can't decode (including HEIC: the prebuilt libvips reads AVIF but not HEVC).
export const processImage = async (input: Buffer, dir = uploadsDir()): Promise<string> => {
  const id = randomUUID();
  await mkdir(dir, { recursive: true });
  const image = sharp(input).rotate();
  try {
    await Promise.all(
      sizes.map((size, index) =>
        image
          .clone()
          .resize(size.max, size.max, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filesOf(id, dir)[index]!),
      ),
    );
  } catch {
    await removeImage(id, dir);
    throw new ImageError("notImage");
  }
  return id;
};
