import { useState } from 'react'
import { colorFaces, colorHouseEdge, rollColors, settleColorBets, type ColorId } from '../domain/games/colorGame'
import { systemRandom } from '../domain/rng'
import type { AppEvent } from '../domain/types'

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
  const [roll, setRoll] = useState<ColorId[] | null>(null)
  const [net, setNet] = useState<number | null>(null)
  const [showOdds, setShowOdds] = useState(false)
  const [lessonReady, setLessonReady] = useState(false)

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
    if (returned) onWallet(returned, 'Color Game return')
    setRoll(result)
    setNet(returned - totalStake)
    onEvent({ type: 'round_resolved', game: 'color', amount: returned - totalStake, detail: returned >= totalStake * 3 ? 'large-win' : returned ? 'win' : 'loss' })
    setLessonReady(mode === 'scenario' || returned >= totalStake * 3)
  }

  return <section className="game-view" aria-labelledby="color-title">
    <div className="game-top"><button className="secondary" onClick={onBack}>← Back</button><label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'free' | 'scenario')}><option value="free">Random free play</option><option value="scenario">Scripted lesson</option></select></label></div>
    <p className="eyebrow">Perya-inspired probability lesson</p><h1 id="color-title">Color Game</h1>
    {mode === 'scenario' && <div className="scenario-banner">Guided scenario: three red faces are scripted to demonstrate how a rare result can create a “hot color” belief.</div>}
    <div className="color-dice" aria-live="polite">{(roll ?? [null, null, null]).map((color, index) => { const face = colorFaces.find((item) => item.id === color); return <div className={`color-die ${color ?? ''}`} key={index}><span aria-hidden="true">{face?.symbol ?? '?'}</span><small>{face?.label ?? `Die ${index + 1}`}</small></div> })}</div>
    <fieldset className="color-bets" disabled={mode === 'scenario'}><legend>Choose one or more colors</legend>{colorFaces.map((face) => <label className={`color-option ${face.id}`} key={face.id}><input type="checkbox" checked={chosen.includes(face.id)} onChange={() => toggle(face.id)} /><span aria-hidden="true">{face.symbol}</span>{face.label}</label>)}</fieldset>
    <fieldset className="stake-picker"><legend>Stake per color</legend>{[10, 50, 100].map((amount) => <button type="button" className={stake === amount ? 'selected' : ''} onClick={() => setStake(amount)} key={amount}>{amount}</button>)}</fieldset>
    <button className="play-button" onClick={play} disabled={!chosen.length || totalStake > balance}>Roll three dice • stake {totalStake}</button>
    {net !== null && <p className={net >= 0 ? 'round-win' : 'round-loss'} aria-live="polite">Round net: {net >= 0 ? '+' : ''}{net} fictional credits</p>}
    {lessonReady && <button className="zoom-button" onClick={() => onIntervention('house-edge')}>Zoom out: why does this feel memorable?</button>}
    <button className="text-button" onClick={() => setShowOdds((value) => !value)} aria-expanded={showOdds}>Show exact odds and house edge</button>
    {showOdds && <div className="odds-note"><strong>Per selected color:</strong> no match 125/216; one 75/216; two 15/216; three 1/216. Expected house edge: {(colorHouseEdge * 100).toFixed(2)}%. Betting more colors creates more separate wagers; it does not remove the edge.</div>}
  </section>
}
