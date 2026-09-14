---
name: G.A.M.E.
description: A coin-op machine panel — gunmetal housing, backlit-amber controls, a teal credit-counter readout
colors:
  housing: "#15181d"
  housing-plate: "#1d2129"
  housing-plate-raised: "#2a2f38"
  panel-ink: "#f2f2ee"
  panel-ink-muted: "#9aa0a8"
  panel-ink-soft: "#767c85"
  backlit-amber: "#e8b93a"
  amber-ink: "#241a02"
  counter-teal: "#4fc7ba"
  counter-teal-ink: "#052622"
  indicator-cyan: "#5fb8e0"
  emergency-red: "#b23a4a"
  hairline: "#33383f"
typography:
  display:
    fontFamily: "'Titan One', Inter, sans-serif"
    fontWeight: 400
    letterSpacing: "0"
    textTransform: "none"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    lineHeight: 1.65
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.backlit-amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.housing-plate-raised}"
    textColor: "{colors.panel-ink}"
    rounded: "{rounded.md}"
  button-calm:
    backgroundColor: "{colors.counter-teal}"
    textColor: "{colors.counter-teal-ink}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.emergency-red}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
---

# Design System: G.A.M.E.

## Overview

The product is a coin-operated arcade/videoke machine's control panel, not a mobile-simulator card floating on a desktop page. Game screens live inside beveled panel modules with backlit-amber controls and a teal credit-counter readout, mounted directly on the housing rather than nested in a second bordered frame. The system exists to solve two tensions at once: it must feel like a genuinely credible, well-made gambling-adjacent product (so a visitor takes the simulations seriously), while staying visibly calmer and less dopamine-optimized than the real casino products it teaches people to recognize — no slot-machine glow, no jackpot lighting, no gradient-heavy CTAs.

Mood: unglamorous, mechanical, trustworthy. Component philosophy: tactile and legible, not decorative — every surface reads as a physical panel module (beveled edge, recessed or raised), never a flat card floating with a drop shadow. Confirmed anti-references: the prior design's centered "phone-frame" card in an empty desktop viewport, and the generic dark-navy-dashboard-with-gold-gradient-buttons look that started this redesign.

## Colors

Housing (the machine's own gunmetal casing, dark theme) / brushed aluminum (light theme) forms the base ground. Panel plates sit on the housing at one or two elevation steps up, distinguished by bevel and a thin border rather than a different hue — the whole app is one material family, not boxes of different colored materials stacked on a page.

- **Backlit amber** (`#e8b93a` dark / `#d99a1f` light) — the one primary-action color: "Open lesson" CTAs, the brand mark, focus rings, stake selection. Used flat, never gradient.
- **Counter teal** (`#4fc7ba` dark / `#0e7c6c` light) — calm/secondary actions: "Calm an urge," win states, the wallet's accent text. Reads as a credit-counter LCD readout.
- **Indicator cyan** (`#5fb8e0` dark / `#0d5a72` light) — informational/status accents only (currently unused after the eyebrow-label removal; reserved for a future status-light use, not a color to introduce decoratively).
- **Emergency red** (`#b23a4a` / `#a3193a` light) — reserved exclusively for Quick Exit and destructive actions (Reset all local data). Never used decoratively.
- **Housing/plate neutrals** — gunmetal family in dark theme, brushed-aluminum-warm-gray family in light theme. Never pure white or pure black; both are slightly warm, matching a machined-metal surface rather than a digital-UI white.

## Typography

Display voice: **Titan One** (self-hosted via `@fontsource`, OFL-licensed, single weight 400 — already very bold by design), used for all headings and the brand wordmark in normal case at normal tracking; button labels stay uppercase for the short-CTA convention, but headings and body text do not. An earlier pass used a stencil-cut display face and forced everything uppercase; user feedback ("hard to read," "military not gamey") replaced it with Titan One's rounded, solid letterforms and dropped the blanket uppercase transform, since a face with literal cut-out gaps in its letters is a real legibility cost, not just an aesthetic one. This is the one deliberate, distinctive typographic choice; do not substitute a system font for it on new headings, and do not reintroduce forced uppercase on paragraph-adjacent text.

Body voice: Inter/system-ui at 1rem/1.65 line-height, kept deliberately as a workhorse face for paragraph text, labels, legends, and form controls — the craft rationale is that Operate-mode surfaces are well served by a plain, legible body face, and introducing a second display-caliber font would dilute the one voice that should stand out. Headings carry generous margin-bottom (20px/14px/8px for h1/h2/h3) so they don't crowd the content beneath them.

Numerals (wallet balance, session timer, credit counter, mastery percentage) use `font-variant-numeric: tabular-nums` so digits don't shift width as they update.

## Layout

The whole viewport is the housing (`.app-shell`, full-bleed, brushed micro-texture + ambient gradient). `.console` is the machine's panel assembly, itself full-width (no max-width cap — an earlier capped version left visible gaps beside the header on wide viewports): a sticky header (brand, credit counter, Quick Exit — sticky because Quick Exit is a safety control that must stay reachable regardless of scroll position) and a body split into a nav rail + main content. The persistent "No real money / local-only / provisional" strip that used to sit under the header was removed at the user's request; the same disclosures still exist contextually (Onboarding notices, Wallet's "Simulation only" notice).

Below 860px width, the nav rail is a bottom tab bar (icons + labels, `.nav-rail` in normal flow, sticky to the viewport bottom). At 860px and above, it becomes a sticky left rail (`position: sticky; top: 68px` — offset below the sticky header, `order: -1` to read visually first despite following main content in DOM order for a sane mobile tab-bar reading order). Main content is not capped to a fixed height with an internal scrollbar; the whole page scrolls naturally, which is why the header must be the thing that stays put.

There is deliberately no "phone-frame" card component anymore. A section or game screen fills the available width up to a generous `max-width: 1600px` cap on `.console`, with responsive padding (`min(5vw, 40px)`), not a small fixed-width box centered in empty space.

## Elevation & Depth

One technique, one CSS custom property pair, used everywhere: `--bevel` (raised: light-catching inset highlight top/left, inset shadow bottom/right) and `--bevel-recessed` (the same effect inverted, for sunken/readout surfaces like the wallet pill, odds notes, and session timer). Never a border stacked under a separate drop shadow ("ghost card") — a surface declares its elevation once, as a single `box-shadow` value.

## Shapes

Radius scale: `8 / 12 / 16 / 20 / 24px` plus a `999px` pill reserved for small chip-style controls only (the wallet balance pill, tags) — large CTAs and cards use `12–16px`, never a pill. One deliberate exception: `.blackjack-table`'s `45% 45% 18px 18px` radius, an intentional oval felt-table shape, not part of the systematic scale.

## Components

- **Primary button** (`.primary`): flat backlit amber, dark ink, `--bevel`. The dashboard's "Open lesson" buttons and every game's main action use this — it is the one dominant CTA color in any given view.
- **Secondary / Calm / Danger buttons**: same shape language, different flat fill (raised housing gray / counter teal / emergency red respectively).
- **Icon set** (`src/components/icons.tsx`): authored SVG, 24×24 viewbox, 2px stroke, round caps/joins — replaces every unicode glyph (◈ ◎ ▤ ← etc.) the prior passes used as icon stand-ins. Reuse this set rather than introducing emoji or a second icon language.
- **Panel module** (`.game-card`, `.mastery-card`, `.notice`, `.odds-note`, etc.): a plate mounted on the housing via `--bevel`/`--bevel-recessed`, never a border-only or shadow-only card, never nested inside another bordered container.
- **Game felt** (`.game-felt`, `.blackjack-table`, `.poker-table`, `.tongits-board`): the one place a radial-gradient "felt" material is used — deliberately fixed/unrecolored across themes (real casino felt, framed by a theme-aware outline so it doesn't look like an unstyled block on the light theme), distinct from the housing chrome around it.

## Do's and Don'ts

- Do keep the display font (Titan One) exclusive to headings and the brand mark; button labels use it too but stay uppercase, while headings do not. Don't introduce a second display-caliber face, and don't force paragraph or label text into uppercase.
- Do use flat color fills for buttons/CTAs. Don't reintroduce a gradient fill — the prior gold→orange gradient was the single most "generic AI dashboard" tell this redesign fixed.
- Do give every new panel-style surface a single `--bevel`/`--bevel-recessed` box-shadow. Don't stack a border under a separate drop shadow.
- Do keep the topbar sticky. Don't remove `position: sticky` from `.topbar` — Quick Exit's reachability at any scroll position is a safety requirement, not a style preference.
- Don't reintroduce an "eyebrow"/kicker label pattern above headings; fold genuinely useful context into a `.lead` paragraph after the heading instead, or drop it if the heading already carries it.
- Don't add a bordered "phone-frame" wrapper back around the app shell. The full-bleed housing layout is the fix for the original "floating container" complaint — reintroducing a centered fixed-width card regresses it.
