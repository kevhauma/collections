import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { data, redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { adminExists, createAdmin } from "../db/admin";
import { hashPassword } from "../features/auth/password";
import { actionI18n } from "../i18n";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";

// First-run setup (TICKET-AUTH-01). Unlinked, and 404 for good once the admin exists. A route action rather than
// a 'use server' function: this page sits under the JS-free public layout, and route actions hand their result
// back to the server component as `actionData`, so the form and its errors work without any client code.

const notFound = () => data(null, { status: 404 });

export const loader = () => {
  if (adminExists()) throw notFound();
  return null;
};

const schema = z
  .object({ password: z.string().min(12), confirm: z.string() })
  .refine(({ password, confirm }) => password === confirm, { path: ["confirm"] });

// Each field has one way to be wrong, so one message per field.
const fieldErrors = {
  password: msg({ id: "setup.error.tooShort", message: "Use at least 12 characters." }),
  confirm: msg({ id: "setup.error.mismatch", message: "The two passwords don't match." }),
};

type Field = keyof typeof fieldErrors;
type ActionData = { errors: Partial<Record<Field, string>> };

export const action = async ({ request }: ActionFunctionArgs) => {
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    const i18n = actionI18n();
    const fields = parsed.error.issues.map((issue) => issue.path[0] as Field);
    return { errors: Object.fromEntries(fields.map((field) => [field, i18n._(fieldErrors[field])])) } satisfies ActionData;
  }
  // createAdmin is atomic: if another setup won the race in the meantime, this one gets the 404.
  if (!createAdmin(await hashPassword(parsed.data.password))) throw notFound();
  // shortcut: no session yet, so the owner lands on /admin unauthenticated; TICKET-AUTH-02 logs them in here.
  return redirect("/admin");
};

export default function Setup({ actionData }: { actionData?: ActionData }) {
  const { t } = useLingui();
  const errors = actionData?.errors ?? {};
  return (
    <div className="mx-auto grid max-w-md gap-6 py-6">
      <title>{t({ id: "setup.title", message: "Set up · Collections" })}</title>
      <h1>
        <Trans id="setup.heading">Welcome</Trans>
      </h1>
      <Card heading={t({ id: "setup.card", message: "Admin password" })} tone="ink">
        <form method="post" className="grid gap-4">
          <p className="text-ink-soft">
            <Trans id="setup.intro">
              Choose the password for managing your collections. Visitors never need one, and this page disappears
              once it's set.
            </Trans>
          </p>
          <FormField
            id="setup-password"
            label={t({ id: "setup.password", message: "Password" })}
            hint={t({ id: "setup.password.hint", message: "At least 12 characters." })}
            error={errors.password}
          >
            {(control) => <Input {...control} type="password" name="password" autoComplete="new-password" required />}
          </FormField>
          <FormField id="setup-confirm" label={t({ id: "setup.confirm", message: "Repeat the password" })} error={errors.confirm}>
            {(control) => <Input {...control} type="password" name="confirm" autoComplete="new-password" required />}
          </FormField>
          <div>
            <Button variant="primary" type="submit">
              <Trans id="setup.submit">Set password</Trans>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
