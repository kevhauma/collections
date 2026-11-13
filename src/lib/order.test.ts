import { describe, expect, it } from "vitest";
import { moveInList } from "./order";

const list = ["a", "b", "c", "d"] as const;

describe("moveInList", () => {
  it("moves an element up", () => {
    expect(moveInList(list, 2, 0)).toEqual(["c", "a", "b", "d"]);
  });

  it("moves an element down", () => {
    expect(moveInList(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("leaves the list as is for the same position", () => {
    expect(moveInList(list, 1, 1)).toEqual(list);
  });

  it("clamps an out-of-range target to the ends", () => {
    expect(moveInList(list, 1, -5)).toEqual(["b", "a", "c", "d"]);
    expect(moveInList(list, 1, 99)).toEqual(["a", "c", "d", "b"]);
  });

  it("ignores an unknown source index and never mutates its input", () => {
    expect(moveInList(list, 7, 0)).toEqual(list);
    const copy = [...list];
    moveInList(copy, 0, 3);
    expect(copy).toEqual(list);
  });
});
