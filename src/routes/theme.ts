import { themeCookie, themes } from "../lib/theme";
import { cookieSwitchAction } from "./cookie-switch";

// POST /theme, from the theme switcher in both headers (TICKET-UI-03).
export const action = cookieSwitchAction(themeCookie, themes);
