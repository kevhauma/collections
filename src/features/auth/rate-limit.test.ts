import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createRateLimiter", () => {
  it("allows 5 failures, blocks the 6th attempt, and opens again after 60 s", () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(limiter.blocked()).toBe(false);
      limiter.fail();
    }
    expect(limiter.blocked()).toBe(true);
    vi.advanceTimersByTime(59_999);
    expect(limiter.blocked()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(limiter.blocked()).toBe(false);
  });

  it("rolls: old failures drop out one by one", () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
    limiter.fail();
    vi.advanceTimersByTime(30_000);
    [1, 2, 3, 4].forEach(() => limiter.fail());
    expect(limiter.blocked()).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(limiter.blocked()).toBe(false);
  });
});
