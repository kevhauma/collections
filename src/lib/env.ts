const named: Record<string, boolean> = { "": false, true: true, false: false };

// Express "trust proxy": unset/"false" → off, "true" → on, digits → hop count, anything else passes through
// (e.g. "loopback" or a comma-separated list of subnets).
export const parseTrustProxy = (value = ""): boolean | number | string =>
  named[value] ?? (/^\d+$/.test(value) ? Number(value) : value);

// DATA_DIR holds db.sqlite and uploads/ (docs/platform/deploy.md).
export const dataDir = (): string => process.env.DATA_DIR ?? "./data";
