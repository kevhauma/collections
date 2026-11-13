import { describe, expect, it } from "vitest";
import { checkChosenFile, maxImageBytes, thumbUrl } from "./shared";

describe("image helpers shared with the browser", () => {
  it("previews a file up to 15 MB and refuses a bigger one", () => {
    expect(checkChosenFile(undefined)).toBe("none");
    expect(checkChosenFile({ size: maxImageBytes })).toBe("ok");
    expect(checkChosenFile({ size: maxImageBytes + 1 })).toBe("tooLarge");
  });

  it("points at the thumbnail in /uploads", () => {
    expect(thumbUrl("0b9c")).toBe("/uploads/0b9c.thumb.webp");
  });
});
