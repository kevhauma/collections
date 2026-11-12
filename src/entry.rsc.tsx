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
import { runWithContext } from "./context";
import { db } from "./db/connection";
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

export default function handler(request: Request): Promise<Response> {
  // Everything below, including actions and server components, can read the request via src/context.ts.
  return runWithContext({ request }, async () => {
    // The ssr environment is a separate module graph (no react-server condition), so it's loaded through Vite.
    const ssr = await import.meta.viteRsc.loadModule<typeof import("./entry.ssr")>("ssr", "index");
    return ssr.generateHTML(request, await fetchServer(request));
  });
}

// Exported for server.ts: opens and migrates the DB before it listens, so a failing migration aborts startup.
export const initDb = (): void => {
  db();
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
