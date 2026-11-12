import { redirect, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { requestContext } from "../context";
import { localeCookie, locales } from "../i18n/locale";
import { safeRedirectTarget } from "../lib/redirect";

const schema = z.object({ locale: z.enum(locales) });

// POST /locale, from the language switcher in both headers. Works without JS: set the cookie, then 303 back to
// the page the switch was made on.
export const action = async ({ request }: ActionFunctionArgs) => {
  const parsed = schema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return new Response(null, { status: 400 });
  requestContext().setCookies.push(`${localeCookie}=${parsed.data.locale}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return redirect(safeRedirectTarget(request.headers.get("referer"), request.url), 303);
};
