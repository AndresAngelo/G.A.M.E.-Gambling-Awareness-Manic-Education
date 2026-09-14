# Requirements Document

## Introduction

This feature introduces a single, systematic motion language to the G.A.M.E. (Gambling Awareness Manic Education) app, replacing today's instant hard-cut rendering of view switches, modal phase changes, and game outcomes. It establishes a shared `src/motion/` module holding duration/easing tokens, a combined motion-preference signal, and reusable enter/exit variants, and it adds literal mechanical simulations for the casino-style learning games: a spinning roulette wheel, tumbling color-game dice, and flipping playing cards for Blackjack, Poker, and Tong-its.

Motion preference is honored by compressing durations toward-instant rather than by branching to a separate unanimated code path, and game outcomes are announced to assistive technology at the same moment they become visible, once the mechanical animation completes. Pure domain rule modules remain untouched, deterministic, and animation-agnostic.

## Glossary

- **Motion_Module**: The new `src/motion/` module containing motion tokens, the preference hook, the preference context, and shared variants.
- **Motion_Tokens**: The `src/motion/tokens.ts` constants exposing a duration, a reduced-motion duration, and an easing curve for each Motion_Tier, plus the sibling card-flip token.
- **Motion_Tier**: One of the three named scales used to look up a token: `view`, `element`, or `mechanical`.
- **Compress_Function**: The exported `compress(duration, reduced)` function in `src/motion/tokens.ts` that resolves a reduced-motion duration for a given full duration.
- **Mechanical_Floor**: The exported `MECHANICAL_FLOOR_MS` constant (150ms), the minimum duration a mechanical-scale animation may compress to.
- **Motion_Preference_Hook**: The `useMotionPreference(settingsMotion)` hook that OR-combines the app setting with the OS-level `prefers-reduced-motion` signal.
- **Motion_Preference_Provider**: The `MotionPreferenceProvider` React provider that supplies the combined preference to all consumers.
- **Motion_Preference_Consumer_Hook**: The `useMotionPref()` hook through which every consumer reads the combined preference.
- **App_Motion_Setting**: The persisted `state.settings.motion` value, surfaced today as the "Reduced motion" toggle in Settings.
- **OS_Motion_Signal**: The operating-system `prefers-reduced-motion` preference, read via Motion's `useReducedMotion()` hook.
- **Reduced_Motion_State**: The state in which the combined motion preference resolves to `reduced: true`.
- **View_Navigator**: The top-level view-switching region in `App.tsx` wrapped in `AnimatePresence`.
- **Navigation_Direction**: The `'forward'` / `'backward'` value derived per view change and threaded through `AnimatePresence`'s `custom` prop.
- **Session_Phase_View**: The phase-switching region of `GameSession.tsx` covering `confirm`, `active`, and `complete`.
- **Intervention_Modal**: The `InterventionModal.tsx` component, with an outer mount/exit animation layer and an inner phase-swap layer.
- **Roulette_Wheel**: The new `RouletteWheel` component rendering the mechanical spinning-wheel animation.
- **Color_Dice**: The new `ColorDice` component rendering the three tumbling dice for the Color Game.
- **Flip_Card**: The new shared `FlipCard` component rendering a card entrance flip and reveal flip.
- **Roulette_Game**: The `RouletteGame.tsx` component that owns roulette wager and reveal state.
- **Color_Game**: The `ColorGame.tsx` component that owns Color Game wager and reveal state.
- **Reveal_Phase**: The internal holding state (`idle` / `animating` / `revealed`) in which a precomputed outcome is kept before being committed to visible state.
- **Settle_Callback**: The `onSettled()` callback a mechanical animation component invokes exactly once when its animation visually completes.
- **Spin_Token**: The monotonically incrementing counter a game component bumps to signal that a new mechanical animation should play.
- **Live_Region**: An `aria-live="polite"` region or a `role="status"` element that announces a game outcome to assistive technology.
- **Domain_Game_Modules**: The pure rule modules `src/domain/games/blackjack.ts`, `poker.ts`, `tongits.ts`, `roulette.ts`, and `colorGame.ts`.

## Requirements

### Requirement 1: Single Motion Engine and Token Source

**User Story:** As a developer, I want one animation engine and one set of timing tokens, so that motion across the app feels consistent and timing values can be changed in one place.

#### Acceptance Criteria

1. THE Motion_Module SHALL use the `motion` package, imported from `motion/react`, as the only animation engine, and SHALL contain no imports from any other animation package.
2. THE `package.json` file SHALL declare the `motion` dependency as a single exact version string containing no `^`, `~`, `>`, `<`, or `*` characters.
3. THE Motion_Tokens SHALL define, for each of the three Motion_Tier values `view`, `element`, and `mechanical`, a full duration, a reduced-motion duration greater than 0 and less than or equal to the full duration, and an easing curve value.
4. THE Motion_Tokens SHALL define the card-flip token as a constant declared alongside, and not as a member of, the Motion_Tier union, so that the Motion_Tier union has exactly three members.
5. THE Motion_Tokens SHALL produce every reduced-motion duration as the return value of a call to the Compress_Function, such that no reduced-motion duration is assigned a numeric literal.
6. WHERE a component animates a view transition, an element transition, or a mechanical animation, THE component SHALL read its duration and easing curve from the Motion_Tokens rather than declaring a literal duration or an inline easing definition in its animation configuration.
7. IF a Motion_Tier name that is not one of `view`, `element`, or `mechanical` is used to look up a token, THEN THE Motion_Tokens SHALL fail at build time with a type error rather than resolving to an undefined duration.

### Requirement 2: Duration Compression Under Reduced Motion

**User Story:** As a user who prefers reduced motion, I want animations shortened rather than removed, so that I still perceive what the interface is doing without discomfort.

#### Acceptance Criteria

1. WHEN the Compress_Function is called with `reduced` equal to `false`, THE Compress_Function SHALL return the supplied duration unchanged.
2. WHEN the Compress_Function is called with `reduced` equal to `true`, THE Compress_Function SHALL return a duration greater than or equal to 0 and less than or equal to the supplied duration.
3. WHEN the Compress_Function is called with `reduced` equal to `true` and a duration present in the curated reduced-duration table, THE Compress_Function SHALL return the exact curated paired value.
4. WHEN the Compress_Function is called with `reduced` equal to `true` and a duration absent from the curated reduced-duration table, THE Compress_Function SHALL return the supplied duration scaled by the fallback ratio and rounded to the nearest whole millisecond.
5. WHEN the Compress_Function is called with `reduced` equal to `true` and a duration greater than or equal to the mechanical-scale minimum, THE Compress_Function SHALL return a duration greater than or equal to the Mechanical_Floor.
6. THE callers of the Compress_Function SHALL supply a duration greater than or equal to 0, because the Compress_Function defines a non-negative duration as its precondition.
7. WHILE the app is in Reduced_Motion_State, THE Roulette_Wheel, Color_Dice, and Flip_Card SHALL each play an animation whose duration is at least the Mechanical_Floor rather than committing the outcome without any animation.
8. WHILE the app is in Reduced_Motion_State, THE View_Navigator, Session_Phase_View, and Intervention_Modal SHALL use the fast-fade variant, which animates opacity only and no vertical offset, in place of the fade-and-rise variant.
9. THE Motion_Tokens SHALL expose, for each of the three Motion_Tier values and for the card-flip token, a reduced-motion duration equal to the value returned by the Compress_Function for that token's full duration with `reduced` equal to `true`.

### Requirement 3: Combined Motion Preference Distribution

**User Story:** As a user who set reduced motion in only one place, either in the app or in my operating system, I want that single choice honored everywhere, so that no part of the interface ignores it.

#### Acceptance Criteria

1. THE Motion_Preference_Hook SHALL resolve `reduced` to `true` when the App_Motion_Setting equals `'reduced'` or the OS_Motion_Signal reports reduced motion, and SHALL resolve `reduced` to `false` in all other cases.
2. IF the OS_Motion_Signal is absent, unreadable, or resolves to any value other than the strict boolean `true`, THEN THE Motion_Preference_Hook SHALL treat the OS_Motion_Signal as not requesting reduced motion and SHALL resolve `reduced` from the App_Motion_Setting alone without throwing an error.
3. WHILE neither the App_Motion_Setting nor the OS_Motion_Signal has changed, THE Motion_Preference_Hook SHALL return the identical preference object reference across every subsequent render.
4. THE Motion_Preference_Provider SHALL be the only caller of the Motion_Preference_Hook, so that exactly one Motion_Preference_Hook invocation exists per rendered application tree.
5. THE Motion_Preference_Provider SHALL wrap both the pre-onboarding return branch and the main return branch of `App.tsx`, so that the onboarding flow also receives the preference.
6. THE Motion_Module SHALL keep the underlying preference context object module-private and SHALL export exactly two public members from the preference context file: the Motion_Preference_Provider and the Motion_Preference_Consumer_Hook.
7. THE View_Navigator, Session_Phase_View, Intervention_Modal, onboarding flow, and all five game components SHALL read the combined preference through the Motion_Preference_Consumer_Hook rather than reading the App_Motion_Setting or the OS_Motion_Signal directly.
8. IF the Motion_Preference_Consumer_Hook is called outside a Motion_Preference_Provider, THEN THE Motion_Preference_Consumer_Hook SHALL throw an error identifying the missing provider rather than returning a default or partial preference value.
9. WHEN either the App_Motion_Setting or the OS_Motion_Signal changes while the application is mounted, THE Motion_Preference_Provider SHALL supply the newly resolved preference to every consumer on the next render without requiring a page reload.

### Requirement 4: Direction-Aware Top-Level View Transitions

**User Story:** As a user navigating between screens, I want transitions that reflect whether I am moving deeper into the app or returning to the home screen, so that navigation feels spatially coherent.

#### Acceptance Criteria

1. WHEN the destination view is `'home'`, THE View_Navigator SHALL resolve the Navigation_Direction to `'backward'` before the transition begins.
2. WHEN the destination view is any view other than `'home'`, THE View_Navigator SHALL resolve the Navigation_Direction to `'forward'` before the transition begins.
3. THE View_Navigator SHALL derive the Navigation_Direction from the destination view alone, as a pure function of that single value, without reading a stored previous-view value and without retaining any navigation history state.
4. THE View_Navigator SHALL pass the resolved Navigation_Direction as the `custom` prop of both the `AnimatePresence` wrapper and the animated view container on every render.
5. WHILE the Navigation_Direction is `'forward'`, THE View_Navigator SHALL animate the outgoing view out to a negative vertical offset at zero opacity and the incoming view in from a positive vertical offset at zero opacity to zero offset at full opacity, using the `view` Motion_Tier duration and easing from the Motion_Tokens.
6. WHILE the Navigation_Direction is `'backward'`, THE View_Navigator SHALL animate the outgoing view out to a positive vertical offset at zero opacity and the incoming view in from a negative vertical offset at zero opacity to zero offset at full opacity, using the `view` Motion_Tier duration and easing from the Motion_Tokens.
7. THE View_Navigator SHALL render all view branches inside a single animated container keyed by the current view, so that one navigation produces exactly one exit-and-enter pair.
8. THE View_Navigator SHALL preserve the existing `key` on `GameSession` that resets session state when the active game changes.
9. THE direction-aware view variant SHALL resolve its resting state to full opacity and a vertical offset of zero for both Navigation_Direction values.
10. IF a navigation is requested while a previous view transition is still running, THEN THE View_Navigator SHALL resolve the Navigation_Direction for the newest destination view and settle the newest destination view at full opacity and zero vertical offset with no view left mounted other than the newest destination.
11. IF the requested destination view equals the currently rendered view, THEN THE View_Navigator SHALL leave the rendered view mounted at full opacity and zero vertical offset rather than starting an exit-and-enter pair.
12. WHILE the Reduced_Motion_State is active, THE View_Navigator SHALL retain the same Navigation_Direction resolution while using the fast-fade variant.

### Requirement 5: Session and Intervention Phase Transitions

**User Story:** As a user moving through a game session or an intervention lesson, I want each step to transition rather than hard-cut, so that the change of content is easy to follow.

#### Acceptance Criteria

1. THE Session_Phase_View SHALL derive exactly one phase value of `confirm`, `active`, or `complete` from the acknowledged flag, the session end time, and the remaining seconds, resolving to `confirm` while the acknowledged flag is false or the session end time is unset, to `complete` once the remaining seconds reach zero or below, and to `active` otherwise.
2. IF the acknowledged flag, the session end time, and the remaining seconds are absent, null, or mutually inconsistent, THEN THE Session_Phase_View SHALL resolve the phase to `confirm`, retain the existing session data without modification, and render without an uncaught error.
3. THE Session_Phase_View SHALL render all three phase sections inside a single animated container keyed by the derived phase, within one `AnimatePresence` operating in wait mode, so that at most one phase section is mounted at any instant.
4. THE Session_Phase_View SHALL use the fade-and-rise or fast-fade variant without a `custom` prop, because session phases advance in one direction only.
5. WHEN the session countdown crosses zero while another enter or exit animation is in flight, THE Session_Phase_View SHALL queue the resulting phase transition rather than overlapping it with the in-flight animation, and SHALL apply at most one queued phase transition, discarding any earlier superseded pending phase value.
6. WHEN a queued phase transition is applied, THE Session_Phase_View SHALL begin it only after the in-flight exit animation completes.
7. THE Intervention_Modal SHALL animate its own mount and exit through an outer layer that fades the backdrop and enters the panel with combined opacity, vertical offset, and scale change.
8. THE Intervention_Modal SHALL animate phase-to-phase content changes through an inner `AnimatePresence` operating in wait mode, keyed by the current phase value.
9. THE Intervention_Modal SHALL use the existing `phase-{phase}` class value as both the styling hook and the animation key, without introducing a parallel key value.
10. THE Intervention_Modal SHALL resolve its outer backdrop and panel transitions from the Motion_Tokens at the call site, because the predefined shared variants express only opacity and vertical offset.
11. WHILE the Intervention_Modal outer exit animation is in flight, THE Intervention_Modal SHALL keep the current phase content mounted until the exit animation completes.

### Requirement 6: Mechanical Roulette Wheel Animation

**User Story:** As a learner playing the roulette simulation, I want to watch a wheel actually spin and settle on a pocket, so that the simulation reflects how a real wheel resolves an outcome.

#### Acceptance Criteria

1. THE Roulette_Wheel SHALL render exactly 37 pockets, one per number 0 to 36, arranged in the pocket sequence of a physical single-zero European wheel rather than in ascending numeric order, with each pocket occupying an equal angular span.
2. THE Roulette_Wheel SHALL derive each pocket's colour from the existing `rouletteColor` helper in the domain roulette module for all 37 pocket numbers.
3. WHEN the Spin_Token increments and the target pocket is an integer in the range 0 to 36, THE Roulette_Wheel SHALL begin a spin animation ending with the target pocket aligned to the fixed marker position.
4. IF the Spin_Token increments while the target pocket is unset, THEN THE Roulette_Wheel SHALL retain its current rotation, start no spin animation, and invoke no Settle_Callback.
5. THE Roulette_Wheel SHALL accumulate cumulative rotation in a single forward direction across spins, so that a target pocket repeating the immediately previous result still rotates by at least one full rotation.
6. WHILE the app is not in Reduced_Motion_State, THE Roulette_Wheel SHALL complete five additional full rotations before settling on the target pocket, over the mechanical-tier duration.
7. WHILE the app is in Reduced_Motion_State, THE Roulette_Wheel SHALL complete two additional full rotations before settling on the target pocket, over the reduced mechanical-tier duration.
8. WHEN the spin animation visually completes and a target pocket is set, THE Roulette_Wheel SHALL invoke the Settle_Callback exactly once per Spin_Token increment.
9. IF the Spin_Token increments while a spin animation is in progress, THEN THE Roulette_Wheel SHALL begin a new spin from its current accumulated rotation toward the new target pocket.
10. THE Roulette_Wheel SHALL be marked `aria-hidden` so that assistive technology does not announce the spinning graphic.

### Requirement 7: Mechanical Color Game Dice Animation

**User Story:** As a learner playing the Color Game simulation, I want to watch three dice tumble and settle on their faces, so that the simulation reflects how a real roll resolves an outcome.

#### Acceptance Criteria

1. THE Color_Dice SHALL render exactly three dice whose visible faces are drawn from the entries of the existing `colorFaces` definition in the domain Color Game module, in the order defined there.
2. WHEN no target roll is supplied, THE Color_Dice SHALL render three placeholder dice and SHALL apply no animation and no step advancement.
3. WHEN the Spin_Token increments, THE Color_Dice SHALL begin a tumble animation for each of the three dice ending on its supplied target face.
4. THE Color_Dice SHALL accumulate a per-die step count that only increases across rolls, adding at least one full face cycle per roll, so that a die landing on a repeated face still produces a visible tumble.
5. WHILE the app is not in Reduced_Motion_State, THE Color_Dice SHALL advance each die through four additional full face cycles before settling, over the mechanical-tier duration.
6. WHILE the app is in Reduced_Motion_State, THE Color_Dice SHALL advance each die through two additional full face cycles before settling, over the reduced mechanical-tier duration.
7. WHEN all three dice have visually completed their tumble animations, THE Color_Dice SHALL invoke the Settle_Callback exactly once per Spin_Token value.
8. WHEN the Spin_Token increments, THE Color_Dice SHALL reset its completion count to zero, so that completions from a previous roll do not carry over and no Settle_Callback from the previous roll is invoked after the reset.
9. THE Color_Dice SHALL animate a numeric step value that a CSS rule maps to exactly one discrete visible face, with no intermediate face partially displayed at rest.
10. THE Color_Dice SHALL be marked `aria-hidden` so that assistive technology does not announce the tumbling graphic.
11. IF the Spin_Token increments while a previous tumble is still in progress, THEN THE Color_Dice SHALL retain the accumulated per-die step counts and start a new tumble toward the newly supplied target faces.
12. IF fewer than three target faces are supplied, THEN THE Color_Dice SHALL render its placeholder dice, start no tumble animation, and invoke no Settle_Callback.

### Requirement 8: Outcome Reveal Timing and Announcement Parity

**User Story:** As a screen-reader user, I want to hear a game outcome at the same moment a sighted user sees it, so that the animation does not give sighted users the result first or announce mine early.

#### Acceptance Criteria

1. WHEN a player starts a roulette spin, THE Roulette_Game SHALL compute the winning pocket immediately, hold it as the Reveal_Phase result, and leave both the rendered outcome text and the Live_Region content unchanged from their pre-spin values until the Settle_Callback fires.
2. WHEN a player starts a Color Game roll, THE Color_Game SHALL compute all three face values immediately, hold them as the Reveal_Phase result, and leave both the rendered outcome text and the Live_Region content unchanged from their pre-roll values until the Settle_Callback fires.
3. WHEN a player starts a roulette spin or a Color Game roll, THE Roulette_Game and Color_Game SHALL debit the wager from the wallet and emit the bet-placed event within the same synchronous handler that increments the Spin_Token.
4. WHEN the Settle_Callback fires and a held outcome is present, THE Roulette_Game and Color_Game SHALL credit any payout to the wallet and commit the held outcome to visible state.
5. THE Roulette_Game and Color_Game SHALL commit an outcome to visible state only from the Settle_Callback, and from no other code path.
6. WHILE a mechanical animation is in progress, THE Live_Region for that game SHALL render its pre-outcome placeholder content rather than any value derived from the held outcome.
7. THE Roulette_Game and Color_Game SHALL each maintain the held outcome and the visible outcome as two separate state values, and SHALL read the visible outcome value for all rendered and announced outcome content.
8. THE Roulette_Game, Color_Game, `PokerGame.tsx`, `TongitsGame.tsx`, and `BlackjackGame.tsx` SHALL each preserve their existing Live_Region markup, attributes, and roles unchanged.
9. THE Roulette_Wheel and Color_Dice SHALL each be rendered as a region separate from the Live_Region that announces the outcome, such that no ancestor of the Roulette_Wheel or Color_Dice is the Live_Region.
10. WHEN the Settle_Callback fires and a held outcome is present, THE Roulette_Game and Color_Game SHALL emit the round-resolved event exactly once and set the lesson-ready flag alongside committing the visible outcome.
11. IF the Settle_Callback fires while no held outcome is present, THEN THE Roulette_Game and Color_Game SHALL make no wallet change, emit no event, and leave the visible outcome unchanged.

### Requirement 9: Shared Card Flip Animation

**User Story:** As a learner playing Blackjack, Poker, or Tong-its, I want dealt cards to flip in and hidden cards to flip over when revealed, so that dealing feels like a real card game.

#### Acceptance Criteria

1. THE Flip_Card SHALL be the single component used by `BlackjackGame.tsx`, `PokerGame.tsx`, and `TongitsGame.tsx` wherever a card is dealt or revealed, with no other flip or reveal animation implementation present in those three components.
2. THE Flip_Card SHALL accept the face-up content as a plain string label, so that it remains independent of any per-game card type.
3. WHEN a Flip_Card first renders, THE Flip_Card SHALL animate an entrance rotation from an edge-on angle about its vertical axis to its resting angle, whether the card is dealt face-up or face-down.
4. WHILE a card is not revealed, THE Flip_Card SHALL display its back face with its front face rotated out of view.
5. WHEN a card's revealed state changes from not revealed to revealed, THE Flip_Card SHALL animate a reveal rotation that ends with its front face in view at its resting angle.
6. WHERE a deal token is supplied and increments, THE Flip_Card SHALL replay its entrance animation from the edge-on angle, so that a card dealt into an already-occupied visual slot still animates.
7. THE Flip_Card SHALL resolve its duration and easing from the card-flip token rather than declaring a literal duration or easing value of its own.
8. THE Flip_Card SHALL mark its back face `aria-hidden`.
9. THE Flip_Card SHALL expose no settle callback, because a card flip reveals information the game state already holds.
10. WHILE Reduced_Motion_State is active, THE Flip_Card SHALL play the same entrance and reveal rotations using the card-flip token's reduced-motion duration rather than skipping either animation.
11. IF the revealed state changes while a reveal rotation is in progress, THEN THE Flip_Card SHALL animate its front face from its current angle to the angle matching the latest revealed state and end at that resting angle.

### Requirement 10: Domain Purity and Test Adaptation

**User Story:** As a developer maintaining this codebase, I want game rules to stay pure and the test suite to stay green, so that adding animation does not compromise correctness or coverage.

#### Acceptance Criteria

1. THE Domain_Game_Modules SHALL contain no references to animation, timing, delay, or motion-preference concerns, and SHALL expose only synchronous functions that return results without scheduling deferred work.
2. THE domain test files `blackjack.test.ts`, `poker.test.ts`, `tongits.test.ts`, `roulette.test.ts`, and `colorGame.test.ts` SHALL pass with all of their assertions synchronous, containing no asynchronous waits or timer advancement.
3. WHEN the `App.test.tsx` case deals a poker hand and asserts on the community board, THE test SHALL use an asynchronous query that waits for the dealt state and SHALL fail if the state is not present within the query timeout.
4. WHEN the `App.test.tsx` case fires repeated roulette wagers and asserts on the intervention dialog, THE test SHALL use an asynchronous query that waits for the dialog and SHALL fail if the dialog is not present within the query timeout.
5. WHERE a component test asserts on a game result, an outcome banner, or a newly dealt card, THE test SHALL use an asynchronous query that waits for the animation-gated state commit.
6. WHEN a view or modal replacement mounts, THE app SHALL move focus to the new content's heading or first focusable element without waiting for the outgoing exit animation to finish.
7. IF an element holding focus is detached or hidden by an exit animation, THEN THE app SHALL move focus to the nearest visible container or the newly mounted content, so that focus is never left on a detached or hidden element.
