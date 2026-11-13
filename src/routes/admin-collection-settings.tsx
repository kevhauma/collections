import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import { deleteCollection, listSlugs, updateCollection } from "../db/collections";
import { requireAdmin } from "../features/auth/guard";
import { removeImage } from "../features/images/process";
import { rejected, type Rejected } from "../features/collections/form";
import { collectionAction, requireCollection } from "../features/collections/require-collection";
import { parseSettings } from "../features/collections/validation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox, RadioGroup } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { CollectionNameFields } from "./collection-name-fields";

// /admin/c/:slug/settings (TICKET-COL-01): name, slug, visibility, default view, and deletion.

// The page reads the collection itself: after a form post, React Router's RSC mode renders without rerunning
// loaders (loaderData is null), so the loader only guards.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  return null;
};

type ActionData = Rejected & { saved?: true };

export const action = collectionAction(async (collection, form) => {
  if (form.intent === "delete") {
    // Image files go after the rows are gone.
    await Promise.all(deleteCollection(collection.id).map((image) => removeImage(image)));
    return redirect("/admin");
  }
  // A hand-edited slug is never auto-suffixed: taken (by another collection) or reserved is an error.
  const taken = listSlugs();
  taken.delete(collection.slug);
  const parsed = parseSettings(form, taken);
  if (!parsed.success) return rejected(parsed.error, form);
  const { name, slug } = parsed.data;
  updateCollection(collection.id, parsed.data);
  // A new slug moves this page; otherwise stay and say it saved.
  return slug === collection.slug
    ? ({ errors: {}, values: { name, slug }, saved: true } satisfies ActionData)
    : redirect(`/admin/c/${slug}/settings`);
});

export default function CollectionSettings({ params, actionData }: { params: Params; actionData?: ActionData }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const { errors, values, saved } = actionData ?? { errors: {}, values: collection, saved: false };
  const name = collection.name;
  return (
    <div className="grid max-w-xl gap-8">
      <title>{t({ id: "collections.settings.title", message: `Settings · ${name}` })}</title>
      <div className="grid gap-1">
        <a href={`/admin/c/${collection.slug}`}>← {name}</a>
        <h1>
          <Trans id="collections.settings.heading">Settings</Trans>
        </h1>
      </div>

      <Card heading={name} tone="ink">
        <form method="post" className="grid gap-4">
          <CollectionNameFields
            origin={new URL(requestContext().request.url).origin}
            name={values.name}
            slug={values.slug}
            errors={errors}
          />
          <p className="text-ink-soft">
            <Trans id="collections.settings.slugWarning">
              Changing the web address breaks links you have already shared. The old address will not redirect.
            </Trans>
          </p>
          <Checkbox
            name="isPublic"
            defaultChecked={collection.isPublic === 1}
            label={t({ id: "collections.settings.public", message: "Public: anyone with the link can see it" })}
          />
          <RadioGroup
            legend={t({ id: "collections.settings.defaultView", message: "Default view" })}
            name="defaultView"
            defaultValue={collection.defaultView}
            options={[
              { value: "table", label: t({ id: "collections.view.table", message: "Table" }) },
              { value: "grid", label: t({ id: "collections.view.grid", message: "Grid" }) },
            ]}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" type="submit">
              <Trans id="collections.settings.save">Save</Trans>
            </Button>
            <p role="status">
              {saved && <Trans id="collections.settings.saved">Saved.</Trans>}
            </p>
          </div>
        </form>
      </Card>

      <Card heading={t({ id: "collections.delete.card", message: "Delete" })}>
        <div className="grid justify-items-start gap-4">
          <p>
            <Trans id="collections.delete.explain">
              Deleting removes the collection with all its fields and items. Download an export first if you might
              want it back.
            </Trans>
          </p>
          <Button variant="danger" commandfor="delete-collection" command="show-modal">
            <Trans id="collections.delete.open">Delete collection…</Trans>
          </Button>
        </div>
      </Card>

      <Dialog
        id="delete-collection"
        title={t({ id: "collections.delete.title", message: `Delete “${name}”?` })}
        closeLabel={t({ id: "collections.delete.close", message: "Close" })}
      >
        <form method="post" className="grid gap-4">
          <p>
            <Trans id="collections.delete.confirmText">
              “{name}” and everything in it will be gone. This can't be undone.
            </Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" type="submit" name="intent" value="delete">
              <Trans id="collections.delete.confirm">Delete for good</Trans>
            </Button>
            <Button type="button" commandfor="delete-collection" command="close">
              <Trans id="collections.delete.cancel">Keep it</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
