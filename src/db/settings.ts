import { db } from "./connection";

// The single settings row (id = 1), seeded by migration 001.
type SettingsRow = { default_locale: string };

export const getDefaultLocale = (): string =>
  (db().prepare("select default_locale from settings where id = 1").get() as SettingsRow).default_locale;
