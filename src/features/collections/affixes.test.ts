import { describe, expect, it } from "vitest";
import { affixes, isBlank } from "./affixes";

describe("affixes", () => {
  it.each([
    [{ prefix: "€", suffix: null }, "€ ", ""],
    [{ prefix: null, suffix: "cm" }, "", " cm"],
    [{ prefix: "€", suffix: "excl." }, "€ ", " excl."],
    [{ prefix: null, suffix: null }, "", ""],
  ])("%j renders around the value", (field, before, after) => {
    expect(affixes(field)).toEqual({ before, after });
  });
});

describe("isBlank", () => {
  it.each([undefined, null, ""])("%j is blank", (value) => expect(isBlank(value)).toBe(true));
  it.each([0, false, " x", "0"])("%j is a value", (value) => expect(isBlank(value)).toBe(false));
});
