import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type ActionFunctionArgs } from "react-router";
import { requireAdmin } from "../features/auth/guard";
import type { Rejected } from "../features/collections/form";
import { addWishlist } from "../features/wishlist/wish-changes";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";

// /admin/wishlists/new (TICKET-WSH-09): just a name. The slug is generated and made unique among wishlists; the
// settings page can change it.

export const loader = () => {
  requireAdmin();
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  requireAdmin();
  const created = addWishlist(Object.fromEntries(await request.formData()));
  return "errors" in created ? created : redirect(`/admin/w/${created.slug}`);
};

export default function NewWishlist({ actionData }: { actionData?: Rejected }) {
  const { t } = useLingui();
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "wishlists.new.title", message: "New wishlist · Hoardr" })}</title>
      <div className="grid gap-1">
        <a href="/admin/wishlists">← {t({ id: "admin.nav.wishlists", message: "Wishlists" })}</a>
        <h1>
          <Trans id="wishlists.new.heading">New wishlist</Trans>
        </h1>
      </div>
      <Card tone="ink">
        <form method="post" noValidate className="grid gap-4">
          <FormField id="wishlist-name" label={t({ id: "collections.name", message: "Name" })} error={actionData?.errors.name}>
            {(control) => <Input {...control} name="name" defaultValue={actionData?.values.name} maxLength={100} required />}
          </FormField>
          <p className="text-ink-soft">
            <Trans id="wishlists.new.private">New wishlists are private until you make them public.</Trans>
          </p>
          <div>
            <Button variant="primary" type="submit">
              <Trans id="wishlists.new.submit">Create wishlist</Trans>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
