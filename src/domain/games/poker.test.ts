import { describe, expect, it } from 'vitest'
import { seededRandom } from '../rng'
import {
  applyAction,
  botDecision,
  cardId,
  compareHands,
  dealHand,
  determineWinners,
  evaluateHand,
  freshDeck,
  legalActions,
  observationFor,
  playHand,
  preflopStrength,
  scriptedScenario,
  shuffledDeck,
  type Card,
  type Observation,
  type SeatConfig,
  type Suit,
} from './poker'

function card(rank: number, suit: Suit): Card {
  return { rank: rank as Card['rank'], suit }
}

const CONFIGS: SeatConfig[] = [
  { id: 'you', name: 'You', isHuman: true },
  { id: 'bot1', name: 'Ada', isHuman: false, bot: 'standard' },
  { id: 'bot2', name: 'Ben', isHuman: false, bot: 'beginner' },
]

describe('deck integrity', () => {
  it('fresh deck has 52 unique cards', () => {
    const deck = freshDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(cardId)).size).toBe(52)
  })

  it('shuffled deck preserves the 52 unique cards', () => {
    const deck = shuffledDeck(seededRandom(7))
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(cardId)).size).toBe(52)
  })

  it('dealt hands and board never reuse a card', () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const rng = seededRandom(seed)
      const table = playHand(dealHand(CONFIGS, rng), rng, (obs) =>
        obs.legalActions.includes('check') ? 'check' : 'call',
      )
      const used = [...table.seats.flatMap((s) => s.hole), ...table.board]
      const ids = used.map(cardId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('hand evaluator: categories', () => {
  it('detects each category correctly', () => {
    expect(evaluateHand([card(14, 's'), card(13, 's'), card(12, 's'), card(11, 's'), card(10, 's')]).category).toBe('straight-flush')
    expect(evaluateHand([card(9, 's'), card(9, 'h'), card(9, 'd'), card(9, 'c'), card(2, 's')]).category).toBe('four-of-a-kind')
    expect(evaluateHand([card(9, 's'), card(9, 'h'), card(9, 'd'), card(2, 'c'), card(2, 's')]).category).toBe('full-house')
    expect(evaluateHand([card(2, 's'), card(5, 's'), card(9, 's'), card(11, 's'), card(13, 's')]).category).toBe('flush')
    expect(evaluateHand([card(5, 's'), card(6, 'h'), card(7, 'd'), card(8, 'c'), card(9, 's')]).category).toBe('straight')
    expect(evaluateHand([card(9, 's'), card(9, 'h'), card(9, 'd'), card(4, 'c'), card(2, 's')]).category).toBe('three-of-a-kind')
    expect(evaluateHand([card(9, 's'), card(9, 'h'), card(4, 'd'), card(4, 'c'), card(2, 's')]).category).toBe('two-pair')
    expect(evaluateHand([card(9, 's'), card(9, 'h'), card(6, 'd'), card(4, 'c'), card(2, 's')]).category).toBe('pair')
    expect(evaluateHand([card(14, 's'), card(9, 'h'), card(6, 'd'), card(4, 'c'), card(2, 's')]).category).toBe('high-card')
  })

  it('reads the ace-low wheel straight with 5 as the high card', () => {
    const wheel = evaluateHand([card(14, 's'), card(2, 'h'), card(3, 'd'), card(4, 'c'), card(5, 's')])
    expect(wheel.category).toBe('straight')
    expect(wheel.tiebreakers[0]).toBe(5)
  })

  it('picks the best 5 from 7 cards', () => {
    const value = evaluateHand([
      card(14, 's'), card(14, 'h'), // pair of aces in hole
      card(14, 'd'), card(9, 's'), card(4, 'h'), card(6, 'c'), card(2, 'd'), // board
    ])
    expect(value.category).toBe('three-of-a-kind')
    expect(value.tiebreakers[0]).toBe(14)
  })
})

describe('hand evaluator: tiebreakers', () => {
  it('higher category always beats lower', () => {
    const flush = evaluateHand([card(2, 's'), card(5, 's'), card(9, 's'), card(11, 's'), card(13, 's')])
    const straight = evaluateHand([card(5, 's'), card(6, 'h'), card(7, 'd'), card(8, 'c'), card(9, 's')])
    expect(compareHands(flush, straight)).toBeGreaterThan(0)
  })

  it('resolves same-category ties by kicker', () => {
    const aceKing = evaluateHand([card(9, 's'), card(9, 'h'), card(14, 'd'), card(4, 'c'), card(2, 's')])
    const aceQueen = evaluateHand([card(9, 'c'), card(9, 'd'), card(13, 'd'), card(4, 'h'), card(2, 'h')])
    expect(compareHands(aceKing, aceQueen)).toBeGreaterThan(0)
  })

  it('identical hands tie exactly', () => {
    const a = evaluateHand([card(9, 's'), card(9, 'h'), card(14, 'd'), card(4, 'c'), card(2, 's')])
    const b = evaluateHand([card(9, 'c'), card(9, 'd'), card(14, 'h'), card(4, 'h'), card(2, 'h')])
    expect(compareHands(a, b)).toBe(0)
  })

  it('higher straight beats lower straight', () => {
    const nineHigh = evaluateHand([card(5, 's'), card(6, 'h'), card(7, 'd'), card(8, 'c'), card(9, 's')])
    const sixHigh = evaluateHand([card(2, 's'), card(3, 'h'), card(4, 'd'), card(5, 'c'), card(6, 's')])
    expect(compareHands(nineHigh, sixHigh)).toBeGreaterThan(0)
  })
})

describe('determineWinners split pots', () => {
  it('returns multiple winners when board plays', () => {
    const rng = seededRandom(1)
    const table = dealHand(
      [
        { id: 'a', name: 'A', isHuman: false, bot: 'standard' },
        { id: 'b', name: 'B', isHuman: false, bot: 'standard' },
      ],
      rng,
    )
    // Force identical low hole cards + a royal-flush board so both share it.
    table.seats[0].hole = [card(2, 'c'), card(3, 'd')]
    table.seats[1].hole = [card(2, 'h'), card(3, 's')]
    table.board = [card(10, 's'), card(11, 's'), card(12, 's'), card(13, 's'), card(14, 's')]
    // Neither seat's hole plays; both use the straight flush on board.
    expect(new Set(determineWinners(table))).toEqual(new Set(['a', 'b']))
  })
})

describe('observation privacy', () => {
  it('exposes only the seat’s own hole cards and public board', () => {
    const rng = seededRandom(3)
    const table = dealHand(CONFIGS, rng)
    const obs = observationFor(table, 0)
    // Own hole cards match.
    expect(obs.hole.map(cardId).sort()).toEqual(table.seats[0].hole.map(cardId).sort())
    // No opponent hole cards leak anywhere in the observation object.
    const serialized = JSON.stringify(obs)
    for (const opponent of [table.seats[1], table.seats[2]]) {
      for (const c of opponent.hole) {
        // A hole card could coincidentally match the board, but board is empty preflop.
        expect(serialized.includes(cardId(c))).toBe(false)
      }
    }
    // Deck is never present.
    expect(serialized.includes('deck')).toBe(false)
  })

  it('observation mutations do not affect the table', () => {
    const rng = seededRandom(4)
    const table = dealHand(CONFIGS, rng)
    const obs = observationFor(table, 0)
    obs.hole[0].rank = 2
    obs.board.push(card(2, 's'))
    expect(table.seats[0].hole[0].rank).not.toBe(2)
    expect(table.board).toHaveLength(0)
  })
})

describe('legal actions', () => {
  it('offers check/bet when nothing is owed and call/raise when facing a bet', () => {
    const rng = seededRandom(5)
    const table = dealHand(CONFIGS, rng)
    expect(legalActions(table, table.toActIndex)).toEqual(expect.arrayContaining(['fold', 'check', 'bet']))
    const afterBet = applyAction(table, 'bet', 'open')
    const facing = legalActions(afterBet, afterBet.toActIndex)
    expect(facing).toEqual(expect.arrayContaining(['fold', 'call', 'raise']))
    expect(facing).not.toContain('check')
  })

  it('rejects illegal actions', () => {
    const rng = seededRandom(6)
    const table = dealHand(CONFIGS, rng)
    // Cannot call when nothing is owed.
    expect(() => applyAction(table, 'call', '')).toThrow(/Illegal/)
  })

  it('caps raises per street', () => {
    const rng = seededRandom(9)
    let table = dealHand(CONFIGS, rng)
    table = applyAction(table, 'bet', '')
    // Keep raising until the cap is hit.
    let raises = 0
    while (legalActions(table, table.toActIndex).includes('raise')) {
      table = applyAction(table, 'raise', '')
      raises += 1
      if (raises > 10) break
    }
    expect(legalActions(table, table.toActIndex)).not.toContain('raise')
    expect(raises).toBeLessThanOrEqual(table.maxRaises)
  })
})

describe('bot fairness and reproducibility', () => {
  it('only ever returns a legal action', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const rng = seededRandom(seed)
      const table = dealHand(CONFIGS, rng)
      const obs = observationFor(table, 1)
      const decision = botDecision(obs, 'standard', rng)
      expect(obs.legalActions).toContain(decision.action)
      expect(decision.reasoning.length).toBeGreaterThan(0)
    }
  })

  it('is reproducible for the same seed', () => {
    const runOnce = () => {
      const rng = seededRandom(123)
      const dealt = dealHand(CONFIGS, seededRandom(123))
      const obs = observationFor(dealt, 1)
      return botDecision(obs, 'standard', rng).action
    }
    expect(runOnce()).toBe(runOnce())
  })

  it('produces mixed (non-constant) decisions across a seeded sequence', () => {
    const obs: Observation = {
      seatId: 'x',
      street: 'flop',
      hole: [card(9, 's'), card(8, 'h')] as [Card, Card],
      board: [card(7, 'd'), card(2, 'c'), card(14, 's')],
      pot: 30,
      toCall: 10,
      betSize: 10,
      legalActions: ['fold', 'call', 'raise'],
      activeOpponents: 1,
      raisesThisStreet: 1,
      maxRaises: 4,
    }
    // A single seeded generator drives a sequence of decisions, exactly as the
    // engine drives sequential bot turns. The seeded rolls span the full range
    // so a mix of legal actions appears – bots are not fully deterministic.
    const rng = seededRandom(2024)
    const seen = new Set<string>()
    for (let i = 0; i < 80; i += 1) {
      seen.add(botDecision({ ...obs }, 'standard', rng).action)
    }
    expect(seen.size).toBeGreaterThanOrEqual(2)
  })

  it('standard bots fold weak hands more than beginners', () => {
    const weak = { rank: 3, suit: 's' } as Card
    const weak2 = { rank: 2, suit: 'h' } as Card
    let stdFolds = 0
    let begFolds = 0
    for (let seed = 0; seed < 100; seed += 1) {
      const base: Observation = {
        seatId: 'x',
        street: 'preflop',
        hole: [weak, weak2] as [Card, Card],
        board: [] as Card[],
        pot: 30,
        toCall: 10,
        betSize: 10,
        legalActions: ['fold', 'call', 'raise'],
        activeOpponents: 2,
        raisesThisStreet: 1,
        maxRaises: 4,
      }
      if (botDecision({ ...base }, 'standard', seededRandom(seed)).action === 'fold') stdFolds += 1
      if (botDecision({ ...base }, 'beginner', seededRandom(seed)).action === 'fold') begFolds += 1
    }
    expect(stdFolds).toBeGreaterThan(begFolds)
  })
})

describe('preflop strength', () => {
  it('ranks premium pairs above trash', () => {
    const aces = preflopStrength([card(14, 's'), card(14, 'h')])
    const trash = preflopStrength([card(7, 'd'), card(2, 'c')])
    expect(aces).toBeGreaterThan(trash)
    expect(aces).toBeLessThanOrEqual(1)
    expect(trash).toBeGreaterThanOrEqual(0)
  })
})

describe('full hand play through all streets', () => {
  it('reaches showdown with a decided winner and complete log', () => {
    const rng = seededRandom(11)
    const table = playHand(dealHand(CONFIGS, rng), rng, (obs) =>
      obs.legalActions.includes('check') ? 'check' : 'call',
    )
    expect(table.street).toBe('showdown')
    expect(table.winners).not.toBeNull()
    expect((table.winners ?? []).length).toBeGreaterThanOrEqual(1)
    expect(table.log.length).toBeGreaterThan(0)
    // Board should have progressed to 5 cards if nobody folded early; either
    // way it never exceeds 5.
    expect(table.board.length).toBeLessThanOrEqual(5)
  })

  it('ends immediately when everyone folds to one player', () => {
    const rng = seededRandom(12)
    let table = dealHand(CONFIGS, rng)
    table = applyAction(table, 'bet', '')
    table = applyAction(table, 'fold', '')
    table = applyAction(table, 'fold', '')
    expect(table.street).toBe('showdown')
    expect(table.winners).toEqual([table.seats[0].id])
  })
})

describe('scripted scenario', () => {
  it('is deterministic and awards the scripted winner', () => {
    const { table, note } = scriptedScenario(CONFIGS)
    expect(table.winners).toEqual(['you'])
    expect(note.toLowerCase()).toContain('not random')
    // Cards are all unique.
    const ids = [...table.seats.flatMap((s) => s.hole), ...table.board].map(cardId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
