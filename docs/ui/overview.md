# UI: overview

Prefix `UI`. The in-house component library in `src/ui/` and the app shells. Design: [technical-design.md § Stack](../technical-design.md#stack).

- [x] [TICKET-UI-01](./tickets/TICKET-UI-01-ui-library-foundation.md): UI library foundation (§ Stack: UI library). Needs TICKET-PLAT-02 · v1
- [x] [TICKET-UI-02](./tickets/TICKET-UI-02-app-shells.md): App shells and error pages (§ Routes). Needs TICKET-UI-01, TICKET-I18N-01 · v1
- [x] [TICKET-UI-03](./tickets/TICKET-UI-03-dark-mode.md): Dark mode (§ Stack: UI library, reverses the design's "dark mode out of scope"). Needs TICKET-UI-02, TICKET-I18N-02 (both shipped), independent, can ship any time · v1
- [x] [TICKET-UI-04](./tickets/TICKET-UI-04-pen-drawn-switcher-icons.md): Pen-drawn icons for the language and theme switchers (§ Stack: UI library, extends TICKET-UI-03 and TICKET-I18N-02). Independent, can ship any time · v1
- [ ] [TICKET-UI-05](./tickets/TICKET-UI-05-pen-drawn-hover-marks.md): Red-pen circle on hover, red-pen cross on delete (§ Stack: UI library, extends TICKET-UI-04). Independent, can ship any time · _unreleased_
- [x] [TICKET-UI-06](./tickets/TICKET-UI-06-flags-keep-day-colours.md): Flags keep their colours in dark mode (bug fix, § Stack: UI library — flags use the theme tokens, so paper and ink invert at night). Independent, can ship any time · v1
- [ ] [TICKET-UI-07](./tickets/TICKET-UI-07-no-font-flash-on-navigation.md): No font jump when switching pages (bug fix, § Stack: UI library — Fontsource `font-display: swap` with no font preload paints a fallback frame on each full page load). Independent, can ship any time · _unreleased_
