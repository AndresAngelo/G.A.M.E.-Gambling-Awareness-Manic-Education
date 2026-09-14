import { useEffect, useRef, useState } from 'react'
import { motion, type Transition } from 'motion/react'
import { rouletteColor } from '../domain/games/roulette'
import { MOTION_TOKENS } from '../motion/tokens'

export interface RouletteWheelProps {
  spinToken: number // increments each time a new spin should play, even if target repeats a prior value
  target: number | null // precomputed result (0-36) from spinRoulette(); null while idle
  reduced: boolean
  onSettled(): void // fires once the spin animation visually completes
}

const POCKET_COUNT = 37

// Real single-zero (European) wheel pocket order, so the rendered wheel matches an authentic
// table layout rather than a ring of ascending numbers. Verified to be a permutation of 0-36
// (37 unique values, full coverage) — see task 9.1 verification notes.
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

function angleForPocket(number: number): number {
  return (WHEEL_ORDER.indexOf(number) * 360) / POCKET_COUNT
}

interface RoulettePocketProps {
  number: number
  index: number
  total: number
}

/** A single colored pocket wedge, positioned by equal angular span around the wheel. */
function RoulettePocket({ number, index, total }: RoulettePocketProps) {
  const color = rouletteColor(number)
  const anglePerPocket = 360 / total
  const startAngle = index * anglePerPocket
  const endAngle = startAngle + anglePerPocket
  const cx = 100
  const cy = 100
  const outerR = 95
  const innerR = 40

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180
  const outerStart = { x: cx + outerR * Math.cos(toRad(startAngle)), y: cy + outerR * Math.sin(toRad(startAngle)) }
  const outerEnd = { x: cx + outerR * Math.cos(toRad(endAngle)), y: cy + outerR * Math.sin(toRad(endAngle)) }
  const innerStart = { x: cx + innerR * Math.cos(toRad(startAngle)), y: cy + innerR * Math.sin(toRad(startAngle)) }
  const innerEnd = { x: cx + innerR * Math.cos(toRad(endAngle)), y: cy + innerR * Math.sin(toRad(endAngle)) }

  const fill = color === 'green' ? '#1a7a3c' : color === 'red' ? '#b3222a' : '#1a1a1a'

  const path = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')

  const labelAngle = startAngle + anglePerPocket / 2
  const labelR = (outerR + innerR) / 2
  const labelX = cx + labelR * Math.cos(toRad(labelAngle))
  const labelY = cy + labelR * Math.sin(toRad(labelAngle))

  return (
    <g className="roulette-pocket" data-color={color}>
      <path d={path} fill={fill} stroke="#000" strokeWidth={0.5} />
      <text
        x={labelX}
        y={labelY}
        fontSize={7}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {number}
      </text>
    </g>
  )
}

/**
 * The mechanical spinning roulette wheel. Consumes `spinToken`/`target` from the caller
 * (`RouletteGame`) and reveals the outcome only via `onSettled`, once the spin animation
 * visually completes (compute-now / animate / reveal-on-settle pattern).
 */
export function RouletteWheel({ spinToken, target, reduced, onSettled }: RouletteWheelProps) {
  const rotationRef = useRef(0) // cumulative rotation; only ever increases, so a repeated target still animates
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (target === null) return
    const extraTurns = reduced ? 2 : 5
    const base = Math.ceil(rotationRef.current / 360) * 360
    const next = base + extraTurns * 360 + (360 - angleForPocket(target))
    rotationRef.current = next
    setRotation(next)
    // Reacts to spinToken changing, not target directly: a new spin is defined by the token
    // incrementing, and target is read fresh from the closure at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken])

  const token = MOTION_TOKENS.mechanical

  return (
    <div className="roulette-wheel" aria-hidden="true">
      <motion.svg
        viewBox="0 0 200 200"
        animate={{ rotate: rotation }}
        transition={{
          duration: (reduced ? token.reducedDuration : token.duration) / 1000,
          // MotionEase is intentionally engine-agnostic in tokens.ts; asserted here at the
          // one call site that bridges it into a Motion Transition (mirrors variants.ts).
          ease: token.ease as Transition['ease'],
        }}
        onAnimationComplete={() => {
          if (target !== null) onSettled()
        }}
      >
        {WHEEL_ORDER.map((number, index) => (
          <RoulettePocket key={number} number={number} index={index} total={POCKET_COUNT} />
        ))}
      </motion.svg>
      <div className="roulette-marker" aria-hidden="true" />
    </div>
  )
}
