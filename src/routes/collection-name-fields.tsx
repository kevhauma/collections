"use client";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import type { FormErrors } from "../features/collections/form";
import { slugify } from "../features/collections/slug";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";

type Props = {
  // The site's own origin, so the hint shows the full public URL.
  origin: string;
  name: string;
  slug: string;
  errors: FormErrors;
  // On create the slug may stay empty: the server derives it, and the preview shows what it will be.
  slugOptional?: boolean;
};

// Name and slug inputs with a live public-URL preview. Without JS the hint shows the URL as last submitted.
export const CollectionNameFields = ({ origin, name, slug, errors, slugOptional }: Props) => {
  const { t } = useLingui();
  const [nameValue, setName] = useState(name);
  const [slugValue, setSlug] = useState(slug);
  // Only on create is an empty slug derived (an empty name derives "collection", as the server would).
  const suggested = slugOptional ? slugify(nameValue) : "";
  const shown = slugValue.trim() || suggested;
  return (
    <>
      <FormField id="collection-name" label={t({ id: "collections.name", message: "Name" })} error={errors.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            defaultValue={name}
            onInput={(event) => setName(event.currentTarget.value)}
            maxLength={100}
            required
          />
        )}
      </FormField>
      <FormField
        id="collection-slug"
        label={
          slugOptional
            ? t({ id: "collections.slug.optional", message: "Web address (optional)" })
            : t({ id: "collections.slug", message: "Web address" })
        }
        hint={`${origin}/${shown}`}
        error={errors.slug}
      >
        {(control) => (
          <Input
            {...control}
            name="slug"
            defaultValue={slug}
            placeholder={suggested}
            onInput={(event) => setSlug(event.currentTarget.value)}
            maxLength={60}
            required={!slugOptional}
            autoCapitalize="none"
            spellCheck={false}
          />
        )}
      </FormField>
    </>
  );
};
