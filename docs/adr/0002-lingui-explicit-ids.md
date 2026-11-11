# 0002: Lingui with explicit ids and minimal JSON catalogs

Status: accepted (2026-11-11)

## Context

The UI ships in NL and EN. We want to try Lingui but keep a cheap way back to i18next or hand-rolled TypeScript
dictionaries. Research: [research/lingui-rsc.md](../research/lingui-rsc.md).

## Decision

- **Lingui 6**, macros compiled with `@lingui/vite-plugin` and `macroTransform: true` (native, no Babel).
- **Explicit message ids** (`<Trans id="item.add">Add item</Trans>`), not source-text-as-id hashes.
- **Minimal JSON catalogs** (`@lingui/format-json`, `style: "minimal"`): `locales/nl.json` is
  `{ "item.add": "Item toevoegen" }`.
- Locale resolution, catalog loading and per-request setup live in **`src/i18n/`**. Code imports Lingui runtime
  APIs through that module where possible. Macros must be imported from `@lingui/*/macro` directly, which the
  explicit ids compensate for.
- Locale comes from cookie → `Accept-Language` → `settings.default_locale`. No URL prefix.

## Consequences

- Server components: `setI18n` per request in the root server component.
- **Server actions**: `setI18n` does not reach them (`React.cache` has no request scope there, Lingui issue
  #2615). Actions build or look up an `i18n` instance for the request's locale and call `i18n._(…)`.
- Client components: `I18nProvider` fed with locale + messages from the server.
- **Reverting** means converting `<Trans id>` / `t` calls to the new library's call style. The catalogs are already
  flat `{id: message}` maps. One caveat: messages are ICU syntax, so i18next would need its ICU plugin or a
  one-off rewrite of plural messages.
- If the spike ([TICKET-PLAT-01](../platform/tickets/TICKET-PLAT-01-stack-spike.md)) shows Lingui can't work under plugin-rsc, fall back to hand-rolled
  dictionaries with the same ids: typed `en.ts` / `nl.ts`, a `t(id, vars)` helper, `Intl.PluralRules`.
