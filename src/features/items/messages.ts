import { msg } from "@lingui/core/macro";
import { actionI18n } from "../../i18n";
import type { ItemErrors, ValidationId } from "./schema";

// The text behind each item-validation id. Typed against ValidationId, so a new id in schema.ts doesn't compile until
// it has a message here (and `npm run i18n:extract` puts it in both catalogs).
const messages: Record<ValidationId, ReturnType<typeof msg>> = {
  "validation.required": msg({ id: "validation.required", message: "Fill this in." }),
  "validation.text": msg({ id: "validation.text", message: "Keep this under 2000 characters." }),
  "validation.number": msg({ id: "validation.number", message: "Enter a number, like 12 or 12,5." }),
  "validation.date": msg({ id: "validation.date", message: "Enter a real date." }),
  "validation.select": msg({ id: "validation.select", message: "Pick one of the options." }),
  "validation.url": msg({ id: "validation.url", message: "Enter a web address starting with http:// or https://." }),
  "validation.quantity": msg({ id: "validation.quantity", message: "Enter a whole number from 1 to 9999." }),
  "validation.status": msg({ id: "validation.status", message: "Choose have or want." }),
};

// For server actions (actionI18n, Lingui #2615). shortcut: unused until TICKET-ITM-02 renders item forms.
export const translateItemErrors = (errors: ItemErrors): Partial<Record<string, string>> => {
  const i18n = actionI18n();
  return Object.fromEntries(Object.entries(errors).map(([input, id]) => [input, id && i18n._(messages[id])]));
};
