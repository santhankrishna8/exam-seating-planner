---
name: Invigil
description: Examination control system styled as campus wayfinding signage - blue door-sign bands, big sans numerals, one yellow marker.
colors:
  sign-blue: "oklch(0.44 0.19 262)"
  sign-blue-hover: "oklch(0.37 0.18 262)"
  sign-blue-night: "oklch(0.34 0.15 264)"
  marker-yellow: "oklch(0.89 0.17 95)"
  marker-ink: "oklch(0.22 0.04 95)"
  sign-text: "oklch(0.99 0.004 250)"
  sign-muted: "oklch(0.88 0.05 255)"
  accent: "oklch(0.46 0.20 262)"
  accent-night: "oklch(0.78 0.13 255)"
  ground: "oklch(0.982 0.004 250)"
  ground-secondary: "oklch(0.962 0.007 250)"
  ground-sunken: "oklch(0.945 0.010 250)"
  sheet: "oklch(1 0 0)"
  ground-night: "oklch(0.180 0.026 264)"
  sheet-night: "oklch(0.225 0.029 264)"
  ink: "oklch(0.21 0.03 262)"
  ink-secondary: "oklch(0.40 0.03 262)"
  ink-muted: "oklch(0.50 0.025 262)"
  ink-night: "oklch(0.96 0.008 250)"
  danger: "oklch(0.52 0.20 27)"
  success: "oklch(0.48 0.13 150)"
  caution: "oklch(0.56 0.14 65)"
  info: "oklch(0.46 0.20 262)"
  hood-blue: "oklch(0.52 0.125 255)"
  hood-slate: "oklch(0.52 0.035 262)"
  hood-ochre: "oklch(0.52 0.125 75)"
  hood-orange: "oklch(0.52 0.125 42)"
  hood-violet: "oklch(0.52 0.125 305)"
  hood-teal: "oklch(0.52 0.125 205)"
  hood-rose: "oklch(0.52 0.125 350)"
  hood-brown: "oklch(0.44 0.09 58)"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(3.1rem, 7vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Barlow Semi Condensed, Barlow, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4vw, 3.2rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Barlow Semi Condensed, Barlow, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Barlow, Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.06em"
rounded:
  sm: "5px"
  md: "7px"
  lg: "10px"
  pill: "99px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "28px"
  page-x: "44px"
components:
  button-primary:
    backgroundColor: "{colors.sign-blue}"
    textColor: "{colors.sign-text}"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.sign-blue-hover}"
  button-primary-on-sign:
    backgroundColor: "{colors.marker-yellow}"
    textColor: "{colors.marker-ink}"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  page-head:
    backgroundColor: "{colors.sign-blue}"
    textColor: "{colors.sign-text}"
    padding: "34px 0 30px"
  card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "42px"
    padding: "9px 12px"
  roundel:
    backgroundColor: "{colors.marker-yellow}"
    textColor: "{colors.marker-ink}"
    rounded: "50%"
    size: "2.1em"
---

# Design System: Invigil

## Overview

**Creative North Star: "Campus Wayfinding"**

The interface is signage. A deep signage-blue band names where you are, big semi-condensed sans numerals say where to go, and a single signal-yellow marker says "this one". Everything else is a quiet, faintly blue-tinted white ground with white sheets and near-black ink. The student's answer (hall, bench, seat) arrives as a sign; the coordinator's every page opens under a door-sign band.

The system is sans only (Barlow and Barlow Semi Condensed, self-hosted). The admin app is flat and ruled: hairline blue-tinted borders and shallow shadows, no glass, no gradients on type. Ornament there is limited to roundels (circled letter or number), arrows, and the department hood ribbon. The public landing alone is softer, after the Doblique reference the user asked for: a sky photograph hero, trays, blue gradient panels and one glass bar (see "Landing: sky and tray").

**Key Characteristics:**
- Blue is the structure: page-head band, hero, footer, active nav item, primary action, allotment cells.
- Yellow is the pointer: current thing, roundels, "your seat", primary action when sitting on blue.
- Numerals are the hero: big Barlow Semi Condensed figures, tabular and lining.
- Two themes from one token set: a light default and a deep blue-black dark slot.

## Colors

A near-white blue-tinted ground, one signage blue, one signal yellow, and eight same-lightness department hues.

### Primary
- **Signage Blue** (`sign-blue`, oklch 0.44 0.19 262): page-head bands, hero, site footer, active nav item, primary button face (`--ink-face`/`--sign`). Darkens to `sign-blue-hover` on hover. In dark it deepens to `sign-blue-night` (0.34 0.15 264) while buttons use a lighter face (0.52 0.19 262).
- **Link Blue** (`accent`, oklch 0.46 0.20 262): links, focus ring, selected borders, tinted fills (8% soft). Flips to a light sky blue (`accent-night`, 0.78 0.13 255) in dark.

### Secondary
- **Signal Yellow** (`marker-yellow`, oklch 0.89 0.17 95; 0.88 0.16 95 in dark): the only warm colour. Always a fill carrying dark `marker-ink` text (roundels, current seat, warning button, skip link, selection) or a colour/outline on top of blue (focus ring inside bands, active nav icon, breadcrumb hover, last allotment numeral, primary button inside a page-head).

### Tertiary
- **Eight hood hues**: one ribbon per department at shared lightness/chroma (L 0.52 C 0.125 light; L 0.72 C 0.12 dark) at hues 255, 75, 42, 305, 205, 350, plus a slate (C 0.035 at 262) and a brown (L 0.44, C 0.09 at 58) so no hood is green. Assigned by `utils/department.ts`.

### Neutral
- **Ground** (`ground`, 0.982 0.004 250) page; **Ground Secondary** (0.962) table heads and hover fills; **Ground Sunken** (0.945); **Sheet** (white) cards, inputs, sidebar.
- **Ink** (0.21 0.03 262), **Ink Secondary** (0.40), **Ink Muted** (0.50): text tiers. Borders are the ink hue at 14% (strong 28%, rule 7%).
- **Night**: ground 0.180, sheet 0.225, text 0.96; borders are white at 10.5% / 20%.
- **Status**: danger (0.52 0.20 27), success (0.48 0.13 150), caution (0.56 0.14 65), info (the brand blue, informational only). All lighten in dark.

### Named Rules
**The One Marker Rule.** Yellow marks the current thing. It is never body text, link text or an icon on white; on light ground it appears only as a fill with `marker-ink` text. On blue it may be text or stroke.
**The Blue Is Structure Rule.** Blue fills belong to bands, primary actions, hero, footer and the active nav item; it is not sprinkled as decoration.
**The Word And A Dot Rule.** Status badges carry a word and a dot, never colour alone.

## Typography

**Display Font:** Barlow Semi Condensed (600/700; fallback Barlow, Segoe UI, system-ui)
**Body Font:** Barlow (400/500/600/700; fallback Segoe UI, system-ui)

**Character:** Wayfinding lettering. Semi-condensed bold sign headlines with tight leading, set against a friendly humanist body. Weight and size carry hierarchy, not typeface changes.

### Hierarchy
- **Display** (700, clamp(3.1rem, 7vw, 6rem), 0.94): landing hero. Search query and allotment figures use 2.6-4.6rem at 0.95-1.
- **Headline** (700, clamp(2.1rem, 4vw, 3.2rem), 1): `.page-title` in the sign band; auth lighthouse quote up to 4.2rem.
- **Title** (700, 1.5rem, 1.05): section titles; card/slip titles 1.2-2.2rem.
- **Body** (400, 1rem, 1.5): all UI; 0.95rem in tables and buttons; captions 0.78-0.875rem. Subtitle max 64ch.
- **Label** (600, 0.75rem, 0.06em, uppercase): table heads, stat labels, sidebar group names, definition terms. Functional labels inside controls and data, never placed above a heading.

### Named Rules
**The Tabular Figures Rule.** Body sets `tnum` and `lnum`; all numerals (hall, bench, seat, tickets, dates) are tabular lining.
**The Sans Only Rule.** No serif, no monospace. `--font-mono` aliases the body face.

## Layout

Admin: a sticky 244px rail (68px collapsed; becomes a top bar under 860px) beside a `.page-content` column (max 1320px, padding 36/44px, 30/28px under 1100px, 22/16px under 700px). Each page opens with the full-bleed `.page-head`. Public pages are full-width: white nav, blue hero in a two-column grid that collapses under ~900px, a directory board of rows (roundel, destination, arrow), blue footer. Spacing is an informal 4/8-based rhythm (gaps 6, 8, 12, 14, 16, 18; section margins 24-32px). Touch targets are 44px under coarse pointers or 700px; inputs are 16px on coarse pointers.

## Elevation & Depth

Mostly flat and ruled. Depth comes from hairline borders and white sheets on a tinted ground; shadows are shallow and blue-tinted (neutral black in dark), with an inset top highlight on filled buttons.

### Shadow Vocabulary
- **sm** (`0 1px 2px oklch(0.25 0.06 264 / 0.07)`): cards, outline buttons, tables.
- **md** (`0 1px 2px ... / 0.06, 0 12px 26px -14px ... / 0.26`): raised panels.
- **lg** (`0 2px 4px ... / 0.06, 0 30px 60px -28px ... / 0.38`): dialogs and toasts.
- **ring-focus** (`0 0 0 3px` accent at 24%, 34% in dark): form-control focus.

### Named Rules
**The Print Sheet Rule.** In print, `.page-head` becomes black on white with a 2px black bottom rule and no clip; `.card` and the hall-ticket slip become white, 1px black border, square corners, no shadow. Blue bands never print.

## Shapes

Small, practical radii: 5px controls and buttons, 7px tiles, 10px cards and tables, 99px badges, 50% for roundels and avatars. Seats use 1.5-5px. The hood ribbon is a 9x15px notched book-ribbon (clip-path polygon). The page-head is a hard-edged full-bleed rectangle (no radius), spread sideways with `box-shadow: 0 0 0 100vmax` plus `clip-path: inset(0 -100vmax)`.

## Components

### Buttons
- **Shape:** 5px radius, min-height 40px (36 sm, 52 lg), 600 weight, 0.95rem.
- **Primary:** signage blue face, near-white text, 8px 18px padding; hover darkens. Inside `.page-head` it flips to signal yellow with `marker-ink` text.
- **Outline:** white face, strong border; hover turns border and text blue. Inside bands: transparent with 40% white border.
- **Ghost / success / danger / warning:** ghost is transparent secondary text; success and danger use status fills; warning is the yellow marker fill.
- **Focus:** 3px accent outline, offset 2px; marker-coloured inside page-head, hero, footer, crumb and query-head. Disabled at 45% opacity. Active nudges 0.5px.

### Page Head (door sign)
Full-bleed blue band, white 700 title (headline size), muted-sky subtitle, translucent-white badges, actions on the right, `margin: -36px 0 32px` to sit flush with the top.

### Cards / Containers
White sheet, 1px hairline border, 10px radius, shadow-sm. Tables sit in a bordered wrapper with 2px strong header rule, uppercase 0.75rem heads, tonal row hover (4.5% accent). Summary figures use a ruled strip (`.stats-grid`), not separate tiles.

### Inputs / Fields
White fill, 1px strong border, 5px radius, 42px minimum height, inset hairline shadow. Hover border goes to muted ink; focus swaps to accent border plus ring-focus; error is red border with bold red message below.

### Navigation
Sidebar rail: white, hairline right border, 44px items with 500 weight; active item is a full blue fill with white text and a yellow icon; group labels are small uppercase. Public navbar is white with brand name in Barlow Semi Condensed.

### Hood Ribbon and Roundel (signature)
The ribbon marks a department beside its name (`dept-tag`). The roundel is a yellow circle (2.1em) holding a letter or number in the head face; it is the only ornament besides arrows.

### Allotment Sign and Seat
The ticket answer is three blue cells (Hall, Bench, Seat) with 2.6-4.2rem white numerals; the last is yellow. "Your seat" in a bench strip is a yellow fill with a white gap and blue outer ring.

### Logo
Built from the name: Invigil has three i's, so the mark is three candidates on one bench (head dot, stem, shared bench bar) in a signage-blue roundel, the middle head in signal yellow: the seat that is yours. The wordmark is `invigil` in Barlow Semi Condensed 700, outlined to paths, with the three i-dots redrawn as true circles and the middle one accented (brand blue on light, yellow on blue).
- One component, `app-brand-mark`: `part="mark"` (roundel, `size` = diameter) and `part="word"` (`size` = box height; em = size, so 26-27 beside a 32px mark). Both are inline SVG driven by `--mark-bg`, `--mark-edge`, `--mark-fg`, `--mark-you`, `--mark-word`, `--mark-word-dot`; the wordmark ink is `currentColor`.
- On blue grounds the roundel turns translucent white with a white edge and the wordmark dot goes yellow (see the auth letterhead). Yellow is never the wordmark dot on white.
- Favicon: `public/favicon.svg` (hex values of the tokens, since a standalone SVG cannot read CSS variables), `favicon.ico` (32 and 48 PNGs) and `apple-touch-icon.png` (full-bleed square, figures at 80%). Regenerate all three together if the mark changes.

### Landing: sky and tray
The tray idea also reaches the app: every `.card` has a pale rim (spread shadows, so layout is untouched), 12px radius and the same soft lift, buttons are 10px, and the public navbar is glass. The page-head door sign, blue primary buttons and flat admin layout are unchanged.
Scoped to `landing.component.ts`; the admin app does not use it.
- **Hero is the drawn hall (chosen over a cloud photograph and a real-hall photograph, because it says what the product does):** a full-bleed blue gradient (`--sky-from` to `--sky-to`, deep blue in dark) carrying columns of benches seen from above, uneven like a real hall, in `--plan-bench`, with one yellow bench: the seat that is yours. A radial mask clears the middle so the headline stays clean. The same drawing makes `og.png`. If the gallery manifest names a `role: "hero"` photograph it replaces the plan; that path is below.
- **Hero photograph (optional):** a manifest entry with `role: "hero"` (never a named place, WebP with `srcset`) sits under a `--sky-wash` veil (and `--sky-dim` in dark) so text reads at 5:1 or better, melting into the page ground with a mask below the feature points. Not used by default.
- **Display type:** the headline is **Cal Sans** (`--font-display`, SIL OFL; landing h1 and h2 only, Barlow everywhere else) with loosened word spacing.
- **Tray:** 6px pale rim (18px radius, ring at 8% ink) round a white card (12px radius, hairline ring plus two soft shadows). Action cards carry their link on a "lip" beneath the card, stretched over the whole tray.
- **Blue panel (`.vis`):** 160deg gradient from sky blue to signage blue, two dashed rings, a white UI fragment or frosted orb on it. Doors swap in a manifest photograph when two or more exist.
- **Ink button:** `--btn-ink` (near-black blue; brand blue in dark) with an inset top highlight and a 1px outer ring. Yellow stays the pointer: the example seat chip, the hit row, the seat cell.
- **Bar:** clear over the sky, glass (blur 14px) once scrolled; a search pill with a "/" key hint (Ctrl or Cmd K also) jumps to the hall ticket field.

### Feedback
Toast, confirm dialog and loader share the sheet language: white sheet, lg shadow, blue primary, red for destructive. Motion is short: 0.18s ease `cubic-bezier(0.32, 0.72, 0, 1)` for state, 0.4s fade-in rise for entry, collapsed to ~0 under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** open every admin page with `.page-head` and put the primary action inside it as the yellow button.
- **Do** show hall, bench and seat as large tabular Barlow Semi Condensed numerals.
- **Do** use yellow as a fill with `marker-ink` text, or on blue.
- **Do** tag every department with its hood ribbon and every status with a word and dot.
- **Do** keep light and dark on the same tokens; add overrides only for lightness shifts.
- **Do** print official documents black on white.

### Don't:
- **Don't** use a serif, monospace costume, claret or grey paper ground (the rejected earlier world).
- **Don't** put yellow text or icons on white or paper grounds.
- **Don't** use glass, gradient text or a four-tile metric row inside the admin app; summary figures are a ruled strip. (The landing's tray cards and blue panels are the one exception.)
- **Don't** add a small kicker or eyebrow above a heading.
- **Don't** introduce a second accent colour for decoration; extra hues belong to departments only.
