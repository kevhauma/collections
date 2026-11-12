import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "./env";

describe("parseTrustProxy", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["false", false],
    ["true", true],
    ["1", 1],
    ["loopback", "loopback"],
    ["10.0.0.0/8, 127.0.0.1", "10.0.0.0/8, 127.0.0.1"],
  ])("%j → %j", (input, expected) => {
    expect(parseTrustProxy(input)).toBe(expected);
  });
});
