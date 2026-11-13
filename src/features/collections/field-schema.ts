import { z } from "zod";
import { affixTypes, fieldTypes, type Field, type FieldType } from "../../db/fields";
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
  | "affix";
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

// A type without affixes ignores whatever was posted for them: the inputs stay in the no-JS form for every type.
const withoutAffixes = ({ prefix: _prefix, suffix: _suffix, ...rest }: FormInput): FormInput => rest;
const affixesFor = (type: unknown, form: FormInput): FormInput =>
  affixTypes.includes(type as FieldType) ? form : withoutAffixes(form);

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
    .transform((field) => ({ ...field, options: field.type === "select" ? field.options : null }))
    .safeParse(affixesFor(form.type, form));

// The type is read-only here, and a select field can only gain options (renaming and removing them is TICKET-COL-03).
export const parseFieldEdit = (form: FormInput, field: Field, taken: ReadonlySet<string>) =>
  z
    .object({ label: label(taken), options, required: checkbox, isPublic: checkbox, prefix: affix, suffix: affix })
    .transform(({ options: added, ...rest }) => ({ ...rest, options: field.options && [...field.options, ...added] }))
    .refine((edit) => edit.options === null || unique(edit.options), {
      message: key("optionsDuplicate"),
      path: ["options"],
    })
    .safeParse(affixesFor(field.type, form));

// Renaming one option (TICKET-COL-03). `option` must be one of the field's; the caller checks that first.
export const parseOptionRename = (form: FormInput, field: Field) =>
  z
    .object({ option: z.string(), to: z.string().trim().min(1, key("optionName")).max(100, key("optionName")) })
    .refine(({ option, to }) => to === option || !field.options?.includes(to), {
      message: key("optionsDuplicate"),
      path: ["to"],
    })
    .safeParse(form);
