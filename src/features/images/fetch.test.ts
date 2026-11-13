import { describe, expect, it, vi } from "vitest";
import { downloadImage, ImageError, readLimited } from "./fetch";
import { maxImageBytes } from "./shared";

const megabyte = new Uint8Array(1024 * 1024);

// A body of `megabytes` 1 MB chunks that counts how many were pulled, so a test can see reading stopped early.
const countingBody = (megabytes: number) => {
  const pulled = { count: 0 };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled.count === megabytes) return controller.close();
      pulled.count++;
      controller.enqueue(megabyte);
    },
  });
  return { body, pulled };
};

const respond = (body: BodyInit | null, headers: Record<string, string>, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(body, { status, headers }));

const rejection = (promise: Promise<unknown>) => promise.then(() => "resolved", (error: unknown) => error);

describe("downloadImage", () => {
  it.each(["file:///etc/passwd", "ftp://example.com/a.png", "javascript:alert(1)", "not a url", ""])(
    "refuses %j without fetching",
    async (url) => {
      const fetcher = respond("x", { "content-type": "image/png" });
      expect(await rejection(downloadImage(url, fetcher))).toEqual(new ImageError("download"));
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("returns the bytes of an http(s) image", async () => {
    const fetcher = respond("png-bytes", { "content-type": "image/png" });
    expect((await downloadImage(" https://example.com/cover.png ", fetcher)).toString()).toBe("png-bytes");
    expect(String(fetcher.mock.calls[0]![0])).toBe("https://example.com/cover.png");
  });

  it("refuses a response that isn't an image", async () => {
    const fetcher = respond("<html></html>", { "content-type": "text/html" });
    expect(await rejection(downloadImage("https://example.com/", fetcher))).toEqual(new ImageError("notImage"));
  });

  it("refuses a failed or unreachable request", async () => {
    const missing = respond("nope", { "content-type": "image/png" }, 404);
    expect(await rejection(downloadImage("https://example.com/a.png", missing))).toEqual(new ImageError("download"));
    const offline = vi.fn<typeof fetch>(async () => Promise.reject(new TypeError("fetch failed")));
    expect(await rejection(downloadImage("https://example.com/a.png", offline))).toEqual(new ImageError("download"));
  });

  it("refuses a declared size over 15 MB before reading the body", async () => {
    const { body, pulled } = countingBody(20);
    const fetcher = respond(body, { "content-type": "image/jpeg", "content-length": String(20 * 1024 * 1024) });
    expect(await rejection(downloadImage("https://example.com/big.jpg", fetcher))).toEqual(new ImageError("tooLarge"));
    expect(pulled.count).toBeLessThanOrEqual(1);
  });

  it("aborts an undeclared body once 15 MB have streamed", async () => {
    const { body, pulled } = countingBody(20);
    const fetcher = respond(body, { "content-type": "image/jpeg" });
    expect(await rejection(downloadImage("https://example.com/big.jpg", fetcher))).toEqual(new ImageError("tooLarge"));
    expect(pulled.count).toBeLessThanOrEqual(17);
  });
});

describe("readLimited", () => {
  it("reads a body at the limit", async () => {
    const { body } = countingBody(15);
    expect((await readLimited(body)).byteLength).toBe(maxImageBytes);
  });
});
