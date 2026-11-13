import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type ActionFunctionArgs } from "react-router";
import { requestContext } from "../context";
import { createCollection, listSlugs } from "../db/collections";
import { requireAdmin } from "../features/auth/guard";
import { rejected, type Rejected } from "../features/collections/form";
import { parseCreate } from "../features/collections/validation";
import { actionI18n } from "../i18n";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CollectionNameFields } from "./collection-name-fields";

// /admin/collections/new (TICKET-COL-01). An empty slug is derived from the name and made unique; a typed one must
// already be free, so the owner gets the address they asked for or an error.

export const loader = () => {
  requireAdmin();
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  requireAdmin();
  const form = Object.fromEntries(await request.formData());
  const parsed = parseCreate(form, listSlugs());
  if (!parsed.success) return rejected(parsed.error, form);
  // The title field's label is user content from here on, so it's stored in the admin's current language.
  const titleLabel = actionI18n()._(msg({ id: "collections.titleField", message: "Title" }));
  createCollection(parsed.data.name, parsed.data.slug, titleLabel);
  return redirect(`/admin/c/${parsed.data.slug}`);
};

const blank: Rejected = { errors: {}, values: { name: "", slug: "" } };

export default function NewCollection({ actionData }: { actionData?: Rejected }) {
  const { t } = useLingui();
  const { errors, values } = actionData ?? blank;
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "collections.new.title", message: "New collection · Collections" })}</title>
      <h1>
        <Trans id="collections.new.heading">New collection</Trans>
      </h1>
      <Card heading={t({ id: "collections.new.card", message: "Name and address" })} tone="ink">
        <form method="post" className="grid gap-4">
          <CollectionNameFields
            origin={new URL(requestContext().request.url).origin}
            name={values.name}
            slug={values.slug}
            errors={errors}
            slugOptional
          />
          <p className="text-ink-soft">
            <Trans id="collections.new.private">New collections are private until you make them public.</Trans>
          </p>
          <div>
            <Button variant="primary" type="submit">
              <Trans id="collections.new.submit">Create collection</Trans>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
