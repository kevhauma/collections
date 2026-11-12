# Spike results: RSC + React Router + Lingui stack (TICKET-PLAT-01)

As of 2026-11-12. Built and run on Windows 11 (Node 22.18.0, npm 10.9.3) and in Docker `node:lts-slim`
(Node 26.13.1, npm 11). The spike code lived in `spike/` and was deleted after this was written.
Ticket: [TICKET-PLAT-01](../platform/tickets/TICKET-PLAT-01-stack-spike.md).

## Verdict: go on every layer

| Layer | Verdict | Note |
|---|---|---|
| React Router v8 RSC data mode on `@vitejs/plugin-rsc`, Express | **Go** | Dev and prod build both work. One production trap: `NODE_ENV` (below). |
| `better-sqlite3` | **Go** | Prebuilds ship inside the npm tarball. Docker needs `npm ci --ignore-scripts`. |
| `'use server'` form actions without JS | **Go** | `decodeAction` / `decodeFormState` path works, page revalidates. |
| Lingui 6 under plugin-rsc | **Go** | ADR 0002 stands. No fallback to hand-rolled dictionaries needed. |
| Tailwind v4 | **Go** | Server and client components. |
| "No client JS" on public pages | **Go**, with a design rule | Skip the bootstrap script per route; keep client providers out of the public layout. |
| Native `<dialog>` without JS | **Go** | Invoker commands, no fallback needed. |
| `sharp` + `better-sqlite3` in `node:lts-slim` | **Go** | Loaded and built inside the image. |

## Versions to pin (exact)

All of these were installed with `npm i -E` and verified together:

```json
"react": "19.3.1",
"react-dom": "19.3.1",
"react-router": "8.5.1",
"@vitejs/plugin-rsc": "0.5.39",
"@vitejs/plugin-react": "6.3.0",
"vite": "8.3.8",
"express": "5.3.0",
"@remix-run/node-fetch-server": "1.0.0",
"better-sqlite3": "13.1.1",
"sharp": "0.35.5",
"@lingui/core": "6.12.0",
"@lingui/react": "6.12.0",
"@lingui/conf": "6.12.0",
"@lingui/vite-plugin": "6.12.0",
"@lingui/format-json": "6.12.0",
"tailwindcss": "4.3.5",
"@tailwindcss/vite": "4.3.5",
"typescript": "7.0.2",
"@types/react": "19.3.0",
"@types/react-dom": "19.3.0"
```

- `react-server-dom-webpack` is **not** a separate dependency: plugin-rsc vendors it. Pinning plugin-rsc pins it.
- Docker base: `node:lts-slim` was Node **26.13.1** on 2026-11-12. Pin the major in the Dockerfile (`node:26-slim`).

## Findings per criterion

### 1. React Router RSC data mode, served by Express (dev and prod)

Works in `npm run dev` (Vite in middleware mode inside Express) and after `vite build` + `node server.ts prod`. The
three entries are the ones from the React Router docs, unchanged except where noted below.

- **Production trap: `NODE_ENV=production` must be set at runtime.** Without it the server-side React bundles run in
  development mode. They stream dev-only debug rows (`$E…`, `D{"time":…}`) that the production client bundle can't
  decode. `createFromReadableStream(getRSCStream())` then never resolves and **the page silently never hydrates**,
  with no console error. No-JS forms keep working, which hides the problem. Set it in the Dockerfile (`ENV`), and
  set it in `server.ts` before the build output is imported.
- Dev server with Express: plugin-rsc option `serverHandler: false`, then `vite.environments.rsc.runner.import(...)`.
  `vite.environments.rsc` is typed as `DevEnvironment`, so narrow it with `isRunnableDevEnvironment` (snippet below).
- React Router issue #12870 (its Vite plugin conflicting with `plugin-react`) does **not** apply. Data mode doesn't use
  React Router's Vite plugin, and `plugin-react` + `plugin-rsc` work together.
- Module state in the rsc environment is reset on HMR (the spike's in-memory DB reset on edit). With an on-disk
  SQLite file this doesn't matter.

### 2. Server component reads from `better-sqlite3`

Works: a synchronous `db.prepare(...).get()` inside a server component.

### 3. `'use server'` action on `<form action>`, with and without JS

- **Without JS** (a POST with only the hidden `$ACTION_*` fields, and a real Chrome with script execution disabled):
  the action runs, `useActionState` returns its value into the HTML, and the page re-renders with the new DB value.
- **With JS**: same action, no full page reload (verified with a window marker), and the page revalidates.
- The progressive-enhancement shape is `useActionState(action, initial)` in a client component, bound to
  `<form action={formAction}>`. React renders the hidden `$ACTION_REF` / `$ACTION_KEY` fields for the no-JS path.

### 4. `File` from a multipart form, and body size limits

- `formData.get("file")` in the action is a real `File` (name, size, type), both with and without JS.
- **Where the body is parsed**: inside `matchRSCServerRequest` → `decodeAction` / `decodeReply`, which call
  `request.formData()` on the Fetch `Request` that `@remix-run/node-fetch-server` builds from the Node request. Our
  code never parses it, so the only place to enforce a limit before buffering is **in `entry.rsc` before
  `matchRSCServerRequest`** (or in Express or the proxy, before that).
- **What worked**:
  1. Reject on `Content-Length` > limit with 413 before touching the body. Browsers always send `Content-Length` for
     form posts.
  2. For chunked bodies, wrap `request.body` in a counting `TransformStream` that errors past the limit. The error
     surfaces as a **500** from `request.formData()`. Real code should catch it and map it to 413.
- **What happens past the limit**: the 413 is sent while the client is still uploading. Node then resets the socket,
  so `fetch` sees `ECONNRESET` / "fetch failed" instead of the 413, and a reused keep-alive socket breaks on the
  next request. Adding `Connection: close` doesn't help. Conclusion: **set the hard limit in the reverse proxy**
  (`client_max_body_size` or equivalent) slightly above the app limit, and keep the app check as defence in depth.
  The image ticket (ITM-04) should also check `file.size` per file inside the action, for a friendly error message
  below the hard cap.

### 5. Reading cookies and headers inside an action

**Both work**, on the no-JS and the JS path:

- **AsyncLocalStorage** set in `entry.rsc` around `matchRSCServerRequest` and SSR (`requestStore.run({ request, locale }, …)`).
- **`unstable_getRequest()`** from `react-router` returns the incoming `Request` inside actions.

Recommendation: use **our own AsyncLocalStorage context** (`src/context.ts`), as the conventions already plan. It
carries typed, already-resolved values (locale, session), and `unstable_getRequest` is an `unstable_` API.

### 6. Client component hydration and `useOptimistic`

Works in dev and prod. Clicking the button shows the optimistic `+1` and `(pending)` at once, then settles to the
server value about 500 ms later. React props are attached to the DOM node (hydrated).

### 7. Lingui

All parts work, in all three environments, dev and prod:

- `@lingui/vite-plugin` with `macroTransform: true` compiles macros (`@lingui/react/macro`, `@lingui/core/macro`) in the
  rsc, ssr and browser environments.
- Catalogs are imported compiled through the plugin: `import { messages } from "./locales/nl.json?lingui"`. No
  separate `lingui compile` step.
- `<Trans id="home.title">…</Trans>` renders in a server component after `setI18n(i18n)` (from `@lingui/react/server`)
  in the root server component.
- A client component renders `<Trans id>` under `I18nProvider`. The provider is a small `'use client'` wrapper that
  gets `locale` + `messages` as props from the root server component.
- Actions translate with an explicit instance: `makeI18n(ctx().locale)._(msg({ id, message: `…${count}` }))`.
  Note: `i18n._(descriptor, values)` is a **type error** in 6.12. Put the values in the `msg` template instead.
- `lingui extract` with explicit ids and `formatter({ style: "minimal" })` produces flat `{id: message}` JSON and
  keeps existing translations.
- **Node engine gotcha**: Lingui 6.12 packages require **Node ≥ 22.19.0**. On Node 22.18 a clean `npm i` silently
  skips the optional native binary (`@lingui/native-tools-<platform>`) because its engine doesn't match. The dev
  server then fails with "Cannot find native binding". (Corrected in TICKET-PLAT-02: the spike first blamed
  npm/cli#4828.) Fix: run Node ≥ 22.19. The project pins `engines.node` to `>=26` to match Docker.
- The full catalog for the locale is serialized into the RSC payload as the client provider's props (about 1 KB per
  20 messages). That's fine for this app's size.

### 8. Tailwind v4

Classes apply in a server component (`text-red-700` on the `h1`) and in a client component (`bg-green-100`),
checked with `getComputedStyle` in dev and prod. plugin-rsc injects the CSS imported by a server component as a
`<link rel="stylesheet" data-precedence>`. No `loadCss()` call was needed.

### 9. JS shipped for a page with no client components

Measured on the production build:

| Page | External JS | Notes |
|---|---|---|
| Page under a root layout with a client provider (`LinguiClientProvider`) | 4 chunks | The provider makes it a page *with* client components. |
| `/bare`: own `<html>` shell, zero client components | 1 chunk, `index-*.js`: **346 KB raw / 107 KB gzip** | The React + React Router client runtime still loads and hydrates. |
| `/bare` with the bootstrap script skipped | **0** | About 1.6 KB of inert inline `__FLIGHT_DATA` scripts remain. |

- **Yes, a route can skip hydration**: in `entry.ssr`, pass `bootstrapScriptContent: undefined` to
  `renderToReadableStream` for that request. With no bootstrap there are no modulepreloads and no external scripts,
  and the page is plain HTML + CSS. The spike keyed this off a query param. The real app should key it off the
  matched route (for example a `handle: { hydrate: false }` on the public routes, or a path check), decided in
  `entry.ssr`.
- **Design rule for TICKET-PUB-02**: public routes must not sit under a layout that renders client components (such as
  the Lingui `I18nProvider` wrapper). Give public routes their own server-only layout, and translate them with
  `setI18n` + `<Trans>` in server components only.
- The inline RSC payload scripts remain even without the bootstrap. They are inert without the runtime. Removing them
  was not explored (React Router injects them in `routeRSCServerRequest`).

### 10. Native `<dialog>` without JS (invoker commands)

- **Chrome 157** (headless, script execution disabled, real mouse click): `<button commandfor="dlg"
  command="show-modal">` opens the dialog, and `command="close"` closes it.
- **Firefox**: the installed Firefox is 82 (2020), too old to tell anything. MDN browser-compat-data 8.1.9
  (2026-11-12) lists `HTMLButtonElement.command` / `commandForElement` / `CommandEvent` in **Firefox 144+**.
- **Safari**: out of scope by decision (2026-11-12). For the record, BCD lists Safari 26.2+.
- **No client fallback is needed.** The React 19.3 types don't know `commandfor` / `command` yet, so the real
  `src/ui` dialog needs a small JSX module augmentation for those two attributes.

### 11. `sharp` and `better-sqlite3` in Docker `node:*-slim`

Verified in `node:lts-slim` (Node 26.13.1): `sharp` (libvips 8.18.7), `better-sqlite3` (SQLite 3.54.1) and
`@lingui/native-tools` all load. `vite build` runs inside the image, and the container serves the app with all the
probes above passing (no-JS form, JS form, optimistic, upload, dialog, Tailwind, NL locale).

- **`npm ci` fails in the image unless you pass `--ignore-scripts`.** better-sqlite3 13 ships its prebuilt binaries
  for every platform inside the npm tarball and sets `"gypfile": false`, but npm 11 (in the image) still runs
  `node-gyp rebuild`, which needs python and a compiler. npm 10 on Windows didn't. `--ignore-scripts` is safe for this
  dependency set: sharp and the Lingui native tools come in as platform optional dependencies, not install scripts.
  The same failure happened on `node:24-slim`, so it's npm's behaviour, not the Node version.
- The single-stage spike image was 580 MB with dev dependencies. PLAT-04 should use a multi-stage build.

## Snippets worth keeping

`vite.config.ts`:

```ts
export default defineConfig({
  plugins: [
    lingui({ macroTransform: true }),
    tailwindcss(),
    react(),
    rsc({
      entries: { client: "src/entry.browser.tsx", rsc: "src/entry.rsc.tsx", ssr: "src/entry.ssr.tsx" },
      serverHandler: false, // Express owns the request, see server.ts
    }),
  ],
});
```

`server.ts` (dev and prod in one file):

```ts
const app = express();
const prod = process.argv.includes("prod");

if (prod) {
  // Before the server bundles load: dev-mode React streams debug rows a prod client can't decode (hangs hydration).
  process.env.NODE_ENV = "production";
  app.use("/assets", express.static("dist/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(express.static("dist/client"));
  const { default: handler } = await import("./dist/rsc/index.js");
  app.use(createRequestListener(handler));
} else {
  const { createServer, isRunnableDevEnvironment } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const rscEnv = vite.environments.rsc;
  if (!isRunnableDevEnvironment(rscEnv)) throw new Error("rsc environment is not runnable");
  app.use(vite.middlewares);
  app.use(createRequestListener(async (request) => (await rscEnv.runner.import("/src/entry.rsc.tsx")).default(request)));
}
```

`entry.rsc.tsx` (request context + size cap around the React Router match):

```tsx
export default async function handler(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return new Response("Payload Too Large", { status: 413 });
  const limited = request.body
    ? new Request(request, { body: capStream(request.body, MAX_BODY), duplex: "half" } as RequestInit)
    : request;
  const locale = resolveLocale(request); // cookie → Accept-Language → settings default
  return requestStore.run({ request: limited, locale }, async () => {
    const ssr = await import.meta.viteRsc.loadModule<typeof import("./entry.ssr")>("ssr", "index");
    return ssr.generateHTML(limited, await fetchServer(limited)); // fetchServer = matchRSCServerRequest({...}) as in the RR docs
  });
}
```

`entry.ssr.tsx`, skipping hydration for a request:

```tsx
async renderHTML(getPayload, options) {
  const payload = await getPayload();
  const formState = payload.type === "render" ? await payload.formState : undefined;
  const bootstrapScriptContent = hydrate(request) ? await import.meta.viteRsc.loadBootstrapScriptContent("index") : undefined;
  return renderHTMLToReadableStream(<RSCStaticRouter getPayload={getPayload} />, { ...options, bootstrapScriptContent, formState, signal: request.signal });
}
```

Lingui (`lingui.config.ts`, `src/i18n`, root, client provider, action):

```ts
// lingui.config.ts
export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "nl"],
  catalogs: [{ path: "<rootDir>/src/i18n/locales/{locale}", include: ["src"] }],
  format: formatter({ style: "minimal" }),
});

// src/i18n: compiled catalogs via the vite plugin
import { messages as en } from "./locales/en.json?lingui";
import { messages as nl } from "./locales/nl.json?lingui";
export const catalogs = { en, nl };
export const makeI18n = (locale: "en" | "nl") => setupI18n({ locale, messages: { [locale]: catalogs[locale] } });

// root server component
setI18n(makeI18n(locale)); // from "@lingui/react/server"
… <LinguiClientProvider locale={locale} messages={catalogs[locale]}>{children}</LinguiClientProvider>

// 'use client' provider
const [i18n] = useState(() => setupI18n({ locale, messages: { [locale]: messages } }));
return <I18nProvider i18n={i18n}>{children}</I18nProvider>;

// in a 'use server' action
const count = getCount();
return makeI18n(ctx().locale)._(msg({ id: "action.saved", message: `Saved! Count is now ${count}` }));
```

Dockerfile core:

```dockerfile
FROM node:26-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts   # better-sqlite3 ships prebuilds; npm 11 would otherwise run node-gyp
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "server.ts", "prod"]
```

## How it was verified

No browser automation dependency was added. Throwaway Node scripts were used instead:

- A **no-JS form client**: GET the page, re-post a form's hidden `$ACTION_*` fields as multipart, and read the
  re-rendered HTML.
- **Chrome over raw CDP** (Node 22's built-in `WebSocket`): real mouse clicks, `Emulation.setScriptExecutionDisabled`
  for the no-JS checks, and network events for script counting.
- The same probes ran against dev, the prod build on Windows, and the Docker container.

## Not checked

- Real Firefox 144+ (installed version too old) and Safari (out of scope).
- Removing the inert inline RSC payload from pages without hydration.
- Memory use of `request.formData()` for multi-file uploads near the limit.
