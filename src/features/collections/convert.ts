import { titleFieldTypes, type Field, type FieldType } from "../../db/fields";
import { isDate, isHttpUrl, parseNumber } from "../items/schema";

// Converting stored values when a field changes type (TICKET-COL-03). Pure. The stored JSON type stands in for the
// old field type: a checkbox value is a boolean, a number a number, everything else a string.

export type Conversion = { ok: unknown } | { blank: true };

const blank: Conversion = { blank: true };
const okUnless = (value: unknown): Conversion => (value === undefined ? blank : { ok: value });

// Checkbox words in English and Dutch. A Map, so "constructor" and friends aren't words.
const checkboxWords = new Map<string, boolean>(
  [
    ["true", "yes", "ja", "1", "on"].map((word) => [word, true] as const),
    ["false", "no", "nee", "0", "off"].map((word) => [word, false] as const),
  ].flat(),
);

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);
const textOf = (value: unknown) => String(value).trim();

// The trimmed text, when the value is text that passes `valid`.
const validText = (value: unknown, valid: (text: string) => boolean) => {
  const text = trimmed(value);
  return text !== undefined && valid(text) ? text : undefined;
};

const converters: Record<FieldType, (value: unknown) => Conversion> = {
  text: (value) => ({ ok: String(value) }),
  // An option is at most 100 characters, like a typed one.
  select: (value) => okUnless(validText(String(value), (text) => text.length > 0 && text.length <= 100)),
  number: (value) => okUnless(typeof value === "number" ? value : parseNumber(trimmed(value) ?? "")),
  date: (value) => okUnless(validText(value, isDate)),
  checkbox: (value) => okUnless(checkboxWords.get(textOf(value).toLowerCase())),
  url: (value) => okUnless(validText(value, isHttpUrl)),
};

export const convertValue = (value: unknown, toType: FieldType): Conversion => converters[toType](value);

// The outcome of a type change for every stored value: what's kept (converted), what's blanked, and for a choice
// field the options it gets, which are the distinct kept values.
export const planTypeChange = <R extends { value: unknown }>(rows: R[], toType: FieldType) => {
  const results = rows.map((row) => ({ row, result: convertValue(row.value, toType) }));
  const kept = results.flatMap(({ row, result }) => ("ok" in result ? [{ ...row, value: result.ok }] : []));
  return {
    kept,
    blanked: results.flatMap(({ row, result }) => ("blank" in result ? [row] : [])),
    options: toType === "select" ? [...new Set(kept.map((row) => String(row.value)))].sort((a, b) => a.localeCompare(b)) : null,
  };
};

type TypeChangePlan = Pick<ReturnType<typeof planTypeChange>, "blanked" | "options">;

export type TypeChangeProblem = "same" | "titleType" | "titleBlank" | "noOptions";

// Why a type change can't be applied: the same type; a title field leaving the text-like types or losing a title;
// or a choice field without any value to become an option.
export const typeChangeProblem = (
  field: Pick<Field, "type" | "isTitle">,
  toType: FieldType,
  plan: TypeChangePlan,
): TypeChangeProblem | undefined => {
  if (field.type === toType) return "same";
  if (field.isTitle && !titleFieldTypes.includes(toType)) return "titleType";
  if (field.isTitle && plan.blanked.length > 0) return "titleBlank";
  return plan.options?.length === 0 ? "noOptions" : undefined;
};
