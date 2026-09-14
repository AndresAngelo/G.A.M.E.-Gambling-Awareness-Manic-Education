# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary audience is general-public prevention/literacy: people who are not (or not yet) personally affected by problem gambling, learning to recognize gambling-design patterns before they matter personally — closer to media literacy than to a clinical recovery tool. Confirmed with the user directly (2026-09-14), correcting an initial "recovery-adjacent" reading inferred from existing UI copy ("Recovery learning dashboard", "Counselor report" export). That copy remains in the current implementation but is not binding — it is pre-existing UI text from before this redesign, not a confirmed product requirement, and may be revisited if it misrepresents the confirmed audience.

Secondary/incidental: anyone already concerned about their own gambling, or a counselor/support worker, may still use it — the counselor-report export stays useful — but the product is not designed primarily around that use case.

## Product Purpose

A browser-based, no-real-money educational prototype that teaches people to notice gambling-related design patterns (rapid play, loss chasing, salient/near-miss wins, payment friction) through guided, fictional simulations of five real games (Roulette, Color Game, Blackjack, Poker, Tong-its), so they can recognize those patterns and choose safer responses before they're in a real gambling context. Success is comprehension and pattern-recognition, not engagement/session-length, retention loops, or monetization — the opposite of what a real gambling product optimizes for.

## Positioning

Teaches gambling-design literacy by putting the visitor inside a faithful simulation of the persuasive mechanics themselves (rapid play, near-misses, loss chasing, payment friction, salient wins) rather than lecturing about them abstractly — the mechanism is "experience the trick, then have it named and explained," not a slide deck or quiz bank a generic awareness resource would use.

## Operating Context

- Runs entirely client-side in a browser; no accounts, no server, no network calls. All state (progress, settings, wallet, reflections) lives in `localStorage`.
- Five simulated games, each with a "random free play" mode and a "scripted lesson" mode (a fixed, non-random scenario used to reliably demonstrate one specific pattern, e.g. a scripted near-miss or a scripted large win).
- A session-boundary model: simulations run in short, timed sessions that shorten as the user's "awareness mastery" increases, and retire entirely at a graduation state — the app is designed to need the user less over time, not more.
- Interventions interrupt gameplay at specific trigger moments (large win, rapid play, chasing losses after a loss, a simulated purchase/payment attempt) with a short guided reflection, not just a warning banner.
- A "quick exit" control is a zero-confirmation, instant navigation away (to a blank page) — this is a deliberate safety pattern from crisis/harm-reduction UX (a glance-over should not catch a confirmation dialog) and must not gain a confirmation step.
- A locally-generated, user-controlled report (opt-in reflections only) can be downloaded or printed to bring to a counselor, but this is a secondary/optional path, not the primary flow.

## Capabilities and Constraints

- No real money anywhere: wallet, purchases, and results are fictional; the product does not and must not accept payment credentials.
- Content (lesson copy, intervention text, game framing) is explicitly provisional pending review by clinical and Filipino cultural experts before broader use — copy is out of scope for this redesign; only layout, visual design, component structure, and motion are in scope, per the user's explicit instruction in this redesign request.
- Must not visually read as an actual gambling/casino product it is trying to inoculate people against (no slot-machine glow, no jackpot dopamine cues used as decoration) — yet must be visually credible/high-production-value enough that a visitor takes the simulations seriously, rather than dismissing them as a cheap or unfinished demo. This tension (credible-feeling casino simulation vs. calm educational surroundings) is the central design problem, not a side constraint.
- Two Filipino-specific games (Color Game / Perya-style, Tong-its) sit alongside three internationally familiar ones (Roulette, Blackjack, Poker) — the audience is not assumed to be exclusively Filipino, but Filipino cultural fluency is a real, intentional part of the product's identity and must not be flattened into a generic international casino look.
- Accessibility is a confirmed requirement, not optional: reduced-motion support (already implemented via a dedicated `useMotionPreference` hook/context), a light and dark theme, a high-contrast mode, and WCAG-measured contrast in the light theme (tracked in `docs/theme-contrast.md`). Any redesign must preserve or improve these, not regress them.
- Must run well as a genuine desktop web experience, not only as a mobile-simulator card centered in a desktop viewport — the current "phone frame floating in empty space" pattern has been identified as a real, unresolved layout defect, not an accepted design choice.

## Brand Commitments

No existing logo asset or pinned visual reference exists in the repository. The name/wordmark "G.A.M.E." (backronym: Gambling Awareness Manic Education) stays. No color, typography, or visual-identity constraint is binding — confirmed with the user (2026-09-14): full freedom to redesign the visual identity from scratch, including the existing gold-accent-on-navy direction.

## Evidence on Hand

- `README.md` — feature list, technology stack, safety/privacy/scope statements.
- `HANDOFF.md` — implementation history for a prior UI-motion pass; documents existing motion tokens/variants and known issues at that point in time (superseded by two subsequent fix/redesign sessions in this repo).
- `docs/theme-contrast.md` — WCAG contrast measurements for the light theme; scope notes on what is and is not covered.
- `.kiro/specs/ui-motion-transitions/` — prior spec (requirements/design/tasks) for the motion pass.
- No user research, personas, testimonials, or usage data exist. No clinical or Filipino cultural expert review has occurred yet (explicitly called out as outstanding in the README). Do not fabricate any of these.

## Product Principles

1. Teach through faithful experience, not lecture — simulations must feel like the real mechanic, or the "notice the pattern" moment doesn't land.
2. Never optimize for engagement — every design decision that would increase session length or return visits in a real gambling product is suspect here by default.
3. Calm surrounds an intense center — the games themselves can and should feel vivid/credible; the chrome, navigation, and framing around them should stay visibly calmer so the whole product doesn't read as a casino.
4. The product must work, and look intentional, at the sizes and contexts it will actually be viewed at — desktop browser included, not just an implied mobile device.
5. Nothing here is a substitute for real support — quick exit stays instant, content stays honestly labeled provisional, and no feature should imply clinical authority the product doesn't have.

## Accessibility & Inclusion

Reduced-motion preference (dedicated hook/context, already implemented), light/dark theme, a high-contrast mode, and WCAG-measured light-theme contrast (see `docs/theme-contrast.md`) are all confirmed, existing requirements this redesign must preserve or improve, not regress.
