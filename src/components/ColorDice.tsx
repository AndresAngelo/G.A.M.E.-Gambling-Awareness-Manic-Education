import { useEffect, useRef } from 'react'
import { motion, type Transition } from 'motion/react'
import { colorFaces, type ColorId } from '../domain/games/colorGame'
import { MOTION_TOKENS } from '../motion/tokens'

export interface ColorDiceProps {
  spinToken: number // increments each time a new roll should play, even if targets repeat prior values
  targets: readonly ColorId[] | null // precomputed roll from rollColors(); null (or not exactly 3 entries) while idle
  reduced: boolean
  onSettled(): void // fires exactly once, after ALL three dice have finished tumbling
}

// Face-index convention (depended on by the CSS layer, task 13.1): index N here is exactly
// colorFaces[N], i.e. 0 = red, 1 = blue, 2 = yellow, 3 = green, 4 = white, 5 = pink, matching
// colorFaces' declared order in src/domain/games/colorGame.ts. `--die-step` is animated as an
// integer that is congruent to this index mod 6 at rest (e.g. step 17 rests on face 17 % 6 = 5,
// "pink"). The CSS strip/steps() mechanism that maps `--die-step` to a visible face must use
// this exact 0-5 ordering, cycling every 6 steps, or the rendered face will not match `target`.
const FACE_ORDER: ColorId[] = colorFaces.map((face) => face.id)

function cycleLength(faceIndex: number, extraCycles: number): number {
  return extraCycles * FACE_ORDER.length + faceIndex
}

interface DieFaceProps {
  faceId: ColorId | null
}

/** Renders one face's symbol/label from `colorFaces`, or a `?` placeholder while idle. */
function DieFace({ faceId }: DieFaceProps) {
  const face = faceId === null ? null : colorFaces.find((item) => item.id === faceId)
  return (
    <span className="die-face">
      <span aria-hidden="true">{face?.symbol ?? '?'}</span>
      <small>{face?.label ?? 'Die'}</small>
    </span>
  )
}

/**
 * The mechanical tumbling-dice animation for the Color Game. Consumes `spinToken`/`targets`
 * from the caller (`ColorGame`) and reveals the outcome only via `onSettled`, once all three
 * dice have visually finished tumbling (compute-now / animate / reveal-on-settle pattern).
 *
 * Renders exactly three dice. When `targets` is null or doesn't contain exactly three valid
 * entries, renders three placeholder dice with no animation and no settle callback.
 */
export function ColorDice({ spinToken, targets, reduced, onSettled }: ColorDiceProps) {
  // Per-die cumulative step count; mirrors RouletteWheel's `rotationRef`. Only ever grows, and
  // is never reset, so a die that lands on the same face twice in a row still has somewhere new
  // to animate to on the second roll instead of sitting still.
  const cycleRef = useRef<[number, number, number]>([0, 0, 0])
  // Counts completions for the CURRENT spinToken only; reset to 0 whenever spinToken changes so
  // completions left over from a superseded roll can never push this past 3 and double-fire
  // onSettled for a roll that didn't actually finish.
  const settledCountRef = useRef(0)

  useEffect(() => {
    settledCountRef.current = 0
    // Reacts to spinToken changing (a new roll starting), not to targets directly.
  }, [spinToken])

  const hasValidTargets =
    targets !== null &&
    targets.length === 3 &&
    targets.every((target) => FACE_ORDER.includes(target))

  if (!hasValidTargets) {
    return (
      <div className="color-dice" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div className="color-die-tumble color-die-placeholder" key={index}>
            <DieFace faceId={null} />
          </div>
        ))}
      </div>
    )
  }

  const token = MOTION_TOKENS.mechanical
  const extraCycles = reduced ? 2 : 4

  const handleOneSettled = () => {
    settledCountRef.current += 1
    if (settledCountRef.current === 3) onSettled()
  }

  return (
    <div className="color-dice" aria-hidden="true">
      {targets.map((target, index) => {
        const faceIndex = FACE_ORDER.indexOf(target)
        const base = Math.ceil(cycleRef.current[index] / FACE_ORDER.length) * FACE_ORDER.length
        const totalSteps = cycleLength(faceIndex, extraCycles) + base
        cycleRef.current[index] = totalSteps
        return (
          <motion.div
            key={index}
            className="color-die-tumble"
            style={{ ['--die-step' as string]: totalSteps } as React.CSSProperties}
            animate={{ ['--die-step' as string]: totalSteps }}
            transition={{
              duration: (reduced ? token.reducedDuration : token.duration) / 1000,
              // MotionEase is intentionally engine-agnostic in tokens.ts; asserted here at the
              // one call site that bridges it into a Motion Transition (mirrors RouletteWheel).
              ease: token.ease as Transition['ease'],
            }}
            onAnimationComplete={handleOneSettled}
          >
            <DieFace faceId={target} />
          </motion.div>
        )
      })}
    </div>
  )
}
