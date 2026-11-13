import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db/connection";
import { getClient, listApprovedClients, approveClient, revokeClient, saveClient } from "../../db/oauth";
import { hashToken } from "../auth/session";
import {
  authorizingClient,
  createCode,
  exchangeCode,
  isAllowedRedirectUri,
  isMetadataUrl,
  lifetimes,
  pkceMatches,
  redirectUriMatches,
  refreshTokens,
  resolveClient,
  sameResource,
  verifyAccessToken,
} from "./oauth";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "collections-oauth-"));
});

const now = 1_800_000_000;
const resource = "https://collections.example.org/api/mcp";
const redirectUri = "http://localhost:4567/callback";
// The challenge is base64url(SHA-256(verifier)), computed outside this code.
const verifier = "dBjftJeZ4CVP-mJ92K1o1nE3nTCz1cxQb1z_uLhdGKE";
const challenge = "g61Gzn2B1inwJVuep6X5xU2linRQTSi-XagJvBhUGuc";

let clients = 0;
const newClient = () => {
  const id = `client-${++clients}`;
  saveClient({ id, name: "Agent", redirectUris: [redirectUri] });
  approveClient(id, now);
  return id;
};

const codeFor = (clientId: string, at = now) =>
  createCode({ clientId, redirectUri, codeChallenge: challenge, resource }, at);

const exchange = (clientId: string, code: string, overrides: Partial<Parameters<typeof exchangeCode>[0]> = {}, at = now) =>
  exchangeCode({ code, clientId, redirectUri, codeVerifier: verifier, resource, ...overrides }, at);

describe("PKCE", () => {
  it("accepts the verifier of the challenge (S256)", () => {
    expect(pkceMatches(verifier, challenge)).toBe(true);
  });

  it("refuses any other verifier", () => {
    expect(pkceMatches(`${verifier.slice(0, -1)}A`, challenge)).toBe(false);
    expect(pkceMatches(challenge, challenge)).toBe(false);
  });
});

describe("redirect URIs", () => {
  it.each([
    ["https://claude.ai/api/mcp/auth_callback", true],
    ["http://localhost:4567/callback", true],
    ["http://127.0.0.1:9000/cb", true],
    ["http://[::1]:9000/cb", true],
    ["http://example.org/callback", false],
    ["https://claude.ai/cb#fragment", false],
    ["javascript:alert(1)", false],
    ["not a url", false],
  ])("%s may be registered: %s", (uri, allowed) => {
    expect(isAllowedRedirectUri(uri)).toBe(allowed);
  });

  it("match exactly, without prefix, path or case leeway", () => {
    const client = { redirectUris: ["https://claude.ai/api/mcp/auth_callback"] };
    expect(redirectUriMatches(client, "https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(redirectUriMatches(client, "https://claude.ai/api/mcp/auth_callback/")).toBe(false);
    expect(redirectUriMatches(client, "https://claude.ai/api/mcp/Auth_callback")).toBe(false);
    expect(redirectUriMatches(client, "https://claude.ai:8443/api/mcp/auth_callback")).toBe(false);
    expect(redirectUriMatches(client, "https://claude.ai.evil.example/api/mcp/auth_callback")).toBe(false);
  });

  it("let a loopback redirect use any port, and nothing else (RFC 8252)", () => {
    const client = { redirectUris: ["http://localhost/callback", "http://127.0.0.1/callback"] };
    expect(redirectUriMatches(client, "http://localhost:44883/callback")).toBe(true);
    expect(redirectUriMatches(client, "http://127.0.0.1:9000/callback")).toBe(true);
    expect(redirectUriMatches(client, "http://localhost:44883/other")).toBe(false);
    expect(redirectUriMatches(client, "http://[::1]:44883/callback")).toBe(false);
    expect(redirectUriMatches({ redirectUris: [redirectUri] }, "http://localhost:4568/callback/")).toBe(false);
  });
});

describe("resource URIs", () => {
  it("compare without a trailing slash and with the host's case folded", () => {
    expect(sameResource(`${resource}/`, resource)).toBe(true);
    expect(sameResource("https://COLLECTIONS.example.org/api/mcp", resource)).toBe(true);
    expect(sameResource("https://other.example.org/api/mcp", resource)).toBe(false);
    expect(sameResource("garbage", "garbage")).toBe(false);
  });
});

describe("authorization codes", () => {
  it("exchange once for an access and a refresh token, stored only as hashes", () => {
    const clientId = newClient();
    const tokens = exchange(clientId, codeFor(clientId));
    expect(tokens).toMatchObject({ token_type: "Bearer", expires_in: 3600 });
    const stored = db().prepare("select token_hash from oauth_tokens").pluck().all();
    expect(stored).toContain(hashToken(tokens!.access_token));
    expect(stored).not.toContain(tokens!.access_token);
  });

  it("are single use", () => {
    const clientId = newClient();
    const code = codeFor(clientId);
    expect(exchange(clientId, code)).toBeDefined();
    expect(exchange(clientId, code)).toBeUndefined();
  });

  it("expire after 60 seconds", () => {
    const clientId = newClient();
    expect(exchange(clientId, codeFor(clientId), {}, now + lifetimes.code - 1)).toBeDefined();
    expect(exchange(clientId, codeFor(clientId), {}, now + lifetimes.code)).toBeUndefined();
  });

  it.each([
    ["a wrong PKCE verifier", { codeVerifier: "x".repeat(43) }],
    ["another redirect URI than the authorization's", { redirectUri: "http://localhost:4568/callback" }],
    ["another resource", { resource: "https://other.example.org/api/mcp" }],
  ])("refuse %s, and are spent by it", (_, overrides) => {
    const clientId = newClient();
    const code = codeFor(clientId);
    expect(exchange(clientId, code, overrides)).toBeUndefined();
    expect(exchange(clientId, code)).toBeUndefined();
  });

  it("refuse another client", () => {
    const clientId = newClient();
    expect(exchange(newClient(), codeFor(clientId))).toBeUndefined();
  });
});

describe("access tokens", () => {
  it("are found by hash while live, with their client and resource", () => {
    const clientId = newClient();
    const { access_token } = exchange(clientId, codeFor(clientId))!;
    expect(verifyAccessToken(access_token, now + 10)).toEqual({ clientId, resource, expiresAt: now + lifetimes.access });
    expect(getClient(clientId)?.lastUsedAt).toBe(now + 10);
  });

  it("stop working after an hour", () => {
    const clientId = newClient();
    const { access_token } = exchange(clientId, codeFor(clientId))!;
    expect(verifyAccessToken(access_token, now + lifetimes.access - 1)).toBeDefined();
    expect(verifyAccessToken(access_token, now + lifetimes.access)).toBeUndefined();
  });

  it("are never a refresh token or an unknown value", () => {
    const clientId = newClient();
    const { refresh_token } = exchange(clientId, codeFor(clientId))!;
    expect(verifyAccessToken(refresh_token, now)).toBeUndefined();
    expect(verifyAccessToken("unknown", now)).toBeUndefined();
  });

  it("stop working when the client is revoked, and the client leaves the approved list", () => {
    const clientId = newClient();
    const { access_token, refresh_token } = exchange(clientId, codeFor(clientId))!;
    expect(revokeClient(clientId)).toBe(true);
    expect(verifyAccessToken(access_token, now)).toBeUndefined();
    expect(refreshTokens(refresh_token, clientId, now)).toBeUndefined();
    expect(listApprovedClients().map((client) => client.id)).not.toContain(clientId);
    expect(revokeClient(clientId)).toBe(false);
  });
});

describe("refresh tokens", () => {
  it("work once and rotate", () => {
    const clientId = newClient();
    const first = exchange(clientId, codeFor(clientId))!;
    const second = refreshTokens(first.refresh_token, clientId, now + 100)!;
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect(verifyAccessToken(second.access_token, now + 100)).toMatchObject({ clientId, resource });
    expect(refreshTokens(second.refresh_token, clientId, now + 200)).toBeDefined();
  });

  it("revoke every token of the client when a rotated one is reused", () => {
    const clientId = newClient();
    const first = exchange(clientId, codeFor(clientId))!;
    const second = refreshTokens(first.refresh_token, clientId, now)!;
    expect(refreshTokens(first.refresh_token, clientId, now)).toBeUndefined();
    expect(verifyAccessToken(first.access_token, now)).toBeUndefined();
    expect(verifyAccessToken(second.access_token, now)).toBeUndefined();
    expect(refreshTokens(second.refresh_token, clientId, now)).toBeUndefined();
  });

  it("expire after 30 days and belong to their client", () => {
    const clientId = newClient();
    const { refresh_token } = exchange(clientId, codeFor(clientId))!;
    expect(refreshTokens(refresh_token, newClient(), now)).toBeUndefined();
    expect(refreshTokens(refresh_token, clientId, now + lifetimes.refresh)).toBeUndefined();
  });
});

describe("client ID metadata documents", () => {
  const url = "https://agent.example.com/oauth/client.json";
  const document = { client_id: url, client_name: "Agent", redirect_uris: ["https://agent.example.com/callback"] };
  const serving = (body: unknown) => (async () => Response.json(body)) as unknown as typeof fetch;

  it("are recognised by an https client_id with a path", () => {
    expect(isMetadataUrl(url)).toBe(true);
    expect(isMetadataUrl("https://agent.example.com/")).toBe(false);
    expect(isMetadataUrl("http://agent.example.com/client.json")).toBe(false);
    expect(isMetadataUrl("8f8e0a3c-uuid")).toBe(false);
  });

  it("resolve to the document's name and redirect URIs", async () => {
    expect(await resolveClient(url, serving(document))).toEqual({
      id: url,
      name: "Agent",
      redirectUris: ["https://agent.example.com/callback"],
    });
  });

  it.each([
    ["names another client_id", { ...document, client_id: "https://evil.example/client.json" }],
    ["has a plain-http redirect URI", { ...document, redirect_uris: ["http://agent.example.com/callback"] }],
    ["has no redirect URIs", { ...document, redirect_uris: [] }],
  ])("are refused when the document %s", async (_, body) => {
    expect(await resolveClient(url, serving(body))).toBeUndefined();
  });

  it("are refused when the fetch fails", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await resolveClient(url, failing)).toBeUndefined();
  });

  it("authorize only a redirect URI the document lists", async () => {
    expect(await authorizingClient(url, "https://agent.example.com/callback", serving(document))).toMatchObject({ id: url });
    expect(await authorizingClient(url, "https://agent.example.com/other", serving(document))).toBeUndefined();
  });

  it("leave a registered client_id to the database", async () => {
    const clientId = newClient();
    expect(await resolveClient(clientId)).toMatchObject({ id: clientId, redirectUris: [redirectUri] });
    expect(await resolveClient("unregistered")).toBeUndefined();
  });
});
