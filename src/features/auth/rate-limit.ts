// A rolling-window failure counter. In memory: the app is a single process.
export const createRateLimiter = ({ limit, windowMs }: { limit: number; windowMs: number }) => {
  let failures: number[] = [];
  const recent = () => (failures = failures.filter((time) => Date.now() - time < windowMs));
  return {
    blocked: (): boolean => recent().length >= limit,
    fail: (): void => {
      failures = [...recent(), Date.now()];
    },
  };
};

// Global, not per IP: anyone can lock the owner out for a minute at a time, which is acceptable for a
// single-owner app and far simpler than tracking clients (TICKET-AUTH-02).
export const loginLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
