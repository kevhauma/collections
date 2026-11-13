import { describe, expect, it } from "vitest";
import type { Field } from "../../db/fields";
import { labelsOf, parseFieldEdit, parseNewField } from "./field-schema";

const field = (overrides: Partial<Field>): Field => ({
  id: 1,
  label: "Title",
  type: "text",
  options: null,
  required: 0,
  isPublic: 1,
  position: 1,
  isTitle: 0,
  valueCount: 0,
  ...overrides,
});

const artist = field({ id: 2, label: "Artist" });
const fields = [field({ id: 1, label: "Title", isTitle: 1 }), artist];
const taken = labelsOf(fields);
const errorKeys = (result: { error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) =>
  result.error?.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);

describe("parseNewField", () => {
  it.each(["text", "number", "date", "checkbox", "url"])("accepts a %s field without options", (type) => {
    expect(parseNewField({ label: "Year", type, isPublic: "on" }, taken).data).toEqual({
      label: "Year",
      type,
      options: null,
      required: 0,
      isPublic: 1,
    });
  });

  it("accepts a select field with trimmed options, one per line", () => {
    const result = parseNewField({ label: "Format", type: "select", options: " LP \r\n\nEP\n", required: "on" }, taken);
    expect(result.data).toMatchObject({ type: "select", options: ["LP", "EP"], required: 1, isPublic: 0 });
  });

  it("refuses a label another field has, ignoring case", () => {
    expect(errorKeys(parseNewField({ label: " artist ", type: "text" }, taken))).toEqual(["label:labelTaken"]);
  });

  it("refuses a select field without options", () => {
    expect(errorKeys(parseNewField({ label: "Format", type: "select", options: " \n " }, taken))).toEqual([
      "options:optionsMissing",
    ]);
  });

  it("refuses duplicate options", () => {
    expect(errorKeys(parseNewField({ label: "Format", type: "select", options: "LP\nEP\nLP" }, taken))).toEqual([
      "options:optionsDuplicate",
    ]);
  });

  it("refuses options on a non-select field", () => {
    expect(errorKeys(parseNewField({ label: "Year", type: "number", options: "1999" }, taken))).toEqual([
      "type:optionsNotSelect",
    ]);
  });

  it("refuses an empty label and an unknown type", () => {
    expect(parseNewField({ label: "", type: "text" }, taken).success).toBe(false);
    expect(parseNewField({ label: "Year", type: "json" }, taken).success).toBe(false);
  });
});

describe("parseFieldEdit", () => {
  const format = field({ id: 3, label: "Format", type: "select", options: ["LP", "EP"] });

  it("keeps its own label and appends new options", () => {
    const result = parseFieldEdit({ label: "format", options: "Single" }, format, labelsOf([...fields, format], 3));
    expect(result.data).toEqual({ label: "format", options: ["LP", "EP", "Single"], required: 0, isPublic: 0 });
  });

  it("refuses an added option that already exists", () => {
    expect(errorKeys(parseFieldEdit({ label: "Format", options: "EP" }, format, taken))).toEqual([
      "options:optionsDuplicate",
    ]);
  });

  it("refuses another field's label", () => {
    expect(errorKeys(parseFieldEdit({ label: "Title" }, format, taken))).toEqual(["label:labelTaken"]);
  });

  it("gives a non-select field no options", () => {
    expect(parseFieldEdit({ label: "Artist", options: "x" }, artist, labelsOf(fields, 2)).data?.options).toBeNull();
  });
});
