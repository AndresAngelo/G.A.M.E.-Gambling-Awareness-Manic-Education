import { useMemo, useState } from 'react'
import { FlipCard } from './FlipCard'
import { useMotionPref } from '../motion/MotionPreferenceContext'
import {
  botDecideDiscard,
  botDecideDraw,
  canPickupDiscard,
  cardId,
  dealTongits,
  deadwoodCards,
  deadwoodValue,
  findBestMelds,
  isLegalDiscard,
  isTongits,
  observeFor,
  resolveChallenge,
  scorePayouts,
  type BotLevel,
  type Card,
  type FullGameState,
  type Meld,
  type PlayerBoard,
} from '../domain/games/tongits'
import { seededRandom, systemRandom } from '../domain/rng'
import type { AppEvent } from '../domain/types'

interface Props {
  balance: number
  onWallet(delta: number, label: string): void
  onEvent(event: Omit<AppEvent, 'id' | 'at'>): void
  onIntervention(lessonId: string): void
  onBack(): void
}

type Phase = 'draw' | 'discard' | 'over'
const SEAT_NAMES = ['You', 'Bot Ana', 'Bot Boy']
const SCRIPT_SEED = 2024 // deterministic deal for the scripted lesson

function freshState(rng: Parameters<typeof dealTongits>[0]): FullGameState {
  const deal = dealTongits(rng)
  const boards: PlayerBoard[] = deal.hands.map((hand) => ({ hand: [...hand], melds: [] }))
  return { boards, stock: [...deal.stock], discard: [] }
}

export function TongitsGame({ balance, onWallet, onEvent, onIntervention, onBack }: Props) {
  const [mode, setMode] = useState<'free' | 'scenario'>('free')
  const [state, setState] = useState<FullGameState>(() => freshState(seededRandom(SCRIPT_SEED)))
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState<Phase>('over')
  const [log, setLog] = useState<string[]>(['Choose a mode and deal a hand to begin.'])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<string | null>(null)
  const [lessonReady, setLessonReady] = useState(false)
  const [staked, setStaked] = useState(false)

  const { reduced } = useMotionPref()
  const you = state.boards[0]
  const suggestedMelds = useMemo(() => findBestMelds(you.hand), [you.hand])
  const yourDeadwood = useMemo(() => deadwoodValue(you.hand, you.melds.length ? you.melds : suggestedMelds), [you.hand, you.melds, suggestedMelds])
  const discardTop = state.discard[state.discard.length - 1]
  const stake = 20

  const note = (line: string) => setLog((prev) => [line, ...prev].slice(0, 8))

  const beginHand = () => {
    if (balance < stake) return
    const rng = mode === 'scenario' ? seededRandom(SCRIPT_SEED) : systemRandom
    setState(freshState(rng))
    setTurn(0)
    setPhase('draw')
    setSelected(new Set())
    setResult(null)
    setLessonReady(false)
    setLog([mode === 'scenario'
      ? 'Scripted lesson: a fixed deal shows how “almost winning” keeps you drawing.'
      : 'New hand dealt. Draw from stock or take the discard into a meld.'])
    if (!staked) {
      onWallet(-stake, `Tong-its ${mode} buy-in`)
      onEvent({ type: 'bet_placed', game: 'tongits', amount: stake })
      setStaked(true)
    }
  }

  const finish = (next: FullGameState, reason: string) => {
    const challenge = resolveChallenge(next.boards)
    const payouts = scorePayouts(challenge)
    const yourPayout = payouts[0]
    if (yourPayout > 0) onWallet(yourPayout, 'Tong-its winnings')
    setState(next)
    setPhase('over')
    setStaked(false)
    const won = challenge.winner === 0
    setResult(`${reason} ${won ? 'You had the lowest deadwood.' : `${SEAT_NAMES[challenge.winner]} won.`} Your net: ${yourPayout >= 0 ? '+' : ''}${yourPayout}.`)
    onEvent({ type: 'round_resolved', game: 'tongits', amount: yourPayout, detail: won ? 'win' : 'loss' })
    setLessonReady(true)
    note(`Hand over. Scores: ${challenge.scores.map((s, i) => `${SEAT_NAMES[i]} ${s}`).join(', ')}.`)
  }

  // --- Player actions -------------------------------------------------------

  const drawStock = () => {
    if (phase !== 'draw' || turn !== 0) return
    if (state.stock.length === 0) return finish(state, 'Stock exhausted — draw challenge.')
    const [card, ...rest] = state.stock
    const boards = cloneBoards(state.boards)
    boards[0] = { ...boards[0], hand: [...boards[0].hand, card] }
    setState({ ...state, boards, stock: rest })
    setPhase('discard')
    note(`You drew ${cardId(card)} from the stock.`)
  }

  const drawDiscard = () => {
    if (phase !== 'draw' || turn !== 0 || !discardTop) return
    const meld = findMeldForDiscard(you.hand, discardTop)
    if (!meld || !canPickupDiscard(you.hand, discardTop, meld.cards)) {
      note('You can only take the discard if it immediately completes a meld.')
      return
    }
    const boards = cloneBoards(state.boards)
    const handWithCard = [...boards[0].hand, discardTop]
    boards[0] = { hand: removeAll(handWithCard, meld.cards), melds: [...boards[0].melds, meld] }
    setState({ ...state, boards, discard: state.discard.slice(0, -1) })
    setPhase('discard')
    note(`You took ${cardId(discardTop)} and melded ${meld.cards.map(cardId).join('-')}.`)
  }

  const layMelds = () => {
    // Lay down the assist-suggested melds that are still fully in hand.
    const boards = cloneBoards(state.boards)
    let hand = boards[0].hand
    const laid: Meld[] = []
    for (const meld of suggestedMelds) {
      if (meld.cards.every((c) => hand.some((h) => cardId(h) === cardId(c)))) {
        hand = removeAll(hand, meld.cards)
        laid.push(meld)
      }
    }
    if (laid.length === 0) {
      note('No complete meld to lay right now.')
      return
    }
    boards[0] = { hand, melds: [...boards[0].melds, ...laid] }
    setState({ ...state, boards })
    note(`You laid ${laid.length} meld(s).`)
  }

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const discardSelected = () => {
    if (phase !== 'discard' || turn !== 0) return
    const ids = [...selected]
    if (ids.length !== 1) {
      note('Select exactly one card to discard.')
      return
    }
    const card = you.hand.find((c) => cardId(c) === ids[0])
    if (!card || !isLegalDiscard(you.hand, card)) return
    const boards = cloneBoards(state.boards)
    boards[0] = { ...boards[0], hand: removeAll(boards[0].hand, [card]) }
    let next: FullGameState = { ...state, boards, discard: [...state.discard, card] }
    setSelected(new Set())
    note(`You discarded ${cardId(card)}.`)
    if (isTongits(boards[0])) {
      return finish(next, 'Tong-its! You melded everything.')
    }
    // Hand off to bots.
    next = runBots(next)
    if (checkGameOver(next)) return
    setState(next)
    setTurn(0)
    setPhase('draw')
  }

  // --- Bot loop -------------------------------------------------------------

  const runBots = (start: FullGameState): FullGameState => {
    let current = start
    for (let seat = 1; seat < current.boards.length; seat += 1) {
      const level: BotLevel = seat === 1 ? 'standard' : 'beginner'
      current = takeBotTurn(current, seat, level, note)
      if (isTongits(current.boards[seat]) || current.stock.length === 0) return current
    }
    return current
  }

  const checkGameOver = (next: FullGameState): boolean => {
    const tongitsSeat = next.boards.findIndex(isTongits)
    if (tongitsSeat >= 0) {
      finish(next, `${SEAT_NAMES[tongitsSeat]} called Tong-its!`)
      return true
    }
    if (next.stock.length === 0) {
      finish(next, 'Stock exhausted — draw challenge.')
      return true
    }
    return false
  }

  const canTakeDiscard = phase === 'draw' && turn === 0 && !!discardTop && !!findMeldForDiscard(you.hand, discardTop)

  return <section className="game-view" aria-labelledby="tongits-title">
    <div className="game-top">
      <button className="secondary" onClick={onBack}>← Back</button>
      <label>Mode<select value={mode} onChange={(event) => setMode(event.target.value as 'free' | 'scenario')}>
        <option value="free">Random free play</option>
        <option value="scenario">Scripted lesson</option>
      </select></label>
    </div>
    <p className="eyebrow">Filipino three-player rummy • fair non-cheating bots</p>
    <h1 id="tongits-title">Tong-its</h1>
    {mode === 'scenario' && <div className="scenario-banner">Guided scenario: a fixed deal is scripted so you repeatedly come “one card away”, illustrating the near-miss pull.</div>}

    <div className="tongits-board" aria-live="polite">
      <div className="tongits-seat">
        <strong>Stock</strong><span>{state.stock.length} cards</span>
      </div>
      <div className="tongits-seat">
        <strong>Discard</strong><span>{discardTop ? cardId(discardTop) : '—'}</span>
      </div>
      {state.boards.map((board, i) => (
        <div className={`tongits-seat ${i === turn ? 'active' : ''}`} key={i}>
          <strong>{SEAT_NAMES[i]}{i === 0 ? ' (dealer)' : ''}</strong>
          <span>{i === 0 ? `${board.hand.length} cards` : `${board.hand.length} hidden`}</span>
          <small>{board.melds.length ? board.melds.map((m) => m.cards.map(cardId).join('-')).join(' | ') : 'no melds'}</small>
        </div>
      ))}
    </div>

    <div className="tongits-hand" role="group" aria-label="Your hand">
      {you.hand.map((card) => (
        <button
          type="button"
          key={cardId(card)}
          className={`tongits-card ${selected.has(cardId(card)) ? 'selected' : ''}`}
          aria-pressed={selected.has(cardId(card))}
          onClick={() => toggle(cardId(card))}
        >
          <FlipCard frontLabel={cardId(card)} revealed reduced={reduced} />
        </button>
      ))}
    </div>

    <p className="odds-note" aria-live="polite">Your best-case deadwood: {yourDeadwood}. Assist suggests {suggestedMelds.length} meld(s).</p>

    {phase === 'over' ? (
      <>
        {result && <p className="round-win" aria-live="polite">{result}</p>}
        <button className="play-button" onClick={beginHand}>Deal a new hand • buy-in {stake}</button>
      </>
    ) : (
      <div className="tongits-actions">
        {phase === 'draw' && <>
          <button className="play-button" onClick={drawStock} disabled={turn !== 0}>Draw from stock</button>
          <button className="secondary" onClick={drawDiscard} disabled={!canTakeDiscard}>Take discard into meld</button>
        </>}
        {phase === 'discard' && <>
          <button className="secondary" onClick={layMelds}>Lay suggested melds</button>
          <button className="play-button" onClick={discardSelected} disabled={selected.size !== 1}>Discard selected</button>
        </>}
      </div>
    )}

    {lessonReady && <button className="zoom-button" onClick={() => onIntervention('near-miss')}>Zoom out: why do near-misses keep me playing?</button>}

    <div className="log" aria-label="Turn log">
      {log.map((line, i) => <p key={i}>{line}</p>)}
    </div>
    {balance < stake && <p className="round-loss">Not enough fictional credits for the next buy-in.</p>}
  </section>
}

// ---------------------------------------------------------------------------
// Helpers (view-local, delegate all rules to the pure domain module)
// ---------------------------------------------------------------------------

function cloneBoards(boards: readonly PlayerBoard[]): PlayerBoard[] {
  return boards.map((b) => ({ hand: [...b.hand], melds: b.melds.map((m) => ({ kind: m.kind, cards: [...m.cards] })) }))
}

function removeAll(hand: readonly Card[], toRemove: readonly Card[]): Card[] {
  const out = [...hand]
  for (const card of toRemove) {
    const idx = out.findIndex((c) => cardId(c) === cardId(card))
    if (idx >= 0) out.splice(idx, 1)
  }
  return out
}

function findMeldForDiscard(hand: readonly Card[], top: Card): Meld | null {
  const withCard = [...hand, top]
  const melds = findBestMelds(withCard).filter((m) => m.cards.some((c) => cardId(c) === cardId(top)))
  if (melds.length === 0) return null
  return melds.reduce((best, m) => (m.cards.length > best.cards.length ? m : best))
}

function takeBotTurn(state: FullGameState, seat: number, level: BotLevel, note: (line: string) => void): FullGameState {
  const boards = cloneBoards(state.boards)
  let stock = [...state.stock]
  let discard = [...state.discard]

  const drawObs = observeFor(seat, { boards, stock, discard })
  const draw = botDecideDraw(drawObs, level)

  if (draw.source === 'discard' && draw.meldWithDiscard && discard.length) {
    const top = discard[discard.length - 1]
    const handWithCard = [...boards[seat].hand, top]
    const meld = classify(draw.meldWithDiscard)
    boards[seat] = { hand: removeAll(handWithCard, draw.meldWithDiscard), melds: [...boards[seat].melds, meld] }
    discard = discard.slice(0, -1)
    note(`${SEAT_NAMES[seat]} took the discard and melded.`)
  } else if (stock.length > 0) {
    const [card, ...rest] = stock
    boards[seat] = { ...boards[seat], hand: [...boards[seat].hand, card] }
    stock = rest
    note(`${SEAT_NAMES[seat]} drew from the stock.`)
  }

  // Lay best melds.
  const best = findBestMelds(boards[seat].hand)
  if (best.length) {
    boards[seat] = { hand: removeAllMelds(boards[seat].hand, best), melds: [...boards[seat].melds, ...best] }
  }

  if (deadwoodCards(boards[seat].hand, []).length === 0 && boards[seat].hand.length === 0 && boards[seat].melds.length) {
    return { boards, stock, discard }
  }

  // Discard.
  const discardObs = observeFor(seat, { boards, stock, discard })
  const decision = botDecideDiscard(boards[seat].hand, discardObs, level)
  if (isLegalDiscard(boards[seat].hand, decision.card)) {
    boards[seat] = { ...boards[seat], hand: removeAll(boards[seat].hand, [decision.card]) }
    discard = [...discard, decision.card]
    note(`${SEAT_NAMES[seat]} discarded ${cardId(decision.card)}.`)
  }

  return { boards, stock, discard }
}

function removeAllMelds(hand: readonly Card[], melds: readonly Meld[]): Card[] {
  let out = [...hand]
  for (const meld of melds) out = removeAll(out, meld.cards)
  return out
}

function classify(cards: readonly Card[]): Meld {
  // Sets share a rank; runs share a suit. Cheap local classification.
  const sameRank = cards.every((c) => c.rank === cards[0].rank)
  return { kind: sameRank ? 'set' : 'run', cards: [...cards] }
}
