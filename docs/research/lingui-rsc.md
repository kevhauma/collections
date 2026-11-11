# Research: Lingui with RSC on Vite (React Router + plugin-rsc)

As of 2026-11-11. Issues were searched, but nothing was built or run.

## 1. Version and RSC APIs

- Latest: **6.12.0, 2026-11-03**. Releases every week or two.
- `@lingui/react/server` exports `setI18n(i18n)` / `getI18n()`.
- Under the `react-server` condition, `@lingui/react` resolves to `index-rsc.mjs`, where `Trans` and `useLingui` read
  from a `React.cache` slot (verified in the npm tarball).
- `initLingui` is **not** a library API, only a helper in the example app.
- RSC support is not labelled experimental, but the only tutorial targets the Next.js App Router.
- **Known gap**: `setI18n` doesn't work in Server Functions, because `React.cache` has no request scope there
  (issue #2615, open). Maintainer workaround: `i18n._(msg\`…\`)` on an explicit instance.

## 2. Compiling macros under Vite

- Recommended: `lingui({ macroTransform: true })` in `@lingui/vite-plugin`. A native Rust/SWC transform with no
  Babel and no SWC plugin needed. Works next to `plugin-react` or `plugin-react-swc`, and on Vite 8 / Rolldown.
- The Babel route (`@rolldown/plugin-babel`) is now the legacy path.
- **Nothing documents RSC or multi-environment Vite builds.** No incompatibility with `@vitejs/plugin-rsc` was found.
- Related trap: React Router's own Vite plugin conflicts with adding `plugin-react` on top (React Router issue #12870).

## 3. Per-request setup for RSC without Next.js

- The library itself relies on `React.cache`: call `setI18n` in the root server component on every request.
- Our inference, not documented: resolve the locale in Express (cookie → `Accept-Language`) and pass it in through
  AsyncLocalStorage or the request context. Outside the render's cache scope (loaders, actions), use an `i18n`
  instance directly.
- Client components need their own `I18nProvider` fed with locale + messages from the server.

## 4. Message ids and catalog formats

- Generated ids are the first 6 characters of a base64url SHA-256 of message + context. Explicit ids look like
  `index.header.title`.
- Formats: PO (default), JSON (`minimal` or `lingui` style), CSV, PO-gettext, custom.
- **Easiest to migrate away from: explicit ids + minimal JSON**, a flat `{id: translation}` map that maps straight
  onto i18next or TypeScript dictionaries. Caveat: messages stay in ICU syntax. i18next uses its own syntax unless
  you add its ICU plugin.

## 5. Without macros

- Supported: `<Trans id="x" message="…"/>`, and `i18n._` / `i18n.t` calls that the extractor picks up by name.
- What you lose: inline ICU plural/select written as JSX, automatic ids, stripping source text from production
  builds, and the ergonomic `t` macro. The docs call this "not common" and recommend macros.

## Conclusion

Lingui fits the stack with explicit ids and minimal JSON. The spike ([TICKET-PLAT-01](../platform/tickets/TICKET-PLAT-01-stack-spike.md)) must prove the
`react-server` resolution and `setI18n` under plugin-rsc, and the action workaround.
→ [ADR 0002](../adr/0002-lingui-explicit-ids.md)

## Not checked

The experimental "runtime macro" docs.

## Sources

- https://github.com/lingui/js-lingui/releases/tag/v6.12.0
- https://lingui.dev/tutorials/react-rsc
- https://github.com/lingui/js-lingui/issues/2615
- https://lingui.dev/ref/vite-plugin
- https://github.com/remix-run/react-router/issues/12870
- https://lingui.dev/guides/explicit-vs-generated-ids
- https://github.com/lingui/js-lingui/blob/main/packages/message-utils/src/generateMessageId.ts
- https://lingui.dev/ref/catalog-formats
- https://github.com/lingui/js-lingui/blob/main/website/docs/ref/react.md
- https://lingui.dev/guides/message-extraction
