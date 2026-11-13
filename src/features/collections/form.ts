import { msg } from "@lingui/core/macro";
import type { z } from "zod";
import { actionI18n } from "../../i18n";
import { maxSlugLength } from "./slug";
import type { ErrorKey, FormInput } from "./validation";

const messages: Record<ErrorKey, ReturnType<typeof msg>> = {
  name: msg({ id: "collections.error.name", message: "Enter a name of up to 100 characters." }),
  format: msg({
    id: "collections.error.slugFormat",
    message: `Use up to ${maxSlugLength} lowercase letters, digits and single dashes.`,
  }),
  reserved: msg({ id: "collections.error.slugReserved", message: "This address is used by the app itself." }),
  taken: msg({ id: "collections.error.slugTaken", message: "Another collection already uses this address." }),
};

export type FormErrors = Partial<Record<"name" | "slug", string>>;

export type Rejected = { errors: FormErrors; values: { name: string; slug: string } };

// The first issue per field, translated into the admin's locale, plus what was typed so a no-JS reload keeps it.
// Issues without a message key (a tampered checkbox or view value) aren't shown; the form just doesn't save.
export const rejected = (error: z.ZodError, form: FormInput): Rejected => {
  const i18n = actionI18n();
  const issues = error.issues.filter((issue) => issue.message in messages).toReversed();
  return {
    errors: Object.fromEntries(issues.map((issue) => [issue.path[0], i18n._(messages[issue.message as ErrorKey])])),
    values: { name: String(form.name ?? ""), slug: String(form.slug ?? "") },
  };
};
