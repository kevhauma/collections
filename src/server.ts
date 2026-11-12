// HTTP server. Run with plain `node` (native TypeScript type stripping): `node src/server.ts` for dev,
// `node src/server.ts --prod` to serve the `vite build` output.
import express from "express";
import { createRequestListener } from "@remix-run/node-fetch-server";
import { parseTrustProxy } from "./lib/env.ts";

type RscEntry = typeof import("./entry.rsc.tsx");

const prod = process.argv.includes("--prod");
const port = Number(process.env.PORT ?? 3000);

const app = express();
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

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

app.get("/healthz", async (_req, res) => {
  res.sendStatus((await entry()).healthz() ? 200 : 503);
});
app.use(createRequestListener(async (request) => (await entry()).default(request)));

app.listen(port, () => console.log(`Listening on http://localhost:${port} (${prod ? "production" : "development"})`));
