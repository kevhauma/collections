# TICKET-MCP-01: MCP server for admin edits by an AI agent

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** [technical-design.md § Scope](../../technical-design.md#scope) (new: one owner, now also through an agent), [technical-design.md § Auth and security](../../technical-design.md#auth-and-security)

## User story

As the admin, I want to connect an AI agent (Claude Code, claude.ai, or any MCP client) to my instance, so I can add
and edit items and fields by asking in plain language instead of filling in forms one by one.

## Description

A remote MCP server at `/api/mcp` (Streamable HTTP) whose tools do what the admin can do in the UI, through the same
repositories and validation. Agents sign in with OAuth 2.1 as the MCP authorization spec describes: the admin approves
each client once on a consent page and can revoke it later.

## Current situation (as-is)

- The only way in is the browser: one admin, password login, a session cookie
  ([src/features/auth/](../../../src/features/auth/), [src/db/sessions.ts](../../../src/db/sessions.ts)).
- Every write is a React Router server action in a route module (e.g.
  [src/routes/admin-item.tsx](../../../src/routes/admin-item.tsx),
  [src/routes/admin-collection-fields.tsx](../../../src/routes/admin-collection-fields.tsx)), guarded by
  `requireAdmin()` and validated with zod ([src/features/items/schema.ts](../../../src/features/items/schema.ts),
  [src/features/collections/field-schema.ts](../../../src/features/collections/field-schema.ts)). The SQL lives in
  [src/db/items.ts](../../../src/db/items.ts), [src/db/fields.ts](../../../src/db/fields.ts) and
  [src/db/collections.ts](../../../src/db/collections.ts).
- [src/server.ts](../../../src/server.ts) is Express in front of the RSC handler. Its first middleware refuses every
  cross-origin write (`isCrossOriginWrite`), which would also refuse an MCP client's POST.
- `api` is already a reserved slug ([src/features/collections/slug.ts](../../../src/features/collections/slug.ts)), so
  `/api/...` can't clash with a collection.
- No MCP or OAuth code or dependency exists.

## Desired result (to-be)

### Transport

- `POST /api/mcp` (Streamable HTTP, stateless, JSON responses) mounted in `server.ts` before the RSC handler, using
  the official TypeScript MCP SDK ~~(`@modelcontextprotocol/sdk`, exact pin, vetted with the dependency-vetting skill)~~
  **v2, `@modelcontextprotocol/server@2.4.0`** (exact pin, vetted: upstream README names it the stable line, v1
  `@modelcontextprotocol/sdk` is fixes-only; `npm audit signatures` verified). JSON responses for 2026-07-28 clients;
  2025-era clients (Claude Code today) get the SDK's stateless legacy serving, one SSE message per request.
- `/api/mcp` and the OAuth endpoints are exempt from the cross-origin check; they never read the session cookie, only
  `Authorization: Bearer`. A browser `Origin` header that isn't the app's own is refused (DNS rebinding guard).

### Authorization (OAuth 2.1, MCP authorization spec)

- `GET /.well-known/oauth-protected-resource`**`/api/mcp`** (RFC 9728, path-aware as the SDK serves it and the 401
  challenge points to) names this server as its own authorization server.
- `GET /.well-known/oauth-authorization-server` (RFC 8414) lists the endpoints below, `S256` only.
- Client registration: Client ID Metadata Documents and Dynamic Client Registration (`POST /api/oauth/register`,
  RFC 7591), so both Claude Code and claude.ai connectors can connect. The exact spec revision is recorded in an ADR.
- `GET /admin/authorize`: the consent page. It requires the admin session (login redirects back here), shows the
  client name, its redirect URI and "can read and edit all your collections", and has Approve / Deny.
- `POST /api/oauth/token`: authorization code with PKCE (`S256` required), and refresh token with rotation. Rate
  limited with `createRateLimiter`.
- Redirect URIs match exactly, as registered, **except the port of a plain-http loopback URI (RFC 8252 § 7.3):
  Claude Code's metadata document lists `http://localhost/callback` and listens on a free port per run.** Only https
  and loopback http may be registered. The `resource` parameter (RFC 8707) must be this server's `/api/mcp`
  URL; tokens are bound to it.
- Tokens are random and opaque; the DB stores only their SHA-256 hash, like sessions. Access tokens live 1 hour,
  refresh tokens 30 days. A missing, expired or revoked token answers 401 with `WWW-Authenticate` pointing at the
  protected-resource metadata.
- A new numbered migration adds `oauth_clients`, `oauth_codes` and `oauth_tokens`. SQL lives in a new
  `src/db/oauth.ts`.

### Tools

All tools call the existing repository functions and zod schemas: no SQL and no validation of their own. Errors come
back as tool errors with the same messages as the UI (EN).

| Tool | Does |
|---|---|
| `list_collections` | Name, slug, public flag, have/want counts. |
| `get_collection` | Settings and fields (id, label, type, options, required, public). |
| `list_items` | Items of a collection by status, with search, sort and filter like the list URL. |
| `get_item` | One item, values keyed by field label and id. |
| `create_item` / `update_item` | Values by field id, status, quantity or rank. Same validation as the item form. |
| `delete_item` | Deletes one item. |
| `move_want` | Moves a want to a rank. |
| `create_field` / `update_field` | Add a field, or rename it, change required/public, add options. |

- Destructive tools (`delete_item`) carry the MCP `destructiveHint` annotation; read tools carry `readOnlyHint`.
- Left out of this ticket: deleting fields or collections, type changes, option rename/remove, images, export.

### Settings

- A "Connected apps" section in admin Settings: each client with name, when approved and last used, and a Revoke
  button that deletes its tokens at once (and its pending codes, and clears the approval, so the next connect asks
  again).

## UI requirements

- Consent page in the admin shell: client name, redirect host, what it may do, Approve (primary) and Deny. Works
  without JS. EN and NL.
- "Connected apps" list in Settings with Revoke behind a confirm, plus an empty state explaining how to connect
  (the `/api/mcp` URL to paste into a client).

## Acceptance criteria

- [x] Claude Code (`claude mcp add --transport http`) connects to a local instance, goes through login and consent,
      and creates an item that then shows up in the admin UI. (2026-11-13, Claude Code 2.1.322 against `npm run dev` on
      :3123: `claude mcp add --transport http collections-local http://localhost:3123/api/mcp`, `claude mcp login`
      → `/admin/authorize` without a session went to `/admin?next=…`, a wrong password kept `next`, the right one came
      back to the consent page "Connect Claude Code?" (name from its metadata document), Approve → its callback said
      "Authentication successful"; `claude -p` then added a private "Price" field and the item "Blue Train", which the
      admin list showed as "Blue Train · € 25".)
- [ ] A claude.ai custom connector connects to a deployed instance through the same flow. (Open: needs a deployed
      HTTPS instance reachable from claude.ai, not available in this session. Discovery, CIMD and the token flow it
      uses are covered by the tests below and the Claude Code run above.)
- [x] Without a token, with an expired token, with a revoked token, and with a token issued for another `resource`,
      `/api/mcp` answers 401 with the `WWW-Authenticate` header. (`src/features/mcp/api.test.ts` › "/api/mcp" › the four
      "answers 401 …" cases, each asserting the `resource_metadata` challenge; live: `POST /api/mcp` without a token on
      the production build answered `www-authenticate: Bearer error="invalid_token", … resource_metadata=…`.)
- [x] The session cookie alone never authorizes `/api/mcp`; a Bearer token never authorizes an `/admin` page.
      (`api.test.ts` › "never accepts the admin's session cookie instead of a token"; `api.ts` never reads cookies and
      `entry.rsc.tsx` resolves the session from the cookie only. Live: `GET /admin/settings` with
      `Authorization: Bearer …` and no cookie → 302 to `/admin?next=%2Fadmin%2Fsettings`.)
- [x] Token exchange fails for a wrong PKCE verifier, a reused code, a code older than 60 seconds, and a redirect URI
      that differs from the registered one. (`src/features/oauth/oauth.test.ts` › "authorization codes": "are single
      use", "expire after 60 seconds", "refuse a wrong PKCE verifier / another redirect URI / another resource",
      "refuse another client"; `api.test.ts` › "refuses a wrong verifier with invalid_grant"; redirect matching in
      "redirect URIs" › "match exactly …" and "let a loopback redirect use any port, and nothing else"; live: a code
      exchanged after 61 s → `{"error":"invalid_grant"}`, an unregistered redirect URI → error page and POST 400.)
- [x] A refresh token works once; reusing a rotated refresh token revokes the client's tokens. (`oauth.test.ts` ›
      "refresh tokens" › "work once and rotate", "revoke every token of the client when a rotated one is reused";
      `api.test.ts` › "rotates a refresh token once".)
- [x] Revoking a client in Settings makes its next call fail with 401. (`oauth.test.ts` › "stop working when the client
      is revoked …", `api.test.ts` › "answers 401 for a revoked token"; live: Revoke → "Revoke access" in Settings, then
      `claude mcp get collections-local` reported "Needs authentication".)
- [x] `create_item` with an invalid value (e.g. "abc" for a number field) returns a tool error with the UI's message
      and writes nothing; every tool runs through the same functions as the UI (no new SQL outside `src/db/oauth.ts`).
      (`src/features/mcp/tools.test.ts` › "create_item" › "refuses an invalid value with the UI's message and writes
      nothing" → `Price: Enter a number, like 12 or 12,5.`; `api.test.ts` › "returns a refused tool call as a tool
      error" (`isError: true`); live: Claude Code got exactly that message. Tools call `parseItemForm`,
      `translateItemErrors`, `itemView`, `commitImage` and the new shared `addField` / `editField`
      (`src/features/collections/field-changes.ts`, now also used by the fields page); the diff adds SQL only in
      `src/db/oauth.ts` and `migrations/005-oauth.sql`. Found on the way: an absent value key skipped the required
      check, so the tools post every field like the form does.)
- [x] Private fields are visible to the agent (it acts as the admin) and still never reach public routes.
      (`tools.test.ts` › "get_collection" returns private fields, "list_items" includes private values; live on the
      production build: public `/records` showed "Blue Train" and no "Price" or "€25". Public reads are unchanged
      (`publicOnly`).)
- [x] The cross-origin write check still guards every other path. (`src/lib/origin.test.ts` › "isApiPath": only `/api/…`
      and `/.well-known/oauth-…` are exempt, not `/api`, `/apiary`, `/admin/authorize`, `/locale`; live:
      `POST /admin/settings` with `Origin: https://evil.example` → 403 from Express, `POST /api/mcp` with it → 403 from
      the MCP origin guard.)
- [x] Persistence goes through `src/db/`. The consent action and Revoke call `requireAdmin()` and validate with zod.
      (`src/db/oauth.ts`; the `action` of `src/routes/admin-authorize.tsx` and of `src/routes/admin-settings.tsx` starts
      with `requireAdmin()` and parses with zod; live: POST approve without a session → 401.)
- [x] Unit tests cover: PKCE verification, code expiry and single use, refresh rotation and reuse detection, token
      hash lookup and expiry, redirect URI matching, the 401 cases above, and each tool's happy path and one
      validation error on a temp DB. (`src/features/oauth/oauth.test.ts`, `src/features/mcp/api.test.ts`,
      `src/features/mcp/tools.test.ts`, `src/db/migrate.test.ts` › "005-oauth"; vitest now runs the Lingui plugin so
      the tools' translated messages are testable.)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md`; live browser check of the consent page and
      Connected apps at 360 px and desktop. (Orca browser at 1440 px and 360 px, dark device theme: consent page,
      Connected apps with a client, the Revoke dialog and the empty state, all built from `Card`, `Button`, `Dialog` and
      `EmptyState` with drawn outlines. No-JS flow checked as plain form posts: deny → `error=access_denied&state&iss`,
      approve → `code&state&iss`. The Collections nav tab stays highlighted on `/admin/authorize`, as on every
      admin page outside export and settings.)
- [x] An ADR records: MCP over Streamable HTTP, OAuth as the auth, the spec revision, and the token lifetimes.
      ([ADR 0006](../../adr/0006-mcp-with-oauth.md): MCP 2026-07-28, code 60 s, access 1 h, refresh 30 days.)
- [x] `technical-design.md` § Scope, § Routes and § Data model updated. (Also § Auth and security and § Stack.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: verdict pass, 0 dead code, 0 complexity,
      0 duplication, after moving the redirect check into `authorizingClient` and the login return into `afterLogin` to
      clear two CRAP findings. `src/ui/popover.tsx` reported unused is pre-existing.)

## Notes

- Needs TICKET-AUTH-02 (sessions, `requireAdmin`) and TICKET-COL-03 / TICKET-ITM-02 (the actions it reuses), all
  shipped. Independent, can ship any time.
- Large. If it runs long, split along the seam: OAuth (endpoints, consent, Connected apps) first, then the tools.
- Reusing validation may mean moving logic out of route modules into `src/features/`; that move keeps its error
  handling and is part of this ticket.
- Agents make mistakes at speed; the export (TICKET-BAK-01) stays the undo. A per-call audit log is a candidate
  follow-up.
- New tools (fields deletion, type changes, images) are each their own ticket, so every destructive path gets its
  own review.
