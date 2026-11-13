import { lingui } from "@lingui/vite-plugin";
import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so unit tests don't spin up the RSC environments. The Lingui plugin compiles macros and
// `?lingui` catalogs, so modules with translated messages (the MCP tools, TICKET-MCP-01) can be tested too.
export default defineConfig({
  plugins: [lingui({ macroTransform: true })],
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
