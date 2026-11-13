import { describe, expect, it } from "vitest";
import { forcedTheme } from "./theme";

// What the root document puts on <html data-theme> for each theme cookie.
describe("forcedTheme", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", undefined],
    [undefined, undefined],
    ["", undefined],
    ["DARK", undefined],
    ["dark; x", undefined],
  ])("cookie %j → %j", (cookie, theme) => {
    expect(forcedTheme(cookie)).toBe(theme);
  });
});
