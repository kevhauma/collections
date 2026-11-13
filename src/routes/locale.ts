import { localeCookie, locales } from "../i18n/locale";
import { cookieSwitchAction } from "./cookie-switch";

// POST /locale, from the language switcher in both headers.
export const action = cookieSwitchAction(localeCookie, locales);
