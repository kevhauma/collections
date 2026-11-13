import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { redirect } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import { getAdminPasswordHash } from "../db/admin";
import { verifyPassword } from "../features/auth/password";
import { loginLimiter } from "../features/auth/rate-limit";
import { logIn } from "../features/auth/session";
import { actionI18n } from "../i18n";
import { safeRedirectTarget } from "../lib/redirect";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";

// The login shown at /admin when there is no session (TICKET-AUTH-02). A route action, like setup, so it works
// without JS; the form posts to `/admin?index`, React Router's address for the index route's action.

const schema = z.object({ password: z.string().catch("") });

// `?next=`: the admin page that sent the browser here (requireAdmin), which the login returns to. The form posts it
// back in its own URL, so it survives a wrong password too. Same-origin only.
const nextOf = (url: string) => new URL(url).searchParams.get("next");
const afterLogin = (url: string) => safeRedirectTarget(nextOf(url) ?? "/admin", url);

const messages = {
  // Deliberately generic: it says nothing about why.
  wrong: msg({ id: "login.error.wrong", message: "Wrong password." }),
  tooMany: msg({ id: "login.error.tooMany", message: "Too many attempts. Try again in a minute." }),
};

export type LoginResult = { error: string };

export const loginAction = async (request: Request) => {
  const i18n = actionI18n();
  // Checked before the password, so even the right one is refused while blocked.
  if (loginLimiter.blocked()) return { error: i18n._(messages.tooMany) } satisfies LoginResult;
  const { password } = schema.parse(Object.fromEntries(await request.formData()));
  if (!(await verifyPassword(password, getAdminPasswordHash() ?? ""))) {
    loginLimiter.fail();
    return { error: i18n._(messages.wrong) } satisfies LoginResult;
  }
  logIn();
  return redirect(afterLogin(request.url));
};

export const LoginForm = ({ error }: { error?: string }) => {
  const { t } = useLingui();
  const next = nextOf(requestContext().request.url);
  return (
    <div className="mx-auto grid max-w-md gap-6 py-6">
      <title>{t({ id: "login.title", message: "Log in · Collections" })}</title>
      <h1>
        <Trans id="login.heading">Log in</Trans>
      </h1>
      <Card heading={t({ id: "login.card", message: "Admin" })} tone="ink">
        <form method="post" action={`/admin?index${next ? `&${new URLSearchParams({ next })}` : ""}`} className="grid gap-4">
          <FormField id="login-password" label={t({ id: "login.password", message: "Password" })} error={error}>
            {(control) => (
              <Input {...control} type="password" name="password" autoComplete="current-password" required />
            )}
          </FormField>
          <div>
            <Button variant="primary" type="submit">
              <Trans id="login.submit">Log in</Trans>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
