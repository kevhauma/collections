import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildValuesSchema, itemStatusSchema, parseItemForm, validationIds, type ValueField } from "./schema";

const field = (id: number, type: ValueField["type"], required = false, options: string[] | null = null): ValueField => ({
  id,
  type,
  options,
  required: required ? 1 : 0,
});

const parse = (target: ValueField, value: unknown) => buildValuesSchema([target]).safeParse({ [target.id]: value });
const value = (target: ValueField, input: unknown) => parse(target, input).data?.[target.id];
const error = (target: ValueField, input: unknown) => parse(target, input).error?.issues.map((issue) => issue.message);

// Per type: a valid value, an invalid value, and an empty value when optional and when required.
const cases: Array<[ValueField["type"], string[] | null, unknown, unknown, unknown, string]> = [
  ["text", null, "  Kind of Blue ", "Kind of Blue", "x".repeat(2001), validationIds.text],
  ["number", null, "12,5", 12.5, "12 apples", validationIds.number],
  ["date", null, "2024-02-29", "2024-02-29", "2023-02-29", validationIds.date],
  ["select", ["LP", "EP"], "EP", "EP", "CD", validationIds.select],
  ["url", null, "https://discogs.com/x", "https://discogs.com/x", "javascript:alert(1)", validationIds.url],
];

describe("buildValuesSchema", () => {
  describe.each(cases)("%s", (type, options, valid, parsed, invalid, invalidId) => {
    it("accepts a valid value", () => {
      expect(value(field(1, type, false, options), valid)).toEqual(parsed);
    });
    it("refuses an invalid value with its i18n id", () => {
      expect(error(field(1, type, false, options), invalid)).toEqual([invalidId]);
    });
    it("leaves an empty optional value out", () => {
      expect(parse(field(1, type, false, options), "  ").data).toEqual({});
      expect(parse(field(1, type, false, options), undefined).data).toEqual({});
    });
    it("refuses an empty required value", () => {
      expect(error(field(1, type, true, options), "")).toEqual([validationIds.required]);
      expect(error(field(1, type, true, options), undefined)).toEqual([validationIds.required]);
    });
  });

  it("reads a checkbox: on → true, absent → false, also when required", () => {
    expect(value(field(1, "checkbox"), "on")).toBe(true);
    expect(value(field(1, "checkbox"), undefined)).toBe(false);
    expect(value(field(1, "checkbox", true), undefined)).toBe(false);
  });

  it("accepts numbers as numbers and refuses non-finite ones", () => {
    expect(value(field(1, "number"), 1959)).toBe(1959);
    expect(value(field(1, "number"), "-0.5")).toBe(-0.5);
    expect(error(field(1, "number"), Number.POSITIVE_INFINITY)).toEqual([validationIds.number]);
    expect(error(field(1, "number"), "1.234,5")).toEqual([validationIds.number]);
  });

  it("refuses a value of the wrong kind with an i18n id, never zod's English", () => {
    expect(error(field(1, "text"), 42)).toEqual([validationIds.text]);
    expect(error(field(1, "number"), true)).toEqual([validationIds.number]);
  });

  it("strips unknown keys and values of deleted fields", () => {
    const fields = [field(1, "text"), field(2, "number")];
    expect(buildValuesSchema(fields).parse({ 1: "Dune", 2: "1965", 3: "deleted field", evil: "x" })).toEqual({
      1: "Dune",
      2: 1965,
    });
  });
});

describe("itemStatusSchema", () => {
  it("defaults a have's quantity to 1 and keeps it within 1..9999", () => {
    expect(itemStatusSchema.parse({ status: "have" })).toEqual({ status: "have", quantity: 1 });
    expect(itemStatusSchema.parse({ status: "have", quantity: "" })).toEqual({ status: "have", quantity: 1 });
    expect(itemStatusSchema.parse({ status: "have", quantity: "9999" })).toEqual({ status: "have", quantity: 9999 });
    for (const quantity of ["0", "10000", "1.5", "two"]) {
      expect(itemStatusSchema.safeParse({ status: "have", quantity }).error?.issues[0]?.message).toBe(
        validationIds.quantity,
      );
    }
  });

  it("never accepts a rank or quantity for a want", () => {
    expect(itemStatusSchema.parse({ status: "want", rank: "1", quantity: "3" })).toEqual({ status: "want" });
  });

  it("refuses an unknown status", () => {
    expect(itemStatusSchema.safeParse({ status: "lent" }).error?.issues[0]?.message).toBe(validationIds.status);
  });
});

describe("parseItemForm", () => {
  const fields = [field(1, "text", true), field(2, "number"), field(3, "checkbox")];
  const form = (entries: Record<string, string>) => {
    const data = new FormData();
    Object.entries(entries).forEach(([name, input]) => data.append(name, input));
    return Object.fromEntries(data);
  };

  it("returns the typed item input", () => {
    expect(parseItemForm(form({ "f.1": "Dune", "f.2": "12,5", status: "have", quantity: "2" }), fields)).toEqual({
      success: true,
      data: { status: "have", quantity: 2, values: { 1: "Dune", 2: 12.5, 3: false } },
    });
  });

  it("returns errors keyed by input name", () => {
    expect(parseItemForm(form({ "f.1": "", "f.2": "lots", status: "have", quantity: "0" }), fields)).toEqual({
      success: false,
      errors: { "f.1": validationIds.required, "f.2": validationIds.number, quantity: validationIds.quantity },
    });
  });
});

describe("i18n and imports", () => {
  const catalog = (locale: string) =>
    JSON.parse(readFileSync(new URL(`../../i18n/locales/${locale}.json`, import.meta.url), "utf8")) as Record<
      string,
      string
    >;

  it.each(["en", "nl"])("every validation id has a message in %s", (locale) => {
    expect(Object.values(validationIds).filter((id) => !catalog(locale)[id])).toEqual([]);
  });

  it("imports nothing server-only, so client components can use it", () => {
    const source = readFileSync(new URL("./schema.ts", import.meta.url), "utf8");
    const valueImports = [...source.matchAll(/^import (?!type )[^;]*from "([^"]+)"/gm)].map((match) => match[1]);
    expect(valueImports).toEqual(["zod"]);
  });
});
