import { useLingui } from "@lingui/react/macro";
import { requestContext } from "../context";
import { locales, type Locale } from "../i18n/locale";
import { Button } from "../ui/button";

// Each language is named in itself, the same in every UI language.
const names: Record<Locale, string> = { en: "English", nl: "Nederlands" };

// A plain form post to /locale, so it works without JS (public pages ship none).
export const LocaleSwitcher = () => {
  const { t } = useLingui();
  const current = requestContext().locale;
  return (
    <form method="post" action="/locale" aria-label={t({ id: "shell.language", message: "Language" })} className="flex gap-1">
      {locales.map((locale) => (
        <Button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          variant="ghost"
          size="sm"
          lang={locale}
          aria-pressed={locale === current}
        >
          {names[locale]}
        </Button>
      ))}
    </form>
  );
};
