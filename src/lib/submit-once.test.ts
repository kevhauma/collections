import { describe, expect, it } from "vitest";
import { sameQuery } from "./submit-once";

const same = (a: string, b: string) => sameQuery(new URLSearchParams(a), new URLSearchParams(b));

describe("sameQuery", () => {
  it("skips the same params", () => {
    expect(same("view=table&q=tin&sort=3&dir=asc", "view=table&q=tin&sort=3&dir=asc")).toBe(true);
  });

  it("ignores parameter order", () => {
    expect(same("q=tin&view=grid&f.4=red", "f.4=red&view=grid&q=tin")).toBe(true);
  });

  it("submits when any field changed", () => {
    expect(same("view=table&q=tin&sort=3&dir=asc", "view=table&q=tins&sort=3&dir=asc")).toBe(false);
    expect(same("view=table&q=&sort=3&dir=asc", "view=table&q=&sort=3&dir=desc")).toBe(false);
    expect(same("q=tin&f.4=red", "q=tin&f.4=")).toBe(false);
    expect(same("q=tin", "q=tin&f.4=red")).toBe(false);
  });
});
