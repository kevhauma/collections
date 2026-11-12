import type { unstable_RSCRouteConfig as RSCRouteConfig } from "react-router";

// Route modules are loaded lazily; each one's default export is a server component.
export const routes = () =>
  [
    {
      id: "root",
      path: "",
      lazy: () => import("./routes/root"),
      children: [{ id: "home", index: true, lazy: () => import("./routes/home") }],
    },
  ] satisfies RSCRouteConfig;
