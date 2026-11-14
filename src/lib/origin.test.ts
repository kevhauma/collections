import { describe, expect, it } from "vitest";
import { isApiPath, isCrossOriginWrite } from "./origin";

const host = "collections.example.org";

describe("isCrossOriginWrite", () => {
  it.each([
    ["matching origin", "POST", `https://${host}`, false],
    ["mismatching origin", "POST", "https://evil.example", true],
    ["absent header", "POST", undefined, false],
    ["same host, other port", "POST", `https://${host}:8443`, true],
    ['the "null" origin', "POST", "null", true],
    ["DELETE from elsewhere", "DELETE", "https://evil.example", true],
    ["a read from elsewhere", "GET", "https://evil.example", false],
  ])("%s → %s", (_, method, origin, rejected) => {
    expect(isCrossOriginWrite({ method, origin, host })).toBe(rejected);
  });
});

// The cross-origin write check skips only these (TICKET-MCP-01); every other path stays guarded.
describe("isApiPath", () => {
  it.each([
    ["/api/mcp", true],
    ["/api/oauth/token", true],
    ["/api/oauth/register", true],
    ["/.well-known/oauth-protected-resource/api/mcp", true],
    ["/.well-known/oauth-authorization-server", true],
    ["/admin/authorize", false],
    ["/admin/settings", false],
    ["/api", false],
    ["/apiary", false],
    ["/locale", false],
    ["/.well-known/security.txt", false],
  ])("%s → %s", (path, api) => {
    expect(isApiPath(path)).toBe(api);
  });
});
