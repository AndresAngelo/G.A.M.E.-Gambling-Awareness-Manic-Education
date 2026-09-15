import { casinoMinutesForMastery } from '../domain/state'
import type { MasteryState } from '../domain/types'
import { CheckIcon } from './icons'

const competencies = [
  ['Random outcomes', 'large-win'], ['Payment friction', 'payment-barrier'], ['Rapid play', 'rapid-play'], ['Loss chasing', 'chasing-loss'], ['Skill and variance', 'skill-variance'],
  ['House advantage', 'house-edge'], ['Near misses', 'near-miss'], ['Urgency', 'urgency'], ['Social proof', 'social-proof'], ['Healthy alternatives', 'alternative-grounding'],
] as const

export function Progress({ mastery }: { mastery: MasteryState }) {
  const minutes = casinoMinutesForMastery(mastery.points)
  const graduated = minutes === 0
  return <section aria-labelledby="progress-title"><h1 id="progress-title">Your path toward leaving</h1><div className="graduation-card"><strong>{mastery.points}%</strong><progress max="100" value={mastery.points}>{mastery.points}%</progress><p>{graduated ? 'Casino simulations are now retired. Alternatives and reports remain available.' : `${minutes} casino-learning minutes per session at this stage.`}</p></div>
    <div className="notice">The long-term curriculum is designed for a 4–6 month counselor-supported journey. This prototype stores mastery locally and never rewards wagers or wins.</div>
    <h2>Awareness competencies</h2><ul className="competency-list">{competencies.map(([title, id]) => { const complete = mastery.completedLessons.includes(id); return <li key={id}><span className="icon-tile" aria-hidden="true">{complete ? <CheckIcon /> : <span className="status-dot" />}</span><span><strong>{title}</strong><small>{complete ? 'Lesson demonstrated' : 'Not yet demonstrated'}</small></span></li> })}</ul>
    {graduated && <div className="graduated"><h2>Graduation is the goal</h2><p>You can keep your report and alternatives without returning to casino simulations. Consider uninstalling or clearing G.A.M.E. when you and your counselor decide it is time.</p></div>}
  </section>
}
