import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("lets a valid cookie win over Accept-Language and the default", () => {
    expect(resolveLocale({ cookie: "nl", acceptLanguage: "en", defaultLocale: "en" })).toBe("nl");
  });

  it("ignores an invalid cookie", () => {
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "nl", defaultLocale: "en" })).toBe("nl");
  });

  it("orders Accept-Language by q-value, not by position", () => {
    expect(resolveLocale({ acceptLanguage: "en;q=0.4, nl;q=0.9", defaultLocale: "en" })).toBe("nl");
  });

  it("falls back from a region subtag to its language (nl-BE → nl)", () => {
    expect(resolveLocale({ acceptLanguage: "nl-BE,nl;q=0.9,en;q=0.8", defaultLocale: "en" })).toBe("nl");
  });

  it("skips languages marked not acceptable with q=0", () => {
    expect(resolveLocale({ acceptLanguage: "nl;q=0, en;q=0.5", defaultLocale: "nl" })).toBe("en");
  });

  it("uses the default without an Accept-Language header", () => {
    expect(resolveLocale({ acceptLanguage: null, defaultLocale: "nl" })).toBe("nl");
  });

  it("uses the default when only unsupported languages are accepted", () => {
    expect(resolveLocale({ acceptLanguage: "fr-FR, de;q=0.8, *;q=0.1", defaultLocale: "nl" })).toBe("nl");
  });

  it("uses the source locale when the stored default is unusable", () => {
    expect(resolveLocale({ acceptLanguage: "fr", defaultLocale: "xx" })).toBe("en");
  });
});
