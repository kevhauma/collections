import { msg, plural } from "@lingui/core/macro";
import type { z } from "zod";
import { actionI18n } from "../../i18n";
import type { FieldErrorKey } from "./field-schema";
import { maxSlugLength } from "./slug";
import type { ErrorKey, FormInput } from "./validation";

// Translations for the issue keys of validation.ts and field-schema.ts.
const messages: Record<ErrorKey | FieldErrorKey, ReturnType<typeof msg>> = {
  name: msg({ id: "collections.error.name", message: "Enter a name of up to 100 characters." }),
  format: msg({
    id: "collections.error.slugFormat",
    message: `Use up to ${maxSlugLength} lowercase letters, digits and single dashes.`,
  }),
  reserved: msg({ id: "collections.error.slugReserved", message: "This address is used by the app itself." }),
  taken: msg({ id: "collections.error.slugTaken", message: "Another collection already uses this address." }),
  label: msg({ id: "fields.error.label", message: "Enter a label of up to 100 characters." }),
  labelTaken: msg({ id: "fields.error.labelTaken", message: "Another field already has this label." }),
  option: msg({ id: "fields.error.option", message: "Keep each option under 100 characters." }),
  optionName: msg({ id: "fields.error.optionName", message: "Enter an option of up to 100 characters." }),
  optionsMissing: msg({ id: "fields.error.optionsMissing", message: "A choice field needs at least one option." }),
  optionsDuplicate: msg({ id: "fields.error.optionsDuplicate", message: "Each option can appear only once." }),
  optionsNotSelect: msg({
    id: "fields.error.optionsNotSelect",
    message: "Only choice fields have options. Clear them or pick Choice.",
  }),
  affix: msg({ id: "fields.error.affix", message: "Keep it to 20 characters or fewer." }),
  ratingMax: msg({ id: "fields.error.ratingMax", message: "Enter a whole number from 2 to 10." }),
  ratingSymbol: msg({ id: "fields.error.ratingSymbol", message: "Enter exactly one symbol, like ★ or 🍺." }),
};

type Message = keyof typeof messages;

// The first issue per form field, translated into the admin's locale. Issues without a message key (a tampered
// checkbox or select value) aren't shown; the form just doesn't save.
const formErrors = (error: z.ZodError): Partial<Record<string, string>> => {
  const i18n = actionI18n();
  const issues = error.issues.filter((issue) => issue.message in messages).toReversed();
  return Object.fromEntries(issues.map((issue) => [issue.path[0], i18n._(messages[issue.message as Message])]));
};

// What was typed, so a no-JS reload keeps it.
const typed = <K extends string>(form: FormInput, keys: readonly K[]) =>
  Object.fromEntries(keys.map((name) => [name, String(form[name] ?? "")])) as Record<K, string>;

export type FormErrors = Partial<Record<"name" | "slug", string>>;
export type Rejected = { errors: FormErrors; values: { name: string; slug: string } };

export const rejected = (error: z.ZodError, form: FormInput): Rejected => ({
  errors: formErrors(error),
  values: typed(form, ["name", "slug"]),
});

const fieldKeys = ["label", "type", "options", "required", "isPublic", "prefix", "suffix", "ratingMax", "ratingSymbol"] as const;
export type FieldFormErrors = Partial<
  Record<"label" | "type" | "options" | "to" | "prefix" | "suffix" | "ratingMax" | "ratingSymbol", string>
>;
// `target`: the field being edited, or "new" for the add form. `option`: the option whose rename failed.
export type FieldRejected = {
  target: number | "new";
  errors: FieldFormErrors;
  values: Record<(typeof fieldKeys)[number], string>;
  option?: string;
};

// A rating's maximum lowered below what some items are rated (TICKET-COL-05): they need re-rating first.
export const ratedAboveRejected = (count: number, max: number, form: FormInput, target: number): FieldRejected => ({
  target,
  errors: {
    ratingMax: actionI18n()._(
      msg({
        id: "fields.error.ratedAbove",
        message: plural(count, {
          one: `# item is rated above ${max}. Re-rate it first.`,
          other: `# items are rated above ${max}. Re-rate them first.`,
        }),
      }),
    ),
  },
  values: typed(form, fieldKeys),
});

export const fieldRejected = (error: z.ZodError, form: FormInput, target: number | "new"): FieldRejected => ({
  target,
  errors: formErrors(error),
  values: typed(form, fieldKeys),
  option: typeof form.option === "string" ? form.option : undefined,
});
