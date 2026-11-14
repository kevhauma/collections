import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createCollection, getCollectionBySlug } from "../../db/collections";
import { countItems } from "../../db/items";
import { approveClient, insertTokens, revokeClient } from "../../db/oauth";
import { createSession, hashToken, sessionCookieName } from "../auth/session";
import { createCode } from "../oauth/oauth";
import { api } from "./api";

// The HTTP surface server.ts hands to entry.rsc's `api` (TICKET-MCP-01): discovery, registration, tokens, /api/mcp.

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-mcp-api-"));
});

const origin = "http://localhost:3000";
const resource = `${origin}/api/mcp`;
const redirectUri = "http://localhost:4567/callback";
// The challenge is base64url(SHA-256(verifier)), computed outside this code.
const verifier = "dBjftJeZ4CVP-mJ92K1o1nE3nTCz1cxQb1z_uLhdGKE";
const challenge = "g61Gzn2B1inwJVuep6X5xU2linRQTSi-XagJvBhUGuc";
const nowSeconds = () => Math.floor(Date.now() / 1000);

const request = (path: string, init: RequestInit = {}) => api(new Request(`${origin}${path}`, init));

const register = async () => {
  const response = await request("/api/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Claude Code", redirect_uris: [redirectUri], token_endpoint_auth_method: "none" }),
  });
  return { response, body: (await response.json()) as { client_id: string } };
};

const tokenRequest = (fields: Record<string, string>) =>
  request("/api/oauth/token", { method: "POST", body: new URLSearchParams(fields) });

// What the consent page does on Approve, then the client's code exchange.
const connect = async () => {
  const { client_id } = (await register()).body;
  approveClient(client_id, nowSeconds());
  const code = createCode({ clientId: client_id, redirectUri, codeChallenge: challenge, resource }, nowSeconds());
  const response = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id,
    code_verifier: verifier,
    resource,
  });
  return { clientId: client_id, response, tokens: (await response.json()) as { access_token: string; refresh_token: string } };
};

const callTool = (token: string, name: string, args: unknown, headers: Record<string, string> = {}) =>
  request("/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
  });

type ToolResult = { content: Array<{ text: string }>; isError?: boolean };

// A 2025-era client gets the result as one SSE message.
const resultOf = async (response: Response): Promise<ToolResult> => {
  const data = /^data: (.*)$/m.exec(await response.text())?.[1] ?? "{}";
  return (JSON.parse(data) as { result: ToolResult }).result;
};

const expectChallenge = (response: Response) => {
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toContain(
    `resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`,
  );
};

describe("discovery", () => {
  it("names this server as the authorization server of /api/mcp (RFC 9728)", async () => {
    const response = await request("/.well-known/oauth-protected-resource/api/mcp");
    expect(await response.json()).toMatchObject({ resource, authorization_servers: [origin] });
  });

  it("lists the endpoints, S256 only, and both ways to register (RFC 8414)", async () => {
    const response = await request("/.well-known/oauth-authorization-server");
    expect(await response.json()).toMatchObject({
      issuer: origin,
      authorization_endpoint: `${origin}/admin/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
    });
  });
});

describe("registration", () => {
  it("registers a public client", async () => {
    const { response, body } = await register();
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ client_name: "Claude Code", redirect_uris: [redirectUri], token_endpoint_auth_method: "none" });
  });

  it("refuses a redirect URI that isn't https or loopback", async () => {
    const response = await request("/api/oauth/register", {
      method: "POST",
      body: JSON.stringify({ client_name: "Evil", redirect_uris: ["http://evil.example/cb"] }),
    });
    expect(response.status).toBe(400);
  });
});

describe("token endpoint", () => {
  it("exchanges a code for tokens that are never cached", async () => {
    const { response, tokens } = await connect();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(tokens).toMatchObject({ token_type: "Bearer", expires_in: 3600 });
  });

  it("refuses a wrong verifier with invalid_grant", async () => {
    const { client_id } = (await register()).body;
    const code = createCode({ clientId: client_id, redirectUri, codeChallenge: challenge, resource }, nowSeconds());
    const response = await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id,
      code_verifier: "x".repeat(43),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_grant" });
  });

  it("rotates a refresh token once", async () => {
    const { clientId, tokens } = await connect();
    const refresh = () => tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId });
    expect((await refresh()).status).toBe(200);
    expect((await refresh()).status).toBe(400);
  });
});

describe("/api/mcp", () => {
  it("runs a tool for a valid token", async () => {
    createCollection("Records", "records", "Title");
    const { id, titleFieldId } = getCollectionBySlug("records")!;
    const { tokens } = await connect();
    const result = await resultOf(
      await callTool(tokens.access_token, "create_item", { collection: "records", values: { [titleFieldId]: "Blue Train" } }),
    );
    expect(result.isError).toBeUndefined();
    expect(countItems(id).have).toBe(1);
  });

  it("returns a refused tool call as a tool error and writes nothing", async () => {
    const { id } = getCollectionBySlug("records")!;
    const { tokens } = await connect();
    const result = await resultOf(await callTool(tokens.access_token, "create_item", { collection: "records", values: {} }));
    expect(result).toMatchObject({ isError: true, content: [{ text: "Title: Fill this in." }] });
    expect(countItems(id).have).toBe(1);
  });

  it("answers 401 with the challenge without a token", async () => {
    expectChallenge(await callTool("", "list_collections", {}, { authorization: "" }));
  });

  it("answers 401 for an expired token", async () => {
    const { clientId } = await connect();
    insertTokens(clientId, resource, [{ hash: hashToken("expired"), kind: "access", expiresAt: nowSeconds() - 1 }]);
    expectChallenge(await callTool("expired", "list_collections", {}));
  });

  it("answers 401 for a revoked token", async () => {
    const { clientId, tokens } = await connect();
    revokeClient(clientId);
    expectChallenge(await callTool(tokens.access_token, "list_collections", {}));
  });

  it("answers 401 for a token issued for another resource", async () => {
    const { clientId } = await connect();
    insertTokens(clientId, "https://other.example.org/api/mcp", [
      { hash: hashToken("foreign"), kind: "access", expiresAt: nowSeconds() + 60 },
    ]);
    expectChallenge(await callTool("foreign", "list_collections", {}));
  });

  it("never accepts the admin's session cookie instead of a token", async () => {
    const cookie = `${sessionCookieName}=${createSession()}`;
    expectChallenge(await callTool("", "list_collections", {}, { authorization: "", cookie }));
  });

  it("refuses a browser page from another site, even with a token (DNS rebinding)", async () => {
    const { tokens } = await connect();
    const response = await callTool(tokens.access_token, "list_collections", {}, { origin: "https://evil.example" });
    expect(response.status).toBe(403);
  });
});
