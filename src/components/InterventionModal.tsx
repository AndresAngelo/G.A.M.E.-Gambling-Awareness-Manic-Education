import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { lessons } from '../domain/content'
import { nextInterventionPhase, type InterventionPhase } from '../domain/interventions'
import { useMotionPref } from '../motion/MotionPreferenceContext'
import { fadeRise, fastFade, resolveTransition } from '../motion/variants'
import { CalmIcon } from './icons'

const PANEL_OFFSET_PX = 20
const PANEL_SCALE = 0.96
const PHASE_ORDER: InterventionPhase[] = ['zoomout', 'explanation', 'reflection', 'alternative', 'quiz', 'complete']

interface Props {
  lessonId: string
  onComplete(reflection: string, share: boolean): void
  onAlternative(): void
  onClose(): void
}

const phaseTitles: Record<InterventionPhase, string> = {
  zoomout: 'Step outside the moment',
  explanation: 'What the design was doing',
  reflection: 'Observe without judgment',
  alternative: 'Choose a different next step',
  quiz: 'Check the lesson',
  complete: 'Lesson recorded',
}

export function InterventionModal({ lessonId, onComplete, onAlternative, onClose }: Props) {
  const lesson = lessons[lessonId] ?? lessons['rapid-play']
  const [phase, setPhase] = useState<InterventionPhase>('zoomout')
  const [reflection, setReflection] = useState('')
  const [share, setShare] = useState(false)
  const [quizCorrect, setQuizCorrect] = useState(false)
  const { reduced } = useMotionPref()
  const titleRef = useRef<HTMLHeadingElement | null>(null)

  // Requirements 10.6, 10.7: focus the modal's heading as soon as it mounts,
  // independent of its own entrance animation completing. Mount-only (not
  // per-phase) — internal phase changes are not a "modal replacement".
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const next = () => setPhase((current) => nextInterventionPhase({ lessonId, phase: current }).phase)
  const finish = () => { onComplete(reflection, share); onClose() }

  const outerTransition = resolveTransition('view', reduced)
  const innerTransition = resolveTransition('element', reduced)

  return (
    <motion.div
      className={`modal-backdrop phase-${phase}`}
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={outerTransition}
    >
      <motion.section
        className="intervention"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intervention-title"
        initial={{ opacity: 0, y: PANEL_OFFSET_PX, scale: PANEL_SCALE }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: PANEL_OFFSET_PX, scale: PANEL_SCALE }}
        transition={outerTransition}
      >
        <div className="intervention-phase" aria-label={`Step ${PHASE_ORDER.indexOf(phase) + 1} of ${PHASE_ORDER.length}`}>
          {PHASE_ORDER.map((step, index) => <span key={step} className={index <= PHASE_ORDER.indexOf(phase) ? 'done' : ''} />)}
        </div>
        <h2 id="intervention-title" ref={titleRef} tabIndex={-1}>{phaseTitles[phase]}</h2>
        <AnimatePresence mode="wait">
          <motion.div
            key={`phase-${phase}`}
            variants={reduced ? fastFade : fadeRise}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={innerTransition}
          >
            {phase === 'zoomout' && <><div className="observer" aria-hidden="true"><CalmIcon /></div><p>{lesson.trigger}</p><p>Imagine watching this choice from across the room. Take one slow breath before continuing.</p></>}
            {phase === 'explanation' && <><h3>{lesson.title}</h3><p>{lesson.explanation}</p><span className="tag">Provisional educational content</span></>}
            {phase === 'reflection' && <><label htmlFor="reflection">{lesson.question}</label><textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={500} /><label className="check-row"><input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} /> Include this reflection in my counselor report</label></>}
            {phase === 'alternative' && <><p>{lesson.healthierAction}</p><button className="calm-action" onClick={onAlternative}>Open calming alternatives</button></>}
            {phase === 'quiz' && <fieldset><legend>Which statement is safer and more accurate?</legend><label className="check-row"><input type="radio" name="quiz" onChange={() => setQuizCorrect(false)} /> A win makes the next result more likely to go my way.</label><label className="check-row"><input type="radio" name="quiz" onChange={() => setQuizCorrect(true)} /> Each new random outcome keeps its original probability.</label></fieldset>}
            {phase === 'complete' && <p>You identified a design tactic. Mastery comes from this learning—not from playing or winning.</p>}
          </motion.div>
        </AnimatePresence>
        <div className="modal-actions">
          {phase !== 'complete' && <button className="primary" onClick={next} disabled={phase === 'quiz' && !quizCorrect}>Continue</button>}
          {phase === 'complete' && <button className="primary" onClick={finish}>Save lesson and return</button>}
          <button className="secondary" onClick={onClose}>Leave lesson</button>
        </div>
      </motion.section>
    </motion.div>
  )
}
