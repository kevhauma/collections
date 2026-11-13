---
name: work-ticket
description: Work a ticket end-to-end — read it, plan the implementation, build it, tick each acceptance criterion as it verifiably passes, then update its status in the release overview and check off its line in the area overview.md. Use whenever someone says "work on a ticket", "start ticket TICKET-XXX", "implement this ticket", "pick up TICKET-ITM-02", "next ticket", or points you at a ticket file to build.
---

# Work a ticket to done

Drive one ticket from ⬜ todo to ✅ done. The ticket is the source of truth: its **Acceptance criteria** are the
contract.

**Discover the docs layout at runtime and don't hardcode it** (see `docs/README.md`):

- Tickets live in `docs/<area>/tickets/TICKET-<PREFIX>-<NN>-*.md`. A prefix maps to exactly one area folder.
- Each area's `docs/<area>/overview.md` has one checkbox line per ticket.
- `docs/releases/<version>/overview.md` has the **build order and status** of every ticket in that release. It is
  the source of truth for status: ⬜ todo · 🔄 in progress · ⛔ blocked · ✅ done.

## Running mode: in-session or delegated

Work a single ticket inline. For several tickets in a row, you
may hand each one to a general-purpose subagent ("Run the work-ticket skill on TICKET-X, stop after Step 5, report
back"). Rules for delegating:

- **One at a time, never in parallel.** They share one working tree and the same test and build commands.
- You do Step 1 and the plan yourself, and pass the plan into the prompt.
- The subagent leaves live-browser criteria open. **You** run them afterwards and tick them with evidence.
- Relay each report to the user: status, what changed, unticked criteria and why, verification result.
- Nobody commits unless the user asks.

## Step 1: Pick and locate the ticket

- **If the user named a ticket** (`TICKET-ITM-02`, `ITM-02`, or a path), open it. Resolve partial ids with a glob
  over `docs/*/tickets/`.
- **If no ticket was named** ("next ticket"), open the current release overview and propose the **first ⬜ row
  whose Needs are all ✅**, plus any ‖ rows that are also unblocked. Ask with `AskUserQuestion`. Use only the real
  rows you found, never a remembered list.
- **Check dependencies**: if anything in the ticket's Needs isn't ✅, say so and ask before starting.

## Step 2: Read and orient

Read the **whole** ticket: User story, Description, Current situation (follow its links), Desired result,
UI requirements, Acceptance criteria, Notes. Then read what it points to:

- the linked sections of `docs/technical-design.md` and any linked ADRs
- the code that its predecessors created (as-is links, or a glob of `src/` for the files the to-be names)
- `.claude/skills/coding-conventions/SKILL.md`
- for a ticket with UI: the design direction in `.impeccable/surfaces/src-ui.md` (and `DESIGN.md` once it exists).
  Build the UI with the `impeccable` skill so it follows that direction
- for PLAT-01-dependent decisions: `docs/research/spike-results.md` once it exists

Restate the ticket's intent in one or two sentences so the user can confirm.

Set the ticket's row in the release overview to **🔄**.

## Step 3: Plan

Produce a concrete plan **mapped to the acceptance criteria**: which routes, actions, repositories, migrations,
`src/ui` components and i18n ids change, and which unit tests get added (name the cases). Respect the hard rules:

- SQL only in `src/db/` repositories. Multi-table writes in one transaction. Values as parameters.
- Schema changes add a **new numbered migration**. Never edit a shipped one.
- Every admin route and action calls `requireAdmin()` and validates with zod.
- Public routes: no client components, `publicOnly` reads, and they work without JavaScript.
- Every new UI string gets an explicit i18n id in both `en.json` and `nl.json`.
- Exact version pins in the RSC and i18n layer. Never bump them as a side effect; an upgrade is its own ticket.

Track the steps with the task tools.

## Step 4: Implement

Work criterion by criterion, following the coding-conventions skill. Keep the change scoped to the ticket; note
out-of-scope findings instead of doing them.

**If the implementation diverges from a criterion, record it at the moment you pivot.** Amend the line in the same
change: strike through the old wording and say what is being built instead and why. A box describing code that
doesn't exist is worse than an open box.

If the spike or real code proves a design decision wrong, update `docs/technical-design.md` in the same change. If it
reverses an ADR, add a new ADR that supersedes it rather than rewriting history.

## Step 5: Verify, then tick each criterion

A criterion is ticked **only when it verifiably passes**.

1. Run the Definition of Done: `npm run typecheck`, `npm test`, `npm run build`. Fix failures before ticking
   anything.
2. Run the **fallow** skill. Fix new dead code and complexity findings by refactoring, not suppressing. Code this
   ticket ships deliberately unreferenced (for a later ticket) is noted in the evidence, not suppressed.
3. For "Live browser check" criteria, drive the real app with the `run` or `supermatt:qa` skill. Reproduce the
   scenario, including **with JavaScript disabled** where the ticket says so, and capture the evidence. Ask the user
   first if a browser session needs their involvement.
   For a ticket with UI, the same check compares the screens against the design direction
   (`.impeccable/surfaces/src-ui.md` / `DESIGN.md`) at 360 px and desktop width. A screen that drifts from it does
   not pass.
4. Tick a satisfied criterion by changing `- [ ]` → `- [x]` and **appending the evidence in parentheses**: the file,
   test name, or observed behaviour. It must be answerable from the ticket alone months later. A tick without
   evidence is not a tick.
5. Leave failing or unverifiable criteria open and say why on the line (e.g. "browser check waived by user on
   2026-11-12").
6. **Final pass**: re-read every `[x]` against the working tree (`git diff`, files, passing tests). Untick anything
   you can't point at right now.

## Step 6: Mark done (only when ALL criteria are `[x]`)

Update all three places:

1. **Release overview** (`docs/releases/<version>/overview.md`): set the row to **✅** and update the
   `Progress: N / M done` line.
2. **Area overview** (`docs/<area>/overview.md`): find the line by its **ticket link**, not its title. Flip
   `- [ ]` → `- [x]` and replace the trailing `· _unreleased_` with `· v1` (the release label).
3. **Ticket header**: replace `- **Released in:** _unreleased_` with
   `- **Released in:** [v1](../../releases/v1/overview.md)`.

If the ticket is blocked or abandoned instead, set ⛔ in the release overview with a one-line reason next to it, and
leave the other two untouched.

## Step 7: Keep the conventions current

If the ticket created or changed a pattern (a new `src/ui` component, a repository shape, an action helper, a test
helper, a real command or path that replaces a planned one), update
`.claude/skills/coding-conventions/SKILL.md` in the same change, in one or two sentences, linking the exemplar file.
A stale conventions skill misdirects every later ticket.

## Step 8: Report and stop

Summarize what changed, link the ticket and its ✅ row, and show the verification evidence (typecheck, test and
build output, fallow result, browser evidence). **Don't commit** unless the user asks. When committing, use no AI
attribution trailers.
