import { useLingui } from "@lingui/react/macro";
import { requestContext } from "../context";
import { locales, type Locale } from "../i18n/locale";
import { Button } from "../ui/button";
import { InkIcon } from "../ui/ink-icon";

// Each language is named in itself, the same in every UI language.
const names: Record<Locale, string> = { en: "English", nl: "Nederlands" };

// A drawn flag per language, named in its own language (the flag stands for a country, the name for the
// language). A plain form post to /locale, so it works without JS (public pages ship none).
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
          size="icon"
          lang={locale}
          aria-label={names[locale]}
          title={names[locale]}
          aria-pressed={locale === current}
        >
          <InkIcon name={`flag-${locale}`} />
        </Button>
      ))}
    </form>
  );
};
