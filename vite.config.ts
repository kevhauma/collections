import { lingui } from "@lingui/vite-plugin";
import rsc from "@vitejs/plugin-rsc";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // Compiles Lingui macros natively in all three environments and `*.json?lingui` catalog imports (ADR 0002).
    lingui({ macroTransform: true }),
    tailwindcss(),
    react(),
    rsc({
      entries: { rsc: "src/entry.rsc.tsx", ssr: "src/entry.ssr.tsx", client: "src/entry.browser.tsx" },
      // Express owns the HTTP server (src/server.ts), so the plugin must not install its own request handler.
      serverHandler: false,
    }),
  ],
});
