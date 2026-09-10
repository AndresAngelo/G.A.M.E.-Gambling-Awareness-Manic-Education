import { shuffle, type RandomSource } from '../rng'

export const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const suits = ['♠', '♥', '♦', '♣'] as const

export type Rank = (typeof ranks)[number]
export type Suit = (typeof suits)[number]

export interface Card {
  rank: Rank
  suit: Suit
}

export const DEFAULT_DECK_COUNT = 6

/** Base value of a single card. Aces count as 1 here and are promoted in {@link handValue}. */
export function cardValue(rank: Rank): number {
  if (rank === 'A') return 1
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return Number(rank)
}

/** Build an ordered N-deck shoe (default six decks). */
export function buildShoe(deckCount: number = DEFAULT_DECK_COUNT): Card[] {
  if (!Number.isInteger(deckCount) || deckCount <= 0) {
    throw new Error('deckCount must be a positive integer')
  }
  const cards: Card[] = []
  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ rank, suit })
      }
    }
  }
  return cards
}

/** Deterministically shuffle a shoe using the shared seeded RNG. */
export function shuffleShoe(rng: RandomSource, deckCount: number = DEFAULT_DECK_COUNT): Card[] {
  return shuffle(buildShoe(deckCount), rng)
}

export interface HandValue {
  /** Best total that does not bust when possible; otherwise the hard total. */
  total: number
  /** True when an ace is still counted as 11 in the best total. */
  soft: boolean
  bust: boolean
}

/** Evaluate a hand with correct ace valuation (one ace may count as 11). */
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0
  let aces = 0
  for (const card of cards) {
    total += cardValue(card.rank)
    if (card.rank === 'A') aces += 1
  }
  let soft = false
  // Promote a single ace from 1 to 11 when it keeps the hand at or below 21.
  if (aces > 0 && total + 10 <= 21) {
    total += 10
    soft = true
  }
  return { total, soft, bust: total > 21 }
}

/** A natural blackjack: exactly two cards totalling 21. */
export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21
}

export type PlayerAction = 'hit' | 'stand' | 'double'

/** Legal actions given the current player hand and whether a double is affordable. */
export function legalActions(cards: readonly Card[], canAffordDouble: boolean): PlayerAction[] {
  const value = handValue(cards)
  if (value.bust || value.total === 21) return []
  const actions: PlayerAction[] = ['hit', 'stand']
  if (cards.length === 2 && canAffordDouble) actions.push('double')
  return actions
}

/**
 * Deterministic dealer policy: hit until 17 or more, standing on soft 17.
 * Returns the sequence of dealer cards after drawing from the shoe. `nextIndex`
 * points at the next undealt card in the shoe.
 */
export function playDealer(
  dealer: readonly Card[],
  shoe: readonly Card[],
  startIndex: number,
): { cards: Card[]; nextIndex: number } {
  const cards = [...dealer]
  let index = startIndex
  while (true) {
    const value = handValue(cards)
    // Stand on all 17s including soft 17.
    if (value.total >= 17) break
    if (index >= shoe.length) break
    cards.push(shoe[index])
    index += 1
  }
  return { cards, nextIndex: index }
}

export type RoundOutcome = 'player-blackjack' | 'player-win' | 'push' | 'dealer-win'

/** Settle a completed round from the player and dealer hands. */
export function settleRound(player: readonly Card[], dealer: readonly Card[]): RoundOutcome {
  const playerValue = handValue(player)
  const dealerValue = handValue(dealer)
  const playerNatural = isBlackjack(player)
  const dealerNatural = isBlackjack(dealer)

  if (playerNatural && dealerNatural) return 'push'
  if (playerNatural) return 'player-blackjack'
  if (dealerNatural) return 'dealer-win'
  if (playerValue.bust) return 'dealer-win'
  if (dealerValue.bust) return 'player-win'
  if (playerValue.total > dealerValue.total) return 'player-win'
  if (playerValue.total < dealerValue.total) return 'dealer-win'
  return 'push'
}

/**
 * Total amount returned to the player (including the returned stake) for an
 * outcome. Blackjack pays 3:2, an ordinary win pays 1:1, a push refunds the
 * stake, and a loss returns nothing.
 */
export function roundReturn(outcome: RoundOutcome, stake: number): number {
  if (!Number.isFinite(stake) || stake <= 0) return 0
  switch (outcome) {
    case 'player-blackjack': return stake + stake * 1.5
    case 'player-win': return stake * 2
    case 'push': return stake
    case 'dealer-win': return 0
  }
}
