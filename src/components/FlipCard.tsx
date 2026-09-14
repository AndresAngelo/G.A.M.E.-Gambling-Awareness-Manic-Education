import { motion, type Transition } from 'motion/react'
import { CARD_FLIP_TOKEN } from '../motion/tokens'

export interface FlipCardProps {
  frontLabel: string // e.g. cardLabel(card), the face-up content (req 9.2: plain string, no per-game Card type)
  revealed: boolean // true = showing front; false = showing back (face-down)
  reduced: boolean
  dealToken?: number // optional: increments to replay the entrance flip even if `revealed` never changes
}

/**
 * Shared card-flip visual, reused by Blackjack, Poker, and Tong-its wherever a card is dealt
 * or revealed. Two independent animated `rotateY` values are in play:
 *
 * - The outer container's `rotateY` is the ENTRANCE flip: it always animates from an edge-on
 *   angle (±90deg) to a resting `0` the instant the card is first dealt (or re-dealt into the
 *   same slot via a changed `dealToken`), regardless of whether it lands face-up or face-down.
 * - The inner front face's `rotateY` is the REVEAL flip: it resolves to `0` (front showing) or
 *   `180` (front rotated out of view, back showing) depending on `revealed`.
 *
 * A card dealt face-down and revealed later (e.g. a dealer hole card) plays the entrance once
 * on deal, then separately plays the inner reveal once `revealed` flips to true. A card dealt
 * face-up from the start plays the identical entrance, but its inner reveal already rests at
 * `revealed: true` from the first render, so only the entrance is visible — no separate code
 * path is needed for either case.
 *
 * Requirement 9.11 (retargeting mid-flip if `revealed` changes again while animating): this is
 * intentionally NOT handled with any manual interruption logic. The inner face's `animate` prop
 * is driven directly off the single `revealed` boolean, so Motion's own animation retargeting
 * takes the current in-flight angle as the starting point for the new target whenever the
 * `animate` value changes mid-transition. Adding a second, competing transition here would only
 * fight that built-in behavior.
 *
 * No `onSettled`/`onAnimationComplete` prop is exposed (req 9.9): a flip only reveals
 * information the calling game's own state already holds, so there's nothing to gate.
 */
export function FlipCard({ frontLabel, revealed, reduced, dealToken }: FlipCardProps) {
  const transition: Transition = {
    duration: (reduced ? CARD_FLIP_TOKEN.reducedDuration : CARD_FLIP_TOKEN.duration) / 1000,
    // MotionEase is intentionally engine-agnostic in tokens.ts; asserted here at the call site
    // that bridges it into a Motion Transition (mirrors RouletteWheel.tsx).
    ease: CARD_FLIP_TOKEN.ease as Transition['ease'],
  }

  return (
    <motion.div
      className="flip-card"
      key={dealToken}
      initial={{ rotateY: revealed ? -90 : 90 }}
      animate={{ rotateY: 0 }}
      transition={transition}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <motion.div
        className="flip-card-inner flip-card-face flip-card-face-front"
        animate={{ rotateY: revealed ? 0 : 180 }}
        transition={transition}
        style={{ backfaceVisibility: 'hidden' }}
      >
        {frontLabel}
      </motion.div>
      <motion.div
        className="flip-card-face flip-card-face-back"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={transition}
        style={{ backfaceVisibility: 'hidden' }}
        aria-hidden="true"
      >
        🂠
      </motion.div>
    </motion.div>
  )
}
