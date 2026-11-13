import { describe, expect, it } from "vitest";
import { declaresTooLarge, limitBody } from "./body-limit";

const post = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request("http://localhost/admin/c/vinyl/items/new", { method: "POST", body, headers, duplex: "half" } as RequestInit);

const chunks = (count: number, size: number) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < count; index++) controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });

describe("body limit", () => {
  it("refuses a declared Content-Length over the limit", () => {
    expect(declaresTooLarge(post("x", { "content-length": String(20 * 1024 * 1024) }))).toBe(true);
    expect(declaresTooLarge(post("x", { "content-length": "1000" }))).toBe(false);
    expect(declaresTooLarge(new Request("http://localhost/"))).toBe(false);
  });

  it("passes a small body through unchanged", async () => {
    const limited = limitBody(post("name=Dune", { "content-type": "application/x-www-form-urlencoded" }), 100);
    expect(limited.method).toBe("POST");
    expect(limited.url).toBe("http://localhost/admin/c/vinyl/items/new");
    expect(Object.fromEntries(await limited.formData())).toEqual({ name: "Dune" });
  });

  it("fails reading a streamed body once it passes the limit", async () => {
    const limited = limitBody(post(chunks(10, 1000)), 5000);
    await expect(limited.arrayBuffer()).rejects.toThrow();
  });

  it("leaves a request without a body alone", () => {
    const get = new Request("http://localhost/");
    expect(limitBody(get)).toBe(get);
  });
});
