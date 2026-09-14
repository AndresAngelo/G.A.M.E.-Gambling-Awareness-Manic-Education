// Duration and easing constants for the three MotionTier values, plus a card-flip sub-case
// that shares the `mechanical` tier conceptually but runs at a different concrete duration
// than the wheel/dice baseline — a flip is a fast reveal, not a multi-second spin.
//
// Reduced-motion values are curated per token rather than computed from one global ratio,
// because a single ratio applied uniformly would produce inconsistent-feeling results across
// tiers of such different scale (a 220ms fade and a 2400ms spin shouldn't compress by the same
// percentage). The curated pairs are the single source of truth — MOTION_TOKENS derives its
// reducedDuration fields by calling compress() rather than hardcoding a second, independently
// drifting number.

export type MotionTier = 'view' | 'element' | 'mechanical'
export type MotionEase = number[] | string

export interface MotionToken {
  duration: number
  reducedDuration: number
  ease: MotionEase
}

const EASE_DECORATIVE: MotionEase = [0.22, 1, 0.36, 1] // gentle ease-out; fade+rise view/element transitions
const EASE_MECHANICAL: MotionEase = [0.65, 0, 0.35, 1] // pronounced ease-in-out; spins/tumbles/flips settling into place

// Mechanical animations (wheel spin, dice tumble, card flip) represent a real outcome, not
// decoration. Per the design's Accessibility section, reduced motion may compress them but must
// never let them collapse to an instant, imperceptible swap. This is the floor compress()
// enforces for any duration it treats as mechanical-scale — it never fully skips the animation.
export const MECHANICAL_FLOOR_MS = 150

const MECHANICAL_MIN_MS = 400 // durations at/above this are assumed mechanical-scale by compress()'s fallback path
const FALLBACK_REDUCED_RATIO = 0.4

// Curated (full -> reduced) pairs for every duration defined below. compress() returns these
// exactly; the ratio/floor fallback only runs for a duration that isn't curated here yet.
const REDUCED_DURATION_MS: Record<number, number> = {
  220: 90, // view
  150: 80, // element
  2400: 900, // mechanical: wheel spin / dice tumble
  450: 150, // mechanical: card flip
}

/**
 * Scales a duration down under reduced motion. Known durations (curated above) return their
 * exact paired value; anything else falls back to a flat ratio, floored so a mechanical-scale
 * duration can never compress below MECHANICAL_FLOOR_MS.
 *
 * Preconditions: `duration >= 0`. This is an undefended precondition — callers are responsible
 * for honoring it; it is not validated or guarded against inside this function.
 * Postconditions:
 *  - `reduced === false` implies result `=== duration` (full motion is never altered).
 *  - `reduced === true` implies result `<= duration` (reduced motion never lands slower).
 *  - `reduced === true && duration >= MECHANICAL_MIN_MS` implies result `>= MECHANICAL_FLOOR_MS`.
 */
export function compress(duration: number, reduced: boolean): number {
  if (!reduced) return duration
  const curated = REDUCED_DURATION_MS[duration]
  if (curated !== undefined) return curated
  const scaled = Math.round(duration * FALLBACK_REDUCED_RATIO)
  return duration >= MECHANICAL_MIN_MS ? Math.max(MECHANICAL_FLOOR_MS, scaled) : scaled
}

export const MOTION_TOKENS: Record<MotionTier, MotionToken> = {
  view: { duration: 220, reducedDuration: compress(220, true), ease: EASE_DECORATIVE },
  element: { duration: 150, reducedDuration: compress(150, true), ease: EASE_DECORATIVE },
  // wheel spin / dice tumble baseline
  mechanical: { duration: 2400, reducedDuration: compress(2400, true), ease: EASE_MECHANICAL },
}

// Card flip is mechanical-tier by category (real outcome, same floor rule) but not the
// wheel/dice baseline duration, so it's a sibling constant rather than a 4th MOTION_TOKENS key —
// MotionTier stays the 3-value union defined in the design's data model. 450ms sits in the
// 400-600ms range appropriate for a quick card reveal, shorter than the multi-second wheel/dice.
export const CARD_FLIP_TOKEN: MotionToken = {
  duration: 450,
  reducedDuration: compress(450, true),
  ease: EASE_MECHANICAL,
}
