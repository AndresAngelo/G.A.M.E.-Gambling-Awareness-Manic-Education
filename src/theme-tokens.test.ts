import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// These assertions guard the light-theme tokenization work without a browser:
// they confirm the component-chrome tokens exist in BOTH the dark (:root) and
// light (.theme-light) blocks, and that the tokenized Category-A rules no
// longer carry raw hard-coded colors. They do NOT assert rendered contrast
// (that requires a browser / the documented ratios in docs/theme-contrast.md).

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')

function block(selector: string): string {
  const start = css.indexOf(selector)
  expect(start, `${selector} block not found`).toBeGreaterThan(-1)
  const open = css.indexOf('{', start)
  // Find the matching closing brace for this top-level block.
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) return css.slice(open + 1, i)
    }
  }
  throw new Error(`unterminated ${selector} block`)
}

const NEW_TOKENS = [
  '--color-offer-grad-1',
  '--color-offer-grad-2',
  '--color-offer-text',
  '--color-offer-detail',
  '--color-win-text',
  '--color-loss-text',
  '--color-negative-text',
  '--color-stake-bg',
  '--color-stake-text',
  '--color-stake-selected-bg',
  '--color-stake-selected-text',
  '--color-play-grad-1',
  '--color-play-grad-2',
  '--color-play-text',
  '--color-play-shadow',
  '--color-link-text',
  '--color-tag-bg',
  '--color-tag-text',
  '--color-selected-outline',
  '--color-selected-ring',
  '--color-outcome-bg',
  '--color-outcome-text',
  '--color-felt-frame-border',
  '--color-felt-frame-shadow',
]

describe('light-theme component tokens', () => {
  const rootBlock = block(':root {')
  const lightBlock = block('.theme-light {')

  it.each(NEW_TOKENS)('defines %s in both dark and light themes', (token) => {
    expect(rootBlock, `${token} missing from :root`).toContain(`${token}:`)
    expect(lightBlock, `${token} missing from .theme-light`).toContain(`${token}:`)
  })

  it('tokenizes Category-A chrome rules (no raw hex left)', () => {
    const rules = [
      '.offer {',
      '.offer small {',
      '.negative {',
      '.tag {',
      '.stake-picker button {',
      '.stake-picker button.selected {',
      '.zoom-button {',
      '.text-button {',
      '.round-win {',
      '.round-loss {',
      '.blackjack-outcome {',
      '.color-option:has(input:checked) {',
      '.game-top label, .game-view > label {',
    ]
    for (const rule of rules) {
      const body = block(rule)
      expect(body, `${rule} still contains a raw hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('keeps the felt frame invisible in dark theme and soft in light', () => {
    expect(rootBlock).toMatch(/--color-felt-frame-border:\s*transparent/)
    expect(lightBlock).toMatch(/--color-felt-frame-border:\s*#[0-9a-fA-F]{6}/)
  })
})

// ---- Executable WCAG 2.x contrast for the .theme-light palette ----
// These cases parse the ACTUAL hex token values out of the `.theme-light`
// block (parsed above) and compute the WCAG 2.1 SC 1.4.3 contrast ratio from
// relative luminance. They replace the previously hand-computed table in
// docs/theme-contrast.md with executable evidence. No browser is required:
// contrast is a pure function of the token hex values.

/** Reads a token's raw value out of a parsed CSS block body. */
function tokenValue(blockBody: string, token: string): string {
  const match = blockBody.match(new RegExp(`${token}:\\s*([^;]+);`))
  expect(match, `${token} not found in .theme-light block`).not.toBeNull()
  return match![1].trim()
}

/** Parses a #rgb / #rrggbb (optionally #rrggbbaa) hex string to sRGB 0..255. */
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  // Ignore any trailing alpha channel for the opaque-surface luminance math.
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  expect([r, g, b].every((v) => Number.isFinite(v)), `unparseable hex: ${hex}`).toBe(true)
  return [r, g, b]
}

/** WCAG 2.1 relative luminance for an sRGB color. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio between two hex colors (>=1, ordered light:dark). */
function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(parseHex(fg))
  const l2 = relativeLuminance(parseHex(bg))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const AA_NORMAL = 4.5

describe('light-theme WCAG 2.x contrast (executable, from parsed tokens)', () => {
  const lightBlock = block('.theme-light {')

  // Each case: human label + foreground token + background token. Backgrounds
  // that render on the frame use --color-frame-bg (white). Gradient surfaces
  // list BOTH endpoints as separate cases so neither endpoint can regress.
  const pairings: { name: string; fg: string; bg: string }[] = [
    // Core body/surface text pairings.
    { name: 'body text on frame', fg: '--color-text', bg: '--color-frame-bg' },
    { name: 'muted text on frame', fg: '--color-text-muted', bg: '--color-frame-bg' },
    { name: 'body text on app background', fg: '--color-text', bg: '--color-bg' },
    // Notice / warning chrome.
    { name: 'notice text', fg: '--color-notice-text', bg: '--color-notice-bg' },
    { name: 'warning notice text (inherits .notice color)', fg: '--color-notice-text', bg: '--color-notice-warn-bg' },
    // Intervention modal input.
    { name: 'intervention/modal input text', fg: '--color-modal-input-text', bg: '--color-modal-input-bg' },
    // Intervention modal BODY copy: p { color: var(--color-text-muted) } rendered
    // over the .intervention gradient's darker endpoint (--color-modal-bg-2).
    { name: 'intervention modal body text on darker gradient endpoint', fg: '--color-text-muted', bg: '--color-modal-bg-2' },
    // Quick-exit / danger.
    { name: 'quick-exit / danger action text', fg: '--color-danger-text', bg: '--color-danger-bg' },
    // Calm action.
    { name: 'calm action text', fg: '--color-calm-text', bg: '--color-calm-bg' },
    // Report code block.
    { name: 'report code text', fg: '--color-code-text', bg: '--color-code-bg' },
    // Scenario banner.
    { name: 'scenario banner text', fg: '--color-scenario-text', bg: '--color-scenario-bg' },
    // Navigation.
    { name: 'nav text on frame', fg: '--color-nav-text', bg: '--color-frame-bg' },
    { name: 'nav active text on active bg', fg: '--color-nav-active-text', bg: '--color-nav-active-bg' },
    // Accent / eyebrow.
    { name: 'accent (link/brand) on frame', fg: '--color-accent', bg: '--color-frame-bg' },
    { name: 'accent-cyan (eyebrow) on frame', fg: '--color-accent-cyan', bg: '--color-frame-bg' },
    // Newly tokenized component chrome. Offer + play are gradients: BOTH ends.
    { name: 'offer text on offer gradient start', fg: '--color-offer-text', bg: '--color-offer-grad-1' },
    { name: 'offer text on offer gradient end', fg: '--color-offer-text', bg: '--color-offer-grad-2' },
    { name: 'offer detail on offer gradient start', fg: '--color-offer-detail', bg: '--color-offer-grad-1' },
    { name: 'offer detail on offer gradient end (darkest)', fg: '--color-offer-detail', bg: '--color-offer-grad-2' },
    { name: 'game-view label (inherits muted text) on frame', fg: '--color-text-muted', bg: '--color-frame-bg' },
    { name: 'ledger negative text on frame', fg: '--color-negative-text', bg: '--color-frame-bg' },
    { name: 'stake button (normal) text', fg: '--color-stake-text', bg: '--color-stake-bg' },
    { name: 'stake button (selected) text', fg: '--color-stake-selected-text', bg: '--color-stake-selected-bg' },
    { name: 'play button text on play gradient start', fg: '--color-play-text', bg: '--color-play-grad-1' },
    { name: 'play button text on play gradient end', fg: '--color-play-text', bg: '--color-play-grad-2' },
    { name: 'zoom button (inherits calm) text', fg: '--color-calm-text', bg: '--color-calm-bg' },
    { name: 'text/link button text on frame', fg: '--color-link-text', bg: '--color-frame-bg' },
    { name: 'tag text', fg: '--color-tag-text', bg: '--color-tag-bg' },
    { name: 'round win text on frame', fg: '--color-win-text', bg: '--color-frame-bg' },
    { name: 'round loss text on frame', fg: '--color-loss-text', bg: '--color-frame-bg' },
    { name: 'neutral blackjack outcome text', fg: '--color-outcome-text', bg: '--color-outcome-bg' },
  ]

  it.each(pairings)('$name meets WCAG AA (>= 4.5:1) for normal text', ({ name, fg, bg }) => {
    const fgHex = tokenValue(lightBlock, fg)
    const bgHex = tokenValue(lightBlock, bg)
    const ratio = contrastRatio(fgHex, bgHex)
    expect(
      ratio,
      `${name}: ${fg} (${fgHex}) on ${bg} (${bgHex}) measured ${ratio.toFixed(2)}:1, need >= ${AA_NORMAL}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})
