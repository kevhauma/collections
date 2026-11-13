import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import { safeRedirectTarget } from "../lib/redirect";

// The action behind a header switcher (/locale, /theme): the form field and the cookie share `name`. Works without
// JS: validate the value, set a one-year cookie, then 303 back to the page the switch was made on.
export const cookieSwitchAction =
  (name: string, values: readonly [string, ...string[]]) =>
  async ({ request }: ActionFunctionArgs) => {
    const parsed = z.enum(values).safeParse((await request.formData()).get(name));
    if (!parsed.success) return new Response(null, { status: 400 });
    requestContext().setCookies.push(`${name}=${parsed.data}; Path=/; Max-Age=31536000; SameSite=Lax`);
    return redirect(safeRedirectTarget(request.headers.get("referer"), request.url), 303);
  };
