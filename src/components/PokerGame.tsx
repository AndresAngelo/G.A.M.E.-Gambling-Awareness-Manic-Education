import { useMemo, useState } from 'react'
import {
  applyAction,
  botDecision,
  cardLabel,
  categoryLabels,
  dealHand,
  determineWinners,
  evaluateHand,
  legalActions,
  observationFor,
  scriptedScenario,
  type Card,
  type HandLog,
  type PlayerAction,
  type PokerTable,
  type SeatConfig,
} from '../domain/games/poker'
import { seededRandom, systemRandom, type RandomSource } from '../domain/rng'
import type { AppEvent } from '../domain/types'

interface Props {
  balance: number
  onWallet(delta: number, label: string): void
  onEvent(event: Omit<AppEvent, 'id' | 'at'>): void
  onIntervention(lessonId: string): void
  onBack(): void
}

const SEATS: SeatConfig[] = [
  { id: 'you', name: 'You', isHuman: true },
  { id: 'ada', name: 'Ada (standard)', isHuman: false, bot: 'standard' },
  { id: 'ben', name: 'Ben (beginner)', isHuman: false, bot: 'beginner' },
]

const HUMAN_INDEX = 0

// A fixed buy-in per hand keeps the fictional wallet math simple: the human
// posts the buy-in up front, then any pot share is returned at showdown.
const BUY_IN = 40

interface RoundState {
  table: PokerTable
  rng: RandomSource
  finished: boolean
}

export function PokerGame({ balance, onWallet, onEvent, onIntervention, onBack }: Props) {
  const [mode, setMode] = useState<'free' | 'scenario'>('free')
  const [round, setRound] = useState<RoundState | null>(null)
  const [scriptNote, setScriptNote] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [lessonReady, setLessonReady] = useState(false)

  const table = round?.table ?? null
  const isHumanTurn =
    table !== null &&
    table.street !== 'showdown' &&
    table.toActIndex === HUMAN_INDEX &&
    !table.seats[HUMAN_INDEX].folded

  const humanLegal = useMemo<PlayerAction[]>(
    () => (isHumanTurn && table ? legalActions(table, HUMAN_INDEX) : []),
    [isHumanTurn, table],
  )

  const start = () => {
    if (BUY_IN > balance) return
    onWallet(-BUY_IN, `Poker ${mode} buy-in`)
    onEvent({ type: 'bet_placed', game: 'poker', amount: BUY_IN })
    setOutcome(null)
    setLessonReady(false)

    if (mode === 'scenario') {
      const scripted = scriptedScenario(SEATS)
      setScriptNote(scripted.note)
      resolve(scripted.table)
      setRound({ table: scripted.table, rng: seededRandom(1), finished: true })
      return
    }

    setScriptNote(null)
    const rng = systemRandom
    let next = dealHand(SEATS, rng)
    next = runBotsUntilHumanOrEnd(next, rng)
    setRound({ table: next, rng, finished: next.street === 'showdown' })
    if (next.street === 'showdown') resolve(next)
  }

  const act = (action: PlayerAction) => {
    if (!round || !isHumanTurn) return
    let next = applyAction(round.table, action, 'Your decision.')
    next = runBotsUntilHumanOrEnd(next, round.rng)
    const finished = next.street === 'showdown'
    setRound({ ...round, table: next, finished })
    if (finished) resolve(next)
  }

  const resolve = (finalTable: PokerTable) => {
    const winners = finalTable.winners ?? determineWinners(finalTable)
    const humanWon = winners.includes('you')
    // Even split of the pot among winners for the fictional return.
    const share = winners.length > 0 ? Math.round(finalTable.pot / winners.length) : 0
    const returned = humanWon ? share : 0
    if (returned > 0) onWallet(returned, 'Poker pot share')
    const net = returned - BUY_IN
    const largeWin = returned >= BUY_IN * 3
    onEvent({
      type: 'round_resolved',
      game: 'poker',
      amount: net,
      detail: largeWin ? 'large-win' : returned ? 'win' : 'loss',
    })
    setOutcome(
      humanWon
        ? `You win the ${finalTable.pot} pot${winners.length > 1 ? ` (split ${winners.length} ways)` : ''}.`
        : `You lose. Winner: ${winners.map((id) => seatName(finalTable, id)).join(', ')}.`,
    )
    setLessonReady(mode === 'scenario' || largeWin)
  }

  return (
    <section className="game-view" aria-labelledby="poker-title">
      <div className="game-top">
        <button className="secondary" onClick={onBack}>
          ← Back
        </button>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as 'free' | 'scenario')}>
            <option value="free">Random free play</option>
            <option value="scenario">Scripted lesson</option>
          </select>
        </label>
      </div>

      <p className="eyebrow">Limit Texas Hold’em • fixed-limit • you versus two fair bots</p>
      <h1 id="poker-title">Poker</h1>

      {scriptNote && <div className="scenario-banner">{scriptNote}</div>}

      {table === null ? (
        <p aria-live="polite">
          Post a fictional {BUY_IN}-chip buy-in to deal one limit Hold’em hand. Bots see only the shared board and
          their own cards — never yours.
        </p>
      ) : (
        <Table table={table} outcome={outcome} isHumanTurn={isHumanTurn} />
      )}

      {isHumanTurn && (
        <fieldset className="stake-picker" aria-label="Your action">
          <legend>Your action</legend>
          {(['fold', 'check', 'call', 'bet', 'raise'] as PlayerAction[]).map((action) => (
            <button
              key={action}
              type="button"
              disabled={!humanLegal.includes(action)}
              onClick={() => act(action)}
            >
              {actionLabel(action, table)}
            </button>
          ))}
        </fieldset>
      )}

      {(!round || round.finished) && (
        <button className="play-button" onClick={start} disabled={BUY_IN > balance}>
          {round ? 'Deal a new hand' : 'Deal one hand'}
        </button>
      )}

      {lessonReady && (
        <button className="zoom-button" onClick={() => onIntervention('skill-variance')}>
          Zoom out and deconstruct this hand
        </button>
      )}

      {table && <ReasoningLog log={table.log} table={table} />}

      <div className="odds-note">
        Bots act on public information plus their own hole cards only — they cannot see yours. Fixed betting limits cap
        each raise, and every hand starts from a freshly shuffled 52-card deck. Past hands never change the next deal.
      </div>
    </section>
  )
}

// Advance the table by running bot decisions until it is either the human's
// turn again or the hand reaches showdown. Bots use fair, seeded strategy.
function runBotsUntilHumanOrEnd(start: PokerTable, rng: RandomSource): PokerTable {
  let current = start
  let guard = 0
  while (current.street !== 'showdown' && guard < 200) {
    guard += 1
    const index = current.toActIndex
    const seat = current.seats[index]
    if (seat.isHuman && !seat.folded) break
    const legal = legalActions(current, index)
    if (legal.length === 0) break
    const observation = observationFor(current, index)
    const decision = botDecision(observation, seat.bot ?? 'standard', rng)
    const action = legal.includes(decision.action)
      ? decision.action
      : legal.includes('check')
        ? 'check'
        : 'fold'
    current = applyAction(current, action, decision.reasoning)
  }
  return current
}

function Table({
  table,
  outcome,
  isHumanTurn,
}: {
  table: PokerTable
  outcome: string | null
  isHumanTurn: boolean
}) {
  const winners = table.street === 'showdown' ? new Set(table.winners ?? []) : new Set<string>()
  return (
    <div className="poker-table">
      <div className="poker-board" aria-label="Community board">
        <strong>Board ({streetLabel(table.street)})</strong>
        <div className="poker-cards">
          {table.board.length === 0 ? (
            <span className="poker-card placeholder">no cards yet</span>
          ) : (
            table.board.map((card) => <CardChip key={cardKey(card)} card={card} />)
          )}
        </div>
        <small>Pot: {table.pot} chips</small>
      </div>

      <ul className="poker-seats">
        {table.seats.map((seat, index) => {
          const reveal = seat.isHuman || table.street === 'showdown'
          const cards = [...seat.hole, ...table.board]
          const value = table.street === 'showdown' && !seat.folded && cards.length >= 5
            ? evaluateHand(cards)
            : null
          return (
            <li
              key={seat.id}
              className={`poker-seat${seat.folded ? ' folded' : ''}${winners.has(seat.id) ? ' winner' : ''}`}
              aria-current={isHumanTurn && index === HUMAN_INDEX ? 'true' : undefined}
            >
              <div className="poker-seat-name">
                {seat.name}
                {winners.has(seat.id) && <span className="tag"> winner</span>}
                {seat.folded && <span className="tag"> folded</span>}
              </div>
              <div className="poker-cards">
                {reveal && !seat.folded ? (
                  seat.hole.map((card) => <CardChip key={cardKey(card)} card={card} />)
                ) : (
                  <>
                    <span className="poker-card facedown" aria-label="hidden card">
                      🂠
                    </span>
                    <span className="poker-card facedown" aria-label="hidden card">
                      🂠
                    </span>
                  </>
                )}
              </div>
              {value && table.street === 'showdown' && !seat.folded && (
                <small>{categoryLabels[value.category]}</small>
              )}
            </li>
          )
        })}
      </ul>

      {outcome && (
        <p className="poker-outcome" aria-live="polite">
          {outcome}
        </p>
      )}
    </div>
  )
}

function CardChip({ card }: { card: Card }) {
  const red = card.suit === 'h' || card.suit === 'd'
  return (
    <span className={`poker-card ${red ? 'red' : 'black'}`}>{cardLabel(card)}</span>
  )
}

function ReasoningLog({ log, table }: { log: HandLog[]; table: PokerTable }) {
  if (log.length === 0) return null
  return (
    <details className="poker-log">
      <summary>Development reasoning ({log.length} actions)</summary>
      <ol>
        {log.map((entry, index) => (
          <li key={`${entry.seatId}-${index}`}>
            <strong>{seatName(table, entry.seatId)}</strong> — {streetLabel(entry.street)}:{' '}
            <em>{entry.action}</em>
            {entry.reasoning ? ` — ${entry.reasoning}` : ''}
          </li>
        ))}
      </ol>
    </details>
  )
}

function actionLabel(action: PlayerAction, table: PokerTable | null): string {
  if (!table) return action
  const size = table.street === 'preflop' || table.street === 'flop' ? table.smallBet : table.bigBet
  switch (action) {
    case 'bet':
      return `Bet ${size}`
    case 'raise':
      return `Raise ${size}`
    case 'call': {
      const owed = table.currentBet - table.seats[HUMAN_INDEX].committed
      return `Call ${Math.max(0, owed)}`
    }
    default:
      return action.charAt(0).toUpperCase() + action.slice(1)
  }
}

function streetLabel(street: PokerTable['street']): string {
  return street.charAt(0).toUpperCase() + street.slice(1)
}

function seatName(table: PokerTable, id: string): string {
  return table.seats.find((seat) => seat.id === id)?.name ?? id
}

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`
}
