import { AsyncLocalStorage } from "node:async_hooks";
import type { Session } from "./features/auth/session";
import type { Locale } from "./i18n/locale";

// One store per request, entered in entry.rsc.tsx around routing, rendering and actions.
// Server components and 'use server' actions both run inside it, so neither needs the request passed down.
// Locale and session are resolved once per request. setCookies collects Set-Cookie values (login, logout,
// session renewal); entry.rsc.tsx adds them to the response.
export type RequestContext = { request: Request; locale: Locale; session?: Session; setCookies: string[] };

const store = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T,>(context: RequestContext, fn: () => T): T => store.run(context, fn);

export const requestContext = (): RequestContext => {
  const context = store.getStore();
  if (!context) throw new Error("requestContext() called outside a request");
  return context;
};

export const parseCookies = (header: string | null): Record<string, string> =>
  Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((pair) => pair.split("="))
      .filter(([name, ...value]) => name?.trim() && value.length > 0)
      .map(([name = "", ...value]) => [name.trim(), safeDecode(value.join("=").trim())]),
  );

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getCookie = (name: string): string | undefined =>
  parseCookies(requestContext().request.headers.get("cookie"))[name];
