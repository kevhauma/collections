import { describe, expect, it } from "vitest";
import { getCookie, parseCookies, requestContext, runWithContext } from "./context";

describe("parseCookies", () => {
  it("returns an empty object for a missing header", () => {
    expect(parseCookies(null)).toEqual({});
  });

  it("parses several cookies and trims whitespace", () => {
    expect(parseCookies("locale=nl; session=abc")).toEqual({ locale: "nl", session: "abc" });
  });

  it("keeps '=' inside a value and decodes it", () => {
    expect(parseCookies("token=a%3Db=c")).toEqual({ token: "a=b=c" });
  });

  it("keeps a malformed escape as-is and skips pairs without '='", () => {
    expect(parseCookies("bad=%E0%A4%A; flag")).toEqual({ bad: "%E0%A4%A" });
  });
});

describe("request context", () => {
  it("exposes the request and its cookies inside runWithContext", () => {
    const request = new Request("http://localhost/", { headers: { cookie: "locale=nl" } });
    runWithContext({ request, locale: "en" }, () => {
      expect(requestContext().request).toBe(request);
      expect(getCookie("locale")).toBe("nl");
      expect(getCookie("missing")).toBeUndefined();
    });
  });

  it("throws outside a request", () => {
    expect(() => requestContext()).toThrow(/outside a request/);
  });
});
