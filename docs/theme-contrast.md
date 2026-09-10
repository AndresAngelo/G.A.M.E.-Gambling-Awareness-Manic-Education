# Light theme contrast measurements

Ratios below were computed with the WCAG 2.x relative-luminance formula for the
light-theme token pairings defined in `src/styles.css` (`.theme-light`). WCAG AA
requires >= 4.5:1 for normal body text and >= 3:1 for large text and UI
component boundaries.

These ratios are no longer hand-computed only: `src/theme-tokens.test.ts`
contains executable WCAG 2.x contrast cases that parse the ACTUAL hex token
values out of the `.theme-light` block and assert every normal-text and
safety-critical pairing below is >= 4.5:1. Gradient surfaces (offer and play)
are asserted against BOTH endpoints. If a token value drifts below AA, the
corresponding test fails with the token names and the measured ratio. The table
values are informational; the tests are the source of truth.

| Surface / pairing | Foreground | Background | Ratio | AA (normal text) |
| --- | --- | --- | --- | --- |
| Body text on frame | `#14181f` | `#ffffff` | 17.79:1 | Pass |
| Muted text on frame | `#3a4356` | `#ffffff` | 9.92:1 | Pass |
| Body text on app background | `#14181f` | `#eef1f8` | 15.74:1 | Pass |
| Safety-strip text | `#333c4f` | `#dde3f0` | 8.59:1 | Pass |
| Notice text | `#23293a` | `#eef2fb` | 12.92:1 | Pass |
| Warning notice text (inherits `.notice`) | `#23293a` | `#fbf1dc` | 12.91:1 | Pass |
| Intervention modal text (input) | `#14181f` | `#ffffff` | 17.79:1 | Pass |
| Intervention modal body (darker gradient end) | `#3a4356` | `#eef1f8` | 8.77:1 | Pass |
| Accent link/brand | `#8a5a00` | `#ffffff` | 5.93:1 | Pass |
| Cyan accent (eyebrow) | `#0d5a72` | `#ffffff` | 7.71:1 | Pass |
| Nav text | `#3a4356` | `#ffffff` | 9.92:1 | Pass |
| Nav active text | `#8a5a00` | `#dde2f2` | 4.58:1 | Pass |
| Calm action text | `#ffffff` | `#0e7c6c` | 5.10:1 | Pass |
| Danger action text | `#ffffff` | `#a3193a` | 7.62:1 | Pass |
| Report code text | `#1a1f2b` | `#f4f6fc` | 15.25:1 | Pass |
| Scenario banner text | `#4a3405` | `#fbf1dc` | 10.49:1 | Pass |

All measured pairings meet WCAG AA for normal text (lowest is 4.58:1).

## Component chrome / text surfaces (light theme, added with tokenization)

These are the newly tokenized Category-A surfaces. Ratios use the same
WCAG 2.x relative-luminance formula against the `.theme-light` token values.

| Surface / pairing | Foreground | Background | Ratio | AA (normal text) |
| --- | --- | --- | --- | --- |
| Offer text | `#12233a` | `#dbe7fb`→`#cdddf6` | 12.68→11.50:1 | Pass |
| Offer detail (small) | `#0d5a72` | `#cdddf6` (darkest) | 5.61:1 | Pass |
| Game-view label | `#3a4356` | `#ffffff` | 9.92:1 | Pass |
| Ledger negative | `#a3193a` | `#ffffff` | 7.62:1 | Pass |
| Stake button | `#1e2536` | `#dde2f2` | 11.82:1 | Pass |
| Stake button selected | `#2a1c00` | `#f2b705` | 9.13:1 | Pass |
| Play button (UI text) | `#2a1c00` | `#f2b705`→`#f08a24` | 9.13→6.62:1 | Pass |
| Zoom button | `#ffffff` | `#0e7c6c` (calm) | 5.10:1 | Pass |
| Text/link button | `#0d5a72` | `#ffffff` | 7.71:1 | Pass |
| Tag | `#2a1c00` | `#f2b705` | 9.13:1 | Pass |
| Round win | `#0e7c6c` | `#ffffff` | 5.10:1 | Pass |
| Round loss | `#a3193a` | `#ffffff` | 7.62:1 | Pass |
| Blackjack outcome (neutral) | `#1e2536` | `#dde2f2` | 11.82:1 | Pass |

The color-option selected outline (`#8a5a00`) and 2px ring (`#ffffff`) are
non-text UI indicators; selection is also conveyed by the checked radio, so
they are not the sole color cue.

## Scope notes

- Game-play visuals (playing-card faces, roulette wheel, color-game dice, poker
  and tong-its felt) keep their fixed "authentic casino" palette in both themes.
  They read against their own self-contained backgrounds (for example dark text
  on white card faces) rather than against theme surfaces, so they are out of
  scope for the theme-driven body-text contrast requirement.
- The dark theme is unchanged from the original design; these measurements cover
  the newly added light theme.
- Ratios can be reproduced with the relative-luminance formula in
  WCAG 2.1 SC 1.4.3 against the hex tokens in `.theme-light`, and are enforced
  automatically by the executable contrast cases in `src/theme-tokens.test.ts`
  (run `npm test`).
