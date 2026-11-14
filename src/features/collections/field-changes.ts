import type { Collection } from "../../db/collections";
import { countRatedAbove, createField, listFields, updateField, type Field } from "../../db/fields";
import { labelsOf, parseFieldEdit, parseNewField } from "./field-schema";
import { fieldRejected, ratedAboveRejected, type FieldRejected } from "./form";
import type { FormInput } from "./validation";

// Adding and editing a field from posted inputs: the fields page and the MCP tools (TICKET-MCP-01) share these, so an
// agent's change passes the same validation as the form. Undefined on success, the translated errors otherwise.

export const addField = (collection: Collection, form: FormInput): FieldRejected | undefined => {
  const parsed = parseNewField(form, labelsOf(listFields(collection.id)));
  if (!parsed.success) return fieldRejected(parsed.error, form, "new");
  createField(collection.id, parsed.data);
};

export const editField = (collection: Collection, field: Field, form: FormInput): FieldRejected | undefined => {
  const parsed = parseFieldEdit(form, field, labelsOf(listFields(collection.id), field.id));
  if (!parsed.success) return fieldRejected(parsed.error, form, field.id);
  if (updateField(collection.id, field.id, parsed.data)) return undefined;
  // The one refusal for an existing field: a rating's maximum below what some items hold.
  const max = parsed.data.ratingMax ?? 0;
  return ratedAboveRejected(countRatedAbove(collection.id, field.id, max), max, form, field.id);
};
