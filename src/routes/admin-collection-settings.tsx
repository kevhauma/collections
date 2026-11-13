import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import { deleteCollection, listSlugs, updateCollection, type Collection } from "../db/collections";
import { requireAdmin } from "../features/auth/guard";
import { commitImage } from "../features/images/change";
import { prepareFormImage } from "../features/images/form";
import { removeImage } from "../features/images/process";
import { rejected, type Rejected } from "../features/collections/form";
import { collectionAction, requireCollection } from "../features/collections/require-collection";
import { parseSettings, type FormInput } from "../features/collections/validation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox, RadioGroup } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { CollectionNameFields } from "./collection-name-fields";
import { ImageSection } from "./image-section";

// /admin/c/:slug/settings (TICKET-COL-01): name, slug, visibility, default view, the picture (TICKET-COL-06), and
// deletion.

// The page reads the collection itself: after a form post, React Router's RSC mode renders without rerunning
// loaders (loaderData is null), so the loader only guards.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  return null;
};

type ActionData = {
  errors: Rejected["errors"] & Partial<Record<"image" | "imageUrl", string>>;
  values: Rejected["values"] & { imageUrl?: string };
  saved?: true;
};

// Image files go after the rows are gone.
const remove = async (collection: Collection) => {
  await Promise.all(deleteCollection(collection.id).map((image) => removeImage(image)));
  return redirect("/admin");
};

// A new slug moves this page; otherwise stay and say it saved.
const saved = (collection: Collection, values: { name: string; slug: string }) =>
  values.slug === collection.slug
    ? ({ errors: {}, values, saved: true } satisfies ActionData)
    : redirect(`/admin/c/${values.slug}/settings`);

// The picture's error, with the typed address kept for a no-JS reload.
const pictureRejected = (errors: ActionData["errors"], values: { name: string; slug: string }, form: FormInput) =>
  ({ errors, values: { ...values, imageUrl: String(form.imageUrl ?? "") } }) satisfies ActionData;

const save = async (collection: Collection, form: FormInput) => {
  // A hand-edited slug is never auto-suffixed: taken (by another collection) or reserved is an error.
  const taken = listSlugs();
  taken.delete(collection.slug);
  const parsed = parseSettings(form, taken);
  // Settings are checked before any image work, so a refused save never leaves picture files behind.
  if (!parsed.success) return rejected(parsed.error, form);
  const { name, slug } = parsed.data;
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return pictureRejected(prepared.errors, { name, slug }, form);
  await commitImage(prepared.image, collection.image, () => updateCollection(collection.id, parsed.data, prepared.image));
  return saved(collection, { name, slug });
};

export const action = collectionAction((collection, form) => (form.intent === "delete" ? remove : save)(collection, form));

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
        <form method="post" encType="multipart/form-data" className="grid gap-4">
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
          <fieldset className="grid gap-4">
            <legend className="mb-1 font-bold">
              <Trans id="collections.settings.picture">Picture</Trans>
            </legend>
            <p className="text-ink-soft">
              <Trans id="collections.settings.pictureHint">
                One photo of the whole collection, shown on its card and above its items.
              </Trans>
            </p>
            <ImageSection
              image={collection.image}
              title={name}
              url={actionData?.values.imageUrl}
              errors={errors}
              labels={{
                image: t({ id: "items.image.file", message: "Photo" }),
                imageUrl: t({ id: "items.image.url", message: "Or an image address" }),
              }}
            />
          </fieldset>
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
