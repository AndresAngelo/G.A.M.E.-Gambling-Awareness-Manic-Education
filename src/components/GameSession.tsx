import { useEffect, useState, type ReactNode } from 'react'

interface Props { minutes: number; onBack(): void; onAlternative(): void; children: ReactNode }

export function GameSession({ minutes, onBack, onAlternative, children }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (endsAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  if (!acknowledged || endsAt === null) return <section className="session-confirm" aria-labelledby="session-confirm-title"><p className="eyebrow">Before this simulation</p><h1 id="session-confirm-title">Start a bounded learning session?</h1><div className="notice warning">This game uses fictional credits and recognizable gambling mechanics. It may trigger urges. Playing earns no mastery and the timer creates a firm stopping point.</div><label className="check-row"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I understand this is a no-money educational simulation and I can stop now.</label><button className="primary full-width" disabled={!acknowledged || minutes <= 0} onClick={() => { setNow(Date.now()); setEndsAt(Date.now() + minutes * 60_000) }}>Start {minutes}-minute learning session</button><button className="calm-action" onClick={onAlternative}>Choose a calming alternative instead</button><button className="secondary full-width" onClick={onBack}>Return home</button></section>

  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  if (minutes <= 0 || seconds <= 0) return <section className="session-complete" aria-labelledby="session-end-title"><p className="eyebrow">Natural stopping point</p><h1 id="session-end-title">This casino-learning session is complete</h1><p>The games are paused. Your report, settings, and calming alternatives remain available.</p><button className="calm-action" onClick={onAlternative}>Choose a healthier alternative</button><button className="secondary full-width" onClick={onBack}>Return home</button></section>
  return <><div className="session-timer" role="status"><span>Learning-session boundary</span><strong>{label}</strong></div>{children}</>
}
