import type { Field } from "../../db/fields";

// A field's display-only prefix and suffix (TICKET-COL-04), joined to the value by non-breaking spaces so "€ 12"
// never wraps apart. Stored values never contain them.

const nbsp = " ";

export const affixes = (field: Pick<Field, "prefix" | "suffix">) => ({
  before: field.prefix ? `${field.prefix}${nbsp}` : "",
  after: field.suffix ? `${nbsp}${field.suffix}` : "",
});

// A blank value shows nothing at all: no lone "€".
export const isBlank = (value: unknown) => value === undefined || value === null || value === "";
