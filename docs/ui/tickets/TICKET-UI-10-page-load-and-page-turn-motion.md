# TICKET-UI-10: Pen-test page load, page turn and handwritten title on page changes

- **Area:** UI
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** [technical-design.md § Stack](../../technical-design.md#stack) (UI library), [DESIGN.md](../../../DESIGN.md) (motion, drawn shapes), [PRODUCT.md](../../../PRODUCT.md) (public pages work without JS), extends [TICKET-UI-05](./TICKET-UI-05-pen-drawn-hover-marks.md) (pen stroke) and [TICKET-UI-07](./TICKET-UI-07-no-font-flash-on-navigation.md) (fonts ready on first paint). Concept prototype: [Paper Motion](https://claude.ai/artifact/6HHUosGCGeX3MyiiuLdpxH) ("Pen test", "6 Page turn", "10 Handwritten title")

## User story

As a visitor opening a shared link, I want the page to arrive the way a notebook page would, with a pen test scribbled
on scrap that gets crumpled and thrown away, and as the admin or a visitor moving around the app, I want each new page
to turn over like a notebook page and have its title written in, so the app feels like the notebook it is drawn as
and I always see that the page changed.

## Description

Two motion moments, both made of the notebook's ballpoint and paper. **Page load** (public pages only, every fresh
open): a pen scribbles a test coil on a blank sheet over the page, then the sheet is crumpled and tossed, showing the
page underneath. **Page change** (admin and public): the old page turns over from the bottom-right corner onto the new
one, and the new page's title writes itself with the pen. Reduced motion gets a short fade instead.

## Current situation (as-is)

- Every page switch is a full document load: headers, nav and tabs are plain `<a>` links
  ([src/routes/public-layout.tsx](../../../src/routes/public-layout.tsx),
  [src/routes/admin-layout.tsx](../../../src/routes/admin-layout.tsx), [src/ui/tab-links.tsx](../../../src/ui/tab-links.tsx)),
  the list toolbar is a GET form, and saving a form ends in a redirect. Nothing marks the change from one page to the
  next.
- Nothing animates beyond colour transitions and the hover marks: [DESIGN.md](../../../DESIGN.md) › "Not shipped yet"
  says so, and `.impeccable/surfaces/src-ui.md` says "nothing else animates".
- The pen-stroke technique exists: the `hover-mark` utility and `pen-stroke` keyframes in
  [src/ui/styles.css](../../../src/ui/styles.css) draw strokes by animating `stroke-dashoffset`, wobbled by
  `#ink-wobble` from [src/ui/ink-defs.tsx](../../../src/ui/ink-defs.tsx).
- Each route's page title is its `<h1>` (Reenie Beanie, styled in the `base` layer of `styles.css`), e.g.
  [src/routes/public-collection.tsx](../../../src/routes/public-collection.tsx),
  [src/routes/home.tsx](../../../src/routes/home.tsx), [src/routes/admin-collection.tsx](../../../src/routes/admin-collection.tsx).
- Public pages ship no client components. The document has exactly one inline script, serialized from tested
  functions: `submitOnceScript` from [src/lib/submit-once.ts](../../../src/lib/submit-once.ts), rendered in
  [src/routes/root.tsx](../../../src/routes/root.tsx). The CSP is only `frame-ancestors 'none'`
  ([src/server.ts](../../../src/server.ts)), so inline script is allowed.
- Fonts are preloaded from `<head>` (TICKET-UI-07), so the title is in Reenie Beanie on the first frame.

## Desired result (to-be)

- **Pen test (page load, public pages only).** When a public page is opened fresh, meaning not reached by a page
  change inside the app (a link from a chat, a typed URL, a bookmark, a refresh), a blank sheet of the squared paper
  covers the page. A drawn ballpoint scribbles a coil of loops and a flick across it (about 730 ms), the sheet
  crumples into a ball (380 ms) and is thrown off towards the bottom-right (340 ms): about 1.4 s in all. It plays on
  every fresh open. Admin pages never play it.
- **The page is never held back.** The real page is rendered under the sheet from the first frame. The sheet, ball
  and pen are `aria-hidden` and `pointer-events: none`, so taps, links and scrolling work while it plays, and screen
  readers read the page as normal. Without JavaScript there is no pen test and the page simply shows.
- **Page turn (page change, admin and public).** Following a link or submitting a form inside the app turns the old
  page over from its bottom-right corner: a fold line, perpendicular to the page diagonal, sweeps to the top-left, and
  the part already turned shows as the back of the sheet (squared paper, a shade darker, with a soft shadow). About
  620 ms, ease-in-out. The new page lies underneath, readable and usable as soon as the turn starts.
- **Handwritten title.** On a page change, the new page's `<h1>` writes itself left to right, with the drawn
  ballpoint riding along its leading edge (about 45 ms per character, at most 900 ms). It starts as the turn clears
  the title. The rest of the page does not animate.
- **Back and forward** turn the page the other way: the previous page folds in from the top-left over the current
  one, then its title writes itself.
- **Refinements stay still.** A navigation that only refines the page you are on gets no turn and no title writing:
  the list toolbar's sort, search, filter and group (same path, different query) and the Have / Want tabs.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no pen test; a page change is a 160 ms crossfade and the
  title is shown at once.
- **Browsers without cross-document view transitions** change pages instantly, with no title writing. The pen test
  does not depend on view transitions, so it still plays on a fresh open.
- **Likely shape (pick what the browser check proves):** `@view-transition { navigation: auto; }` in `styles.css`; the
  turn as `clip-path` keyframes on `::view-transition-old(root)` plus a flap layer for the back of the sheet; the title
  as `view-transition-name: page-title` on each `<h1>` with a mask wipe on `::view-transition-new(page-title)`. A
  small decision function, serialized into the document like `submitOnceScript` and unit-tested, decides per load:
  fresh open (pen test on public pages), page change (turn and title), back / forward (`back` view-transition type), or
  refinement (skip the transition, via `pageswap` / `pagereveal`). The sheet, ball and pen are server-rendered markup
  in the public layout that the script starts.
- **Same ink, same paper.** Only the colour tokens (day and night), the pen strokes through `#ink-wobble`, shadows from
  the existing shadow vocabulary. No new dependency, no client component, no image file. Public pages still ship no
  client components.
- **Design direction first** (via the impeccable skill): `src-ui.md` gains a motion addendum for these moments and
  `DESIGN.md` gains their motion entries and updates "Not shipped yet", so the code doesn't contradict "nothing else
  animates".

## UI requirements

- The pen is a small drawn ballpoint (body, cone, grip lines, clip) in the ink outline style, with the post-it lift
  shadow because it is an object on the page. Concept: the prototype's pen.
- The pen-test sheet is the page's squared paper with the grid aligned to the page grid; the ball shows creases and
  shading from the ink token, and follows night through the tokens.
- The back of the turned sheet is squared paper, slightly darker than the page, so the fold reads in day and night.
- The title wipe never shifts layout and the title's box is the same before, during and after.
- Holds at 360 px and desktop, light and dark: a one-line and a two-line title, a public collection page and an admin
  item form.

## Acceptance criteria

- [x] Opening a public page fresh (from another site, a typed URL or a refresh) plays the pen test once: coil and
      flick, crumple, toss, about 1.4 s. Following a link or submitting a form inside the app does not play it. Admin
      pages never play it. (Orca browser on the production build, 2026-11-14: a typed `/` and a reload each start the
      8 pen-test animations (730 + 380 + 340 ms); frames paused at 450 / 950 / 1250 ms show coil and pen, creased ball,
      toss. A link to `/anime`, the Want tab, a toolbar submit and the admin login POST start none; a fresh `/admin`
      starts none. Back to a page first opened fresh plays none, since back/forward read
      `navigation.activation.from` in `currentLoad`, `src/lib/page-motion.ts`.)
- [x] During the pen test the page under it is rendered and works: a link tapped mid-animation navigates, and the
      sheet, ball and pen are `aria-hidden` with `pointer-events: none`. (Pen test paused at 1000 ms at 360 px:
      `elementFromPoint` on the Want link hit the link, and clicking it navigated to `/anime/want`. Server HTML:
      `<div aria-hidden="true" class="pen-test">` and `<svg aria-hidden="true" … class="page-pen">`; built CSS gives
      both `pointer-events:none`.)
- [x] With JavaScript disabled, public pages show at once with no pen test, and still work. (Checked from the served
      page, not a JS-off browser session: `curl /anime` has no `data-pen-test`, and the built CSS keeps the sheet
      `display:none` until the inline script sets `html[data-pen-test]`; links and forms are unchanged plain HTML.)
- [x] Following a link or submitting a form inside the app (admin and public) turns the old page from the
      bottom-right corner onto the new page in about 620 ms, with the back of the sheet visible as it folds. (Orca:
      `/` → `/anime` dark, collection settings → `/admin/c/anime` light, collection → item form dark, and the login
      POST → `/admin` each ran type `turn` with clip animations on `::view-transition-old(root)` and
      `::view-transition-image-pair(page-flap)`, 620 ms ease-in-out. Frames at 250 / 300 ms show the fold
      perpendicular to the diagonal and the darker squared back with its shadow. Geometry: `turnFrames` tests.)
- [x] On a page change, the new page's `<h1>` writes itself left to right with the pen riding along, at most 900 ms,
      starting as the turn clears it; nothing else on the page animates. (Frames at 508 ms ("Anime") and 640 ms (the
      two-line "Frieren: Beyond Journey's End", both lines wiped together) show the wipe with the pen on its edge; the
      only animations are the four view-transition ones. Duration `min(900, 45 × chars)`, delay from `turnClears`,
      tested in `page-motion.test.ts`.)
- [x] Back and forward turn the page the other way and write the title. (`history.go(-2)` from `/anime/want` to `/`:
      type `back`; the clip on `::view-transition-new(root)` and the flap run with `direction: reverse`, plus the
      title and pen animations.)
- [x] Changing sort, search, filter or group in the list toolbar, and switching the Have / Want tab, changes the page
      with no turn and no title writing. (Orca: `/anime` → `/anime/want`, and a toolbar submit to
      `/anime/want?…&dir=desc`, ran no animations and no turn type (`skipTransition`). Unit tests "skips a query-only
      change on the same path" and "skips the Have / Want tab switch".)
- [x] With `prefers-reduced-motion: reduce`, there is no pen test, a page change is a 160 ms crossfade and the title
      shows at once. (`orca set media --reduced-motion reduce`: a fresh `/vinyl-records` set no `data-pen-test` and
      ran no animations. Replaying the head script on a view transition added no types and left only the UA fade-in /
      fade-out at 160 ms, so there is no `page-title` group.)
- [ ] In a browser without cross-document view transitions, pages change instantly with no title writing, and the
      pen test still plays on a fresh public open. (Open: not checked in such a browser, because headless Firefox
      hung on 2026-11-14. From the code: the turn and title run only inside `pagereveal` when `event.viewTransition`
      exists, and the pen test is its own WAAPI-only script, which in Chromium already plays on fresh opens, where no
      transition exists.)
- [x] Only colour tokens and `#ink-wobble`; no `.tsx` gains a hex or `rgb()` value; no new dependency, image asset or
      client component. (`src/ui/page-motion.tsx` has no colour values; the CSS uses `--color-*`, `--shadow-postit`,
      and `#000` only as a mask; `package.json` unchanged; no `'use client'`, no image files.)
- [x] Unit tests cover the decision function: fresh open on a public page (pen test), fresh open on an admin page
      (nothing), reload (pen test on public), in-app link (turn), back / forward (`back` type), query-only change on
      the same path (skip), Have / Want tab switch (skip). (`src/lib/page-motion.test.ts`: one case each under
      `pageMotion`, plus `turnFrames` and `turnClears`. `npm test`: 41 files, 992 tests passed.)
- [x] `.impeccable/surfaces/src-ui.md` and `DESIGN.md` describe the pen test, page turn and handwritten title and their
      motion before the code lands. (src-ui.md "Page motion addendum" and the updated motion line; DESIGN.md
      › Components › Page motion, the shadow vocabulary, "Not shipped yet" and the shadows Don't.)
- [x] UI follows the design direction in `.impeccable/surfaces/src-ui.md` / `DESIGN.md`; live browser check at 360 px
      and desktop, light and dark, including reduced motion, on a production build. (Orca, `npm start`, 2026-11-14:
      pen test dark at 1391 px and light at 360 px; the turn dark and light at desktop. The turn at 360 px was checked
      by replaying the head script on a same-document transition, because viewport emulation resets on a
      cross-document navigation. Fixed along the way: the crumpled ball was see-through (the scrap faded to 50%), now
      opaque. The impeccable skill's detector was not run.)
- [x] Verified with the fallow skill. (`npx fallow@3.43.0 audit --base HEAD`: 11 changed files, dead code 0,
      complexity 0, duplication 0; two advisories inherited from HEAD.)

## Notes

- Decided with the owner on 2026-11-14 after the concept prototype: the original scribble, crumple and toss idea
  becomes the page load, and the page turn plus handwritten title become the page change. The pen test plays on
  public pages only, on every fresh open. The tear-off, paper plane, post-it handoff and other prototype moments are
  out of scope.
- Public pages gain JavaScript-driven motion through the inline script. That stays progressive enhancement: without
  JS the page shows and works, which keeps the "works without JavaScript in public" principle.
- A fresh open is decided from the navigation itself (navigation type `reload`, or a referrer that is not this
  origin), not from whether a view transition ran, so browsers without view transitions don't get the pen test on
  every page change.
- The page turn's fold is perpendicular to the diagonal in pixels, so its `clip-path` polygons depend on the viewport
  size. Either compute them per viewport in the script, or settle for a fixed fold angle if the browser check shows
  it reads the same.
- A two-line title is wiped left to right across both lines together; writing line by line is a later refinement if
  wanted.
- Prefer the turn over a crumple on page changes because a crumple reads as "thrown away", which is wrong after
  saving a form; a turn is neutral.
- Independent, can ship any time (TICKET-UI-05 and TICKET-UI-07 are shipped).
