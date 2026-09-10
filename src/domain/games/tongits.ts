import { shuffle, type RandomSource } from '../rng'

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export const suits = ['C', 'D', 'H', 'S'] as const
export type Suit = (typeof suits)[number]

// Ace-low ordering: Ace is rank 1, King is rank 13.
export const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export type Rank = (typeof ranks)[number]

export interface Card {
  readonly suit: Suit
  readonly rank: Rank
}

export type CardId = string // e.g. "AS", "10H", "KD"

export function cardId(card: Card): CardId {
  return `${card.rank}${card.suit}`
}

export function parseCard(id: CardId): Card {
  const suit = id.slice(-1) as Suit
  const rank = id.slice(0, -1) as Rank
  if (!suits.includes(suit) || !ranks.includes(rank)) throw new Error(`invalid card id: ${id}`)
  return { suit, rank }
}

export function rankValue(rank: Rank): number {
  return ranks.indexOf(rank) + 1 // A=1 .. K=13 (ace-low)
}

// Deadwood point value. Face cards (J,Q,K) and 10 count 10; ace counts 1; others pip.
export function cardPoints(card: Card): number {
  const value = rankValue(card.rank)
  return value >= 10 ? 10 : value
}

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) deck.push({ suit, rank })
  }
  return deck
}

// ---------------------------------------------------------------------------
// Deal
// ---------------------------------------------------------------------------

export const PLAYER_COUNT = 3
export const DEALER_INDEX = 0

export interface Deal {
  readonly hands: readonly Card[][] // hands[0] is dealer with 13 cards, others 12
  readonly stock: readonly Card[]
  readonly discard: readonly Card[] // empty at the start of the game
}

/**
 * Standard three-player Tong-its deal from a shuffled 52-card deck.
 * The dealer receives 13 cards, the two other players receive 12 each.
 * The remaining 15 cards form the stock. There is no starting discard;
 * the dealer opens play by discarding from their 13 cards.
 */
export function dealTongits(rng: RandomSource): Deal {
  const deck = shuffle(makeDeck(), rng)
  const hands: Card[][] = [[], [], []]
  let cursor = 0
  // Deal round-robin: dealer (13) and others (12). We deal 12 to everyone then 1 extra to dealer.
  for (let round = 0; round < 12; round += 1) {
    for (let player = 0; player < PLAYER_COUNT; player += 1) {
      hands[player].push(deck[cursor])
      cursor += 1
    }
  }
  hands[DEALER_INDEX].push(deck[cursor])
  cursor += 1
  const stock = deck.slice(cursor)
  return { hands, stock, discard: [] }
}

// ---------------------------------------------------------------------------
// Melds: sets and runs
// ---------------------------------------------------------------------------

export type MeldKind = 'set' | 'run'

export interface Meld {
  readonly kind: MeldKind
  readonly cards: readonly Card[]
}

/** A set is 3 or 4 cards of the same rank, all distinct suits. */
export function isValidSet(cards: readonly Card[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false
  const rank = cards[0].rank
  if (!cards.every((c) => c.rank === rank)) return false
  const uniqueSuits = new Set(cards.map((c) => c.suit))
  return uniqueSuits.size === cards.length
}

/**
 * A run is 3+ consecutive cards of the same suit. Ace is low only:
 * A-2-3 is valid, but Q-K-A / K-A-2 are not.
 */
export function isValidRun(cards: readonly Card[]): boolean {
  if (cards.length < 3) return false
  const suit = cards[0].suit
  if (!cards.every((c) => c.suit === suit)) return false
  const values = cards.map((c) => rankValue(c.rank))
  const sorted = [...values].sort((a, b) => a - b)
  // No duplicates and strictly consecutive.
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

export function isValidMeld(cards: readonly Card[]): boolean {
  return isValidSet(cards) || isValidRun(cards)
}

export function classifyMeld(cards: readonly Card[]): Meld | null {
  if (isValidSet(cards)) return { kind: 'set', cards: [...cards] }
  if (isValidRun(cards)) return { kind: 'run', cards: sortRun(cards) }
  return null
}

function sortRun(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
}

// ---------------------------------------------------------------------------
// Deadwood
// ---------------------------------------------------------------------------

function removeCards(hand: readonly Card[], toRemove: readonly Card[]): Card[] {
  const remaining = [...hand]
  for (const card of toRemove) {
    const idx = remaining.findIndex((c) => c.rank === card.rank && c.suit === card.suit)
    if (idx >= 0) remaining.splice(idx, 1)
  }
  return remaining
}

/** Sum of point values of cards not part of any provided meld. */
export function deadwoodValue(hand: readonly Card[], melds: readonly Meld[]): number {
  let remaining = [...hand]
  for (const meld of melds) remaining = removeCards(remaining, meld.cards)
  return remaining.reduce((sum, card) => sum + cardPoints(card), 0)
}

/** Cards in hand that are not covered by any of the provided melds. */
export function deadwoodCards(hand: readonly Card[], melds: readonly Meld[]): Card[] {
  let remaining = [...hand]
  for (const meld of melds) remaining = removeCards(remaining, meld.cards)
  return remaining
}

/**
 * Greedy best-effort meld finder for a hand: finds a non-overlapping set of
 * valid melds that minimizes remaining deadwood. Used by bots and the meld
 * assist. Exhaustive within reason for a 13-card hand.
 */
export function findBestMelds(hand: readonly Card[]): Meld[] {
  const candidates = enumerateMelds(hand)
  let best: Meld[] = []
  let bestDeadwood = deadwoodValue(hand, [])

  const search = (index: number, chosen: Meld[], used: Set<string>) => {
    const dw = deadwoodValue(hand, chosen)
    if (dw < bestDeadwood || (dw === bestDeadwood && chosen.length > best.length)) {
      bestDeadwood = dw
      best = chosen.map((m) => ({ kind: m.kind, cards: [...m.cards] }))
    }
    if (dw === 0) return
    for (let i = index; i < candidates.length; i += 1) {
      const meld = candidates[i]
      const ids = meld.cards.map(cardId)
      if (ids.some((id) => used.has(id))) continue
      ids.forEach((id) => used.add(id))
      search(i + 1, [...chosen, meld], used)
      ids.forEach((id) => used.delete(id))
    }
  }
  search(0, [], new Set())
  return best
}

/** Enumerate all valid minimal melds (size 3 sets/runs and size 4 sets) in a hand. */
export function enumerateMelds(hand: readonly Card[]): Meld[] {
  const melds: Meld[] = []
  // Sets by rank
  const byRank = new Map<Rank, Card[]>()
  for (const card of hand) {
    const list = byRank.get(card.rank) ?? []
    list.push(card)
    byRank.set(card.rank, list)
  }
  for (const cards of byRank.values()) {
    const uniqueSuits = dedupeSuits(cards)
    if (uniqueSuits.length >= 3) {
      // all 3-combinations and the full 4-set
      for (const combo of combinations(uniqueSuits, 3)) melds.push({ kind: 'set', cards: combo })
      if (uniqueSuits.length === 4) melds.push({ kind: 'set', cards: [...uniqueSuits] })
    }
  }
  // Runs by suit
  const bySuit = new Map<Suit, Card[]>()
  for (const card of hand) {
    const list = bySuit.get(card.suit) ?? []
    list.push(card)
    bySuit.set(card.suit, list)
  }
  for (const cards of bySuit.values()) {
    const unique = dedupeRanks(cards).sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
    for (let start = 0; start < unique.length; start += 1) {
      const run: Card[] = [unique[start]]
      for (let next = start + 1; next < unique.length; next += 1) {
        if (rankValue(unique[next].rank) === rankValue(run[run.length - 1].rank) + 1) {
          run.push(unique[next])
          if (run.length >= 3) melds.push({ kind: 'run', cards: [...run] })
        } else {
          break
        }
      }
    }
  }
  return melds
}

function dedupeSuits(cards: readonly Card[]): Card[] {
  const seen = new Set<Suit>()
  const out: Card[] = []
  for (const card of cards) {
    if (!seen.has(card.suit)) {
      seen.add(card.suit)
      out.push(card)
    }
  }
  return out
}

function dedupeRanks(cards: readonly Card[]): Card[] {
  const seen = new Set<Rank>()
  const out: Card[] = []
  for (const card of cards) {
    if (!seen.has(card.rank)) {
      seen.add(card.rank)
      out.push(card)
    }
  }
  return out
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [first, ...rest] = items
  const withFirst = combinations(rest, size - 1).map((combo) => [first, ...combo])
  const withoutFirst = combinations(rest, size)
  return [...withFirst, ...withoutFirst]
}

// ---------------------------------------------------------------------------
// Opening & discard-pickup rules
// ---------------------------------------------------------------------------

/**
 * A player may draw from the stock freely. Alternatively, they may take the top
 * discard, but only if they immediately use it in a valid meld (mandatory meld
 * on discard pickup). This validates that intent.
 */
export function canPickupDiscard(hand: readonly Card[], discardTop: Card, meldCards: readonly Card[]): boolean {
  // The meld must include the discard card and be otherwise composed of hand cards.
  const includesDiscard = meldCards.some((c) => c.rank === discardTop.rank && c.suit === discardTop.suit)
  if (!includesDiscard) return false
  if (!isValidMeld(meldCards)) return false
  const others = meldCards.filter((c) => !(c.rank === discardTop.rank && c.suit === discardTop.suit))
  return others.every((c) => hand.some((h) => h.rank === c.rank && h.suit === c.suit))
}

/**
 * "Opening" refers to the first time a player lays down melds. In standard
 * Tong-its there is no minimum point requirement, but a player must lay at
 * least one valid meld to be considered open. Returns true when the proposed
 * initial meld set is legal (all valid, non-overlapping, drawn from hand).
 */
export function canOpen(hand: readonly Card[], melds: readonly Meld[]): boolean {
  if (melds.length === 0) return false
  return meldsAreLegal(hand, melds)
}

/** All melds valid, disjoint, and fully contained in the hand. */
export function meldsAreLegal(hand: readonly Card[], melds: readonly Meld[]): boolean {
  const used = new Set<CardId>()
  const available = new Map<CardId, number>()
  for (const card of hand) available.set(cardId(card), (available.get(cardId(card)) ?? 0) + 1)
  for (const meld of melds) {
    if (!isValidMeld(meld.cards)) return false
    for (const card of meld.cards) {
      const id = cardId(card)
      if (used.has(id)) return false
      used.add(id)
      if (!available.has(id)) return false
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Sapaw (laying off onto an existing meld)
// ---------------------------------------------------------------------------

/**
 * Sapaw: adding one or more cards to an existing exposed meld (own or an
 * opponent's) such that the extended meld remains valid.
 */
export function canSapaw(existing: Meld, additions: readonly Card[]): boolean {
  if (additions.length === 0) return false
  const combined = [...existing.cards, ...additions]
  if (existing.kind === 'set') return isValidSet(combined)
  return isValidRun(combined)
}

export function applySapaw(existing: Meld, additions: readonly Card[]): Meld | null {
  if (!canSapaw(existing, additions)) return null
  const combined = [...existing.cards, ...additions]
  return classifyMeld(combined)
}

// ---------------------------------------------------------------------------
// Turn / draw source
// ---------------------------------------------------------------------------

export type DrawSource = 'stock' | 'discard'

export function stockExhausted(stock: readonly Card[]): boolean {
  return stock.length === 0
}

// ---------------------------------------------------------------------------
// Scoring, Tong-its, challenge, sunog
// ---------------------------------------------------------------------------

export interface PlayerBoard {
  readonly hand: readonly Card[]
  readonly melds: readonly Meld[]
}

/**
 * A player who has melded all cards (empty hand after melding) declares
 * "Tong-its" and wins immediately.
 */
export function isTongits(board: PlayerBoard): boolean {
  return deadwoodCards(board.hand, board.melds).length === 0 && board.hand.length > 0
}

/**
 * "Sunog" (burned): a player who has not laid any meld the entire game is
 * penalized. Here we expose the predicate: a board with no melds is sunog.
 */
export function isSunog(board: PlayerBoard): boolean {
  return board.melds.length === 0
}

/**
 * Draw challenge: when the stock is exhausted (or a player "knocks"/calls),
 * players compare deadwood. The lowest deadwood wins. This computes each
 * player's final deadwood total, applying a sunog penalty for players with no
 * melds (their full hand counts, doubled by convention here as a burn penalty).
 */
export interface ChallengeResult {
  readonly scores: readonly number[] // deadwood per player (lower is better)
  readonly winner: number // index of lowest deadwood
  readonly sunog: readonly boolean[]
}

export function resolveChallenge(boards: readonly PlayerBoard[]): ChallengeResult {
  const sunog = boards.map(isSunog)
  const scores = boards.map((board, i) => {
    const base = deadwoodValue(board.hand, board.melds)
    return sunog[i] ? base * 2 : base
  })
  let winner = 0
  for (let i = 1; i < scores.length; i += 1) {
    if (scores[i] < scores[winner]) winner = i
  }
  return { scores, winner, sunog }
}

/**
 * Standard payoff helper: winner collects the sum of the other players'
 * deadwood scores as fictional credits; losers pay their own score.
 */
export function scorePayouts(result: ChallengeResult): number[] {
  const { scores, winner } = result
  const winnings = scores.reduce((sum, score, i) => (i === winner ? sum : sum + score), 0)
  return scores.map((score, i) => (i === winner ? winnings : -score))
}

// ---------------------------------------------------------------------------
// Bot observation (filtered / hidden information)
// ---------------------------------------------------------------------------

/**
 * The public, non-cheating view a bot is allowed to reason over. It contains
 * the bot's OWN hand, all exposed melds, the discard pile, and only the COUNTS
 * of opponents' hidden hands and the stock — never opponents' actual cards.
 */
export interface BotObservation {
  readonly seat: number
  readonly hand: readonly Card[]
  readonly exposedMelds: readonly { seat: number; melds: readonly Meld[] }[]
  readonly discard: readonly Card[]
  readonly opponentHandSizes: readonly number[]
  readonly stockCount: number
}

export interface FullGameState {
  readonly boards: readonly PlayerBoard[]
  readonly stock: readonly Card[]
  readonly discard: readonly Card[]
}

/**
 * Produce the filtered observation for a given seat. This is the ONLY function a
 * bot should consume; it guarantees opponents' concealed cards are never leaked.
 */
export function observeFor(seat: number, state: FullGameState): BotObservation {
  return {
    seat,
    hand: [...state.boards[seat].hand],
    exposedMelds: state.boards.map((board, i) => ({ seat: i, melds: board.melds.map((m) => ({ kind: m.kind, cards: [...m.cards] })) })),
    discard: [...state.discard],
    opponentHandSizes: state.boards.map((board, i) => (i === seat ? -1 : deadwoodCards(board.hand, []).length)),
    stockCount: state.stock.length,
  }
}

// ---------------------------------------------------------------------------
// Bot strategy (fair, no cheating)
// ---------------------------------------------------------------------------

export type BotLevel = 'beginner' | 'standard'

export interface BotDrawDecision {
  readonly source: DrawSource
  readonly meldWithDiscard?: readonly Card[] // required when source === 'discard'
}

export interface BotDiscardDecision {
  readonly card: Card
  readonly melds: readonly Meld[] // melds the bot chooses to keep laid down
}

/**
 * Decide whether to draw from stock or take the discard. A fair bot only uses
 * its own hand and the public discard top — never opponents' hidden cards.
 */
export function botDecideDraw(obs: BotObservation, level: BotLevel): BotDrawDecision {
  const top = obs.discard[obs.discard.length - 1]
  if (top) {
    const meld = bestMeldUsingCard(obs.hand, top)
    if (meld && canPickupDiscard(obs.hand, top, meld.cards)) {
      // Standard bots always take a free meld; beginners take it only for runs
      // or 4-card sets (simpler heuristic that still respects rules).
      if (level === 'standard' || meld.cards.length >= 4 || meld.kind === 'run') {
        return { source: 'discard', meldWithDiscard: meld.cards }
      }
    }
  }
  if (obs.stockCount === 0) return { source: 'discard', meldWithDiscard: top ? tryMeld(obs.hand, top) : undefined }
  return { source: 'stock' }
}

function tryMeld(hand: readonly Card[], top: Card): readonly Card[] | undefined {
  const meld = bestMeldUsingCard(hand, top)
  return meld && canPickupDiscard(hand, top, meld.cards) ? meld.cards : undefined
}

function bestMeldUsingCard(hand: readonly Card[], card: Card): Meld | null {
  const withCard = [...hand, card]
  const melds = enumerateMelds(withCard).filter((m) => m.cards.some((c) => c.rank === card.rank && c.suit === card.suit))
  if (melds.length === 0) return null
  // Prefer the largest meld.
  return melds.reduce((best, m) => (m.cards.length > best.cards.length ? m : best))
}

/**
 * Decide what to discard after drawing. A fair bot lays its best melds then
 * discards its highest-value deadwood card. Beginners discard the single
 * highest card; standard bots avoid discarding a card that completes an
 * opponent-visible sapaw when a safer alternative exists.
 */
export function botDecideDiscard(hand: readonly Card[], obs: BotObservation, level: BotLevel): BotDiscardDecision {
  const melds = findBestMelds(hand)
  const deadwood = deadwoodCards(hand, melds)
  const pool = deadwood.length > 0 ? deadwood : [...hand]

  const byValueDesc = [...pool].sort((a, b) => cardPoints(b) - cardPoints(a))
  if (level === 'beginner') {
    return { card: byValueDesc[0], melds }
  }

  // Standard: avoid feeding opponents' exposed melds via sapaw if we can.
  const opponentMelds = obs.exposedMelds.filter((e) => e.seat !== obs.seat).flatMap((e) => e.melds)
  const safe = byValueDesc.filter((card) => !opponentMelds.some((meld) => canSapaw(meld, [card])))
  const choice = safe[0] ?? byValueDesc[0]
  return { card: choice, melds }
}

/** Convenience: is this discard legal (the card is actually in hand). */
export function isLegalDiscard(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => c.rank === card.rank && c.suit === card.suit)
}
