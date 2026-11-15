import { describe, expect, it } from "vitest";
import { wishView } from "./view";

describe("wishView", () => {
  it("maps wishes onto want items keyed by the fixed field ids, leaving blanks out", () => {
    const view = wishView(
      [
        { id: 7, title: "Lamp", link: "https://shop.example/lamp", note: null, price: "€25", image: "img", rank: 1 },
        { id: 9, title: "Mug", link: null, note: "Blue", price: null, image: null, rank: 2 },
      ],
      [
        ["title", "Title"],
        ["price", "Price"],
        ["link", "Link"],
      ],
    );
    expect(view.fields.map((field) => [field.id, field.label, field.type, field.position])).toEqual([
      [1, "Title", "text", 1],
      [2, "Price", "text", 2],
      [4, "Link", "url", 3],
    ]);
    expect(view.items).toEqual([
      { id: 7, status: "want", quantity: null, rank: 1, values: { 1: "Lamp", 2: "€25", 4: "https://shop.example/lamp" }, image: "img" },
      { id: 9, status: "want", quantity: null, rank: 2, values: { 1: "Mug", 3: "Blue" }, image: null },
    ]);
    expect(view.titleFieldId).toBe(1);
    expect(view.linkFieldId).toBe(4);
  });
});
