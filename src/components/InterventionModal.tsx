import { useState } from 'react'
import { lessons } from '../domain/content'
import { nextInterventionPhase, type InterventionPhase } from '../domain/interventions'

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

  const next = () => setPhase((current) => nextInterventionPhase({ lessonId, phase: current }).phase)
  const finish = () => { onComplete(reflection, share); onClose() }

  return (
    <div className={`modal-backdrop phase-${phase}`} role="presentation">
      <section className="intervention" role="dialog" aria-modal="true" aria-labelledby="intervention-title">
        <p className="eyebrow">Perspective shift • {phase}</p>
        <h2 id="intervention-title">{phaseTitles[phase]}</h2>
        {phase === 'zoomout' && <><div className="observer" aria-hidden="true">◎</div><p>{lesson.trigger}</p><p>Imagine watching this choice from across the room. Take one slow breath before continuing.</p></>}
        {phase === 'explanation' && <><h3>{lesson.title}</h3><p>{lesson.explanation}</p><span className="tag">Provisional educational content</span></>}
        {phase === 'reflection' && <><label htmlFor="reflection">{lesson.question}</label><textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={500} /><label className="check-row"><input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} /> Include this reflection in my counselor report</label></>}
        {phase === 'alternative' && <><p>{lesson.healthierAction}</p><button className="calm-action" onClick={onAlternative}>Open calming alternatives</button></>}
        {phase === 'quiz' && <fieldset><legend>Which statement is safer and more accurate?</legend><label className="check-row"><input type="radio" name="quiz" onChange={() => setQuizCorrect(false)} /> A win makes the next result more likely to go my way.</label><label className="check-row"><input type="radio" name="quiz" onChange={() => setQuizCorrect(true)} /> Each new random outcome keeps its original probability.</label></fieldset>}
        {phase === 'complete' && <p>You identified a design tactic. Mastery comes from this learning—not from playing or winning.</p>}
        <div className="modal-actions">
          {phase !== 'complete' && <button className="primary" onClick={next} disabled={phase === 'quiz' && !quizCorrect}>Continue</button>}
          {phase === 'complete' && <button className="primary" onClick={finish}>Save lesson and return</button>}
          <button className="secondary" onClick={onClose}>Leave lesson</button>
        </div>
      </section>
    </div>
  )
}
