# 0006: An MCP server with its own OAuth for AI agents

Status: accepted (2026-11-13)

## Context

The owner wants to add and edit items by asking an AI agent (Claude Code, a claude.ai connector, any MCP client)
instead of filling in forms. Until now the only way in was the browser: one admin, a password, a session cookie
([TICKET-AUTH-02](../auth/tickets/TICKET-AUTH-02-login-and-sessions.md)). Agents can't hold a cookie session, and the
cookie must never become an API credential.

## Decision

- **MCP over Streamable HTTP**, stateless, at `/api/mcp`, built on the official TypeScript SDK v2
  (`@modelcontextprotocol/server`, exact pin). v2 is upstream's stable line; v1 (`@modelcontextprotocol/sdk`) only
  gets fixes. `createMcpHandler(…, { responseMode: "json" })`: 2026-07-28 clients get JSON responses, 2025-era clients
  (Claude Code today) the SDK's stateless legacy serving, which answers with one SSE message per request.
- **Spec revision: MCP 2026-07-28**, authorization as specified there: OAuth 2.1 with PKCE (`S256` only), Protected
  Resource Metadata (RFC 9728, path-aware at `/.well-known/oauth-protected-resource/api/mcp`), Authorization Server
  Metadata (RFC 8414), resource indicators (RFC 8707: codes and tokens are bound to `<origin>/api/mcp`), and the `iss`
  authorization response parameter (RFC 9207).
- **This app is its own authorization server.** Clients register with **Client ID Metadata Documents** (the spec's
  preferred way; Claude Code uses `https://claude.ai/oauth/claude-code-client-metadata`) or **Dynamic Client
  Registration** (RFC 7591, deprecated in the spec, kept for clients without CIMD). All clients are public
  (`token_endpoint_auth_method: none`).
- **Consent** at `/admin/authorize` behind the admin session; Revoke under Settings › Connected apps.
- **Tokens** are 32 random bytes, opaque; the DB keeps only their SHA-256, like sessions. Lifetimes: code **60 s**,
  access token **1 hour**, refresh token **30 days** with rotation; presenting an already rotated refresh token
  revokes all of that client's tokens.
- **Redirect URIs** match exactly as registered, except that a plain-http loopback URI (`localhost`, `127.0.0.1`,
  `[::1]`) may use any port (RFC 8252 § 7.3): native clients listen on a free port per run, and Claude Code's
  metadata document lists `http://localhost/callback` without one. Only https and loopback http may be registered.
- `/api/*` and `/.well-known/oauth-*` skip the cookie-based cross-origin write check, never read the session cookie,
  and refuse a foreign browser `Origin` on `/api/mcp` (DNS rebinding). A Bearer token never authorizes an `/admin` page.
- **Tools reuse the UI's repositories and parsers** (`src/features/mcp/tools.ts`), so an agent's input gets the
  item and field forms' validation and their English messages.

## Consequences

- Everything an agent can do, it does as the owner: private fields included. Destructive scope is kept small on
  purpose (one `delete_item`); deleting fields or collections, type changes and option removal are each a later ticket.
- No scopes: one token grants all tools. Fine for one owner; scopes come with the first tool that needs less.
- Rate limits are global and in memory (token endpoint 10 failures/min, registration 20/min), like the login limiter.
- Metadata documents are fetched on every authorization request (5 s, 10 kB, no redirects), without HTTP caching.
- The export zip ([TICKET-BAK-01](../backup/tickets/TICKET-BAK-01-export-zip.md)) stays the undo for an agent's
  mistakes; there is no per-call audit log yet.
