import { describe, expect, it } from "vitest";
import { safeRedirectTarget } from "./redirect";

const requestUrl = "https://collections.example.org/locale";

describe("safeRedirectTarget", () => {
  it.each([
    ["same-origin path kept, with its query", "https://collections.example.org/vinyl/want?view=grid", "/vinyl/want?view=grid"],
    ["absolute URL to another host rejected", "https://evil.example/phish", "/"],
    ["same host over another scheme rejected", "http://collections.example.org/vinyl", "/"],
    ["protocol-relative //evil rejected", "//evil.example/phish", "/"],
    ["missing referer", undefined, "/"],
    ["empty referer", "", "/"],
    ["unparseable referer", "http://[not a url", "/"],
    ["double slash path collapsed", "https://collections.example.org//evil.example", "/evil.example"],
  ])("%s", (_, referer, expected) => {
    expect(safeRedirectTarget(referer, requestUrl)).toBe(expected);
  });
});
