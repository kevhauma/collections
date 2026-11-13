import { z } from "zod";
import type { Field, FieldType } from "../../db/fields";

// Item validation built from a collection's field definitions (TICKET-ITM-01). Pure and shared: server actions, admin
// client components and the CSV import (TICKET-IMP-01) all use it, so it must never import server-only code.
// Every error message is an i18n id from `validationIds`; the caller translates it (messages.ts).

export const validationIds = {
  required: "validation.required",
  text: "validation.text",
  number: "validation.number",
  date: "validation.date",
  select: "validation.select",
  url: "validation.url",
  quantity: "validation.quantity",
  status: "validation.status",
  rating: "validation.rating",
} as const;
export type ValidationId = (typeof validationIds)[keyof typeof validationIds];

export type ValueField = Pick<Field, "id" | "type" | "options" | "required"> & Partial<Pick<Field, "ratingMax">>;

// Low-level parsers: undefined when the text isn't a value of that kind. TICKET-COL-03's convertValue reuses them.
export const parseNumber = (text: string): number | undefined =>
  /^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text) ? Number(text.replace(",", ".")) : undefined;

export const isDate = (text: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(text) && new Date(`${text}T00:00:00Z`).toISOString().startsWith(text);

export const isHttpUrl = (text: string): boolean => /^https?:$/.test(URL.parse(text)?.protocol ?? "");

const text = z.string({ error: validationIds.text }).trim();

// Schema per type for a present (non-blank) value.
// A number typed or stored, refused with `error` unless it passes `valid`.
const numeric = (error: ValidationId, valid: (value: number | undefined) => boolean) =>
  z.union([z.number(), z.string().trim().transform(parseNumber)], { error }).refine(valid, error);

const isFiniteNumber = (value: number | undefined) => value !== undefined && Number.isFinite(value);

// A whole number from 1 to the field's maximum (TICKET-COL-05). 5 is the default every rating field is created with.
const ratingWithin = (max: number) => (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value >= 1 && value <= max;

const typeSchemas: Record<Exclude<FieldType, "checkbox">, (field: ValueField) => z.ZodType> = {
  text: () => text.max(2000, validationIds.text),
  number: () => numeric(validationIds.number, isFiniteNumber),
  rating: (field) => numeric(validationIds.rating, ratingWithin(field.ratingMax ?? 5)),
  date: () => text.refine(isDate, validationIds.date),
  select: (field) => text.refine((value) => field.options?.includes(value) ?? false, validationIds.select),
  url: () => text.refine(isHttpUrl, validationIds.url),
};

const blankToUndefined = (value: unknown) =>
  value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

// A checkbox always has a value: from a form, "on" when ticked and absent otherwise.
const checkbox = z
  .unknown()
  .optional()
  .transform((value) => value === true || value === "on");

const valueSchema = (field: ValueField): z.ZodType => {
  if (field.type === "checkbox") return checkbox;
  const value = z.preprocess(blankToUndefined, typeSchemas[field.type](field).optional());
  return field.required ? value.refine((parsed) => parsed !== undefined, validationIds.required) : value;
};

// Keyed by field id. Unknown keys (and keys of deleted fields) are stripped, and blank optional values are left out,
// so they never reach values_json.
export const buildValuesSchema = (fields: ValueField[]) =>
  z
    .object(Object.fromEntries(fields.map((field) => [String(field.id), valueSchema(field)])))
    .transform((values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)));

// Rank is never accepted from the item form: ranking is TICKET-ITM-03.
export const itemStatusSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("have"),
      quantity: z.preprocess(
        blankToUndefined,
        z.coerce
          .number({ error: validationIds.quantity })
          .int(validationIds.quantity)
          .min(1, validationIds.quantity)
          .max(9999, validationIds.quantity)
          .default(1),
      ),
    }),
    z.object({ status: z.literal("want") }),
  ],
  { error: validationIds.status },
);

export type ItemInput = z.infer<typeof itemStatusSchema> & { values: Record<string, unknown> };
// Keyed by input name (`f.<fieldId>`, `status`, `quantity`): the first error of each.
export type ItemErrors = Partial<Record<string, ValidationId>>;

const issuesByInput = (issues: z.core.$ZodIssue[], prefix = "") =>
  issues.toReversed().map((issue) => [`${prefix}${String(issue.path[0] ?? "status")}`, issue.message as ValidationId]);

// Reads `f.<fieldId>` inputs plus `status` / `quantity` from a posted item form (`Object.fromEntries(formData)`).
export const parseItemForm = (
  form: Record<string, unknown>,
  fields: ValueField[],
): { success: true; data: ItemInput } | { success: false; errors: ItemErrors } => {
  const valueInputs = Object.entries(form).filter(([name]) => name.startsWith("f."));
  const values = buildValuesSchema(fields).safeParse(
    Object.fromEntries(valueInputs.map(([name, value]) => [name.slice(2), value])),
  );
  const status = itemStatusSchema.safeParse(form);
  if (values.success && status.success) return { success: true, data: { ...status.data, values: values.data } };
  return {
    success: false,
    errors: Object.fromEntries([
      ...issuesByInput(values.error?.issues ?? [], "f."),
      ...issuesByInput(status.error?.issues ?? []),
    ]),
  };
};
