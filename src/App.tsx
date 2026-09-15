import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Alternatives } from './components/Alternatives'
import { BlackjackGame } from './components/BlackjackGame'
import { ColorGame } from './components/ColorGame'
import { CounselorReport } from './components/CounselorReport'
import { GameSession } from './components/GameSession'
import { InterventionModal } from './components/InterventionModal'
import { MotionPreferenceProvider, useMotionPref } from './motion/MotionPreferenceContext'
import { fastFade, viewTransition } from './motion/variants'
import type { NavigationDirection } from './motion/types'
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
import {
  BrandIcon, CalmIcon, CardsIcon, DiceIcon, ExitIcon, HomeIcon, ProgressIcon,
  ReportIcon, RouletteIcon, SettingsIcon, WalletIcon,
} from './components/icons'
import type { ComponentType } from 'react'

type View = 'home' | 'wallet' | 'settings' | 'alternatives' | 'progress' | 'report' | GameId

/**
 * Resolves the navigation direction purely from the destination view (Requirements 4.1-4.3):
 * 'home' is treated as "returning" (backward), every other destination as "going deeper"
 * (forward). No previous-view tracking — this is a pure function of `nextView` alone.
 */
function directionFor(nextView: View): NavigationDirection {
  return nextView === 'home' ? 'backward' : 'forward'
}

/**
 * Moves focus to the most meaningful entry point of newly mounted content
 * (Requirements 10.6, 10.7): the container's first heading if present,
 * otherwise its first natively focusable element, otherwise the container
 * itself. Headings are not natively focusable, so a temporary `tabindex="-1"`
 * is applied (display-focus-only pattern — does not add the heading to the
 * normal tab order).
 */
function focusEntryPoint(container: HTMLElement | null) {
  if (!container) return
  const heading = container.querySelector<HTMLElement>('h1, h2')
  const target = heading ?? container.querySelector<HTMLElement>('button, a[href], input, textarea, select, [tabindex]') ?? container
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus()
}

export function App() {
  const { state, dispatch } = useAppState()
  const [view, setView] = useState<View>('home')
  const [activeLesson, setActiveLesson] = useState<string | null>(null)

  if (!state.onboarded) return <MotionPreferenceProvider settingsMotion={state.settings.motion}><Onboarding onComplete={() => dispatch({ type: 'complete_onboarding' })} /></MotionPreferenceProvider>

  return <MotionPreferenceProvider settingsMotion={state.settings.motion}><AppShell state={state} dispatch={dispatch} view={view} setView={setView} activeLesson={activeLesson} setActiveLesson={setActiveLesson} /></MotionPreferenceProvider>
}

function AppShell({ state, dispatch, view, setView, activeLesson, setActiveLesson }: {
  state: ReturnType<typeof useAppState>['state']
  dispatch: ReturnType<typeof useAppState>['dispatch']
  view: View
  setView(view: View): void
  activeLesson: string | null
  setActiveLesson(lessonId: string | null): void
}) {
  const { reduced } = useMotionPref()
  const direction = directionFor(view)

  // Requirements 10.6, 10.7: move focus to the newly mounted view's heading
  // as soon as it mounts, decoupled from the enter-transition timeline.
  // AnimatePresence mode="wait" defers the incoming node's mount until the
  // outgoing node's exit finishes — that ordering is inherent to mode="wait"
  // and is accepted here (it is the accepted reading of 10.6, per task
  // guidance: focus must not additionally wait for the incoming element's
  // own enter animation to finish playing on top of that). A callback ref
  // (rather than a `[view]`-keyed effect) is used because AnimatePresence
  // controls the incoming node's actual DOM mount timing itself; an effect
  // keyed on `view` fires on the state-change commit, which precedes that
  // mount and reads a stale or null container.
  const focusOnViewMount = useCallback((node: HTMLDivElement | null) => {
    if (node) focusEntryPoint(node)
  }, [])

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

  const viewNode = view === 'home' ? <Dashboard points={state.mastery.points} onWallet={() => setView('wallet')} onGame={navigateToGame} onNavigate={setView} />
    : view === 'wallet' ? <Wallet balance={state.wallet} ledger={state.ledger} onPurchaseAttempt={openPurchaseLesson} />
    : view === 'settings' ? <Settings state={state.settings} onChange={(key, value) => dispatch({ type: 'set_setting', key, value })} onReset={() => dispatch({ type: 'reset' })} />
    : view === 'alternatives' ? <Alternatives onComplete={(activityId) => { dispatch({ type: 'log_event', event: { type: 'alternative_completed', detail: activityId } }); dispatch({ type: 'complete_lesson', lessonId: `alternative-${activityId}`, points: 5 }) }} />
    : view === 'progress' ? <Progress mastery={state.mastery} />
    : view === 'report' ? <CounselorReport state={state} />
    : gameNode ? <GameSession key={view} minutes={sessionMinutes} onBack={() => setView('home')} onAlternative={() => setView('alternatives')}>{gameNode}</GameSession>
    : null

  return (
    <main className={`app-shell theme-${state.settings.theme} ${state.settings.highContrast ? 'high-contrast' : ''} motion-${state.settings.motion} intensity-${state.settings.intensity}`}>
      <div className="console">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <header className="topbar">
          <button className="brand" onClick={() => setView('home')} aria-label="G.A.M.E. home">
            <span className="brand-mark"><BrandIcon /></span>
            G.A.M.E.
          </button>
          <div className="topbar-actions">
            <div className="wallet-pill" aria-label={`${state.wallet} fictional credits`}><WalletIcon /><span className="wallet-label">{state.wallet.toLocaleString()}</span></div>
            <a className="quick-exit" href="about:blank"><ExitIcon />Quick exit</a>
          </div>
        </header>
        <div className="console-body">
          <div id="main-content">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={view}
                ref={focusOnViewMount}
                custom={direction}
                variants={reduced ? fastFade : viewTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {viewNode}
              </motion.div>
            </AnimatePresence>
          </div>
          <nav className="nav-rail" aria-label="Primary">
            <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><HomeIcon />Home</button>
            <button className={view === 'alternatives' ? 'active' : ''} onClick={() => setView('alternatives')}><CalmIcon />Calm</button>
            <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}><ProgressIcon />Progress</button>
            <button className={view === 'report' ? 'active' : ''} onClick={() => setView('report')}><ReportIcon />Report</button>
            <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><SettingsIcon />Settings</button>
          </nav>
        </div>
      </div>
      <AnimatePresence>
        {activeLesson && <InterventionModal key="intervention-modal" lessonId={activeLesson} onClose={() => setActiveLesson(null)} onAlternative={() => { setActiveLesson(null); setView('alternatives') }} onComplete={(reflection, share) => {
          if (reflection) dispatch({ type: 'add_reflection', lessonId: activeLesson, text: reflection, shareInReport: share })
          dispatch({ type: 'complete_lesson', lessonId: activeLesson })
          dispatch({ type: 'log_event', event: { type: 'intervention_completed', detail: activeLesson } })
        }} />}
      </AnimatePresence>
    </main>
  )
}

const gameCards: { id: GameId; name: string; icon: ComponentType }[] = [
  { id: 'roulette', name: 'Roulette', icon: RouletteIcon }, { id: 'color', name: 'Color Game', icon: DiceIcon }, { id: 'blackjack', name: 'Blackjack', icon: CardsIcon }, { id: 'poker', name: 'Poker', icon: CardsIcon }, { id: 'tongits', name: 'Tong-its', icon: CardsIcon },
]

function Dashboard({ points, onWallet, onGame, onNavigate }: { points: number; onWallet(): void; onGame(game: GameId): void; onNavigate(view: View): void }) {
  const minutes = casinoMinutesForMastery(points)
  const graduated = minutes === 0
  return <section aria-labelledby="dashboard-title">
    <h1 id="dashboard-title">Notice the design. Choose the next step.</h1>
    <button className="mastery-card mastery-button" onClick={() => onNavigate('progress')}><div><strong>{points}%</strong><span>Awareness mastery</span></div><progress max="100" value={points}>{points}%</progress><small>{graduated ? 'Casino simulations retired — graduation reached' : `Casino allowance: ${minutes} minutes per learning session`}</small></button>
    <div className="notice warning"><strong>Remember:</strong> playing never earns mastery. Only reflection, learning checks, and healthier alternatives do.</div>
    <div className="recovery-shortcuts"><button className="icon-btn" onClick={() => onNavigate('alternatives')}><CalmIcon />Calm an urge</button><button className="icon-btn" onClick={() => onNavigate('report')}><ReportIcon />Counselor report</button></div>
    <h2>Learning simulations</h2>
    {graduated && <div className="graduated"><strong>Graduated:</strong> game simulations are no longer available. Your alternatives and report remain accessible.</div>}
    <div className="game-grid" aria-label="Learning simulations">{gameCards.map((game) => { const Icon = game.icon; return <article className="game-card" key={game.id}><span className="icon-tile" aria-hidden="true"><Icon /></span><h3>{game.name}</h3><p>Random free play + guided scenario</p><button className="primary" onClick={() => onGame(game.id)} disabled={graduated}>{graduated ? 'Retired' : 'Open lesson'}</button></article> })}</div>
    <button className="wallet-banner" onClick={onWallet}><span className="icon-btn"><WalletIcon />Fictional wallet</span><strong>Review simulated credits →</strong></button>
  </section>
}

function Settings({ state, onChange, onReset }: { state: SettingsType; onChange(key: keyof SettingsType, value: SettingsType[keyof SettingsType]): void; onReset(): void }) {
  return <section aria-labelledby="settings-title"><h1 id="settings-title">Your controls</h1>
    <label className="setting-row"><span>Sound effects</span><input type="checkbox" checked={state.sound} onChange={(event) => onChange('sound', event.target.checked)} /></label>
    <label className="setting-row"><span>Reduced motion</span><input type="checkbox" checked={state.motion === 'reduced'} onChange={(event) => onChange('motion', event.target.checked ? 'reduced' : 'full')} /></label>
    <label className="setting-row"><span>Calm visual intensity</span><input type="checkbox" checked={state.intensity === 'calm'} onChange={(event) => onChange('intensity', event.target.checked ? 'calm' : 'authentic')} /></label>
    <label className="setting-row"><span>Higher contrast</span><input type="checkbox" checked={state.highContrast} onChange={(event) => onChange('highContrast', event.target.checked)} /></label>
    <label className="setting-row"><span>Light theme</span><input type="checkbox" checked={state.theme === 'light'} onChange={(event) => onChange('theme', event.target.checked ? 'light' : 'dark')} /></label>
    <div className="notice">All progress stays in this browser. Reset removes your local history and returns to onboarding.</div><button className="danger full-width" onClick={onReset}>Reset all local data</button>
  </section>
}
