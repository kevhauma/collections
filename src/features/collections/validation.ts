import { z } from "zod";
import { defaultViews, sortDirections } from "../../db/collections";
import { maxSlugLength, reservedSlugs, slugify, slugPattern, uniqueSlug } from "./slug";

// Validation shared by the create and settings actions. Issue messages are keys that form.ts translates.

export type ErrorKey = "name" | "format" | "reserved" | "taken";
const key = (errorKey: ErrorKey) => errorKey;

export type FormInput = Record<string, FormDataEntryValue>;

// `taken`: the slugs of every other collection.
const fields = (taken: ReadonlySet<string>) => ({
  name: z.string().trim().min(1, key("name")).max(100, key("name")),
  slug: z
    .string()
    .trim()
    .max(maxSlugLength, key("format"))
    .regex(slugPattern, key("format"))
    .refine((slug) => !reservedSlugs.has(slug), key("reserved"))
    .refine((slug) => !taken.has(slug), key("taken")),
});

// An empty slug is derived from the name and made unique. A typed one is validated as is: taken or reserved is an
// error, never auto-suffixed.
export const parseCreate = (form: FormInput, taken: ReadonlySet<string>) =>
  z.object(fields(taken)).safeParse({
    name: form.name,
    slug: form.slug || uniqueSlug(slugify(String(form.name ?? "")), taken),
  });

// The collection's own choices, as the form posts them. `taken`: other collections' slugs. `sortable`: what the default
// sort may be besides "" for the title ("created" and the field ids, TICKET-COL-07). `linkable`: its url field ids
// (TICKET-COL-09). A value outside them (forged) has no message key, so the form just doesn't save.
type SettingsChoices = { taken: ReadonlySet<string>; sortable: ReadonlySet<string>; linkable: ReadonlySet<string> };

// "on" when ticked; an unticked checkbox sends nothing.
const checkbox = z
  .literal("on")
  .optional()
  .transform((on) => (on ? 1 : 0) as 0 | 1);

// "" is none (null); anything else must be one of `allowed`.
const optionalChoice = (allowed: ReadonlySet<string>) =>
  z
    .string()
    .refine((value) => value === "" || allowed.has(value))
    .transform((value) => value || null);

export const parseSettings = (form: FormInput, { taken, sortable, linkable }: SettingsChoices) =>
  z
    .object({
      ...fields(taken),
      // An unchecked checkbox sends nothing.
      isPublic: checkbox,
      showOnWishlist: checkbox,
      defaultView: z.enum(defaultViews),
      defaultSort: optionalChoice(sortable),
      defaultDir: z.enum(sortDirections),
      titleLinkFieldId: optionalChoice(linkable).transform((id) => (id === null ? null : Number(id))),
    })
    .safeParse(form);
