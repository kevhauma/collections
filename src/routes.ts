import type { unstable_RSCRouteConfig as RSCRouteConfig } from "react-router";

// Route modules are loaded lazily; each one's default export is a server component. A layout module also exports
// `Layout` (its frame, which wraps its ErrorBoundary too) and `ErrorBoundary`.
export const routes = () =>
  [
    {
      id: "root",
      path: "",
      lazy: () => import("./routes/root"),
      children: [
        {
          // Visitor pages: server components only, no JS shipped (see entry.ssr.tsx).
          id: "public",
          lazy: () => import("./routes/public-layout"),
          children: [
            { id: "home", index: true, lazy: () => import("./routes/home") },
            { id: "setup", path: "setup", lazy: () => import("./routes/setup") },
            { id: "not-found", path: "*", lazy: () => import("./routes/not-found") },
          ],
        },
        {
          id: "admin",
          path: "admin",
          lazy: () => import("./routes/admin-layout"),
          children: [
            { id: "admin-home", index: true, lazy: () => import("./routes/admin-home") },
            { id: "admin-logout", path: "logout", lazy: () => import("./routes/admin-logout") },
          ],
        },
      ],
    },
  ] satisfies RSCRouteConfig;
