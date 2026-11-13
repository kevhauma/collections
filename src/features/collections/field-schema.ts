import { z } from "zod";
import { affixTypes, defaultRating, fieldTypes, type Field, type FieldType } from "../../db/fields";
import type { FormInput } from "./validation";

// Validation for a field definition (TICKET-COL-02). Issue messages are keys that form.ts translates.

export type FieldErrorKey =
  | "label"
  | "labelTaken"
  | "option"
  | "optionName"
  | "optionsMissing"
  | "optionsDuplicate"
  | "optionsNotSelect"
  | "affix"
  | "ratingMax"
  | "ratingSymbol";
const key = (errorKey: FieldErrorKey) => errorKey;

// An unchecked checkbox sends nothing.
const checkbox = z
  .literal("on")
  .optional()
  .transform((on) => (on ? 1 : 0) as 0 | 1);

const unique = (list: string[]) => new Set(list).size === list.length;

// `taken`: the other fields' labels, lowercased.
const label = (taken: ReadonlySet<string>) =>
  z
    .string()
    .trim()
    .min(1, key("label"))
    .max(100, key("label"))
    .refine((value) => !taken.has(value.toLowerCase()), key("labelTaken"));

// Options are typed one per line; blank lines are dropped.
const options = z.preprocess(
  (value) =>
    String(value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  z.array(z.string().max(100, key("option"))),
);

// Display-only text around a value (TICKET-COL-04); blank means none.
const affix = z
  .string()
  .trim()
  .max(20, key("affix"))
  .optional()
  .transform((value) => value || null);

// A rating's maximum and its one symbol (TICKET-COL-05). A symbol is one grapheme, as the user sees it, so 🍺 and ❤️
// (two code points) count as one; the length cap keeps a stack of combining marks out.
const ratingMax = z.coerce
  .number({ error: key("ratingMax") })
  .int(key("ratingMax"))
  .min(2, key("ratingMax"))
  .max(10, key("ratingMax"))
  .optional();

const graphemeCount = (text: string) => [...new Intl.Segmenter().segment(text)].length;

const ratingSymbol = z
  .string()
  .trim()
  .max(16, key("ratingSymbol"))
  .refine((symbol) => graphemeCount(symbol) === 1, key("ratingSymbol"))
  .optional();

// Inputs only some types have. Other types ignore whatever was posted for them: the inputs stay in the no-JS form
// for every type.
const typeInputs: Array<{ names: string[]; types: readonly FieldType[] }> = [
  { names: ["prefix", "suffix"], types: affixTypes },
  { names: ["ratingMax", "ratingSymbol"], types: ["rating"] },
];
const inputsFor = (type: unknown, form: FormInput): FormInput =>
  Object.fromEntries(
    Object.entries(form).filter(([name]) =>
      typeInputs.every((input) => !input.names.includes(name) || input.types.includes(type as FieldType)),
    ),
  );

// A rating gets its config (defaults for anything not posted); every other type none.
const ratingConfig = (type: FieldType, config: { ratingMax?: number; ratingSymbol?: string }) =>
  type === "rating"
    ? { ratingMax: config.ratingMax ?? defaultRating.max, ratingSymbol: config.ratingSymbol ?? defaultRating.symbol }
    : { ratingMax: null, ratingSymbol: null };

export const labelsOf = (fields: Field[], except?: number): Set<string> =>
  new Set(fields.filter((field) => field.id !== except).map((field) => field.label.toLowerCase()));

export const parseNewField = (form: FormInput, taken: ReadonlySet<string>) =>
  z
    .object({
      label: label(taken),
      type: z.enum(fieldTypes),
      options,
      required: checkbox,
      isPublic: checkbox,
      prefix: affix,
      suffix: affix,
      ratingMax,
      ratingSymbol,
    })
    .refine((field) => field.type !== "select" || field.options.length > 0, {
      message: key("optionsMissing"),
      path: ["options"],
    })
    .refine((field) => field.type === "select" || field.options.length === 0, {
      message: key("optionsNotSelect"),
      path: ["type"],
    })
    .refine((field) => unique(field.options), { message: key("optionsDuplicate"), path: ["options"] })
    .transform((field) => ({
      ...field,
      options: field.type === "select" ? field.options : null,
      ...ratingConfig(field.type, field),
    }))
    .safeParse(inputsFor(form.type, form));

// The type is read-only here, and a select field can only gain options (renaming and removing them is TICKET-COL-03).
export const parseFieldEdit = (form: FormInput, field: Field, taken: ReadonlySet<string>) =>
  z
    .object({
      label: label(taken),
      options,
      required: checkbox,
      isPublic: checkbox,
      prefix: affix,
      suffix: affix,
      ratingMax,
      ratingSymbol,
    })
    .transform(({ options: added, ...rest }) => ({
      ...rest,
      options: field.options && [...field.options, ...added],
      ...ratingConfig(field.type, rest),
    }))
    .refine((edit) => edit.options === null || unique(edit.options), {
      message: key("optionsDuplicate"),
      path: ["options"],
    })
    .safeParse(inputsFor(field.type, form));

// Renaming one option (TICKET-COL-03). `option` must be one of the field's; the caller checks that first.
export const parseOptionRename = (form: FormInput, field: Field) =>
  z
    .object({ option: z.string(), to: z.string().trim().min(1, key("optionName")).max(100, key("optionName")) })
    .refine(({ option, to }) => to === option || !field.options?.includes(to), {
      message: key("optionsDuplicate"),
      path: ["to"],
    })
    .safeParse(form);
