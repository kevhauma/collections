import { createHash, randomBytes } from "node:crypto";
import { requestContext } from "../../context";
import { deleteExpiredSessions, deleteSession, findSession, insertSession, renewSession } from "../../db/sessions";

const day = 24 * 60 * 60;
const lifetime = 30 * day;
// Renew only in the second half of the lifetime, so most requests don't write.
const renewBelow = 15 * day;

export const sessionCookieName = "sid";

export type Session = { token: string; renewed: boolean };

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export const createSession = (now = nowSeconds()): string => {
  deleteExpiredSessions(now);
  const token = randomBytes(32).toString("base64url");
  insertSession(hashToken(token), now + lifetime);
  return token;
};

// The valid session for a cookie token, renewing it when fewer than 15 days remain.
export const getSession = (token: string | undefined, now = nowSeconds()): Session | undefined => {
  const tokenHash = hashToken(token ?? "");
  const row = token ? findSession(tokenHash) : undefined;
  if (!token || !row || row.expires_at <= now) return undefined;
  const renewed = row.expires_at - now < renewBelow;
  if (renewed) renewSession(tokenHash, now + lifetime);
  return { token, renewed };
};

export const destroySession = (token: string): void => deleteSession(hashToken(token));

// Secure only over https: browsers silently drop a Secure cookie sent over plain http, so login would never stick.
// Behind a TLS proxy, TRUST_PROXY makes request.url https (X-Forwarded-Proto).
const isSecure = (request: Request) => new URL(request.url).protocol === "https:";

export const sessionCookie = (token: string, request: Request, maxAge = lifetime): string =>
  [`${sessionCookieName}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`]
    .concat(isSecure(request) ? ["Secure"] : [])
    .join("; ");

// For actions: start or end the session of the current request and send the cookie with its response.
export const logIn = (): void => {
  const { request, setCookies } = requestContext();
  setCookies.push(sessionCookie(createSession(), request));
};

export const logOut = (): void => {
  const { request, session, setCookies } = requestContext();
  if (session) destroySession(session.token);
  setCookies.push(sessionCookie("", request, 0));
};
