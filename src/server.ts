// HTTP server. Run with plain `node` (native TypeScript type stripping): `node src/server.ts` for dev,
// `node src/server.ts --prod` to serve the `vite build` output.
import express from "express";
import { createRequestListener } from "@remix-run/node-fetch-server";
import { join } from "node:path";
import { dataDir, parseTrustProxy } from "./lib/env.ts";
import { isApiPath, isCrossOriginWrite } from "./lib/origin.ts";

type RscEntry = typeof import("./entry.rsc.tsx");

const prod = process.argv.includes("--prod");
const port = Number(process.env.PORT ?? 3000);

const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
const app = express();
app.set("trust proxy", trustProxy);

// Writes from another site are refused before any app code runs. req.host follows X-Forwarded-Host when the
// proxy is trusted. The API paths answer agents on other hosts and authorize by Bearer token only.
app.use((req, res, next) =>
  !isApiPath(req.path) && isCrossOriginWrite({ method: req.method, origin: req.headers.origin, host: req.host })
    ? res.sendStatus(403)
    : next(),
);

// Admin pages, the OAuth consent page among them, are never shown inside another site's frame (clickjacking).
app.use("/admin", (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  next();
});

// Item images are named by random UUIDs and never change, so browsers may keep them for good.
app.use("/uploads", express.static(join(dataDir(), "uploads"), { immutable: true, maxAge: "1y", index: false }));

const loadEntry = async (): Promise<() => Promise<RscEntry>> => {
  if (prod) {
    // Must be set before the server bundles load: dev-mode React streams debug rows that the production client
    // can't decode, and the page then silently never hydrates (spike-results § 1).
    process.env.NODE_ENV = "production";
    app.use("/assets", express.static("dist/client/assets", { immutable: true, maxAge: "1y" }));
    app.use(express.static("dist/client"));
    // @ts-ignore build output, absent until `npm run build`
    const entry: RscEntry = await import("../dist/rsc/index.js");
    return async () => entry;
  }
  const { createServer, isRunnableDevEnvironment } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const rsc = vite.environments.rsc;
  if (!rsc || !isRunnableDevEnvironment(rsc)) throw new Error("Vite rsc environment is not runnable");
  app.use(vite.middlewares);
  // Imported per request so edits are picked up (HMR) without restarting Express.
  return () => rsc.runner.import<RscEntry>("/src/entry.rsc.tsx");
};

const entry = await loadEntry();
(await entry()).initDb();

app.get("/healthz", async (_req, res) => {
  res.sendStatus((await entry()).healthz() ? 200 : 503);
});
// trustProxy makes request.url carry the scheme and host the browser used (X-Forwarded-Proto / -Host).
const listenerOptions = { trustProxy: trustProxy !== false && trustProxy !== 0 };
// The MCP and OAuth endpoints (TICKET-MCP-01), ahead of React Router.
const api = createRequestListener(async (request) => (await entry()).api(request), listenerOptions);
app.use((req, res, next) => (isApiPath(req.path) ? api(req, res) : next()));
const handler = createRequestListener(async (request) => (await entry()).default(request), listenerOptions);
app.use(handler);

app.listen(port, () => console.log(`Listening on http://localhost:${port} (${prod ? "production" : "development"})`));
