import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { redirect, type LoaderFunctionArgs, type Params } from "react-router";
import { requestContext } from "../context";
import { listWishlist, listWishlistSlugs, updateWishlist, type Wishlist } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { commitImage } from "../features/images/change";
import { prepareFormImage } from "../features/images/form";
import { rejected, type Rejected } from "../features/collections/form";
import type { FormInput } from "../features/collections/validation";
import { requireWishlist, wishlistAction } from "../features/wishlist/require-wishlist";
import { parseWishlistSettings } from "../features/wishlist/validation";
import { removeWishlist } from "../features/wishlist/wish-changes";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/choice";
import { Dialog } from "../ui/dialog";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { SaveRow } from "./admin-parts";
import { CollectionNameFields } from "./collection-name-fields";
import { ImageSection } from "./image-section";

// /admin/w/:slug/settings (TICKET-WSH-09): name, slug, visibility, the collection reminders (TICKET-WSH-06) and
// deletion, laid out like a collection's settings.

// The page reads the wishlist itself: after a form post, RSC renders without rerunning loaders.
export const loader = ({ params }: LoaderFunctionArgs) => {
  requireAdmin();
  requireWishlist(params.slug);
  return null;
};

type ActionData = {
  errors: Rejected["errors"] & Partial<Record<"image" | "imageUrl", string>>;
  values: Rejected["values"] & { imageUrl?: string };
  saved?: true;
};

// The cover's error, with the typed address kept for a no-JS reload.
const pictureRejected = (errors: ActionData["errors"], values: { name: string; slug: string }, form: FormInput): ActionData => ({
  errors,
  values: { ...values, imageUrl: String(form.imageUrl ?? "") },
});

// A hand-edited slug is never auto-suffixed: taken by another wishlist or malformed is an error. A new slug moves the
// page; otherwise stay and say it saved.
const save = async (wishlist: Wishlist, form: FormInput): Promise<ActionData | Response> => {
  const taken = listWishlistSlugs();
  taken.delete(wishlist.slug);
  const parsed = parseWishlistSettings(form, taken);
  if (!parsed.success) return rejected(parsed.error, form);
  const { name, slug } = parsed.data;
  const prepared = await prepareFormImage(form);
  if ("errors" in prepared) return pictureRejected(prepared.errors, { name, slug }, form);
  await commitImage(prepared.image, wishlist.image, () => updateWishlist(wishlist.id, parsed.data, prepared.image));
  return slug === wishlist.slug ? { errors: {}, values: { name, slug }, saved: true } : redirect(`/admin/w/${slug}/settings`);
};

const remove = async (wishlist: Wishlist) => {
  await removeWishlist(wishlist);
  return redirect("/admin/wishlists");
};

export const action = wishlistAction((wishlist, form) => (form.intent === "delete" ? remove(wishlist) : save(wishlist, form)));

// The delete card and its confirmation dialog, which says how many wishes go with it.
const DeleteWishlist = ({ name, count }: { name: string; count: number }) => {
  const { t } = useLingui();
  return (
    <>
      <Card heading={t({ id: "collections.delete.card", message: "Delete" })}>
        <div className="grid justify-items-start gap-4">
          <p>
            <Trans id="wishlists.delete.explain">
              Deleting removes the wishlist with all its items. Download an export first if you might want it back.
            </Trans>
          </p>
          <Button variant="danger" mark="cross" commandfor="delete-wishlist" command="show-modal">
            <Trans id="wishlists.delete.open">Delete wishlist…</Trans>
          </Button>
        </div>
      </Card>

      <Dialog
        id="delete-wishlist"
        title={t({ id: "collections.delete.title", message: `Delete “${name}”?` })}
        closeLabel={t({ id: "collections.delete.close", message: "Close" })}
      >
        <form method="post" className="grid gap-4">
          <p>
            <Plural
              id="wishlists.delete.confirmText"
              value={count}
              _0="This empty wishlist will be gone. This can't be undone."
              one="It and its # item will be gone. This can't be undone."
              other="It and its # items will be gone. This can't be undone."
            />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" mark="cross" type="submit" name="intent" value="delete">
              <Trans id="collections.delete.confirm">Delete for good</Trans>
            </Button>
            <Button type="button" commandfor="delete-wishlist" command="close">
              <Trans id="collections.delete.cancel">Keep it</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default function WishlistSettings({ params, actionData }: { params: Params; actionData?: ActionData }) {
  const { t } = useLingui();
  const wishlist = requireWishlist(params.slug);
  const { errors, values, saved } = actionData ?? { errors: {}, values: { name: wishlist.name, slug: wishlist.slug } };
  const name = wishlist.name;
  return (
    <div className="grid max-w-xl gap-8">
      <title>{t({ id: "collections.settings.title", message: `Settings · ${name}` })}</title>
      <div className="grid gap-1">
        <a href={`/admin/w/${wishlist.slug}`}>← {name}</a>
        <h1>
          <Trans id="collections.settings.heading">Settings</Trans>
        </h1>
      </div>

      <Card heading={name} tone="ink">
        <form method="post" encType="multipart/form-data" className="grid gap-4">
          {/* Its public address is /wishlist/<slug>, so that is the preview's base. */}
          <CollectionNameFields
            origin={`${new URL(requestContext().request.url).origin}/wishlist`}
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
            defaultChecked={wishlist.isPublic === 1}
            label={t({ id: "collections.settings.public", message: "Public: anyone with the link can see it" })}
          />
          <Checkbox
            name="showReminders"
            defaultChecked={wishlist.showReminders === 1}
            label={t({ id: "wishlists.settings.reminders", message: "Show my collections' want lists on this wishlist" })}
          />
          <fieldset className="grid gap-4">
            <legend className="mb-1 font-bold">
              <Trans id="wishlists.settings.priceRange">Budget range</Trans>
            </legend>
            <p className="text-ink-soft">
              <Trans id="wishlists.settings.priceRangeHint">
                Ideas from my collections that cost within this range show on the public wishlist. Leave a box empty for no limit.
              </Trans>
            </p>
            <div className="flex flex-wrap gap-4">
              <FormField id="settings-min-price" label={t({ id: "wishlists.settings.minPrice", message: "Lowest price" })}>
                {(control) => (
                  <Input {...control} type="number" name="minPrice" min="0" step="any" defaultValue={wishlist.minPrice ?? ""} />
                )}
              </FormField>
              <FormField id="settings-max-price" label={t({ id: "wishlists.settings.maxPrice", message: "Highest price" })}>
                {(control) => (
                  <Input {...control} type="number" name="maxPrice" min="0" step="any" defaultValue={wishlist.maxPrice ?? ""} />
                )}
              </FormField>
            </div>
          </fieldset>
          <fieldset className="grid gap-4">
            <legend className="mb-1 font-bold">
              <Trans id="collections.settings.picture">Picture</Trans>
            </legend>
            <p className="text-ink-soft">
              <Trans id="wishlists.settings.coverHint">One photo for the whole wishlist, shown on its card and above its items.</Trans>
            </p>
            <ImageSection
              image={wishlist.image}
              title={name}
              url={values.imageUrl}
              errors={errors}
              labels={{
                image: t({ id: "items.image.file", message: "Photo" }),
                imageUrl: t({ id: "items.image.url", message: "Or an image address" }),
              }}
            />
          </fieldset>
          <SaveRow saved={saved} />
        </form>
      </Card>

      <DeleteWishlist name={name} count={listWishlist(wishlist.id).length} />
    </div>
  );
}
