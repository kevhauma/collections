import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// OWASP's scrypt baseline (N=2^17, r=8, p=1): about 128 MB and a few hundred ms per hash. The parameters are
// stored with each hash, so raising them later keeps old hashes verifiable.
const params = { N: 2 ** 17, r: 8, p: 1 };
const keyLength = 64;

const derive = (password: string, salt: Buffer, { N, r, p }: typeof params, length = keyLength): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    // scrypt needs 128 * N * r bytes; the default 32 MB cap is too small for N=2^17. A fixed cap also stops a
    // tampered stored N from allocating unbounded memory (scrypt then errors, and verify returns false).
    const options: ScryptOptions = { N, r, p, maxmem: 256 * 1024 * 1024 };
    scrypt(password, salt, length, options, (error, key) => (error ? reject(error) : resolve(key)));
  });

// Stored as `scrypt$N$r$p$saltB64$hashB64`.
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, params);
  return ["scrypt", params.N, params.r, params.p, salt.toString("base64"), hash.toString("base64")].join("$");
};

// False for a wrong password and for any malformed or tampered stored string; never throws.
export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, N, r, p, salt = "", hash = "", ...rest] = stored.split("$");
  const expected = Buffer.from(hash, "base64");
  const valid = scheme === "scrypt" && rest.length === 0 && expected.length > 0;
  try {
    const actual = valid
      ? await derive(password, Buffer.from(salt, "base64"), { N: Number(N), r: Number(r), p: Number(p) }, expected.length)
      : Buffer.alloc(0);
    return actual.length > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};
