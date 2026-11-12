---
name: Collections
description: A collection kept on one notebook page, drawn in blue ballpoint on squared paper, with item photos as post-its.
colors:
  paper: "#fdfdfb"
  grid: "#e3e9f3"
  rule: "#b4c0da"
  ink: "#1f3a93"
  ink-soft: "#4a5f9e"
  pencil: "#555b6e"
  red-pen: "#d6312b"
  highlighter: "#fff27a"
  postit-yellow: "#ffe66d"
  postit-pink: "#ffb3c7"
  postit-blue: "#a9dcf5"
  postit-green: "#bfe8a6"
typography:
  display:
    fontFamily: "Reenie Beanie, cursive"
    fontSize: "clamp(3.5rem, 12vw, 5.75rem)"
    fontWeight: 400
    lineHeight: 0.8
  headline:
    fontFamily: "Reenie Beanie, cursive"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Kalam, cursive"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Kalam, cursive"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
  label-sm:
    fontFamily: "Kalam, cursive"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
  tab:
    fontFamily: "Kalam, cursive"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: "0.025em"
rounded:
  drawn: "6px 12px 5px 10px / 10px 6px 12px 5px"
  scrap: "3px 9px 4px 8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  grid-square: "18px"
  xl: "24px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.drawn}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.drawn}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.grid}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.red-pen}"
    typography: "{typography.label}"
    rounded: "{rounded.drawn}"
    padding: "0 16px"
    height: "44px"
  button-sm:
    typography: "{typography.label-sm}"
    padding: "0 12px"
    height: "40px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.drawn}"
    padding: "0 12px"
    height: "44px"
  tab-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.drawn}"
    padding: "0 14px"
    height: "40px"
  tab-link-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  card:
    backgroundColor: "rgb(253 253 251 / 0.6)"
    rounded: "{rounded.drawn}"
    padding: "28px 16px 16px"
  card-tab-red:
    backgroundColor: "{colors.red-pen}"
    textColor: "{colors.paper}"
    typography: "{typography.tab}"
    rounded: "{rounded.scrap}"
    padding: "0 12px"
  card-tab-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.tab}"
    rounded: "{rounded.scrap}"
    padding: "0 12px"
  badge:
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.drawn}"
    padding: "0 10px"
  badge-highlight:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.ink}"
  badge-pencil:
    textColor: "{colors.pencil}"
  postit-sm:
    backgroundColor: "{colors.postit-yellow}"
    padding: "6px"
    size: "56px"
  postit-md:
    padding: "6px"
    size: "80px"
  postit-lg:
    padding: "16px"
    size: "176px"
---

# Design System: Collections

## Overview

**Creative North Star: "The Crammed Notebook Page"**

The whole collection lives on one page of a squared-paper notebook, written and boxed in blue ballpoint. Every container, button, tab, input and chip is a box someone drew by hand: a wobbly outline traced twice, the second pass fainter and slightly off. Item images are post-its tacked onto the page with a red pin or a strip of tape, each turned a few degrees. The page is dense on purpose; the owner should see everything about a collection at once, and a relative on a phone should see the same paper and ink in one calm column.

The handwriting carries the voice. Titles are scrawled large and loose; everything you read for information is written in a neater, steadier hand that stays legible down to 360 px table data. Colour is a pen case, not a palette: blue ink for nearly everything, a red pen for marks that demand attention, a highlighter for the one thing that matters most.

The world refuses the grey database app: a neutral sidebar, hairline tables, a single blue accent on white. Dark mode is out of scope; the page is paper.

**Key Characteristics:**
- Squared paper background (18px grid) under everything.
- Double-pass wobbly pen outline on every drawn box; content inside stays crisp.
- Blue ballpoint for text and outlines, red pen for ranks, module tabs and corrections, highlighter for the top item.
- Post-its, pinned or taped and tilted, as the frame for item images.
- Two handwriting faces: scrawled display, neat set text.

## Colors

A ballpoint pen case on white squared paper: one blue ink in three strengths, one red pen, one highlighter, four post-it pads.

### Primary
- **Ballpoint Blue** (ink): all body text, every drawn outline, the filled primary button, the current tab, focus rings, caret and native accent. Contrast on paper 9.89:1.

### Secondary
- **Red Pen** (red-pen): rank numerals, the default module heading tab, the pin head on post-its, and corrections: danger buttons, the outline of an invalid input, and form error text. Contrast on paper 4.76:1, and paper text on a red tab is also 4.76:1, so red text is kept at bold weight or large rank sizes.

### Tertiary
- **Highlighter Yellow** (highlighter): a slanted marker stroke behind the active/top item's text, the highlight badge, and text selection. Ink on highlighter is 8.75:1.
- **Post-it Yellow, Pink, Blue, Green** (postit-yellow, postit-pink, postit-blue, postit-green): the four post-it pads. Only post-its use them; they never fill buttons, cards or text.

### Neutral
- **Notebook White** (paper): the page and the fill of inputs, dialogs and popovers; also the text colour on filled ink and red surfaces.
- **Grid Line Blue** (grid): the 1px lines of the squared paper, and the hover fill of secondary, ghost and tab controls.
- **Margin Rule Blue** (rule): dashed table row rules and the scrollbar thumb.
- **Faded Ink** (ink-soft): secondary text (hints, notes, empty-state copy) and the primary button's hover fill. 6.03:1 on paper.
- **Pencil Grey** (pencil): placeholders and the pencil badge, for text that is provisional. 6.63:1 on paper.

### Named Rules
**The Pen Case Rule.** Only the twelve colours above exist; the theme resets Tailwind's palette. A new colour needs a new pen, not a new shade.

**The Red Mark Rule.** Red means "look here": a rank, a module heading, or a correction (danger, error). It never decorates.

**The One Highlight Rule.** The highlighter marks the single active or top item on a surface. Two highlighted things means neither is.

## Typography

**Display Font:** Reenie Beanie (with cursive)
**Body Font:** Kalam (with cursive), weights 400 and 700

Both faces are self-hosted via Fontsource, latin subset (covers EN and NL).

**Character:** A fast, loose scrawl for anything shouted (page titles, dialog titles, rank numerals, notes on post-its) over a tidy, upright hand for everything read. The pair reads as one person writing at two speeds.

### Hierarchy
- **Display** (Reenie Beanie 400, clamp(3.5rem, 12vw, 5.75rem), line-height 0.8, balanced wrap): the page title, every h1.
- **Headline** (Reenie Beanie 400, 2.25rem, line-height 1): dialog titles, empty-state titles, rank numerals in red, notes written on a large post-it (1.875rem).
- **Body** (Kalam 400, 1rem, line-height 1.4): all set text including table data, which stays legible at 360 px.
- **Label** (Kalam 700, 1rem): buttons, tab links, form labels, legends, table headers, emphasised table titles.
- **Label small** (Kalam 700, 0.875rem): small buttons and badges. Hints use Kalam 400 at 0.875rem in faded ink.
- **Tab** (Kalam 700, 0.875rem, uppercase, 0.025em tracking, paper on red or ink): module heading tabs only.

### Named Rules
**The Two Speeds Rule.** Reenie Beanie is for things you glance at, Kalam for things you read. Never set paragraphs, form values or table data in Reenie Beanie.

**The Tabular Ink Rule.** Tables use tabular numerals so columns of numbers line up.

## Layout

The page is a single centred sheet (max width 72rem, 16px side padding, 32px from the sm breakpoint) on the full-bleed squared-paper background, whose 18px square is the page's visual unit. Layout spacing uses the default 4px scale: 4 and 8px between controls, 16px between form fields, 24px inside dialogs, 40px between modules. On desktop the admin page is a mosaic of drawn modules (a wider main column beside a narrower one from the lg breakpoint); at 360 px the same modules stack into one column, and title, tabs and actions wrap in place rather than collapsing into a menu. Tables scroll sideways inside their module instead of shrinking type. Touch targets are at least 40px (small controls) or 44px (default controls and inputs).

## Elevation & Depth

The page is flat paper; drawn boxes sit on it without shadow. Depth only belongs to things physically stuck onto the page: post-its cast a soft blue-tinted shadow, pin heads carry a small bead shadow, and popovers borrow the post-it shadow because they float over the page like a note. Dialogs dim the page with a 25% ink wash instead of a shadow.

### Shadow Vocabulary
- **Post-it lift** (`box-shadow: 1px 3px 4px rgb(31 58 147 / 0.18)`): post-its and popovers.
- **Pin head** (`box-shadow: inset -2px -2px 0 rgb(0 0 0 / 0.25), 1px 2px 2px rgb(0 0 0 / 0.25)`): the red pin on a pinned post-it.

### Named Rules
**The Stuck-On Rule.** Only objects stuck onto the page cast shadows. Drawn boxes are ink on paper and stay flat.

## Shapes

Nothing is a clean rectangle. Drawn boxes use an uneven four-corner radius (6px 12px 5px 10px / 10px 6px 12px 5px) so no two sides match, and their outline is a 2px pen line passed through a turbulence displacement filter (the shared `#ink-wobble` SVG filter, rendered once per document). A second fainter pass (1.3px, 45% opacity, offset a few pixels and rotated 0.35deg) traces it again, as if the box were drawn twice. Filled shapes (primary button, current tab, badges) drop the second pass. The outline lives on pseudo-elements so text and images inside never wobble. Paper scraps (module heading tabs) use a smaller uneven radius (3px 9px 4px 8px) and a -1.5deg turn. Post-its are square, unrounded, tilted (-3deg or 2deg) and have a folded-up bottom-right corner (12px). Pins and radios are round.

## Components

### Buttons
Hand-drawn boxes that read as ink, not chrome.
- **Shape:** drawn box (rounded drawn), double-pass wobble outline.
- **Primary:** filled ballpoint blue with paper text, single outline pass; one per surface, for the main action ("+ Add item", "Save").
- **Secondary (default):** drawn outline, ink text, transparent fill.
- **Ghost:** no box at all, an underlined ink word.
- **Danger:** outline and text in red pen, the correction mark.
- **Hover / Focus:** primary fades to faded ink; secondary and ghost fill with grid blue; danger takes a 10% red wash. Focus is a 2px dashed ink outline 3px out. Disabled drops to 50% opacity with a not-allowed cursor.
- **Sizes:** md (44px min height, 16px sides), sm (40px, 12px sides, 0.875rem).

### Chips (Badges)
- **Style:** small drawn box, single pass, bold 0.875rem.
- **Variants:** outline (ink), highlight (highlighter stroke behind ink text), pencil (grey outline and text, for provisional states).

### Cards / Containers
- **Corner Style:** drawn box.
- **Background:** paper at 60%, so the grid shows faintly through.
- **Shadow Strategy:** none (see the Stuck-On Rule).
- **Heading:** a scrap of coloured paper stuck over the top-left edge: uppercase Kalam bold on red pen (default) or ink, turned -1.5deg.
- **Internal Padding:** 28px top (clears the tab), 16px sides and bottom.

### Inputs / Fields
- **Style:** drawn box on a wrapper around the control (inputs cannot carry pseudo-elements), paper fill, ink text, pencil placeholder, 44px min height, 12px sides. Textareas start at 96px and resize vertically. Selects carry a drawn chevron.
- **Focus:** the wrapper takes the dashed ink focus ring.
- **Error:** an invalid control's box turns red pen; the error message sits under it in bold red and is announced before the hint. Hints are 0.875rem faded ink.
- **Checkbox / Radio:** the control itself is a 22px drawn box (round for radio) that wobbles; checked shows an ink tick or ink dot.

### Navigation
- **Tab links:** drawn boxes, bold ink, 40px min height; the current tab is filled with ink and paper text. Tabs are real links to separate URLs, so they work without JavaScript.
- **Links:** underlined, 1.5px thick, 4px offset.

### Tables
Ruled like a notebook: a 2px ink line under the header row, dashed rule-blue lines between rows, 8px cell padding. Sortable headers are plain links with a small drawn arrow.

### Post-it (Signature Component)
The frame for item images and notes: a square post-it in one of four pad colours, tilted left or right, fastened with a red pin or a strip of translucent tape, with a lifting corner and the post-it shadow. Sizes 56px, 80px and 176px; 6px padding (16px on the large size) keeps the paper visible around a photo. The empty state is a blank taped post-it beside a scrawled title and one action.

### Dialog and Popover
Both are drawn boxes on paper. The dialog is a native modal (max 32rem, 24px padding) with a scrawled title and a ghost close button. The popover anchors under its trigger where the browser supports it, centred otherwise, and carries the post-it shadow.

### Not shipped yet
Planned in the direction but not built, so no tokens exist for them: the post-it settle motion (rotate-and-drop on add, removed under reduced motion), the "got it!" strike-through on a bought want, real item photos inside post-its, the admin module mosaic and the public shells. Nothing in the system animates today beyond colour transitions on hover.

## Do's and Don'ts

### Do:
- **Do** draw every box, button, tab, input and chip with the double-pass wobble outline; recolour it for danger and errors rather than inventing a new border.
- **Do** keep text and outlines in ballpoint blue on paper; use faded ink for secondary text and pencil grey only for placeholders and provisional states.
- **Do** frame item images in a post-it, tilted, pinned or taped, with paper showing around the photo.
- **Do** use red pen only for ranks, module heading tabs and corrections (danger, errors), at bold or large sizes.
- **Do** use the dashed ink focus ring (2px, 3px offset) on every focusable element.
- **Do** keep controls at least 40px tall, and layouts working from 360px.

### Don't:
- **Don't** add colours outside the twelve tokens, or use post-it colours for anything but post-its.
- **Don't** highlight more than one item per surface.
- **Don't** set body text, form values or table data in Reenie Beanie.
- **Don't** give drawn boxes shadows; only post-its, pins and popovers cast them.
- **Don't** draw clean straight-cornered rectangles, hairline borders or a neutral grey sidebar: that is the grey database app this world refuses.
