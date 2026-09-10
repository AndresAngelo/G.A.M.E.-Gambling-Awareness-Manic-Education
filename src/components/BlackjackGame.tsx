import { useMemo, useState } from 'react'
import {
  handValue,
  isBlackjack,
  legalActions,
  playDealer,
  roundReturn,
  settleRound,
  shuffleShoe,
  type Card,
  type RoundOutcome,
} from '../domain/games/blackjack'
import { seededRandom, systemRandom } from '../domain/rng'
import type { AppEvent } from '../domain/types'

interface Props {
  balance: number
  onWallet(delta: number, label: string): void
  onEvent(event: Omit<AppEvent, 'id' | 'at'>): void
  onIntervention(lessonId: string): void
  onBack(): void
}

type Mode = 'free' | 'scenario'
type Phase = 'idle' | 'player' | 'done'

// A fixed shoe used by the scripted scenario so the demonstration is repeatable:
// the player is dealt a natural blackjack (A + 10) that pays 3:2.
const SCENARIO_SEED = 4

interface RoundState {
  shoe: Card[]
  index: number
  player: Card[]
  dealer: Card[]
  stake: number
  doubled: boolean
  phase: Phase
  outcome: RoundOutcome | null
  returned: number
}

const cardLabel = (card: Card) => `${card.rank}${card.suit}`

const outcomeText: Record<RoundOutcome, string> = {
  'player-blackjack': 'Natural blackjack — pays 3:2',
  'player-win': 'You win this round',
  push: 'Push — stake refunded',
  'dealer-win': 'Dealer wins this round',
}

export function BlackjackGame({ balance, onWallet, onEvent, onIntervention, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('free')
  const [stake, setStake] = useState(10)
  const [round, setRound] = useState<RoundState | null>(null)
  const [lessonReady, setLessonReady] = useState(false)

  const canAffordDouble = round ? stake <= balance : false
  const actions = useMemo(
    () => (round && round.phase === 'player' ? legalActions(round.player, canAffordDouble) : []),
    [round, canAffordDouble],
  )

  const finish = (state: RoundState) => {
    const dealt = playDealer(state.dealer, state.shoe, state.index)
    const totalStake = state.doubled ? state.stake * 2 : state.stake
    const outcome = settleRound(state.player, dealt.cards)
    const returned = roundReturn(outcome, totalStake)
    if (returned > 0) onWallet(returned, 'Blackjack return')
    const largeWin = outcome === 'player-blackjack'
    onEvent({
      type: 'round_resolved',
      game: 'blackjack',
      amount: returned - totalStake,
      detail: outcome,
    })
    setRound({ ...state, dealer: dealt.cards, index: dealt.nextIndex, phase: 'done', outcome, returned })
    setLessonReady(mode === 'scenario' || largeWin)
  }

  const deal = () => {
    if (stake > balance) return
    onWallet(-stake, `Blackjack ${mode} wager`)
    onEvent({ type: 'bet_placed', game: 'blackjack', amount: stake })
    const shoe = mode === 'scenario' ? shuffleShoe(seededRandom(SCENARIO_SEED)) : shuffleShoe(systemRandom)
    // Standard deal order: player, dealer, player, dealer.
    const player = [shoe[0], shoe[2]]
    const dealer = [shoe[1], shoe[3]]
    const base: RoundState = {
      shoe,
      index: 4,
      player,
      dealer,
      stake,
      doubled: false,
      phase: 'player',
      outcome: null,
      returned: 0,
    }
    setLessonReady(false)
    // A natural on either side ends the hand immediately.
    if (isBlackjack(player) || isBlackjack(dealer)) {
      finish(base)
    } else {
      setRound(base)
    }
  }

  const hit = () => {
    if (!round || round.phase !== 'player') return
    const next = round.shoe[round.index]
    const player = [...round.player, next]
    const updated: RoundState = { ...round, player, index: round.index + 1 }
    if (handValue(player).bust || handValue(player).total === 21) {
      finish(updated)
    } else {
      setRound(updated)
    }
  }

  const stand = () => {
    if (!round || round.phase !== 'player') return
    finish(round)
  }

  const double = () => {
    if (!round || round.phase !== 'player' || stake > balance) return
    onWallet(-round.stake, 'Blackjack double wager')
    const next = round.shoe[round.index]
    finish({ ...round, player: [...round.player, next], index: round.index + 1, doubled: true })
  }

  const playerValue = round ? handValue(round.player) : null
  const dealerReveal = round?.phase === 'done'
  const dealerValue = round && dealerReveal ? handValue(round.dealer) : null

  return (
    <section className="game-view blackjack" aria-labelledby="blackjack-title">
      <div className="game-top">
        <button className="secondary" onClick={onBack}>← Back</button>
        <label>
          Mode
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as Mode)
              setRound(null)
              setLessonReady(false)
            }}
          >
            <option value="free">Random free play</option>
            <option value="scenario">Scripted lesson</option>
          </select>
        </label>
      </div>

      <p className="eyebrow">Six-deck blackjack, dealer stands on soft 17</p>
      <h1 id="blackjack-title">Blackjack</h1>

      {mode === 'scenario' && (
        <div className="scenario-banner">
          Guided scenario: a scripted natural blackjack (Ace and ten) demonstrates a memorable 3:2
          celebration. This deal is fixed, not random.
        </div>
      )}

      <div className="blackjack-table" aria-live="polite">
        <div className="blackjack-hand" aria-label="Dealer hand">
          <h2>Dealer</h2>
          <ul className="blackjack-cards">
            {round
              ? round.dealer.map((card, position) => (
                  <li className="blackjack-card" key={`dealer-${position}-${cardLabel(card)}`}>
                    {dealerReveal || position === 0 ? cardLabel(card) : '🂠'}
                  </li>
                ))
              : <li className="blackjack-card blackjack-card-empty">—</li>}
          </ul>
          <small>{dealerValue ? `Total ${dealerValue.total}` : round ? 'Hole card hidden' : 'Waiting to deal'}</small>
        </div>

        <div className="blackjack-hand" aria-label="Your hand">
          <h2>You</h2>
          <ul className="blackjack-cards">
            {round
              ? round.player.map((card, position) => (
                  <li className="blackjack-card" key={`player-${position}-${cardLabel(card)}`}>
                    {cardLabel(card)}
                  </li>
                ))
              : <li className="blackjack-card blackjack-card-empty">—</li>}
          </ul>
          <small>{playerValue ? `${playerValue.soft ? 'Soft ' : ''}Total ${playerValue.total}${playerValue.bust ? ' — bust' : ''}` : 'Place a fictional wager'}</small>
        </div>
      </div>

      {round?.phase === 'done' && round.outcome && (
        <div className={`blackjack-outcome ${round.outcome}`} role="status">
          {outcomeText[round.outcome]} • {round.returned ? `returned ${round.returned}` : 'wager lost'}
        </div>
      )}

      {(!round || round.phase === 'done') && (
        <>
          <fieldset className="stake-picker">
            <legend>Fictional stake</legend>
            {[10, 50, 100].map((amount) => (
              <button
                type="button"
                key={amount}
                className={stake === amount ? 'selected' : ''}
                onClick={() => setStake(amount)}
              >
                {amount}
              </button>
            ))}
          </fieldset>
          <button className="play-button" onClick={deal} disabled={stake > balance}>
            Deal one hand
          </button>
        </>
      )}

      {round?.phase === 'player' && (
        <div className="blackjack-actions" role="group" aria-label="Player actions">
          <button className="play-button" onClick={hit} disabled={!actions.includes('hit')}>Hit</button>
          <button className="play-button" onClick={stand} disabled={!actions.includes('stand')}>Stand</button>
          <button
            className="play-button"
            onClick={double}
            disabled={!actions.includes('double')}
            title={canAffordDouble ? undefined : 'Not enough balance to double'}
          >
            Double
          </button>
        </div>
      )}

      {lessonReady && (
        <button className="zoom-button" onClick={() => onIntervention('skill-variance')}>
          Zoom out and separate decision from chance
        </button>
      )}

      <div className="odds-note">
        The dealer follows one fixed legal rule: draw below 17, stand on 17 and above including soft 17.
        Blackjack pays 3:2, but good decisions still lose whenever the unseen cards fall against you.
      </div>
    </section>
  )
}
