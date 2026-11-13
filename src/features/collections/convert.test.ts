import { describe, expect, it } from "vitest";
import { convertValue, planTypeChange, typeChangeProblem } from "./convert";

const ok = (value: unknown) => ({ ok: value });
const blank = { blank: true };

describe("convertValue", () => {
  it("→ text: anything becomes its string form", () => {
    expect(convertValue(12.5, "text")).toEqual(ok("12.5"));
    expect(convertValue(true, "text")).toEqual(ok("true"));
    expect(convertValue(false, "text")).toEqual(ok("false"));
    expect(convertValue("https://x.org", "text")).toEqual(ok("https://x.org"));
  });

  it("→ number: comma or dot decimals, trimmed; anything else blanks", () => {
    expect(["12", " 12,5 ", "12.5"].map((value) => convertValue(value, "number"))).toEqual([ok(12), ok(12.5), ok(12.5)]);
    expect(convertValue(1959, "number")).toEqual(ok(1959));
    expect(["abc", "12 apples", "", "Infinity"].map((value) => convertValue(value, "number"))).toEqual([
      blank,
      blank,
      blank,
      blank,
    ]);
    expect(convertValue(true, "number")).toEqual(blank);
  });

  it("→ date: a real ISO day", () => {
    expect(convertValue(" 2024-02-29 ", "date")).toEqual(ok("2024-02-29"));
    expect(convertValue("2023-02-29", "date")).toEqual(blank);
    expect(convertValue("29/02/2024", "date")).toEqual(blank);
    expect(convertValue(20240229, "date")).toEqual(blank);
  });

  it("→ checkbox: yes/no words in English and Dutch, any case", () => {
    const words = ["true", "Yes", "JA", "1", "on", "false", "no", "Nee", "0", "OFF"];
    expect(words.map((word) => convertValue(word, "checkbox"))).toEqual([
      ok(true),
      ok(true),
      ok(true),
      ok(true),
      ok(true),
      ok(false),
      ok(false),
      ok(false),
      ok(false),
      ok(false),
    ]);
    expect(convertValue(1, "checkbox")).toEqual(ok(true));
    expect(["maybe", "constructor", "2"].map((word) => convertValue(word, "checkbox"))).toEqual([blank, blank, blank]);
  });

  it("→ url: http(s) only", () => {
    expect(convertValue(" https://discogs.com/x ", "url")).toEqual(ok("https://discogs.com/x"));
    expect(convertValue("javascript:alert(1)", "url")).toEqual(blank);
    expect(convertValue("discogs.com", "url")).toEqual(blank);
  });

  it("→ select: the string form, up to 100 characters", () => {
    expect(convertValue(" Near Mint ", "select")).toEqual(ok("Near Mint"));
    expect(convertValue(1959, "select")).toEqual(ok("1959"));
    expect(convertValue("x".repeat(101), "select")).toEqual(blank);
  });
});

describe("planTypeChange", () => {
  const rows = [
    { id: 1, title: "A", value: "12" },
    { id: 2, title: "B", value: "12,5" },
    { id: 3, title: "C", value: "12.5" },
    { id: 4, title: "D", value: "abc" },
  ];

  it("splits values into kept (converted) and blanked", () => {
    const plan = planTypeChange(rows, "number");
    expect(plan.kept.map((row) => [row.id, row.value])).toEqual([
      [1, 12],
      [2, 12.5],
      [3, 12.5],
    ]);
    expect(plan.blanked).toEqual([{ id: 4, title: "D", value: "abc" }]);
    expect(plan.options).toBeNull();
  });

  it("gives a choice field the distinct kept values as sorted options", () => {
    expect(planTypeChange([...rows, { id: 5, title: "E", value: "abc" }], "select").options).toEqual([
      "12",
      "12,5",
      "12.5",
      "abc",
    ]);
  });
});

describe("typeChangeProblem", () => {
  const plain = { type: "text", isTitle: 0 } as const;
  const title = { type: "text", isTitle: 1 } as const;
  const clean = { blanked: [], options: null };

  it("allows a change that keeps titles and gives a choice field options", () => {
    expect(typeChangeProblem(plain, "number", { blanked: [{ value: "x" }], options: null })).toBeUndefined();
    expect(typeChangeProblem(title, "url", clean)).toBeUndefined();
    expect(typeChangeProblem(plain, "select", { blanked: [], options: ["LP"] })).toBeUndefined();
  });

  it("refuses the same type, a title leaving text-like types or losing a title, and a choice without options", () => {
    expect(typeChangeProblem(plain, "text", clean)).toBe("same");
    expect(typeChangeProblem(title, "number", clean)).toBe("titleType");
    expect(typeChangeProblem(title, "url", { blanked: [{ value: "x" }], options: null })).toBe("titleBlank");
    expect(typeChangeProblem(plain, "select", { blanked: [], options: [] })).toBe("noOptions");
  });
});
