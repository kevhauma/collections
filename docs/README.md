# Docs

Everything decided about this project lives here.

| Path | What |
|---|---|
| [design.md](design.md) | The full design: scope, domain rules, routes, data model, stack. Start here. |
| `<area>/overview.md` + `<area>/tickets/` | Tickets, organised by feature area (see below). |
| [adr/](adr/) | Architecture decision records: why the non-obvious choices were made. |
| [research/](research/) | Fact-finding behind the ADRs, with sources (as of 2026-11-11). |
| [releases/](releases/v1/overview.md) | Per-release build order and ticket status. |

## Areas and ticket prefixes

Tickets are named `TICKET-<PREFIX>-<NN>-<slug>.md`. A prefix maps to exactly one area folder.

| Prefix | Area | Covers |
|---|---|---|
| `PLAT` | [platform](platform/overview.md) | Stack spike, scaffold, database + migrations, Docker |
| `UI` | [ui](ui/overview.md) | `src/ui/` component library, app shells, error pages |
| `I18N` | [i18n](i18n/overview.md) | Lingui, locale resolution, language switcher |
| `AUTH` | [auth](auth/overview.md) | First-run setup, login, sessions, password reset |
| `COL` | [collections](collections/overview.md) | Collections, slugs, field editor, schema evolution |
| `ITM` | [items](items/overview.md) | Item validation, CRUD, want ranking, images, list views |
| `PUB` | [sharing](sharing/overview.md) | Public index and public have/want pages |
| `BAK` | [backup](backup/overview.md) | Export zip, restore (v2) |
| `IMP` | [import](import/overview.md) | CSV import (v2), catalog lookups (v2) |

## Build plan

**[releases/v1/overview.md](releases/v1/overview.md)**: v1 build order, status per ticket, milestones and the
dependency graph. v2 tickets are listed at its end.

## Conventions every ticket inherits

- Persistence goes through repository modules in `src/db/`. No SQL in route modules or components.
- Schema changes add a new numbered migration. Never edit a shipped one.
- Every admin route and server action calls `requireAdmin()` and validates input with zod.
- Every UI string has an explicit i18n id with EN and NL text. User-typed content is never translated.
- Public pages ship no client components and work without JavaScript.
- Unit tests (vitest) for logic, with the cases named in the ticket. No component tests unless asked.
- A live browser check for UI changes, and verification with the fallow skill.
- Exact version pins for the RSC and i18n layer. Upgrades are their own tickets.

## ADRs

1. [RSC via React Router on Vite, not Next.js](adr/0001-rsc-react-router-vite.md)
2. [Lingui with explicit ids and JSON catalogs](adr/0002-lingui-explicit-ids.md)
3. [Plain SQL, no ORM](adr/0003-plain-sql.md)
4. [Dense integer ranks for wants](adr/0004-dense-integer-ranks.md)
5. [Plain public slugs, no share tokens](adr/0005-plain-public-slugs.md)
