import { useEffect, useState } from 'react'
import { BreathIcon, GroundingIcon, PatternIcon, WaveIcon } from './icons'
import type { ComponentType } from 'react'

interface Props { onComplete(activityId: string): void }
type Activity = 'breathing' | 'grounding' | 'pattern' | 'urge'

const activities: { id: Activity; title: string; description: string; icon: ComponentType }[] = [
  { id: 'breathing', title: 'Paced breathing', description: 'A quiet one-minute breathing cycle.', icon: BreathIcon },
  { id: 'grounding', title: '5–4–3 grounding', description: 'Reconnect attention to the room around you.', icon: GroundingIcon },
  { id: 'pattern', title: 'Steady pattern', description: 'A low-stimulation attention reset.', icon: PatternIcon },
  { id: 'urge', title: 'Urge surfing', description: 'Watch an urge rise and fall without acting on it.', icon: WaveIcon },
]

export function Alternatives({ onComplete }: Props) {
  const [active, setActive] = useState<Activity | null>(null)
  return <section aria-labelledby="alternatives-title"><h1 id="alternatives-title">Choose a quieter next step</h1><p>These practices do not award credits, streaks, jackpots, or playtime. Completion can count toward awareness mastery.</p>
    {!active && <div className="alternative-grid">{activities.map((activity) => { const Icon = activity.icon; return <button key={activity.id} className="alternative-card" onClick={() => setActive(activity.id)}><span className="icon-tile" aria-hidden="true"><Icon /></span><strong>{activity.title}</strong><small>{activity.description}</small></button> })}</div>}
    {active === 'breathing' && <TimedPractice title="Paced breathing" seconds={60} instruction={(left) => Math.ceil(left / 4) % 2 ? 'Breathe in gently' : 'Breathe out slowly'} onDone={() => { onComplete(active); setActive(null) }} />}
    {active === 'urge' && <TimedPractice title="Urge surfing" seconds={120} instruction={(left) => left > 80 ? 'Notice where the urge sits in your body.' : left > 40 ? 'Let the feeling move without feeding it.' : 'Watch the wave lower. You do not have to act.'} onDone={() => { onComplete(active); setActive(null) }} />}
    {active === 'grounding' && <Grounding onDone={() => { onComplete(active); setActive(null) }} />}
    {active === 'pattern' && <Pattern onDone={() => { onComplete(active); setActive(null) }} />}
    {active && <button className="secondary full-width" onClick={() => setActive(null)}>Stop and return</button>}
  </section>
}

function TimedPractice({ title, seconds, instruction, onDone }: { title: string; seconds: number; instruction(left: number): string; onDone(): void }) {
  const [left, setLeft] = useState(seconds)
  const [running, setRunning] = useState(false)
  useEffect(() => { if (!running || left <= 0) return; const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000); return () => clearTimeout(timer) }, [running, left])
  return <div className="practice"><div className="breathing-orb" aria-hidden="true" /><h2>{title}</h2><p className="practice-instruction" aria-live="polite">{left > 0 ? instruction(left) : 'Practice complete. Notice what changed.'}</p><progress max={seconds} value={seconds - left}>{seconds - left} seconds</progress><p>{left} seconds remaining</p><div className="practice-actions"><button className="primary" onClick={() => setRunning((value) => !value)} disabled={left <= 0}>{running ? 'Pause' : 'Start'}</button><button className="secondary" onClick={() => { setRunning(false); setLeft(seconds) }}>Reset</button><button className="calm-action" onClick={onDone}>{left <= 0 ? 'Record practice' : 'Finish early and reflect'}</button></div></div>
}

function Grounding({ onDone }: { onDone(): void }) {
  const prompts = ['5 things you can see', '4 things you can feel', '3 things you can hear', '2 things you can smell', '1 thing you value right now']
  const [done, setDone] = useState<boolean[]>(prompts.map(() => false))
  return <div className="practice"><h2>5–4–3–2–1 grounding</h2>{prompts.map((prompt, index) => <label className="check-row" key={prompt}><input type="checkbox" checked={done[index]} onChange={(event) => setDone((current) => current.map((value, item) => item === index ? event.target.checked : value))} />{prompt}</label>)}<button className="calm-action" disabled={!done.every(Boolean)} onClick={onDone}>Record grounding practice</button></div>
}

function Pattern({ onDone }: { onDone(): void }) {
  const [answer, setAnswer] = useState('')
  return <div className="practice"><h2>Steady pattern</h2><p className="pattern" aria-label="Circle, square, circle, square, what comes next?">● ■ ● ■ ?</p><fieldset><legend>What comes next?</legend><label className="check-row"><input type="radio" name="pattern" value="circle" onChange={(event) => setAnswer(event.target.value)} /> Circle ●</label><label className="check-row"><input type="radio" name="pattern" value="square" onChange={(event) => setAnswer(event.target.value)} /> Square ■</label></fieldset>{answer && <p aria-live="polite">{answer === 'circle' ? 'Correct. The goal is steady attention, not a reward.' : 'Try once more. The shapes alternate.'}</p>}<button className="calm-action" disabled={answer !== 'circle'} onClick={onDone}>Record attention reset</button></div>
}
