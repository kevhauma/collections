import { describe, expect, it } from "vitest";
import { isCrossOriginWrite } from "./origin";

const host = "collections.example.org";

describe("isCrossOriginWrite", () => {
  it.each([
    ["matching origin", "POST", `https://${host}`, false],
    ["mismatching origin", "POST", "https://evil.example", true],
    ["absent header", "POST", undefined, false],
    ["same host, other port", "POST", `https://${host}:8443`, true],
    ['the "null" origin', "POST", "null", true],
    ["DELETE from elsewhere", "DELETE", "https://evil.example", true],
    ["a read from elsewhere", "GET", "https://evil.example", false],
  ])("%s → %s", (_, method, origin, rejected) => {
    expect(isCrossOriginWrite({ method, origin, host })).toBe(rejected);
  });
});
