"use server";
import { msg } from "@lingui/core/macro";
import { actionI18n } from "../i18n";

// shortcut: placeholder action proving translation inside server actions (TICKET-I18N-01); it reads and writes
// nothing, so it skips requireAdmin(). Delete it with LocaleCheck once a real action translates its result.
export const localeCheckAction = async (): Promise<string> =>
  actionI18n()._(msg({ id: "home.placeholder.action", message: "Translated by a server action." }));
