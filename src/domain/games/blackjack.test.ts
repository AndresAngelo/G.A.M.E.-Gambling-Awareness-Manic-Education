import { describe, expect, it } from 'vitest'
import {
  buildShoe,
  cardValue,
  handValue,
  isBlackjack,
  legalActions,
  playDealer,
  ranks,
  roundReturn,
  settleRound,
  shuffleShoe,
  suits,
  type Card,
} from './blackjack'
import { seededRandom } from '../rng'

const card = (rank: Card['rank'], suit: Card['suit'] = '♠'): Card => ({ rank, suit })

describe('Blackjack shoe', () => {
  it('builds a configurable multi-deck shoe of 52 cards per deck', () => {
    expect(buildShoe(1)).toHaveLength(52)
    expect(buildShoe()).toHaveLength(52 * 6)
    expect(buildShoe(6)).toHaveLength(52 * 6)
    expect(ranks).toHaveLength(13)
    expect(suits).toHaveLength(4)
  })

  it('rejects invalid deck counts', () => {
    expect(() => buildShoe(0)).toThrow()
    expect(() => buildShoe(-1)).toThrow()
    expect(() => buildShoe(1.5)).toThrow()
  })

  it('shuffles deterministically from a seed while preserving all cards', () => {
    const a = shuffleShoe(seededRandom(7))
    const b = shuffleShoe(seededRandom(7))
    const c = shuffleShoe(seededRandom(8))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
    expect(a).toHaveLength(52 * 6)
    // Same multiset of cards after shuffling.
    const key = (cards: Card[]) => [...cards].map((x) => `${x.rank}${x.suit}`).sort().join()
    expect(key(a)).toBe(key(buildShoe()))
  })
})

describe('Hand valuation', () => {
  it('scores face cards as ten and number cards at pip value', () => {
    expect(cardValue('K')).toBe(10)
    expect(cardValue('Q')).toBe(10)
    expect(cardValue('7')).toBe(7)
    expect(cardValue('A')).toBe(1)
  })

  it('counts a single ace as eleven when it does not bust (soft hand)', () => {
    expect(handValue([card('A'), card('7')])).toEqual({ total: 18, soft: true, bust: false })
  })

  it('demotes aces to one to avoid busting (hard hand)', () => {
    expect(handValue([card('A'), card('7'), card('K')])).toEqual({ total: 18, soft: false, bust: false })
    expect(handValue([card('A'), card('A'), card('9')])).toEqual({ total: 21, soft: true, bust: false })
  })

  it('flags a bust above 21', () => {
    expect(handValue([card('K'), card('Q'), card('5')])).toEqual({ total: 25, soft: false, bust: true })
  })

  it('recognizes a two-card natural blackjack only', () => {
    expect(isBlackjack([card('A'), card('K')])).toBe(true)
    expect(isBlackjack([card('A'), card('7'), card('3')])).toBe(false)
    expect(isBlackjack([card('K'), card('Q'), card('A')])).toBe(false)
  })
})

describe('Legal actions', () => {
  it('offers hit, stand and (affordable) double on a fresh two-card hand', () => {
    expect(legalActions([card('9'), card('7')], true)).toEqual(['hit', 'stand', 'double'])
    expect(legalActions([card('9'), card('7')], false)).toEqual(['hit', 'stand'])
  })

  it('drops double after the first draw', () => {
    expect(legalActions([card('5'), card('4'), card('3')], true)).toEqual(['hit', 'stand'])
  })

  it('offers no actions on 21 or a bust', () => {
    expect(legalActions([card('A'), card('K')], true)).toEqual([])
    expect(legalActions([card('K'), card('Q'), card('5')], true)).toEqual([])
  })
})

describe('Dealer policy (stands on soft 17)', () => {
  it('draws until reaching a hard 17 or more, deterministically', () => {
    // Dealer starts on 6, then draws 5 (11), then 10 (hard 21) and stops.
    const shoe = [card('5'), card('10'), card('9')]
    const result = playDealer([card('6')], shoe, 0)
    expect(result.cards.map((c) => c.rank)).toEqual(['6', '5', '10'])
    expect(handValue(result.cards).total).toBe(21)
    expect(result.nextIndex).toBe(2)
  })

  it('stands on soft 17 (A + 6) without drawing', () => {
    const shoe = [card('9')]
    const result = playDealer([card('A'), card('6')], shoe, 0)
    expect(result.cards).toHaveLength(2)
    expect(result.nextIndex).toBe(0)
    expect(handValue(result.cards)).toEqual({ total: 17, soft: true, bust: false })
  })

  it('is reproducible for the same shoe and start index', () => {
    const shoe = [card('4'), card('4'), card('4'), card('4')]
    expect(playDealer([card('2')], shoe, 0)).toEqual(playDealer([card('2')], shoe, 0))
  })
})

describe('Settlement and returns', () => {
  it('resolves naturals, wins, pushes and losses', () => {
    expect(settleRound([card('A'), card('K')], [card('9'), card('9')])).toBe('player-blackjack')
    expect(settleRound([card('A'), card('K')], [card('A'), card('Q')])).toBe('push')
    expect(settleRound([card('10'), card('9')], [card('A'), card('K')])).toBe('dealer-win')
    expect(settleRound([card('10'), card('9')], [card('10'), card('7')])).toBe('player-win')
    expect(settleRound([card('K'), card('Q'), card('5')], [card('10'), card('7')])).toBe('dealer-win')
    expect(settleRound([card('10'), card('7')], [card('K'), card('Q'), card('5')])).toBe('player-win')
    expect(settleRound([card('10'), card('8')], [card('10'), card('8')])).toBe('push')
  })

  it('pays blackjack 3:2, wins 1:1, pushes refund and losses return nothing', () => {
    expect(roundReturn('player-blackjack', 10)).toBe(25)
    expect(roundReturn('player-win', 10)).toBe(20)
    expect(roundReturn('push', 10)).toBe(10)
    expect(roundReturn('dealer-win', 10)).toBe(0)
    expect(roundReturn('player-win', 0)).toBe(0)
  })
})
