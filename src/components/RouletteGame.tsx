import { useMemo, useRef, useState } from 'react'
import { rouletteColor, rouletteReturn, spinRoulette, type RouletteBet } from '../domain/games/roulette'
import { systemRandom } from '../domain/rng'
import type { AppEvent } from '../domain/types'
import { useMotionPref } from '../motion/MotionPreferenceContext'
import { RouletteWheel } from './RouletteWheel'

interface Props {
  balance: number
  onWallet(delta: number, label: string): void
  onEvent(event: Omit<AppEvent, 'id' | 'at'>): void
  onIntervention(lessonId: string): void
  onBack(): void
}

type BetChoice = 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'straight7'

export function RouletteGame({ balance, onWallet, onEvent, onIntervention, onBack }: Props) {
  const [mode, setMode] = useState<'free' | 'scenario'>('free')
  const [choice, setChoice] = useState<BetChoice>('red')
  const [stake, setStake] = useState(10)
  // Visible state: only ever committed from handleSettled (requirements 8.5, 8.7).
  const [result, setResult] = useState<number | null>(null)
  const [returned, setReturned] = useState(0)
  const [lessonReady, setLessonReady] = useState(false)

  // Held state: computed synchronously at play time, revealed only on settle.
  const [spinToken, setSpinToken] = useState(0)
  const [pendingResult, setPendingResult] = useState<number | null>(null)
  const pendingDataRef = useRef<{ number: number; payout: number; largeWin: boolean; stake: number } | null>(null)

  const { reduced } = useMotionPref()

  const bet = useMemo<RouletteBet>(() => {
    if (mode === 'scenario' || choice === 'straight7') return { kind: 'straight', number: 7, stake }
    if (choice.startsWith('dozen')) return { kind: 'dozen', dozen: Number(choice.at(-1)) as 1 | 2 | 3, stake }
    return { kind: choice, stake } as RouletteBet
  }, [choice, mode, stake])

  const play = () => {
    if (stake > balance) return
    onWallet(-stake, `Roulette ${mode} wager`)
    onEvent({ type: 'bet_placed', game: 'roulette', amount: stake })
    const number = mode === 'scenario' ? 7 : spinRoulette(systemRandom)
    const payout = rouletteReturn(number, bet)
    const largeWin = payout >= stake * 10
    pendingDataRef.current = { number, payout, largeWin, stake }
    setPendingResult(number)
    setSpinToken((token) => token + 1)
  }

  const handleSettled = () => {
    const pending = pendingDataRef.current
    if (!pending) return
    const { number, payout, largeWin, stake: pendingStake } = pending
    if (payout) onWallet(payout, 'Roulette return')
    setResult(number)
    setReturned(payout)
    onEvent({ type: 'round_resolved', game: 'roulette', amount: payout - pendingStake, detail: largeWin ? 'large-win' : payout ? 'win' : 'loss' })
    setLessonReady(mode === 'scenario' || largeWin)
    pendingDataRef.current = null
  }

  return <section className="game-view" aria-labelledby="roulette-title">
    <GameTop onBack={onBack} mode={mode} setMode={setMode} />
    <p className="eyebrow">European single-zero roulette</p><h1 id="roulette-title">Roulette</h1>
    <RouletteWheel spinToken={spinToken} target={pendingResult} reduced={reduced} onSettled={handleSettled} />
    <div className={`roulette-result ${result === null ? '' : rouletteColor(result)}`} aria-live="polite"><span>{result ?? '?'}</span><small>{result === null ? 'Place a fictional wager' : `${rouletteColor(result)} • ${returned ? `returned ${returned}` : 'wager lost'}`}</small></div>
    {mode === 'scenario' && <div className="scenario-banner">Guided scenario: a scripted straight-up win on 7 demonstrates memorable celebration. This outcome is not random.</div>}
    <label>Bet type<select value={mode === 'scenario' ? 'straight7' : choice} disabled={mode === 'scenario'} onChange={(event) => setChoice(event.target.value as BetChoice)}>
      <option value="red">Red</option><option value="black">Black</option><option value="even">Even</option><option value="odd">Odd</option><option value="low">1–18</option><option value="high">19–36</option><option value="dozen1">1st dozen</option><option value="dozen2">2nd dozen</option><option value="dozen3">3rd dozen</option><option value="straight7">Straight 7</option>
    </select></label>
    <StakePicker value={stake} onChange={setStake} />
    <button className="play-button" onClick={play} disabled={stake > balance}>Spin once</button>
    {lessonReady && <button className="zoom-button" onClick={() => onIntervention('large-win')}>Zoom out and deconstruct this win</button>}
    <div className="odds-note">Zero makes red/black, odd/even, and high/low lose. Previous spins never change the next spin.</div>
  </section>
}

function GameTop({ onBack, mode, setMode }: { onBack(): void; mode: 'free' | 'scenario'; setMode(value: 'free' | 'scenario'): void }) {
  return <div className="game-top"><button className="secondary" onClick={onBack}>← Back</button><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'free' | 'scenario')}><option value="free">Random free play</option><option value="scenario">Scripted lesson</option></select></label></div>
}

function StakePicker({ value, onChange }: { value: number; onChange(value: number): void }) {
  return <fieldset className="stake-picker"><legend>Fictional stake</legend>{[10, 50, 100].map((amount) => <button type="button" className={value === amount ? 'selected' : ''} onClick={() => onChange(amount)} key={amount}>{amount}</button>)}</fieldset>
}
