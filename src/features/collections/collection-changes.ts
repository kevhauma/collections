import { msg } from "@lingui/core/macro";
import { createCollection, listSlugs } from "../../db/collections";
import { actionI18n } from "../../i18n";
import { rejected, type Rejected } from "./form";
import { parseCreate, type FormInput } from "./validation";

// Creating a collection from posted inputs: the new-collection form and the MCP tool (TICKET-MCP-02) share it. The new
// collection's slug on success, the translated errors otherwise.
export const addCollection = (form: FormInput): { slug: string } | Rejected => {
  const parsed = parseCreate(form, listSlugs());
  if (!parsed.success) return rejected(parsed.error, form);
  // The title field's label is user content from here on, so it's stored in the admin's current language.
  const titleLabel = actionI18n()._(msg({ id: "collections.titleField", message: "Title" }));
  createCollection(parsed.data.name, parsed.data.slug, titleLabel);
  return { slug: parsed.data.slug };
};
