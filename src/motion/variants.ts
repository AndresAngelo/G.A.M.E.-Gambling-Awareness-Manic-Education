// Shared Motion variant objects reused across view/element-tier consumers.
//
// Variants here express positional/opacity values only. The reduced/full branch lives at the
// call site (via resolveTransition), not inside these variant objects — see design.md's
// "Direction-aware transitions model" / Accessibility considerations for why: the same
// enter/exit structure runs for every user, just faster, and pure decorative transitions
// (unlike the mechanical wheel/dice/card animations) collapse toward the fast-fade variant
// instead of just a shorter version of the same offset animation.

import type { Transition, Variants } from 'motion/react'
import { MOTION_TOKENS, type MotionTier } from './tokens'
import type { NavigationDirection } from './types'

/**
 * Resolves a Motion `Transition` for a given tier and reduced-motion state. Token durations are
 * stored in milliseconds; Motion's `Transition.duration` is in seconds, so we divide by 1000.
 */
export function resolveTransition(tier: MotionTier, reduced: boolean): Transition {
  const token = MOTION_TOKENS[tier]
  const durationMs = reduced ? token.reducedDuration : token.duration
  return {
    duration: durationMs / 1000,
    // MotionEase is intentionally the broader `number[] | string` shape in tokens.ts (kept
    // animation-engine-agnostic); Motion's own `Transition['ease']` type is narrower, so we
    // assert here at the one call site that bridges token values into a Motion Transition.
    ease: token.ease as Transition['ease'],
  }
}

const RISE_OFFSET_PX = 12

/**
 * Fade + vertical rise/fall variant for view- and element-tier transitions. Used at full motion;
 * substituted by `fastFade` when the combined motion preference is reduced.
 */
export const fadeRise: Variants = {
  initial: { opacity: 0, y: RISE_OFFSET_PX },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -RISE_OFFSET_PX },
}

/**
 * Opacity-only substitute for `fadeRise`, used when motion is reduced (Requirement 2.8). No
 * vertical offset at all, so it never reads as a "smaller" version of the rise, just a fade.
 */
export const fastFade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const VIEW_OFFSET_PX = 24

/**
 * Direction-aware view-tier variant (Requirements 4.4-4.6, 4.9). `initial`/`exit` are
 * function-valued so Motion resolves them against the `custom` prop passed to both
 * `AnimatePresence` and the animated container — the sign of the vertical offset flips per
 * `NavigationDirection`, mirroring "moving deeper" (forward) against "returning" (backward).
 * `animate` is a plain object because the resting state (full opacity, zero offset) is the same
 * for both directions (Requirement 4.9).
 *
 * The full-motion `view`-tier transition is baked in here (via `resolveTransition('view', false)`)
 * rather than left for the call site, because Motion resolves a variant's own `transition` field
 * once per key and this variant has no full/reduced branch of its own — the call site substitutes
 * `fastFade` entirely for reduced motion (matching the existing fadeRise/fastFade swap pattern),
 * so `viewTransition` itself never needs to express a reduced branch.
 */
export const viewTransition: Variants = {
  initial: (direction: NavigationDirection) => ({
    opacity: 0,
    y: direction === 'forward' ? VIEW_OFFSET_PX : -VIEW_OFFSET_PX,
    transition: resolveTransition('view', false),
  }),
  animate: { opacity: 1, y: 0, transition: resolveTransition('view', false) },
  exit: (direction: NavigationDirection) => ({
    opacity: 0,
    y: direction === 'forward' ? -VIEW_OFFSET_PX : VIEW_OFFSET_PX,
    transition: resolveTransition('view', false),
  }),
}
