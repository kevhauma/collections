// Getting image bytes in (TICKET-ITM-04): from a pasted URL, read with a size cap so an oversized body is dropped while
// it streams instead of being buffered whole.

import { maxImageBytes } from "./shared";

export type ImageErrorReason = "notImage" | "tooLarge" | "download";

// Carries what to tell the admin; the item form maps the reason to a translated message.
export class ImageError extends Error {
  constructor(readonly reason: ImageErrorReason) {
    super(`Image rejected: ${reason}`);
  }
}

// Reads a body up to `limit` bytes; past it, the stream is cancelled and nothing more is read.
export const readLimited = async (body: ReadableStream<Uint8Array>, limit = maxImageBytes): Promise<Buffer> => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Throwing inside for-await cancels the stream.
  for await (const chunk of body) {
    size += chunk.byteLength;
    if (size > limit) throw new ImageError("tooLarge");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const isHttp = (url: URL | null): url is URL => url?.protocol === "http:" || url?.protocol === "https:";

// Why a response can't be used, judged from its status and headers before reading the body.
const refusalOf = (response: Response): ImageErrorReason | undefined => {
  if (!response.ok || !response.body) return "download";
  if (!response.headers.get("content-type")?.startsWith("image/")) return "notImage";
  return Number(response.headers.get("content-length")) > maxImageBytes ? "tooLarge" : undefined;
};

// Only http(s), 15 s, an image/* content type, at most 15 MB. Admin-only, so pointing it at an internal address is an
// accepted risk (see the ticket). `fetcher` is swappable for tests.
export const downloadImage = async (url: string, fetcher: typeof fetch = fetch): Promise<Buffer> => {
  const target = URL.parse(url.trim());
  if (!isHttp(target)) throw new ImageError("download");
  const response = await fetcher(target, { signal: AbortSignal.timeout(15_000) }).catch(() => {
    throw new ImageError("download");
  });
  const refusal = refusalOf(response);
  if (refusal) {
    await response.body?.cancel();
    throw new ImageError(refusal);
  }
  return readLimited(response.body!).catch((error: unknown) => {
    throw error instanceof ImageError ? error : new ImageError("download");
  });
};
