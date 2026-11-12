import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

const password = "correct horse battery staple";

describe("password hashing", async () => {
  const stored = await hashPassword(password);

  it("stores the scrypt$N$r$p$salt$hash format, never the password", () => {
    expect(stored).toMatch(/^scrypt\$131072\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(stored).not.toContain(password);
  });

  it("verifies the right password", async () => {
    expect(await verifyPassword(password, stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await verifyPassword("correct horse battery stapler", stored)).toBe(false);
  });

  it("salts: two hashes of the same password differ", async () => {
    expect(await hashPassword(password)).not.toBe(stored);
  });

  it.each([
    ["empty", ""],
    ["wrong scheme", stored.replace(/^scrypt/, "bcrypt")],
    ["missing hash", stored.split("$").slice(0, 5).join("$")],
    ["extra segment", `${stored}$x`],
    ["non-numeric N", stored.replace("$131072$", "$abc$")],
    ["N too large for the memory cap", stored.replace("$131072$", "$1073741824$")],
    ["flipped hash byte", stored.slice(0, -3) + (stored.at(-3) === "A" ? "B" : "A") + stored.slice(-2)],
  ])("fails cleanly on a tampered string (%s)", async (_, tampered) => {
    await expect(verifyPassword(password, tampered)).resolves.toBe(false);
  });
});
