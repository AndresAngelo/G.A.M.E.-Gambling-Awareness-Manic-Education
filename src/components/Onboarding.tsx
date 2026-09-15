import { useState } from 'react'

interface Props { onComplete(): void }

export function Onboarding({ onComplete }: Props) {
  const [checks, setChecks] = useState([false, false, false, false])
  const labels = [
    'I am 18 or older.',
    'I understand this app contains simulated gambling and may be triggering.',
    'I understand no real money, prizes, deposits, or withdrawals exist here.',
    'I understand the goal is to reduce gambling and eventually stop using this app.',
  ]

  const update = (index: number, checked: boolean) => {
    setChecks((current) => current.map((value, item) => item === index ? checked : value))
  }

  return (
    <main className="app-shell">
      <section className="onboarding" aria-labelledby="welcome-title">
        <h1 id="welcome-title">Welcome to G.A.M.E.</h1>
        <p className="lead">This educational prototype helps you recognize gambling manipulation—not practice gambling for profit.</p>
        <div className="notice warning"><strong>Content notice:</strong> Casino visuals and game mechanics can trigger urges. You can exit, mute, or reduce intensity at any time.</div>
        <div className="notice"><strong>No real money:</strong> Credits, wallet activity, purchases, chips, and reports are entirely fictional and stay on this device.</div>
        <fieldset>
          <legend>Confirm each statement to continue</legend>
          {labels.map((label, index) => (
            <label className="check-row" key={label}>
              <input type="checkbox" checked={checks[index]} onChange={(event) => update(index, event.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p className="provisional">Educational content is provisional pending clinical and Filipino cultural review. G.A.M.E. is not treatment or crisis care.</p>
        <button className="primary" disabled={!checks.every(Boolean)} onClick={onComplete}>Enter the learning space</button>
        <a className="button secondary" href="about:blank">Exit now</a>
      </section>
    </main>
  )
}
