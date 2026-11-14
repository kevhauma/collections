import { Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import { deleteCollection, listSlugs, setItemImage, updateCollection, type Collection } from "../db/collections";
import { listFields, type Field } from "../db/fields";
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
import { FormField } from "../ui/form-field";
import { Select } from "../ui/input";
import { CollectionNameFields } from "./collection-name-fields";
import { ImageSection } from "./image-section";

// /admin/c/:slug/settings (TICKET-COL-01): name, slug, visibility, default view, default sort (TICKET-COL-07), the
// title link (TICKET-COL-09), the picture (TICKET-COL-06), the default item image (TICKET-COL-08, its own form), and
// deletion.

// The page reads the collection itself: after a form post, React Router's RSC mode renders without rerunning
// loaders (loaderData is null), so the loader only guards.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireCollection(params.slug);
  return null;
};

// `section`: which form posted, so its image errors and "Saved." show there and not in the other one.
type ActionData = {
  section?: "itemImage";
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
  const fields = listFields(collection.id);
  const parsed = parseSettings(form, {
    taken,
    sortable: new Set(["created", ...fields.map((field) => String(field.id))]),
    linkable: new Set(fields.filter((field) => field.type === "url").map((field) => String(field.id))),
  });
  // Settings are checked before any image work, so a refused save never leaves picture files behind.
  if (!parsed.success) return rejected(parsed.error, form);
  const { name, slug } = parsed.data;
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return pictureRejected(prepared.errors, { name, slug }, form);
  await commitImage(prepared.image, collection.image, () => updateCollection(collection.id, parsed.data, prepared.image));
  return saved(collection, { name, slug });
};

// The have tab's default order: the title (stored as null), any other field, or date added; then the direction.
const DefaultSort = ({ collection, fields }: { collection: Collection; fields: Field[] }) => {
  const { t } = useLingui();
  const title = fields.find((field) => field.id === collection.titleFieldId);
  const options = [
    { value: "", label: title?.label ?? "" },
    ...fields.filter((field) => field !== title).map((field) => ({ value: String(field.id), label: field.label })),
    { value: "created", label: t({ id: "items.sort.created", message: "Date added" }) },
  ];
  return (
    <>
      <FormField id="settings-default-sort" label={t({ id: "collections.settings.defaultSort", message: "Default sort" })}>
        {(control) => (
          <Select {...control} name="defaultSort" defaultValue={collection.defaultSort ?? ""}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <RadioGroup
        legend={t({ id: "collections.settings.defaultDir", message: "Default order" })}
        name="defaultDir"
        defaultValue={collection.defaultDir}
        options={[
          { value: "asc", label: t({ id: "items.sort.asc", message: "Ascending" }) },
          { value: "desc", label: t({ id: "items.sort.desc", message: "Descending" }) },
        ]}
      />
    </>
  );
};

// The url field the title links to, or nothing. A field that is no longer a url field isn't offered, so it shows
// "Nothing" and saving clears it.
const TitleLink = ({ collection, fields }: { collection: Collection; fields: Field[] }) => {
  const { t } = useLingui();
  const options = [
    { value: "", label: t({ id: "collections.settings.titleLinkNone", message: "Nothing" }) },
    ...fields.filter((field) => field.type === "url").map((field) => ({ value: String(field.id), label: field.label })),
  ];
  return (
    <FormField
      id="settings-title-link"
      label={t({ id: "collections.settings.titleLink", message: "Title links to" })}
      hint={t({
        id: "collections.settings.titleLinkHint",
        message: "A link field. On public pages the title opens it; in admin it's the ↗ next to the title.",
      })}
    >
      {(control) => (
        <Select {...control} name="titleLinkFieldId" defaultValue={String(collection.titleLinkFieldId ?? "")}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
};

// The default item image's own form: the same image inputs, so the same limits, errors and file handling. Nothing
// chosen keeps it.
const saveItemImage = async (collection: Collection, form: FormInput) => {
  const values = { name: collection.name, slug: collection.slug, imageUrl: String(form.imageUrl ?? "") };
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return { section: "itemImage", errors: prepared.errors, values } satisfies ActionData;
  const image = prepared.image;
  if (image !== undefined) await commitImage(image, collection.itemImage, () => setItemImage(collection.id, image));
  return { section: "itemImage", errors: {}, values, saved: true } satisfies ActionData;
};

const intents = { delete: remove, itemImage: saveItemImage };
// Own keys only, so an intent like "toString" can't reach the prototype.
const intentOf = (intent: unknown) => (Object.hasOwn(intents, String(intent)) ? intents[intent as keyof typeof intents] : save);

export const action = collectionAction((collection, form) => intentOf(form.intent)(collection, form));

// The state each form shows: the one that posted gets the action's result, the other starts clean.
const formStates = (collection: Collection, actionData?: ActionData) => {
  const clean: ActionData = { errors: {}, values: collection };
  return actionData?.section === "itemImage"
    ? { settings: clean, itemImage: actionData }
    : { settings: actionData ?? clean, itemImage: clean };
};

// The default item image's own form (TICKET-COL-08), with its own errors and "Saved.".
const DefaultItemImage = ({ collection, state }: { collection: Collection; state: ActionData }) => {
  const { t } = useLingui();
  return (
    <Card heading={t({ id: "collections.settings.itemImage", message: "Default item image" })}>
      <form method="post" encType="multipart/form-data" className="grid gap-4">
        <input type="hidden" name="intent" value="itemImage" />
        <p className="text-ink-soft">
          <Trans id="collections.settings.itemImageHint">Shown for items that have no photo of their own.</Trans>
        </p>
        <ImageSection
          id="default-item-image"
          image={collection.itemImage}
          title=""
          url={state.values.imageUrl}
          errors={state.errors}
          labels={{
            image: t({ id: "items.image.file", message: "Photo" }),
            imageUrl: t({ id: "items.image.url", message: "Or an image address" }),
          }}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" type="submit">
            <Trans id="collections.settings.save">Save</Trans>
          </Button>
          <p role="status">
            {state.saved && <Trans id="collections.settings.saved">Saved.</Trans>}
          </p>
        </div>
      </form>
    </Card>
  );
};

// The delete card and its confirmation dialog.
const DeleteCollection = ({ name }: { name: string }) => {
  const { t } = useLingui();
  return (
    <>
      <Card heading={t({ id: "collections.delete.card", message: "Delete" })}>
        <div className="grid justify-items-start gap-4">
          <p>
            <Trans id="collections.delete.explain">
              Deleting removes the collection with all its fields and items. Download an export first if you might
              want it back.
            </Trans>
          </p>
          <Button variant="danger" mark="cross" commandfor="delete-collection" command="show-modal">
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
            <Button variant="danger" mark="cross" type="submit" name="intent" value="delete">
              <Trans id="collections.delete.confirm">Delete for good</Trans>
            </Button>
            <Button type="button" commandfor="delete-collection" command="close">
              <Trans id="collections.delete.cancel">Keep it</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default function CollectionSettings({ params, actionData }: { params: Params; actionData?: ActionData }) {
  const { t } = useLingui();
  const collection = requireCollection(params.slug);
  const states = formStates(collection, actionData);
  const { errors, values, saved } = states.settings;
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
          <DefaultSort collection={collection} fields={listFields(collection.id)} />
          <TitleLink collection={collection} fields={listFields(collection.id)} />
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
              url={values.imageUrl}
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

      <DefaultItemImage collection={collection} state={states.itemImage} />
      <DeleteCollection name={name} />
    </div>
  );
}
