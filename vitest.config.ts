import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit tests don't spin up the RSC environments.
export default defineConfig({
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
