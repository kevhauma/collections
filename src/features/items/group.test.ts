import { describe, expect, it } from "vitest";
import type { Item } from "../../db/items";
import { groupItems } from "./group";

const item = (id: number, value?: unknown): Item => ({
  id,
  status: "have",
  quantity: 1,
  rank: null,
  image: null,
  values: value === undefined ? {} : { 7: value },
});
const genre = { id: 7, type: "text", options: null } as const;
const groups = (items: Item[], field: Parameters<typeof groupItems>[1] = genre) =>
  groupItems(items, field, "en").map((group) => [group.value, group.items.map((entry) => entry.id)]);

describe("groupItems", () => {
  it("splits a text value on commas, trims the parts and drops empty ones", () => {
    expect(groups([item(1, " Jazz ,Soul,, "), item(2, "Rock")])).toEqual([
      ["Jazz", [1]],
      ["Rock", [2]],
      ["Soul", [1]],
    ]);
  });

  it("merges values case-insensitively under the first spelling seen, and puts an item in each of its groups", () => {
    expect(groups([item(1, "Jazz, Soul"), item(2, "jazz"), item(3, "Rock")])).toEqual([
      ["Jazz", [1, 2]],
      ["Rock", [3]],
      ["Soul", [1]],
    ]);
    // "jazz, JAZZ" on one item counts once.
    expect(groups([item(1, "jazz, JAZZ")])).toEqual([["jazz", [1]]]);
  });

  it("puts items without a value in a last group", () => {
    expect(groups([item(1), item(2, "Rock"), item(3, " , "), item(4, "Ambient")])).toEqual([
      ["Ambient", [4]],
      ["Rock", [2]],
      [null, [1, 3]],
    ]);
  });

  it("orders choice groups by the field's options, leaving out options nobody has", () => {
    const format = { id: 7, type: "select" as const, options: ["LP", "EP", '7"'] };
    expect(groups([item(1, '7"'), item(2, "LP"), item(3), item(4, "LP")], format)).toEqual([
      ["LP", [2, 4]],
      ['7"', [1]],
      [null, [3]],
    ]);
  });

  it("groups a checkbox Yes then No, an unticked or missing one being No", () => {
    const signed = { id: 7, type: "checkbox", options: null } as const;
    expect(groups([item(1, false), item(2, true), item(3)], signed)).toEqual([
      [true, [2]],
      [false, [1, 3]],
    ]);
  });

  it("keeps the list's order inside each group", () => {
    expect(groups([item(9, "Jazz"), item(2, "Jazz"), item(5, "Jazz")])).toEqual([["Jazz", [9, 2, 5]]]);
  });
});
