import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { colorFaces, colorHouseEdge, rollColors, settleColorBets, type ColorId } from '../domain/games/colorGame'
import { systemRandom } from '../domain/rng'
import type { AppEvent } from '../domain/types'
import { useMotionPref } from '../motion/MotionPreferenceContext'
import { fadeRise, fastFade, resolveTransition } from '../motion/variants'
import { BackIcon } from './icons'
import { ColorDice } from './ColorDice'

interface Props {
  balance: number
  onWallet(delta: number, label: string): void
  onEvent(event: Omit<AppEvent, 'id' | 'at'>): void
  onIntervention(lessonId: string): void
  onBack(): void
}

export function ColorGame({ balance, onWallet, onEvent, onIntervention, onBack }: Props) {
  const [mode, setMode] = useState<'free' | 'scenario'>('free')
  const [selected, setSelected] = useState<ColorId[]>(['red'])
  const [stake, setStake] = useState(10)
  // Visible state: only ever committed from handleSettled (requirements 8.5, 8.7).
  const [roll, setRoll] = useState<ColorId[] | null>(null)
  const [net, setNet] = useState<number | null>(null)
  // Bumped only inside handleSettled, decoupled from spinToken (which bumps at play-time,
  // before settle) — keys the result reveal so its enter animation replays on the render
  // that actually commits the new roll/net, not one render early with the previous values.
  const [settleToken, setSettleToken] = useState(0)
  const [showOdds, setShowOdds] = useState(false)
  const [lessonReady, setLessonReady] = useState(false)

  // Held state: computed synchronously at play time, revealed only on settle.
  const [spinToken, setSpinToken] = useState(0)
  const [pendingTargets, setPendingTargets] = useState<readonly ColorId[] | null>(null)
  const pendingDataRef = useRef<{ result: [ColorId, ColorId, ColorId]; returned: number; totalStake: number; largeWin: boolean } | null>(null)

  const { reduced } = useMotionPref()

  const chosen = mode === 'scenario' ? ['red'] as ColorId[] : selected
  const totalStake = chosen.length * stake
  const toggle = (color: ColorId) => setSelected((current) => current.includes(color) ? current.filter((item) => item !== color) : [...current, color])

  const play = () => {
    if (!chosen.length || totalStake > balance) return
    onWallet(-totalStake, `Color Game ${mode} wager`)
    onEvent({ type: 'bet_placed', game: 'color', amount: totalStake })
    const result: [ColorId, ColorId, ColorId] = mode === 'scenario' ? ['red', 'red', 'red'] : rollColors(systemRandom)
    const settlements = settleColorBets(result, chosen.map((color) => ({ color, stake })))
    const returned = settlements.reduce((sum, item) => sum + item.returned, 0)
    const largeWin = returned >= totalStake * 3
    pendingDataRef.current = { result, returned, totalStake, largeWin }
    setPendingTargets(result)
    setSpinToken((token) => token + 1)
  }

  const handleSettled = () => {
    const pending = pendingDataRef.current
    if (!pending) return
    const { result, returned, totalStake: pendingStake, largeWin } = pending
    if (returned) onWallet(returned, 'Color Game return')
    setRoll(result)
    setNet(returned - pendingStake)
    setSettleToken((token) => token + 1)
    onEvent({ type: 'round_resolved', game: 'color', amount: returned - pendingStake, detail: largeWin ? 'large-win' : returned ? 'win' : 'loss' })
    setLessonReady(mode === 'scenario' || largeWin)
    pendingDataRef.current = null
  }

  return <section className="game-view" aria-labelledby="color-title">
    <div className="game-top"><button className="secondary icon-btn" onClick={onBack}><BackIcon />Back</button><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'free' | 'scenario')}><option value="free">Random free play</option><option value="scenario">Scripted lesson</option></select></label></div>
    <h1 id="color-title">Color Game</h1>
    <p className="lead">Perya-inspired probability lesson.</p>
    {mode === 'scenario' && <div className="scenario-banner">Guided scenario: three red faces are scripted to demonstrate how a rare result can create a “hot color” belief.</div>}
    <div className="game-felt game-felt-color">
      <ColorDice spinToken={spinToken} targets={pendingTargets} reduced={reduced} onSettled={handleSettled} />
    </div>
    <fieldset className="color-bets" disabled={mode === 'scenario'}><legend>Choose one or more colors</legend>{colorFaces.map((face) => <label className={`color-option ${face.id}`} key={face.id}><input type="checkbox" checked={chosen.includes(face.id)} onChange={() => toggle(face.id)} /><span aria-hidden="true">{face.symbol}</span>{face.label}</label>)}</fieldset>
    <fieldset className="stake-picker"><legend>Stake per color</legend>{[10, 50, 100].map((amount) => <button type="button" className={stake === amount ? 'selected' : ''} onClick={() => setStake(amount)} key={amount}>{amount}</button>)}</fieldset>
    <button className="play-button" onClick={play} disabled={!chosen.length || totalStake > balance}>Roll three dice • stake {totalStake}</button>
    <AnimatePresence>
      {net !== null && roll && <motion.p key={settleToken} className={net >= 0 ? 'round-win' : 'round-loss'} aria-live="polite" variants={reduced ? fastFade : fadeRise} initial="initial" animate="animate" exit="exit" transition={resolveTransition('element', reduced)}>Rolled {roll.map((color) => colorFaces.find((face) => face.id === color)?.label ?? color).join(', ')} • Round net: {net >= 0 ? '+' : ''}{net} fictional credits</motion.p>}
    </AnimatePresence>
    {lessonReady && <button className="zoom-button" onClick={() => onIntervention('house-edge')}>Zoom out: why does this feel memorable?</button>}
    <button className="text-button" onClick={() => setShowOdds((value) => !value)} aria-expanded={showOdds}>Show exact odds and house edge</button>
    <AnimatePresence initial={false}>
      {showOdds && (
        <motion.div
          key="color-odds-note"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={resolveTransition('element', reduced)}
          style={{ overflow: 'hidden' }}
        >
          <div className="odds-note"><strong>Per selected color:</strong> no match 125/216; one 75/216; two 15/216; three 1/216. Expected house edge: {(colorHouseEdge * 100).toFixed(2)}%. Betting more colors creates more separate wagers; it does not remove the edge.</div>
        </motion.div>
      )}
    </AnimatePresence>
  </section>
}
