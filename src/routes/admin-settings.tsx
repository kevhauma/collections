import { Trans, useLingui } from "@lingui/react/macro";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getDefaultLocale, setDefaultLocale } from "../db/settings";
import { requireAdmin } from "../features/auth/guard";
import { locales } from "../i18n/locale";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Select } from "../ui/input";

// /admin/settings: the default language for visitors whose browser asks for neither Dutch nor English.

export const loader = () => {
  requireAdmin();
  return null;
};

const schema = z.object({ defaultLocale: z.enum(locales) });

export const action = async ({ request }: ActionFunctionArgs) => {
  requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return new Response(null, { status: 400 });
  setDefaultLocale(parsed.data.defaultLocale);
  return { saved: true };
};

export default function AdminSettings({ actionData }: { actionData?: { saved: boolean } }) {
  const { t } = useLingui();
  return (
    <div className="grid max-w-xl gap-6">
      <title>{t({ id: "settings.title", message: "Settings · Collections" })}</title>
      <h1>
        <Trans id="settings.heading">Settings</Trans>
      </h1>
      <Card heading={t({ id: "settings.visitors", message: "Visitors" })} tone="ink">
        <form method="post" className="grid gap-4">
          <FormField
            id="settings-default-locale"
            label={t({ id: "settings.defaultLocale", message: "Default language" })}
            hint={t({
              id: "settings.defaultLocale.hint",
              message: "Used when a visitor's browser asks for neither English nor Dutch.",
            })}
          >
            {(control) => (
              <Select {...control} name="defaultLocale" defaultValue={getDefaultLocale()}>
                <option value="en" lang="en">
                  English
                </option>
                <option value="nl" lang="nl">
                  Nederlands
                </option>
              </Select>
            )}
          </FormField>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" type="submit">
              <Trans id="settings.save">Save</Trans>
            </Button>
            <p role="status">{actionData?.saved && <Trans id="settings.saved">Saved.</Trans>}</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
