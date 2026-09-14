# Implementation Plan: UI Motion & Transitions

## Overview

Implementation proceeds in the dependency order the design establishes: pin the `motion` dependency, build `src/motion/` bottom-up (tokens → preference hook → context → variants), wire the three decorative transition sites (App view navigation, GameSession phases, InterventionModal nested layers), then the three mechanical animations with their reveal-timing wiring (RouletteWheel/RouletteGame, ColorDice/ColorGame, FlipCard across the three card games), then the CSS mechanisms, focus management, and the test-suite migration.

Language: TypeScript / React 19 (matching the existing codebase and the design's code sketches). Property-based tests use a property library added under devDependencies at an exact pinned version.

## Tasks

- [ ] 1. Motion dependency and timing tokens
  - [ ] 1.1 Add the `motion` dependency pinned to an exact version
    - Add `motion` to `package.json` dependencies as a bare exact version string with no `^`, `~`, `>`, `<`, or `*`
    - Add the property-based test library to devDependencies, also exact-pinned
    - Confirm the package resolves and `motion/react` is importable
    - _Requirements: 1.1, 1.2_

  - [ ] 1.2 Create `src/motion/tokens.ts`
    - Define `MotionTier` as the exactly-three-member union `'view' | 'element' | 'mechanical'`, `MotionEase`, and `MotionToken`
    - Define `EASE_DECORATIVE`, `EASE_MECHANICAL`, `MECHANICAL_FLOOR_MS = 150`, `MECHANICAL_MIN_MS`, `FALLBACK_REDUCED_RATIO`, and the curated `REDUCED_DURATION_MS` table
    - Implement `compress(duration, reduced)` with the curated-lookup → ratio-and-round → mechanical-floor path, documenting `duration >= 0` as an undefended precondition
    - Export `MOTION_TOKENS` as `Record<MotionTier, MotionToken>` with every `reducedDuration` produced by a `compress(full, true)` call, never a numeric literal
    - Export `CARD_FLIP_TOKEN` as a sibling constant, not a fourth `MOTION_TOKENS` key
    - _Requirements: 1.3, 1.4, 1.5, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9_

  - [ ]* 1.3 Write property tests for token shape and derivation
    - **Property 1: Token shape is well-formed for every tier**
    - **Property 2: Reduced durations are derived, never hand-written**
    - **Validates: Requirements 1.3, 1.5, 2.2, 2.9**

  - [ ]* 1.4 Write property tests for `compress()`
    - **Property 3: Full motion is never altered**
    - **Property 4: Reduced motion never lands slower**
    - **Property 5: Curated pairs win, otherwise ratio and rounding**
    - **Property 6: Mechanical-scale animations never collapse to instant**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.7**

- [ ] 2. Combined motion preference
  - [ ] 2.1 Create `src/motion/useMotionPreference.ts`
    - Export the `MotionPreference` interface and `useMotionPreference(settingsMotion: MotionLevel)`
    - OR-combine `settingsMotion === 'reduced'` with Motion's `useReducedMotion()`, compared as `=== true` so an unresolved or non-boolean OS value never forces reduced motion and never throws
    - Wrap the returned object in `useMemo` keyed on both inputs so the reference is stable across renders where neither changed
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Create `src/motion/MotionPreferenceContext.tsx`
    - Keep the raw `createContext` object module-private; export exactly `MotionPreferenceProvider` and `useMotionPref`
    - Make the provider the sole caller of `useMotionPreference`
    - Throw from `useMotionPref()` with an error naming the missing provider when the context is `undefined`
    - _Requirements: 3.4, 3.6, 3.8_

  - [ ] 2.3 Mount `MotionPreferenceProvider` in `App.tsx`
    - Wrap both the pre-onboarding return branch and the main return branch, passing `state.settings.motion`
    - Leave `state.settings.motion` reads out of every downstream consumer
    - _Requirements: 3.5, 3.7, 3.9_

  - [ ]* 2.4 Write property test for preference combination
    - **Property 8: Motion preference is the OR of its two inputs**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.5 Write property test for preference identity and propagation
    - **Property 9: Preference identity is stable and updates propagate**
    - **Validates: Requirements 3.3, 3.9**

- [ ] 3. Shared variants
  - [ ] 3.1 Create `src/motion/variants.ts` base variants
    - Implement `resolveTransition(tier, reduced)` converting token milliseconds to Motion's seconds
    - Export `fadeRise` (opacity plus vertical offset) and `fastFade` (opacity only, no vertical offset)
    - Keep the reduced/full branch at the call site rather than inside the variant objects
    - _Requirements: 1.6, 2.8_

  - [ ] 3.2 Add the direction-aware view variant
    - Add `NavigationDirection` to `src/motion/types.ts` and export `viewTransition` with function-valued `initial`/`exit` reading the `custom` direction
    - Mirror the offsets: forward exits to a negative offset and enters from a positive one, backward mirrors that; `animate` always rests at full opacity and zero offset
    - Resolve duration and easing from the `view` tier token
    - _Requirements: 4.4, 4.5, 4.6, 4.9_

  - [ ]* 3.3 Write property test for variant selection
    - **Property 7: Variant selection follows the reduced flag**
    - **Validates: Requirements 2.8, 4.12, 5.4**

  - [ ]* 3.4 Write property test for the direction-aware variant pair
    - **Property 11: Direction-aware variant is a mirrored pair with a neutral rest state**
    - **Validates: Requirements 4.5, 4.6, 4.9**

- [ ] 4. Checkpoint - motion foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Top-level view navigation
  - [ ] 5.1 Wire `AnimatePresence` and direction into `App.tsx`
    - Add `directionFor(nextView)` returning `'backward'` for `'home'` and `'forward'` otherwise, derived from the destination alone
    - Do NOT carry over the design sketch's `previousViewRef` and its `useEffect` — the heuristic never reads them; drop both rather than adding dead code
    - Move every `{view === 'x' && ...}` branch inside one `motion.div` keyed by `view` within a single `AnimatePresence mode="wait"`, passing `custom={direction}` on both
    - Preserve `GameSession`'s existing inner `key={view}` unchanged
    - Select `viewTransition` with `fastFade` substituted when `useMotionPref().reduced` is true, keeping the same direction resolution
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.10, 4.11, 4.12_

  - [ ]* 5.2 Write property test for navigation direction
    - **Property 10: Navigation direction is a pure function of the destination**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.12**

  - [ ]* 5.3 Write property test for navigation convergence
    - **Property 12: View navigation converges on exactly the newest destination**
    - **Validates: Requirements 4.7, 4.10, 4.11**

- [ ] 6. Game session phase transitions
  - [ ] 6.1 Refactor `GameSession.tsx` to a derived phase with one animated container
    - Add `phaseFor(acknowledged, endsAt, secondsLeft)` resolving to `confirm` when the flag is false or `endsAt` is unset, `complete` when seconds reach zero or below, `active` otherwise, and tolerating null/inconsistent inputs without throwing
    - Collapse the three early returns into sibling branches inside one `motion.div` keyed by `phase` within a single `AnimatePresence mode="wait"`, with no `custom` prop
    - Pick `fadeRise`/`fastFade` from `useMotionPref().reduced` at the call site
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Verify and enforce wait-mode queuing for the timer-driven phase change
    - Confirm against `AnimatePresence` directly that a countdown-driven `active` → `complete` key change occurring mid-animation queues rather than overlaps, since this is a timer firing with no click debounce
    - If queuing does not hold, add explicit pending-phase handling that applies at most one queued transition, discards superseded pending values, and starts only after the in-flight exit completes
    - _Requirements: 5.5, 5.6_

  - [ ]* 6.3 Write property test for session phase derivation
    - **Property 13: Session phase is a total function of its three inputs**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 6.4 Write property test for phase transition queuing
    - **Property 15: Phase transitions queue rather than overlap**
    - **Validates: Requirements 5.5, 5.6, 5.11**

- [ ] 7. Intervention modal transitions
  - [ ] 7.1 Add the outer mount/exit layer and inner phase layer to `InterventionModal.tsx`
    - Outer `AnimatePresence` with a fading `.modal-backdrop` and an `.intervention` panel entering with combined opacity, vertical offset, and scale
    - Resolve the outer backdrop and panel transitions from `resolveTransition('view', reduced)` inline, since the shared variants express no scale
    - Inner `AnimatePresence mode="wait"` keyed by `phase`, reusing the existing `phase-{phase}` class as both styling hook and animation key with no parallel key value
    - Select `fadeRise`/`fastFade` for the inner layer from `useMotionPref().reduced`
    - _Requirements: 5.7, 5.8, 5.9, 5.10_

  - [ ] 7.2 Verify nested `AnimatePresence` exit propagation
    - Check the nested arrangement against Motion's documented exit-completion propagation between nested instances rather than assuming the layers compose as sketched
    - Ensure the current phase content stays mounted until the outer exit animation completes
    - _Requirements: 5.11_

  - [ ]* 7.3 Write property test for keyed phase containers
    - **Property 14: One keyed container is mounted per animated region**
    - **Validates: Requirements 5.3, 5.8, 5.9**

- [ ] 8. Checkpoint - decorative transitions complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Roulette mechanical spin
  - [ ] 9.1 Create the `RouletteWheel` component
    - Render 37 pockets from a `WHEEL_ORDER` reproducing the physical single-zero European sequence, each at an equal angular span, with `RoulettePocket` filling colour from the existing `rouletteColor` helper
    - Accumulate a monotonically increasing `rotationRef`; add five extra full rotations at full motion and two under reduced motion, landing the target pocket at the fixed marker
    - Depend the spin effect on `spinToken`, not `target`; return early with no animation and no settle when `target` is null
    - Fire `onSettled` from Motion's `onAnimationComplete` exactly once per token increment when a target is set; mark the wheel region `aria-hidden`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10_

  - [ ]* 9.2 Write property test for wheel layout
    - **Property 16: Wheel layout is an authentic evenly spaced permutation**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 9.3 Write property test for rotation accumulation
    - **Property 17: Rotation accumulates forward and lands on the target**
    - **Validates: Requirements 6.3, 6.5, 6.9**

  - [ ]* 9.4 Write property test for spin magnitude
    - **Property 18: Spin magnitude reflects the motion preference**
    - **Validates: Requirements 6.6, 6.7**

  - [ ] 9.5 Wire `RouletteGame.tsx` to the reveal-timing pattern
    - Add `spinToken`, `pendingResult`, and the existing visible `result`/`returned` as separate state values
    - In `play()`, compute the pocket, debit the wager and emit `bet_placed` synchronously, hold the result, and bump `spinToken`
    - In `handleSettled()`, guard on a non-null held result, credit the payout, commit the visible result, emit `round_resolved` once, and set the lesson-ready flag; commit from nowhere else
    - Render `RouletteWheel` outside and separate from the unchanged `.roulette-result` live region, which keeps its pre-outcome placeholder during the spin
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

- [ ] 10. Color game mechanical tumble
  - [ ] 10.1 Create the `ColorDice` component
    - Render three dice whose faces come from `colorFaces` in the domain Color Game module, in its defined order, with a `DieFace` placeholder rendering when targets are null or fewer than three
    - Accumulate a per-die `cycleRef` that only increases, adding four extra full face cycles at full motion and two under reduced motion
    - Animate the numeric `--die-step` value and aggregate the three `onAnimationComplete` calls through a `settledCountRef` that resets on every `spinToken` change, invoking `onSettled` once per roll
    - Mark the dice region `aria-hidden`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

  - [ ] 10.2 Wire `ColorGame.tsx` to the reveal-timing pattern
    - Add `spinToken` and `pendingRoll` alongside the existing visible `roll`/`net`
    - In `play()`, compute all three faces, debit the total stake and emit `bet_placed` synchronously, hold the roll, and bump `spinToken`
    - In `handleSettled()`, guard on a non-null held roll, settle bets, credit the return, commit the visible roll, emit `round_resolved` once, and set the lesson-ready flag
    - Split the current combined region into the `aria-hidden` `ColorDice` and a separate unchanged-attribute live region for the announced result, reconciling class names against `styles.css`
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [ ]* 10.3 Write property test for dice step accumulation
    - **Property 19: Dice steps accumulate forward and land on their target faces**
    - **Validates: Requirements 7.1, 7.3, 7.4, 7.9, 7.11**

  - [ ]* 10.4 Write property test for tumble magnitude
    - **Property 20: Tumble magnitude reflects the motion preference**
    - **Validates: Requirements 7.5, 7.6**

  - [ ]* 10.5 Write property test for settle-once semantics
    - **Property 21: Settle fires exactly once per animation round**
    - **Validates: Requirements 6.8, 7.7, 7.8**

- [ ] 11. Reveal parity and wager accounting tests
  - [ ]* 11.1 Write property test for outcome reveal parity
    - **Property 22: Outcome reveal parity between sighted and announced output**
    - **Validates: Requirements 8.1, 8.2, 8.5, 8.6, 8.7**

  - [ ]* 11.2 Write property test for wager and payout timing
    - **Property 23: Wager is committed on placement, payout on settle**
    - **Validates: Requirements 8.3, 8.4, 8.10**

  - [ ]* 11.3 Write property test for live-region containment
    - **Property 24: Animated regions sit outside the announcing live region**
    - **Validates: Requirements 8.9**

- [ ] 12. Shared card flip
  - [ ] 12.1 Create the `FlipCard` component
    - Accept `frontLabel` as a plain string, plus `revealed`, `reduced`, and an optional `dealToken`
    - Animate the outer entrance rotation from the edge-on angle to the resting angle, and the inner front-face reveal rotation from `revealed`
    - Key the outer element on `dealToken` so an increment replays the entrance into an already-occupied slot
    - Resolve duration and easing only from `CARD_FLIP_TOKEN`, including its reduced duration, and expose no settle callback
    - Mark the back face `aria-hidden`
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

  - [ ] 12.2 Adopt `FlipCard` in `BlackjackGame.tsx`
    - Replace every dealt/revealed card rendering with `FlipCard`, passing `cardLabel(card)` and a `dealToken` for `hit()`-dealt cards
    - Remove any other flip or reveal implementation from the component; keep the `.blackjack-outcome` `role="status"` markup unchanged
    - _Requirements: 9.1, 8.8_

  - [ ] 12.3 Adopt `FlipCard` in `PokerGame.tsx`
    - Replace hole-card and community-board card rendering with `FlipCard`, driving the hole cards' `revealed` from existing game state
    - Keep the `.poker-outcome` live region markup unchanged
    - _Requirements: 9.1, 8.8_

  - [ ] 12.4 Adopt `FlipCard` in `TongitsGame.tsx`
    - Replace card rendering with `FlipCard`, reconciling the existing `.tongits-card` transition so it does not compete with the flip
    - Keep the `.round-win` live region markup unchanged
    - _Requirements: 9.1, 8.8_

  - [ ] 12.5 Visually verify the nested `rotateY` composition
    - Render a card dealt face-up, a card dealt face-down, a mid-flight reveal toggle, and a `dealToken` replay, confirming the outer entrance and inner reveal rotations compose on the shared axis as intended rather than trusting the numbers
    - Adjust the transform origin, `transformStyle`, or angle values if composition is wrong
    - _Requirements: 9.3, 9.5, 9.11_

  - [ ]* 12.6 Write property test for displayed card face
    - **Property 25: Displayed card face matches the latest revealed state**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.11**

  - [ ]* 12.7 Write property test for deal-token replay
    - **Property 26: Deal token replays the entrance**
    - **Validates: Requirements 9.6**

  - [ ]* 12.8 Write property test for card flip timing source
    - **Property 27: Card flip timing comes only from the card-flip token**
    - **Validates: Requirements 9.7, 9.10**

- [ ] 13. Stylesheet support
  - [ ] 13.1 Work out the `--die-step` to visible-face mechanism in `styles.css`
    - Register `--die-step` as an animatable numeric property and map it to exactly one discrete face at rest, using a stepped transform or offset into a repeating strip of the six faces
    - Verify no intermediate face is partially displayed once a die settles
    - _Requirements: 7.9_

  - [ ] 13.2 Add flip-card and wheel/dice layout styles
    - Add `.flip-card` 3D styles (preserve-3d, backface visibility, face stacking) and the roulette wheel/marker layout rules
    - Reconcile the existing blanket `prefers-reduced-motion` rule so it does not zero out the mechanical animations that must stay perceivable
    - _Requirements: 9.4, 9.8, 2.7_

- [ ] 14. Focus management
  - [ ] 14.1 Move focus to newly mounted view and modal content
    - On each view mount and modal mount, focus the new content's heading or first focusable element without waiting for the outgoing exit animation
    - Ensure focus never remains on an element detached or hidden by an exit animation, falling back to the nearest visible container
    - _Requirements: 10.6, 10.7_

  - [ ]* 14.2 Write property test for focus placement
    - **Property 29: Focus lands on live content and never on hidden content**
    - **Validates: Requirements 10.6, 10.7**

- [ ] 15. Domain purity and test migration
  - [ ]* 15.1 Write property test for domain purity
    - **Property 28: Domain rule modules stay pure and synchronous**
    - **Validates: Requirements 10.1**

  - [ ] 15.2 Migrate `App.test.tsx` to async-aware queries
    - Convert `'deals a poker hand without crashing before five cards are available'` to a `findBy*`/`waitFor` query on the community board
    - Convert `'interrupts rapid repeated roulette wagers'` to a `findBy*`/`waitFor` query on the intervention dialog
    - Apply the same treatment to any other assertion on a result, outcome banner, or newly dealt card, letting the query timeout be the failure mode
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ] 15.3 Confirm domain tests remain synchronous
    - Verify `blackjack.test.ts`, `poker.test.ts`, `tongits.test.ts`, `roulette.test.ts`, and `colorGame.test.ts` still pass with no awaits or timer advancement, and that the domain modules gained no animation, timing, or motion-preference references
    - _Requirements: 10.1, 10.2_

- [ ] 16. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 29 correctness properties in `design.md`; unit tests validate specific examples and edge cases
- Tasks 5.1, 6.2, 7.2, 12.5, and 13.1 carry forward the design's explicitly deferred implementation-phase decisions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1"] },
    { "id": 4, "tasks": ["2.3", "3.2", "2.4", "2.5"] },
    { "id": 5, "tasks": ["3.3", "3.4", "5.1", "6.1", "7.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.2", "6.3", "6.4", "7.2", "7.3", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "9.4", "9.5", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5", "12.1"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3", "12.2", "12.3", "12.4", "13.1"] },
    { "id": 10, "tasks": ["12.5", "12.6", "12.7", "12.8", "13.2", "14.1"] },
    { "id": 11, "tasks": ["14.2", "15.1", "15.2", "15.3"] }
  ]
}
```
