import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-json";

// ADR 0002: explicit ids, flat { id: message } JSON catalogs.
export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "nl"],
  catalogs: [{ path: "<rootDir>/src/i18n/locales/{locale}", include: ["src"] }],
  format: formatter({ style: "minimal" }),
});
