import { describe, expect, it } from 'vitest'
import { seededRandom } from '../rng'
import {
  applySapaw,
  botDecideDiscard,
  botDecideDraw,
  canOpen,
  canPickupDiscard,
  canSapaw,
  cardId,
  cardPoints,
  classifyMeld,
  dealTongits,
  deadwoodCards,
  deadwoodValue,
  enumerateMelds,
  findBestMelds,
  isLegalDiscard,
  isSunog,
  isTongits,
  isValidRun,
  isValidSet,
  makeDeck,
  observeFor,
  parseCard,
  rankValue,
  resolveChallenge,
  scorePayouts,
  stockExhausted,
  type Card,
  type FullGameState,
  type Meld,
  type PlayerBoard,
} from './tongits'

const C = (id: string): Card => parseCard(id)

describe('cards & deck', () => {
  it('builds a unique 52-card deck', () => {
    const deck = makeDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(cardId)).size).toBe(52)
  })

  it('scores ace low and faces as ten', () => {
    expect(rankValue('A')).toBe(1)
    expect(rankValue('K')).toBe(13)
    expect(cardPoints(C('AS'))).toBe(1)
    expect(cardPoints(C('9H'))).toBe(9)
    expect(cardPoints(C('10D'))).toBe(10)
    expect(cardPoints(C('KC'))).toBe(10)
  })
})

describe('deal', () => {
  it('deals 13 to dealer, 12 to others, 15 in stock, all unique', () => {
    const deal = dealTongits(seededRandom(7))
    expect(deal.hands[0]).toHaveLength(13)
    expect(deal.hands[1]).toHaveLength(12)
    expect(deal.hands[2]).toHaveLength(12)
    expect(deal.stock).toHaveLength(15)
    expect(deal.discard).toHaveLength(0)

    const all = [...deal.hands.flat(), ...deal.stock]
    expect(all).toHaveLength(52)
    expect(new Set(all.map(cardId)).size).toBe(52)
  })

  it('produces different deals for different seeds', () => {
    const a = dealTongits(seededRandom(1))
    const b = dealTongits(seededRandom(2))
    expect(a.hands[0].map(cardId).join()).not.toBe(b.hands[0].map(cardId).join())
  })
})

describe('melds', () => {
  it('validates sets of distinct suits', () => {
    expect(isValidSet([C('7C'), C('7D'), C('7H')])).toBe(true)
    expect(isValidSet([C('7C'), C('7D'), C('7H'), C('7S')])).toBe(true)
    expect(isValidSet([C('7C'), C('7C'), C('7H')])).toBe(false) // duplicate suit
    expect(isValidSet([C('7C'), C('8D'), C('7H')])).toBe(false) // mixed rank
    expect(isValidSet([C('7C'), C('7D')])).toBe(false) // too short
  })

  it('validates ace-low runs only', () => {
    expect(isValidRun([C('AH'), C('2H'), C('3H')])).toBe(true)
    expect(isValidRun([C('4S'), C('5S'), C('6S'), C('7S')])).toBe(true)
    expect(isValidRun([C('QD'), C('KD'), C('AD')])).toBe(false) // ace high not allowed
    expect(isValidRun([C('KH'), C('AH'), C('2H')])).toBe(false) // wrap not allowed
    expect(isValidRun([C('5H'), C('6D'), C('7H')])).toBe(false) // mixed suit
  })

  it('classifies and sorts runs', () => {
    const meld = classifyMeld([C('3H'), C('AH'), C('2H')])
    expect(meld?.kind).toBe('run')
    expect(meld?.cards.map(cardId)).toEqual(['AH', '2H', '3H'])
  })

  it('enumerates and finds best melds minimizing deadwood', () => {
    const hand = [C('7C'), C('7D'), C('7H'), C('4S'), C('5S'), C('6S'), C('KH')]
    const enumerated = enumerateMelds(hand)
    expect(enumerated.some((m) => m.kind === 'set')).toBe(true)
    expect(enumerated.some((m) => m.kind === 'run')).toBe(true)
    const best = findBestMelds(hand)
    // Only the lone KH (10 points) should remain as deadwood.
    expect(deadwoodValue(hand, best)).toBe(10)
  })
})

describe('deadwood', () => {
  it('sums cards outside melds', () => {
    const hand = [C('7C'), C('7D'), C('7H'), C('KH'), C('AS')]
    const melds: Meld[] = [{ kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }]
    expect(deadwoodValue(hand, melds)).toBe(11) // K=10 + A=1
    expect(deadwoodCards(hand, melds).map(cardId).sort()).toEqual(['AS', 'KH'])
  })
})

describe('opening & discard pickup', () => {
  it('rejects opening with no melds and accepts a legal meld', () => {
    const hand = [C('7C'), C('7D'), C('7H'), C('KH')]
    expect(canOpen(hand, [])).toBe(false)
    expect(canOpen(hand, [{ kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }])).toBe(true)
  })

  it('rejects opening melds that use cards not in hand', () => {
    const hand = [C('7C'), C('7D'), C('KH')]
    expect(canOpen(hand, [{ kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }])).toBe(false)
  })

  it('requires the discard be used in a valid meld to pick it up', () => {
    const hand = [C('7C'), C('7D'), C('KH')]
    const top = C('7H')
    // Valid: forms a set with two hand cards.
    expect(canPickupDiscard(hand, top, [C('7C'), C('7D'), C('7H')])).toBe(true)
    // Invalid: meld does not include the discard.
    expect(canPickupDiscard(hand, top, [C('7C'), C('7D'), C('KH')])).toBe(false)
    // Invalid: uses a card not in hand.
    expect(canPickupDiscard(hand, top, [C('7H'), C('7S'), C('7C')])).toBe(false)
    // Invalid: not a meld.
    expect(canPickupDiscard(hand, top, [C('7H'), C('KH')])).toBe(false)
  })
})

describe('sapaw', () => {
  it('extends a set with a matching suit', () => {
    const meld: Meld = { kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }
    expect(canSapaw(meld, [C('7S')])).toBe(true)
    expect(canSapaw(meld, [C('7C')])).toBe(false) // duplicate suit
    expect(canSapaw(meld, [C('8S')])).toBe(false) // wrong rank
    expect(canSapaw(meld, [])).toBe(false)
    expect(applySapaw(meld, [C('7S')])?.cards).toHaveLength(4)
  })

  it('extends a run consecutively same suit', () => {
    const meld: Meld = { kind: 'run', cards: [C('4S'), C('5S'), C('6S')] }
    expect(canSapaw(meld, [C('7S')])).toBe(true)
    expect(canSapaw(meld, [C('3S')])).toBe(true)
    expect(canSapaw(meld, [C('7H')])).toBe(false) // wrong suit
    expect(canSapaw(meld, [C('8S')])).toBe(false) // gap
    expect(applySapaw(meld, [C('7S'), C('3S')])?.cards.map(cardId)).toEqual(['3S', '4S', '5S', '6S', '7S'])
  })
})

describe('tongits, sunog, stock, challenge & scoring', () => {
  it('detects tongits when hand fully melds', () => {
    const board: PlayerBoard = {
      hand: [C('7C'), C('7D'), C('7H'), C('4S'), C('5S'), C('6S')],
      melds: [
        { kind: 'set', cards: [C('7C'), C('7D'), C('7H')] },
        { kind: 'run', cards: [C('4S'), C('5S'), C('6S')] },
      ],
    }
    expect(isTongits(board)).toBe(true)
  })

  it('detects sunog when no melds laid', () => {
    expect(isSunog({ hand: [C('KH')], melds: [] })).toBe(true)
    expect(isSunog({ hand: [C('KH')], melds: [{ kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }] })).toBe(false)
  })

  it('flags stock exhaustion', () => {
    expect(stockExhausted([])).toBe(true)
    expect(stockExhausted([C('AS')])).toBe(false)
  })

  it('resolves a draw challenge by lowest deadwood with sunog penalty', () => {
    const boards: PlayerBoard[] = [
      { hand: [C('KH'), C('QH')], melds: [] }, // sunog: (10+10)*2 = 40
      { hand: [C('7C'), C('7D'), C('7H'), C('2S')], melds: [{ kind: 'set', cards: [C('7C'), C('7D'), C('7H')] }] }, // 2
      { hand: [C('9C'), C('8D')], melds: [{ kind: 'set', cards: [C('3C'), C('3D'), C('3H')] }] }, // 17 (but melds not in hand -> deadwood counts full hand)
    ]
    const result = resolveChallenge(boards)
    expect(result.sunog).toEqual([true, false, false])
    expect(result.scores[0]).toBe(40)
    expect(result.scores[1]).toBe(2)
    expect(result.winner).toBe(1)

    const payouts = scorePayouts(result)
    expect(payouts[1]).toBeGreaterThan(0)
    expect(payouts[0]).toBeLessThan(0)
    // Zero-sum: winner's gains equal the losers' losses.
    expect(payouts.reduce((s, p) => s + p, 0)).toBe(0)
  })
})

describe('bot observation (hidden information boundary)', () => {
  const state: FullGameState = {
    boards: [
      { hand: [C('7C'), C('7D'), C('KH')], melds: [{ kind: 'set', cards: [C('3C'), C('3D'), C('3H')] }] },
      { hand: [C('AS'), C('2S'), C('9D')], melds: [] },
      { hand: [C('QC'), C('QD'), C('QH')], melds: [] },
    ],
    stock: [C('5C'), C('6C')],
    discard: [C('7H')],
  }

  it('exposes own hand, melds, discard, counts — never opponent cards', () => {
    const obs = observeFor(0, state)
    expect(obs.hand.map(cardId).sort()).toEqual(['7C', '7D', 'KH'])
    expect(obs.stockCount).toBe(2)
    expect(obs.discard.map(cardId)).toEqual(['7H'])
    // Opponent hand sizes are counts only.
    expect(obs.opponentHandSizes[1]).toBe(3)
    expect(obs.opponentHandSizes[2]).toBe(3)

    // Collect every card id reachable from the observation.
    const visibleIds = new Set<string>([
      ...obs.hand.map(cardId),
      ...obs.discard.map(cardId),
      ...obs.exposedMelds.flatMap((e) => e.melds.flatMap((m) => m.cards.map(cardId))),
    ])
    // Opponents' concealed cards must never be reachable.
    expect(visibleIds.has('AS')).toBe(false)
    expect(visibleIds.has('2S')).toBe(false)
    expect(visibleIds.has('9D')).toBe(false)
    expect(visibleIds.has('QC')).toBe(false)
    expect(visibleIds.has('QD')).toBe(false)
    expect(visibleIds.has('QH')).toBe(false)
    // Exposed melds are public, so a laid meld remains visible.
    expect(visibleIds.has('3C')).toBe(true)
  })
})

describe('bot strategy (fair, legal)', () => {
  it('takes discard only with a mandatory valid meld', () => {
    const state: FullGameState = {
      boards: [
        { hand: [C('7C'), C('7D'), C('KH'), C('QS')], melds: [] },
        { hand: [], melds: [] },
        { hand: [], melds: [] },
      ],
      stock: [C('5C')],
      discard: [C('7H')],
    }
    const obs = observeFor(0, state)
    const decision = botDecideDraw(obs, 'standard')
    expect(decision.source).toBe('discard')
    expect(decision.meldWithDiscard).toBeDefined()
    expect(canPickupDiscard(obs.hand, C('7H'), decision.meldWithDiscard!)).toBe(true)
  })

  it('draws from stock when the discard cannot be melded', () => {
    const state: FullGameState = {
      boards: [
        { hand: [C('7C'), C('9D'), C('KH')], melds: [] },
        { hand: [], melds: [] },
        { hand: [], melds: [] },
      ],
      stock: [C('5C'), C('6C')],
      discard: [C('2S')],
    }
    const obs = observeFor(0, state)
    expect(botDecideDraw(obs, 'standard').source).toBe('stock')
    expect(botDecideDraw(obs, 'beginner').source).toBe('stock')
  })

  it('discards a legal card and prefers high deadwood', () => {
    const state: FullGameState = {
      boards: [
        { hand: [C('7C'), C('7D'), C('7H'), C('KH'), C('2S')], melds: [] },
        { hand: [], melds: [] },
        { hand: [], melds: [] },
      ],
      stock: [C('5C')],
      discard: [],
    }
    const obs = observeFor(0, state)
    const decision = botDecideDiscard(obs.hand, obs, 'beginner')
    expect(isLegalDiscard(obs.hand, decision.card)).toBe(true)
    expect(cardId(decision.card)).toBe('KH') // highest-value deadwood
  })

  it('standard bot avoids feeding an opponent sapaw when a safe discard exists', () => {
    const opponentMeld: Meld = { kind: 'set', cards: [C('KC'), C('KD'), C('KS')] }
    const state: FullGameState = {
      boards: [
        { hand: [C('KH'), C('9S'), C('3C')], melds: [] },
        { hand: [], melds: [opponentMeld] },
        { hand: [], melds: [] },
      ],
      stock: [C('5C')],
      discard: [],
    }
    const obs = observeFor(0, state)
    const decision = botDecideDiscard(obs.hand, obs, 'standard')
    // KH would complete opponent's K-set via sapaw; standard bot should avoid it.
    expect(cardId(decision.card)).not.toBe('KH')
    expect(isLegalDiscard(obs.hand, decision.card)).toBe(true)
  })
})
