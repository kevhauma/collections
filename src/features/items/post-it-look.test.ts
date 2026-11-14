import { describe, expect, it } from "vitest";
import { postItLook } from "./post-it-look";

const ids = Array.from({ length: 300 }, (_, index) => index + 1);

describe("postItLook", () => {
  it("is the same for an id every time", () => {
    expect(ids.map(postItLook)).toEqual(ids.map(postItLook));
  });

  it("gives each fastening between 25% and 42% of ids 1-300", () => {
    for (const fastening of ["pin", "tape", "paperclip"]) {
      const share = ids.filter((id) => postItLook(id).fastening === fastening).length / ids.length;
      expect(share).toBeGreaterThanOrEqual(0.25);
      expect(share).toBeLessThanOrEqual(0.42);
    }
  });

  it("follows no short cycle in id order", () => {
    const sequence = ids.slice(0, 36).map((id) => postItLook(id).fastening);
    for (const period of [1, 2, 3, 4, 6]) {
      expect(sequence.every((fastening, index) => index < period || fastening === sequence[index - period])).toBe(false);
    }
  });
});
