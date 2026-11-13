// Pure theme logic (TICKET-UI-03), safe to import anywhere. "system" follows the device; the others force it.
export const themes = ["system", "light", "dark"] as const;

export const themeCookie = "theme";

// What <html data-theme> gets: the forced theme, or nothing to follow prefers-color-scheme. A missing or garbage
// cookie follows the device.
export const forcedTheme = (cookie: string | undefined): "light" | "dark" | undefined =>
  cookie === "light" || cookie === "dark" ? cookie : undefined;
