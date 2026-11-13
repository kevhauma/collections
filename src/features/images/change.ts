import { downloadImage, ImageError } from "./fetch";
import { maxImageBytes } from "./shared";
import { processImage, removeImage } from "./process";

// An item save's image (TICKET-ITM-04). The form has a file input (`image`), a URL input (`imageUrl`) and a
// "remove image" checkbox (`removeImage`). A chosen file wins over a URL.

type ImageSource = { file: File } | { url: string } | "remove" | undefined;

export const imageSource = (form: Record<string, unknown>): ImageSource => {
  const { image, imageUrl, removeImage: remove } = form;
  if (image instanceof File && image.size > 0) return { file: image };
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (url) return { url };
  return remove === "on" ? "remove" : undefined;
};

// Which input an image came from, so its error shows there.
export const sourceInput = (source: ImageSource): "image" | "imageUrl" =>
  typeof source === "object" && "file" in source ? "image" : "imageUrl";

const fileBytes = async (file: File): Promise<Buffer> => {
  if (file.size > maxImageBytes) throw new ImageError("tooLarge");
  return Buffer.from(await file.arrayBuffer());
};

// The new image's id once its files are written, null to remove the image, undefined to keep it. Throws ImageError.
export const prepareImage = async (source: ImageSource): Promise<string | null | undefined> => {
  if (source === "remove") return null;
  if (source === undefined) return undefined;
  return processImage("file" in source ? await fileBytes(source.file) : await downloadImage(source.url));
};

// Runs the DB write for a prepared image: the old files are deleted only after the write succeeded, and the new ones
// if it failed, so neither path leaves orphans.
export const commitImage = async <T,>(
  prepared: string | null | undefined,
  previous: string | null | undefined,
  write: () => T,
): Promise<T> => {
  let result: T;
  try {
    result = write();
  } catch (error) {
    if (prepared) await removeImage(prepared);
    throw error;
  }
  if (prepared !== undefined && previous) await removeImage(previous);
  return result;
};
