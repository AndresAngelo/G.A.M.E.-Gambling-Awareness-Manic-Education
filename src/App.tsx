import { useState } from 'react'
import { Alternatives } from './components/Alternatives'
import { BlackjackGame } from './components/BlackjackGame'
import { ColorGame } from './components/ColorGame'
import { CounselorReport } from './components/CounselorReport'
import { GameSession } from './components/GameSession'
import { InterventionModal } from './components/InterventionModal'
import { Onboarding } from './components/Onboarding'
import { PokerGame } from './components/PokerGame'
import { Progress } from './components/Progress'
import { RouletteGame } from './components/RouletteGame'
import { TongitsGame } from './components/TongitsGame'
import { Wallet } from './components/Wallet'
import { detectIntervention } from './domain/interventions'
import { casinoMinutesForMastery } from './domain/state'
import type { AppEvent, GameId, Settings as SettingsType } from './domain/types'
import { useAppState } from './useAppState'

type View = 'home' | 'wallet' | 'settings' | 'alternatives' | 'progress' | 'report' | GameId

export function App() {
  const { state, dispatch } = useAppState()
  const [view, setView] = useState<View>('home')
  const [activeLesson, setActiveLesson] = useState<string | null>(null)

  if (!state.onboarded) return <Onboarding onComplete={() => dispatch({ type: 'complete_onboarding' })} />

  const openPurchaseLesson = () => {
    dispatch({ type: 'log_event', event: { type: 'fake_purchase_started', amount: 0 } })
    setActiveLesson('payment-barrier')
  }
  const onWallet = (game: GameId) => (delta: number, label: string) => dispatch({ type: 'wallet_delta', delta, label, game })
  const onEvent = (event: Omit<AppEvent, 'id' | 'at'>) => {
    const at = Date.now()
    dispatch({ type: 'log_event', event, at })
    const lessonId = detectIntervention([...state.events, { ...event, id: 'pending', at }])
    if (lessonId && !activeLesson) {
      dispatch({ type: 'log_event', event: { type: 'intervention_started', detail: lessonId }, at })
      setActiveLesson(lessonId)
    }
  }
  const gameProps = (game: GameId) => ({ balance: state.wallet, onWallet: onWallet(game), onEvent, onIntervention: setActiveLesson, onBack: () => setView('home') })
  const sessionMinutes = casinoMinutesForMastery(state.mastery.points)
  const navigateToGame = (game: GameId) => { if (sessionMinutes > 0) setView(game) }
  const gameNode = view === 'roulette' ? <RouletteGame {...gameProps('roulette')} /> : view === 'color' ? <ColorGame {...gameProps('color')} /> : view === 'blackjack' ? <BlackjackGame {...gameProps('blackjack')} /> : view === 'poker' ? <PokerGame {...gameProps('poker')} /> : view === 'tongits' ? <TongitsGame {...gameProps('tongits')} /> : null

  return (
    <main className={`app-shell theme-${state.settings.theme} ${state.settings.highContrast ? 'high-contrast' : ''} motion-${state.settings.motion} intensity-${state.settings.intensity}`}>
      <section className="phone-frame">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="topbar">
          <button className="brand" onClick={() => setView('home')} aria-label="G.A.M.E. home">G.A.M.E.</button>
          <div className="wallet-pill" aria-label={`${state.wallet} fictional credits`}>◈ {state.wallet.toLocaleString()}</div>
          <a className="quick-exit" href="about:blank">Quick exit</a>
        </header>
        <div className="safety-strip">No real money • Local-only prototype • Content provisional</div>
        <div id="main-content">
          {view === 'home' && <Dashboard points={state.mastery.points} onWallet={() => setView('wallet')} onGame={navigateToGame} onNavigate={setView} />}
          {view === 'wallet' && <Wallet balance={state.wallet} ledger={state.ledger} onPurchaseAttempt={openPurchaseLesson} />}
          {view === 'settings' && <Settings state={state.settings} onChange={(key, value) => dispatch({ type: 'set_setting', key, value })} onReset={() => dispatch({ type: 'reset' })} />}
          {view === 'alternatives' && <Alternatives onComplete={(activityId) => { dispatch({ type: 'log_event', event: { type: 'alternative_completed', detail: activityId } }); dispatch({ type: 'complete_lesson', lessonId: `alternative-${activityId}`, points: 5 }) }} />}
          {view === 'progress' && <Progress mastery={state.mastery} />}
          {view === 'report' && <CounselorReport state={state} />}
          {gameNode && <GameSession key={view} minutes={sessionMinutes} onBack={() => setView('home')} onAlternative={() => setView('alternatives')}>{gameNode}</GameSession>}
        </div>
        <nav className="bottom-nav" aria-label="Primary">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Home</button>
          <button className={view === 'alternatives' ? 'active' : ''} onClick={() => setView('alternatives')}>Calm</button>
          <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}>Progress</button>
          <button className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}>Report</button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
        </nav>
      </section>
      {activeLesson && <InterventionModal lessonId={activeLesson} onClose={() => setActiveLesson(null)} onAlternative={() => { setActiveLesson(null); setView('alternatives') }} onComplete={(reflection, share) => {
        if (reflection) dispatch({ type: 'add_reflection', lessonId: activeLesson, text: reflection, shareInReport: share })
        dispatch({ type: 'complete_lesson', lessonId: activeLesson })
        dispatch({ type: 'log_event', event: { type: 'intervention_completed', detail: activeLesson } })
      }} />}
    </main>
  )
}

const gameCards: { id: GameId; name: string; icon: string }[] = [
  { id: 'roulette', name: 'Roulette', icon: '◉' }, { id: 'color', name: 'Color Game', icon: '◆' }, { id: 'blackjack', name: 'Blackjack', icon: '21' }, { id: 'poker', name: 'Poker', icon: '♠' }, { id: 'tongits', name: 'Tong-its', icon: '♣' },
]

function Dashboard({ points, onWallet, onGame, onNavigate }: { points: number; onWallet(): void; onGame(game: GameId): void; onNavigate(view: View): void }) {
  const minutes = casinoMinutesForMastery(points)
  const graduated = minutes === 0
  return <section aria-labelledby="dashboard-title">
    <p className="eyebrow">Recovery learning dashboard</p><h1 id="dashboard-title">Notice the design. Choose the next step.</h1>
    <button className="mastery-card mastery-button" onClick={() => onNavigate('progress')}><div><strong>{points}%</strong><span>Awareness mastery</span></div><progress max="100" value={points}>{points}%</progress><small>{graduated ? 'Casino simulations retired — graduation reached' : `Casino allowance: ${minutes} minutes per learning session`}</small></button>
    <div className="notice warning"><strong>Remember:</strong> playing never earns mastery. Only reflection, learning checks, and healthier alternatives do.</div>
    <div className="recovery-shortcuts"><button onClick={() => onNavigate('alternatives')}>◎ Calm an urge</button><button onClick={() => onNavigate('report')}>▤ Counselor report</button></div>
    <h2>Learning simulations</h2>
    {graduated && <div className="graduated"><strong>Graduated:</strong> game simulations are no longer available. Your alternatives and report remain accessible.</div>}
    <div className="game-grid" aria-label="Learning simulations">{gameCards.map((game) => <article className="game-card" key={game.id}><span aria-hidden="true">{game.icon}</span><h3>{game.name}</h3><p>Random free play + guided scenario</p><button onClick={() => onGame(game.id)} disabled={graduated}>{graduated ? 'Retired' : 'Open lesson'}</button></article>)}</div>
    <button className="wallet-banner" onClick={onWallet}><span>Fictional wallet</span><strong>Review simulated credits →</strong></button>
  </section>
}

function Settings({ state, onChange, onReset }: { state: SettingsType; onChange(key: keyof SettingsType, value: SettingsType[keyof SettingsType]): void; onReset(): void }) {
  return <section aria-labelledby="settings-title"><p className="eyebrow">Accessibility and privacy</p><h1 id="settings-title">Your controls</h1>
    <label className="setting-row"><span>Sound effects</span><input type="checkbox" checked={state.sound} onChange={(event) => onChange('sound', event.target.checked)} /></label>
    <label className="setting-row"><span>Reduced motion</span><input type="checkbox" checked={state.motion === 'reduced'} onChange={(event) => onChange('motion', event.target.checked ? 'reduced' : 'full')} /></label>
    <label className="setting-row"><span>Calm visual intensity</span><input type="checkbox" checked={state.intensity === 'calm'} onChange={(event) => onChange('intensity', event.target.checked ? 'calm' : 'authentic')} /></label>
    <label className="setting-row"><span>Higher contrast</span><input type="checkbox" checked={state.highContrast} onChange={(event) => onChange('highContrast', event.target.checked)} /></label>
    <label className="setting-row"><span>Light theme</span><input type="checkbox" checked={state.theme === 'light'} onChange={(event) => onChange('theme', event.target.checked ? 'light' : 'dark')} /></label>
    <div className="notice">All progress stays in this browser. Reset removes your local history and returns to onboarding.</div><button className="danger full-width" onClick={onReset}>Reset all local data</button>
  </section>
}
