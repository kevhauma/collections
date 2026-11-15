import { msg } from "@lingui/core/macro";
import type { z } from "zod";
import { actionI18n } from "../../i18n";
import type { WishErrorKey } from "./validation";

// Translations for the issue keys of validation.ts.
const messages: Record<WishErrorKey, ReturnType<typeof msg>> = {
  title: msg({ id: "wishlist.error.title", message: "Enter a title of up to 200 characters." }),
  link: msg({ id: "wishlist.error.link", message: "Enter a web address starting with http:// or https://." }),
  note: msg({ id: "wishlist.error.note", message: "Keep the note under 2000 characters." }),
  price: msg({ id: "wishlist.error.price", message: "Keep the price to 50 characters or fewer." }),
};

// The first issue per input, translated into the admin's locale.
export const wishErrors = (error: z.ZodError): Partial<Record<WishErrorKey, string>> => {
  const i18n = actionI18n();
  const issues = error.issues.filter((issue) => issue.message in messages).toReversed();
  return Object.fromEntries(issues.map((issue) => [issue.path[0], i18n._(messages[issue.message as WishErrorKey])]));
};
