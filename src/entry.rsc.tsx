// RSC entry: runs in Vite's "rsc" environment (the react-server condition). Every HTTP request that isn't a
// static asset lands here, as a Fetch API Request converted by @remix-run/node-fetch-server in server.ts.
//
// The round trip:
// 1. matchRSCServerRequest matches the URL against routes.ts. For a POST it first runs the server action:
//    - a no-JS <form action> post is decoded with decodeAction, and its result with decodeFormState, so forms
//      work before (or without) hydration;
//    - a post from hydrated client code is decoded with decodeReply + loadServerAction.
// 2. The matched route tree is serialized into an RSC stream (renderToReadableStream).
// 3. For a document request, entry.ssr turns that stream into HTML and inlines it for hydration. For a client
//    navigation or action call, React Router returns the RSC stream itself.
import {
  createTemporaryReferenceSet,
  decodeAction,
  decodeFormState,
  decodeReply,
  loadServerAction,
  renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc";
import { unstable_matchRSCServerRequest as matchRSCServerRequest } from "react-router";
import { declaresTooLarge, limitBody } from "./lib/body-limit";
import { parseCookies, runWithContext } from "./context";
import { db } from "./db/connection";
import { getDefaultLocale } from "./db/settings";
import { deleteExpiredOAuth } from "./db/oauth";
import { deleteExpiredSessions } from "./db/sessions";
import { getSession, sessionCookie, sessionCookieName } from "./features/auth/session";
import { api as apiHandler } from "./features/mcp/api";
import { localeCookie, resolveLocale } from "./i18n/locale";
import { routes } from "./routes";

const fetchServer = (request: Request) =>
  matchRSCServerRequest({
    createTemporaryReferenceSet,
    decodeAction,
    decodeFormState,
    decodeReply,
    loadServerAction,
    request,
    routes: routes(),
    generateResponse: (match, options) =>
      new Response(renderToReadableStream(match.payload, options), {
        status: match.statusCode,
        headers: match.headers,
      }),
  });

export default async function handler(incoming: Request): Promise<Response> {
  // Oversized bodies are refused before React Router buffers them (src/lib/body-limit.ts).
  if (declaresTooLarge(incoming)) return new Response(null, { status: 413 });
  const request = limitBody(incoming);
  // Locale and session are resolved once here; everything below, including actions and server components, reads
  // them and the request via src/context.ts.
  const cookies = parseCookies(request.headers.get("cookie"));
  const locale = resolveLocale({
    cookie: cookies[localeCookie],
    acceptLanguage: request.headers.get("accept-language"),
    defaultLocale: getDefaultLocale(),
  });
  const session = getSession(cookies[sessionCookieName]);
  // A renewed session re-sends its cookie, so the browser's expiry slides along with the server's.
  const setCookies = session?.renewed ? [sessionCookie(session.token, request)] : [];
  const response = await runWithContext({ request, locale, session, setCookies }, async () => {
    // The ssr environment is a separate module graph (no react-server condition), so it's loaded through Vite.
    const ssr = await import.meta.viteRsc.loadModule<typeof import("./entry.ssr")>("ssr", "index");
    return ssr.generateHTML(request, await fetchServer(request));
  });
  return withCookies(response, setCookies);
}

// Copies the response so its headers are mutable (redirect responses' aren't).
const withCookies = (response: Response, cookies: string[]): Response => {
  if (cookies.length === 0) return response;
  const copy = new Response(response.body, response);
  cookies.forEach((cookie) => copy.headers.append("Set-Cookie", cookie));
  return copy;
};

// Exported for server.ts: /api/* and the OAuth discovery documents (TICKET-MCP-01). They bypass React Router and
// never see the session cookie: their only credential is a Bearer token.
export const api = (incoming: Request): Promise<Response> | Response =>
  declaresTooLarge(incoming) ? new Response(null, { status: 413 }) : apiHandler(limitBody(incoming));

// Exported for server.ts: opens and migrates the DB before it listens, so a failing migration aborts startup.
export const initDb = (): void => {
  db();
  const now = Math.floor(Date.now() / 1000);
  deleteExpiredSessions(now);
  deleteExpiredOAuth(now);
};

// Exported for server.ts so /healthz checks the same DB connection the app uses, inside this bundle.
export const healthz = (): boolean => {
  try {
    db().prepare("select 1").get();
    return true;
  } catch {
    return false;
  }
};
