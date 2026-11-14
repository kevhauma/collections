import { describe, expect, it } from "vitest";
import { pageMotion, polygon, turnClears, turnFrames } from "./page-motion";

const site = "https://hoardr.example";
const load = (type: string, from: string, to: string, publicPage = true) =>
  pageMotion({ type, from: from && `${site}${from}`, to: `${site}${to}`, publicPage });

describe("pageMotion", () => {
  it("plays the pen test on a fresh open of a public page", () => {
    expect(load("navigate", "", "/lego")).toBe("pen-test");
    expect(pageMotion({ type: "navigate", from: "https://chat.example/x", to: `${site}/lego/want`, publicPage: true })).toBe(
      "pen-test",
    );
  });

  it("plays nothing on a fresh open of an admin page", () => {
    expect(load("navigate", "", "/admin", false)).toBe("none");
    expect(pageMotion({ type: "navigate", from: "https://chat.example/x", to: `${site}/admin`, publicPage: false })).toBe("none");
  });

  it("treats a reload as a fresh open", () => {
    expect(load("reload", "/lego", "/lego")).toBe("pen-test");
    expect(load("reload", "/admin", "/admin", false)).toBe("none");
  });

  it("turns the page on an in-app link or form submit", () => {
    expect(load("navigate", "/", "/lego")).toBe("turn");
    expect(load("navigate", "/admin/c/lego", "/admin/c/lego/items/3", false)).toBe("turn");
    // A form that redirects back to its own page still turns it.
    expect(load("navigate", "/admin/c/lego/settings", "/admin/c/lego/settings", false)).toBe("turn");
  });

  it("turns back on back and forward", () => {
    expect(load("back_forward", "/lego/want", "/", false)).toBe("back");
    expect(load("back_forward", "/admin/c/lego/items/3", "/admin/c/lego", false)).toBe("back");
  });

  it("skips a query-only change on the same path", () => {
    expect(load("navigate", "/lego?view=table", "/lego?view=table&sort=3&dir=asc")).toBe("skip");
    expect(load("navigate", "/admin/c/lego", "/admin/c/lego?group=4", false)).toBe("skip");
    expect(load("back_forward", "/lego?q=tin", "/lego")).toBe("skip");
  });

  it("skips the Have / Want tab switch", () => {
    expect(load("navigate", "/lego", "/lego/want")).toBe("skip");
    expect(load("navigate", "/admin/c/lego/want?sort=2", "/admin/c/lego", false)).toBe("skip");
    // A collection called "want" is a page of its own.
    expect(load("navigate", "/", "/want")).toBe("turn");
  });
});

describe("turnFrames", () => {
  const { offset, page, flap } = turnFrames(400, 300, polygon);

  it("goes from the whole page to nothing, through the corners the fold passes", () => {
    expect(offset[0]).toBe(0);
    expect(offset.at(-1)).toBe(1);
    expect(offset).toEqual([...offset].sort((a, b) => a - b));
    expect(page[0]).toBe("polygon(0.0px 0.0px,400.0px 0.0px,400.0px 300.0px,400.0px 300.0px,0.0px 300.0px)");
    expect(page.at(-1)).toBe("polygon(0.0px 0.0px,0.0px 0.0px,0.0px 0.0px,0.0px 0.0px,0.0px 0.0px)");
  });

  it("keeps five points in every frame, so the clip interpolates", () => {
    expect([...page, ...flap].map((frame) => frame.split(",").length)).toEqual(Array(8).fill(5));
  });

  it("mirrors the whole sheet over the top-left corner once it has turned", () => {
    // The fold through (0, 0) perpendicular to the diagonal reflects (400, 300) to (-400, -300).
    expect(flap.at(-1)).toContain("-400.0px -300.0px");
    expect(flap[0]).toBe("polygon(400.0px 300.0px,400.0px 300.0px,400.0px 300.0px,400.0px 300.0px,400.0px 300.0px)");
  });
});

describe("turnClears", () => {
  const title = { left: 32, top: 66, right: 400, bottom: 154 };

  it("clears a title near the top-left late going forward and early going back", () => {
    const forward = turnClears(1280, 800, title, false), back = turnClears(1280, 800, title, true);
    expect(forward).toBeGreaterThan(0.8);
    expect(forward).toBeLessThan(1);
    expect(back).toBeLessThan(forward);
  });

  it("stays inside the turn", () => {
    expect(turnClears(360, 740, { left: 0, top: 0, right: 0, bottom: 0 }, false)).toBeCloseTo(1, 2);
    expect(turnClears(360, 740, { left: 360, top: 740, right: 360, bottom: 740 }, true)).toBeCloseTo(1, 2);
  });
});
