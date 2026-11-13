const writes = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// A write whose Origin header names another host. Absent Origin is allowed (SameSite=Lax already covers it);
// an unparseable one, including the literal "null", counts as foreign.
export const isCrossOriginWrite = ({ method, origin, host }: { method: string; origin?: string; host?: string }) => {
  if (!writes.has(method.toUpperCase()) || origin === undefined) return false;
  return !URL.canParse(origin) || new URL(origin).host !== host;
};

// The MCP endpoint, OAuth endpoints and OAuth discovery documents (TICKET-MCP-01). Agents call them from other
// hosts, and they never read the session cookie, so the cross-origin write check doesn't apply to them.
export const isApiPath = (path: string): boolean => path.startsWith("/api/") || path.startsWith("/.well-known/oauth-");
