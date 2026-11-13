import { useLingui } from "@lingui/react/macro";
import { getCookie } from "../context";
import { forcedTheme, themeCookie, themes } from "../lib/theme";
import { Button } from "../ui/button";

// System / Light / Dark (TICKET-UI-03). A plain form post to /theme, so it works without JS, like LocaleSwitcher.
export const ThemeSwitcher = () => {
  const { t } = useLingui();
  const current = forcedTheme(getCookie(themeCookie)) ?? "system";
  const labels = {
    system: t({ id: "shell.theme.system", message: "System" }),
    light: t({ id: "shell.theme.light", message: "Light" }),
    dark: t({ id: "shell.theme.dark", message: "Dark" }),
  };
  return (
    <form method="post" action="/theme" aria-label={t({ id: "shell.theme", message: "Colours" })} className="flex gap-1">
      {themes.map((theme) => (
        <Button key={theme} type="submit" name="theme" value={theme} variant="ghost" size="sm" aria-pressed={theme === current}>
          {labels[theme]}
        </Button>
      ))}
    </form>
  );
};
