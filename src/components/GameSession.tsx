import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useMotionPref } from '../motion/MotionPreferenceContext'
import { fadeRise, fastFade, resolveTransition } from '../motion/variants'

interface Props { minutes: number; onBack(): void; onAlternative(): void; children: ReactNode }

type SessionPhase = 'confirm' | 'active' | 'complete'

/**
 * Pure derivation of the session phase (Requirement 5.1, 5.2). Tolerant of any input shape:
 * an unset/null `endsAt` or a false `acknowledged` resolves to `confirm`; once `secondsLeft`
 * reaches zero or below, the phase is `complete`; otherwise `active`. Existing session data
 * (acknowledged/endsAt) is never mutated by this function — it only reads and classifies.
 */
export function phaseFor(acknowledged: boolean, endsAt: number | null, secondsLeft: number): SessionPhase {
  if (!acknowledged || endsAt === null || endsAt === undefined || Number.isNaN(endsAt)) return 'confirm'
  if (!Number.isFinite(secondsLeft) || secondsLeft <= 0) return 'complete'
  return 'active'
}

export function GameSession({ minutes, onBack, onAlternative, children }: Props) {
  const { reduced } = useMotionPref()
  const [acknowledged, setAcknowledged] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (endsAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  // seconds is only meaningful once endsAt is set; guard so we never compute against null.
  const seconds = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))
  const phase = phaseFor(acknowledged, endsAt, endsAt === null ? Number.POSITIVE_INFINITY : seconds)
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  let phaseNode: ReactNode
  if (phase === 'confirm') {
    phaseNode = (
      <section className="session-confirm" aria-labelledby="session-confirm-title">
        <p className="eyebrow">Before this simulation</p>
        <h1 id="session-confirm-title">Start a bounded learning session?</h1>
        <div className="notice warning">This game uses fictional credits and recognizable gambling mechanics. It may trigger urges. Playing earns no mastery and the timer creates a firm stopping point.</div>
        <label className="check-row">
          <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I understand this is a no-money educational simulation and I can stop now.
        </label>
        <button className="primary full-width" disabled={!acknowledged || minutes <= 0} onClick={() => { setNow(Date.now()); setEndsAt(Date.now() + minutes * 60_000) }}>Start {minutes}-minute learning session</button>
        <button className="calm-action" onClick={onAlternative}>Choose a calming alternative instead</button>
        <button className="secondary full-width" onClick={onBack}>Return home</button>
      </section>
    )
  } else if (phase === 'complete') {
    phaseNode = (
      <section className="session-complete" aria-labelledby="session-end-title">
        <p className="eyebrow">Natural stopping point</p>
        <h1 id="session-end-title">This casino-learning session is complete</h1>
        <p>The games are paused. Your report, settings, and calming alternatives remain available.</p>
        <button className="calm-action" onClick={onAlternative}>Choose a healthier alternative</button>
        <button className="secondary full-width" onClick={onBack}>Return home</button>
      </section>
    )
  } else {
    phaseNode = (
      <>
        <div className="session-timer" role="status"><span>Learning-session boundary</span><strong>{label}</strong></div>
        {children}
      </>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {/* 'element' tier: this is a phase-swap within a single session view, not a top-level
          view navigation (that's the 'view' tier, used in App.tsx). No `custom` prop per
          Requirement 5.4 — phases only ever advance one direction (confirm -> active -> complete).

          Requirement 5.5/5.6 (queue a timer-driven phase change that arrives mid-exit, applying
          only the latest one, only after the in-flight exit settles): verified against the
          installed framer-motion@13.2.0 source (which motion/react re-exports) that
          AnimatePresence's own `mode="wait"` implementation already guarantees this for a single
          keyed child. Internally it keeps a `pendingPresentChildren` ref that is overwritten with
          the newest children on every render, while the currently-exiting child is left untouched
          and is the only thing rendered until it reports exit-complete; only then does it commit
          `pendingPresentChildren.current` (whatever the latest value is at that moment) as the
          next rendered child. So if `phase` changed more than once while a previous phase's exit
          was still animating, only the most recent `phase` would ever be committed — any
          intermediate value is discarded by AnimatePresence itself, never mounted, and the
          in-flight exit is never interrupted or overlapped. No extra pending-phase state is
          needed here: `phase` is derived fresh every render from `phaseFor`, and because it only
          ever advances confirm -> active -> complete (and `complete` is a stable fixed point once
          `endsAt` has elapsed), there is no scenario where a discarded intermediate phase would
          be user-visible or safety-relevant even in the generic case above. */}
      <motion.div
        key={phase}
        variants={reduced ? fastFade : fadeRise}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={resolveTransition('element', reduced)}
      >
        {phaseNode}
      </motion.div>
    </AnimatePresence>
  )
}
