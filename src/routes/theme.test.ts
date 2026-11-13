import { describe, expect, it } from "vitest";
import { runWithContext } from "../context";
import { action } from "./theme";

// POST /theme with the given body and Referer; the response plus the cookies it set.
const post = async (body: Record<string, string>, referer?: string) => {
  const request = new Request("http://localhost:3000/theme", {
    method: "POST",
    body: new URLSearchParams(body),
    headers: referer ? { referer } : {},
  });
  const setCookies: string[] = [];
  const response = (await runWithContext({ request, locale: "en", setCookies }, () =>
    action({ request, params: {}, context: {} } as Parameters<typeof action>[0]),
  )) as Response;
  return { response, setCookies };
};

describe("POST /theme", () => {
  it.each(["system", "light", "dark"])("sets a one-year %s cookie and goes back to the page", async (theme) => {
    const { response, setCookies } = await post({ theme }, "http://localhost:3000/records/want?view=grid");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/records/want?view=grid");
    expect(setCookies).toEqual([`theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`]);
  });

  it.each<Record<string, string>>([{ theme: "sepia" }, { theme: "" }, {}])("answers 400 to %j and sets nothing", async (body) => {
    const { response, setCookies } = await post(body);
    expect(response.status).toBe(400);
    expect(setCookies).toEqual([]);
  });

  it("goes home for an off-site or missing Referer", async () => {
    expect((await post({ theme: "dark" }, "https://evil.example/x")).response.headers.get("location")).toBe("/");
    expect((await post({ theme: "dark" })).response.headers.get("location")).toBe("/");
  });
});
