import { shuffle, type RandomSource } from '../rng'

// ---------------------------------------------------------------------------
// Cards & deck
// ---------------------------------------------------------------------------

export const suits = ['s', 'h', 'd', 'c'] as const
export type Suit = typeof suits[number]

// 2..14 where 11=J, 12=Q, 13=K, 14=A
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
export const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export interface Card {
  rank: Rank
  suit: Suit
}

const rankLabels: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
}

const suitSymbols: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

export function cardLabel(card: Card): string {
  return `${rankLabels[card.rank]}${suitSymbols[card.suit]}`
}

export function cardId(card: Card): string {
  return `${card.rank}${card.suit}`
}

export function freshDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function shuffledDeck(rng: RandomSource): Card[] {
  return shuffle(freshDeck(), rng)
}

// ---------------------------------------------------------------------------
// Hand evaluation (5–7 cards)
// ---------------------------------------------------------------------------

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'

const categoryOrder: HandCategory[] = [
  'high-card',
  'pair',
  'two-pair',
  'three-of-a-kind',
  'straight',
  'flush',
  'full-house',
  'four-of-a-kind',
  'straight-flush',
]

export const categoryRank: Record<HandCategory, number> = categoryOrder.reduce(
  (acc, category, index) => {
    acc[category] = index
    return acc
  },
  {} as Record<HandCategory, number>,
)

export const categoryLabels: Record<HandCategory, string> = {
  'high-card': 'High card',
  pair: 'Pair',
  'two-pair': 'Two pair',
  'three-of-a-kind': 'Three of a kind',
  straight: 'Straight',
  flush: 'Flush',
  'full-house': 'Full house',
  'four-of-a-kind': 'Four of a kind',
  'straight-flush': 'Straight flush',
}

export interface HandValue {
  category: HandCategory
  // Ordered tiebreaker ranks (most significant first). Compared lexically.
  tiebreakers: number[]
}

function descending(numbers: number[]): number[] {
  return [...numbers].sort((a, b) => b - a)
}

// Returns the highest card of a straight given a set of ranks, or 0 if none.
// Handles the wheel (A-2-3-4-5) where the ace plays low and the straight high is 5.
function bestStraightHigh(uniqueRanks: number[]): number {
  const present = new Set(uniqueRanks)
  // Ace can act as 1 for the wheel.
  if (present.has(14)) present.add(1)
  const sorted = [...present].sort((a, b) => b - a)
  let run = 1
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] - 1) {
      run += 1
      if (run >= 5) return sorted[i - run + 1]
    } else if (sorted[i] !== sorted[i - 1]) {
      run = 1
    }
  }
  return 0
}

/**
 * Evaluate the best 5-card poker hand from 5, 6, or 7 cards.
 * Returns a comparable HandValue.
 */
export function evaluateHand(cards: readonly Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('evaluateHand expects between 5 and 7 cards')
  }

  const rankCounts = new Map<number, number>()
  const suitGroups = new Map<Suit, number[]>()
  for (const card of cards) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1)
    const group = suitGroups.get(card.suit) ?? []
    group.push(card.rank)
    suitGroups.set(card.suit, group)
  }

  // Flush / straight-flush detection.
  let flushSuit: Suit | null = null
  for (const [suit, group] of suitGroups) {
    if (group.length >= 5) flushSuit = suit
  }

  if (flushSuit) {
    const flushRanks = suitGroups.get(flushSuit) as number[]
    const straightFlushHigh = bestStraightHigh(flushRanks)
    if (straightFlushHigh) {
      return { category: 'straight-flush', tiebreakers: [straightFlushHigh] }
    }
  }

  // Group ranks by their multiplicity for pair/trips/quads logic.
  const byCount = new Map<number, number[]>()
  for (const [rank, count] of rankCounts) {
    const bucket = byCount.get(count) ?? []
    bucket.push(rank)
    byCount.set(count, bucket)
  }
  const quads = descending(byCount.get(4) ?? [])
  const trips = descending(byCount.get(3) ?? [])
  const pairs = descending(byCount.get(2) ?? [])
  const singles = descending(byCount.get(1) ?? [])

  if (quads.length > 0) {
    const four = quads[0]
    const kicker = descending([...quads.slice(1), ...trips, ...pairs, ...singles])[0]
    return { category: 'four-of-a-kind', tiebreakers: [four, kicker] }
  }

  // Full house: a trip plus another trip or pair.
  if (trips.length >= 2) {
    return { category: 'full-house', tiebreakers: [trips[0], trips[1]] }
  }
  if (trips.length === 1 && pairs.length >= 1) {
    return { category: 'full-house', tiebreakers: [trips[0], pairs[0]] }
  }

  if (flushSuit) {
    const flushRanks = descending(suitGroups.get(flushSuit) as number[]).slice(0, 5)
    return { category: 'flush', tiebreakers: flushRanks }
  }

  const straightHigh = bestStraightHigh([...rankCounts.keys()])
  if (straightHigh) {
    return { category: 'straight', tiebreakers: [straightHigh] }
  }

  if (trips.length === 1) {
    const kickers = descending([...pairs, ...singles]).slice(0, 2)
    return { category: 'three-of-a-kind', tiebreakers: [trips[0], ...kickers] }
  }

  if (pairs.length >= 2) {
    const [high, low] = pairs
    const kicker = descending([...pairs.slice(2), ...singles])[0]
    return { category: 'two-pair', tiebreakers: [high, low, kicker] }
  }

  if (pairs.length === 1) {
    const kickers = descending(singles).slice(0, 3)
    return { category: 'pair', tiebreakers: [pairs[0], ...kickers] }
  }

  return { category: 'high-card', tiebreakers: descending(singles).slice(0, 5) }
}

/**
 * Compare two hand values. Returns > 0 if a beats b, < 0 if b beats a, 0 for a tie.
 */
export function compareHands(a: HandValue, b: HandValue): number {
  const categoryDelta = categoryRank[a.category] - categoryRank[b.category]
  if (categoryDelta !== 0) return categoryDelta
  const length = Math.max(a.tiebreakers.length, b.tiebreakers.length)
  for (let i = 0; i < length; i += 1) {
    const delta = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0)
    if (delta !== 0) return delta
  }
  return 0
}

export function handStrengthLabel(value: HandValue): string {
  return categoryLabels[value.category]
}

// ---------------------------------------------------------------------------
// Limit Texas Hold'em – table state
// ---------------------------------------------------------------------------

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
export type BotLevel = 'beginner' | 'standard'
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise'

export interface SeatConfig {
  id: string
  name: string
  isHuman: boolean
  bot?: BotLevel
}

export interface Seat {
  id: string
  name: string
  isHuman: boolean
  bot?: BotLevel
  hole: [Card, Card]
  folded: boolean
  committed: number // chips committed this street
  totalCommitted: number // chips committed this hand
}

export interface HandLog {
  seatId: string
  street: Street
  action: PlayerAction
  amount: number
  reasoning: string
}

export interface PokerTable {
  seats: Seat[]
  board: Card[]
  deck: Card[]
  street: Street
  pot: number
  currentBet: number // highest committed on the current street
  smallBet: number
  bigBet: number
  raisesThisStreet: number
  maxRaises: number
  toActIndex: number
  // Number of active seats that have acted since the last bet/raise (or since
  // the street opened). The betting round closes once this reaches the number
  // of active seats and all committed chips are equal.
  actedSinceAggression: number
  log: HandLog[]
  winners: string[] | null
}

export const DEFAULT_SMALL_BET = 10
export const DEFAULT_BIG_BET = 20
export const MAX_RAISES_PER_STREET = 4

/**
 * Deal a new limit Hold'em hand. Seat 0 is treated as the button/first bettor
 * for a compact heads-up-plus format. Bots receive their hole cards but the
 * caller is responsible for filtering observations before showing them.
 */
export function dealHand(
  configs: readonly SeatConfig[],
  rng: RandomSource,
  options?: { smallBet?: number; bigBet?: number; maxRaises?: number },
): PokerTable {
  if (configs.length < 2 || configs.length > 6) {
    throw new Error('Hold’em table supports 2–6 seats')
  }
  const deck = shuffledDeck(rng)
  const seats: Seat[] = configs.map((config) => {
    const hole: [Card, Card] = [deck.pop() as Card, deck.pop() as Card]
    return {
      id: config.id,
      name: config.name,
      isHuman: config.isHuman,
      bot: config.bot,
      hole,
      folded: false,
      committed: 0,
      totalCommitted: 0,
    }
  })

  return {
    seats,
    board: [],
    deck,
    street: 'preflop',
    pot: 0,
    currentBet: 0,
    smallBet: options?.smallBet ?? DEFAULT_SMALL_BET,
    bigBet: options?.bigBet ?? DEFAULT_BIG_BET,
    raisesThisStreet: 0,
    maxRaises: options?.maxRaises ?? MAX_RAISES_PER_STREET,
    toActIndex: 0,
    actedSinceAggression: 0,
    log: [],
    winners: null,
  }
}

export function betSizeFor(table: PokerTable): number {
  return table.street === 'preflop' || table.street === 'flop' ? table.smallBet : table.bigBet
}

/**
 * Legal actions for the seat currently to act. Returns an empty array when the
 * hand is over or the seat has folded.
 */
export function legalActions(table: PokerTable, seatIndex: number): PlayerAction[] {
  if (table.street === 'showdown') return []
  const seat = table.seats[seatIndex]
  if (!seat || seat.folded) return []
  const owed = table.currentBet - seat.committed
  const actions: PlayerAction[] = []
  actions.push('fold')
  if (owed <= 0) {
    actions.push('check')
  } else {
    actions.push('call')
  }
  const canRaise = table.raisesThisStreet < table.maxRaises
  if (canRaise) {
    if (table.currentBet === 0) actions.push('bet')
    else actions.push('raise')
  }
  return actions
}

// ---------------------------------------------------------------------------
// Information-filtered observations (fair bots never see others' hole cards)
// ---------------------------------------------------------------------------

export interface Observation {
  seatId: string
  street: Street
  hole: [Card, Card]
  board: Card[]
  pot: number
  toCall: number
  betSize: number
  legalActions: PlayerAction[]
  activeOpponents: number
  raisesThisStreet: number
  maxRaises: number
}

/**
 * Build the observation for a single seat. Only that seat's own hole cards and
 * public board information are included – opponents' hole cards and the deck
 * are never exposed. This is the sole information source for fair bots.
 */
export function observationFor(table: PokerTable, seatIndex: number): Observation {
  const seat = table.seats[seatIndex]
  if (!seat) throw new Error('invalid seat index')
  const activeOpponents = table.seats.filter((other, index) => index !== seatIndex && !other.folded).length
  return {
    seatId: seat.id,
    street: table.street,
    hole: [{ ...seat.hole[0] }, { ...seat.hole[1] }],
    board: table.board.map((card) => ({ ...card })),
    pot: table.pot,
    toCall: Math.max(0, table.currentBet - seat.committed),
    betSize: betSizeFor(table),
    legalActions: legalActions(table, seatIndex),
    activeOpponents,
    raisesThisStreet: table.raisesThisStreet,
    maxRaises: table.maxRaises,
  }
}

// ---------------------------------------------------------------------------
// Bot strategy – fair, using only the observation
// ---------------------------------------------------------------------------

export interface BotDecision {
  action: PlayerAction
  reasoning: string
}

// Preflop hand strength on a 0..1 scale using only the two hole cards.
export function preflopStrength(hole: readonly [Card, Card]): number {
  const [a, b] = hole
  const high = Math.max(a.rank, b.rank)
  const low = Math.min(a.rank, b.rank)
  const pair = a.rank === b.rank
  const suited = a.suit === b.suit
  const gap = high - low

  let score = (high - 2) / 12 // 0..1 by top card
  if (pair) score = 0.5 + ((a.rank - 2) / 12) * 0.5
  else {
    score += (low - 2) / 24
    if (suited) score += 0.08
    if (gap === 1) score += 0.05
    else if (gap >= 4) score -= 0.05
  }
  return Math.max(0, Math.min(1, score))
}

// Postflop strength using the seat's own hole + public board only.
export function madeHandStrength(hole: readonly [Card, Card], board: readonly Card[]): number {
  if (board.length === 0) return preflopStrength(hole as [Card, Card])
  const value = evaluateHand([...hole, ...board])
  // Normalise category into 0..1 and nudge with the top tiebreaker.
  const base = categoryRank[value.category] / categoryRank['straight-flush']
  const kicker = (value.tiebreakers[0] ?? 0) / 14
  return Math.max(0, Math.min(1, base * 0.85 + kicker * 0.15))
}

/**
 * Decide an action for a bot given ONLY its observation and a seeded RNG.
 * The RNG produces reproducible "mixed" (probabilistic) decisions so bots are
 * neither fully deterministic nor cheating. Returns a legal action only.
 */
export function botDecision(observation: Observation, level: BotLevel, rng: RandomSource): BotDecision {
  const legal = observation.legalActions
  if (legal.length === 0) return { action: 'check', reasoning: 'No action required.' }

  const strength = madeHandStrength(observation.hole, observation.board)
  const roll = rng.next()
  const canRaise = legal.includes('bet') || legal.includes('raise')
  const raiseAction: PlayerAction = legal.includes('bet') ? 'bet' : 'raise'
  const canCheck = legal.includes('check')

  // Value-raise threshold: standard bots raise a wider (lower) band for value;
  // beginners only raise the nuts. Both rely solely on public information plus
  // their own hole cards, so they never cheat.
  const raiseThreshold = level === 'beginner' ? 0.82 : 0.66
  const opponents = observation.activeOpponents
  const potOdds = observation.toCall > 0 ? observation.toCall / (observation.pot + observation.toCall) : 0

  // Occasional bluff/probe frequency – small and seeded for unpredictability.
  const bluffNoise = level === 'beginner' ? 0.04 : 0.1

  // Facing no bet: option to check or open.
  if (canCheck) {
    if (canRaise && (strength >= raiseThreshold || roll < bluffNoise)) {
      const why = strength >= raiseThreshold
        ? `Strong holding (${Math.round(strength * 100)}%) versus ${opponents} opponent(s); betting for value.`
        : `Occasional probe bet (seeded ${roll.toFixed(2)}) to stay unpredictable.`
      return { action: raiseAction, reasoning: why }
    }
    return {
      action: 'check',
      reasoning: `Content to see a free card with ${Math.round(strength * 100)}% strength.`,
    }
  }

  // Facing a bet: fold / call / raise. Value-raise strong hands (with a small
  // seeded semi-bluff frequency).
  if (canRaise && (strength >= raiseThreshold || roll < bluffNoise)) {
    const why = strength >= raiseThreshold
      ? `Value raise: ${Math.round(strength * 100)}% strength ahead of ${opponents} opponent(s).`
      : `Seeded semi-bluff raise (roll ${roll.toFixed(2)}).`
    return { action: raiseAction, reasoning: why }
  }

  // Fold probability grows as hand strength falls. Standard bots fold weak
  // hands aggressively; beginners are "calling stations" who fold far less,
  // paying off with dominated holdings. Pot odds slightly discourage folding.
  const weakness = Math.max(0, 1 - strength)
  const foldTendency = level === 'beginner' ? 0.25 : 0.85
  const foldProbability = Math.max(0, Math.min(1, weakness * foldTendency - potOdds * 0.15))
  if (roll < foldProbability) {
    return {
      action: 'fold',
      reasoning: `Hand strength ${Math.round(strength * 100)}% is weak; folding (seeded ${roll.toFixed(
        2,
      )} < ${foldProbability.toFixed(2)}).`,
    }
  }
  return {
    action: 'call',
    reasoning: `Calling ${observation.toCall} with ${Math.round(strength * 100)}% strength; pot odds ${Math.round(
      potOdds * 100,
    )}%.`,
  }
}

// ---------------------------------------------------------------------------
// Applying actions & advancing streets
// ---------------------------------------------------------------------------

/**
 * Apply a legal action for the seat currently to act, mutating a copy and
 * returning the new table. Throws on illegal actions to guarantee legality.
 */
export function applyAction(
  table: PokerTable,
  action: PlayerAction,
  reasoning = '',
): PokerTable {
  const index = table.toActIndex
  const legal = legalActions(table, index)
  if (!legal.includes(action)) {
    throw new Error(`Illegal action ${action}; legal: ${legal.join(', ') || 'none'}`)
  }
  const next = cloneTable(table)
  const seat = next.seats[index]
  const betSize = betSizeFor(next)

  switch (action) {
    case 'fold':
      seat.folded = true
      next.actedSinceAggression += 1
      break
    case 'check':
      next.actedSinceAggression += 1
      break
    case 'call': {
      const owed = next.currentBet - seat.committed
      seat.committed += owed
      seat.totalCommitted += owed
      next.pot += owed
      next.actedSinceAggression += 1
      break
    }
    case 'bet': {
      seat.committed += betSize
      seat.totalCommitted += betSize
      next.pot += betSize
      next.currentBet = seat.committed
      next.raisesThisStreet += 1
      next.actedSinceAggression = 1 // aggressor has now acted
      break
    }
    case 'raise': {
      const target = next.currentBet + betSize
      const delta = target - seat.committed
      seat.committed += delta
      seat.totalCommitted += delta
      next.pot += delta
      next.currentBet = target
      next.raisesThisStreet += 1
      next.actedSinceAggression = 1 // aggressor has now acted
      break
    }
  }

  next.log.push({ seatId: seat.id, street: next.street, action, amount: seat.committed, reasoning })

  const remaining = next.seats.filter((s) => !s.folded)
  if (remaining.length === 1) {
    next.street = 'showdown'
    next.winners = [remaining[0].id]
    return next
  }

  advanceTurn(next)
  return next
}

function cloneTable(table: PokerTable): PokerTable {
  return {
    ...table,
    seats: table.seats.map((seat) => ({ ...seat, hole: [{ ...seat.hole[0] }, { ...seat.hole[1] }] })),
    board: table.board.map((card) => ({ ...card })),
    deck: table.deck.map((card) => ({ ...card })),
    log: [...table.log],
    winners: table.winners ? [...table.winners] : null,
  }
}

// Determine whether the betting round is complete and either advance the
// street or hand the turn to the next active seat.
function advanceTurn(table: PokerTable): void {
  const activeIndices = table.seats
    .map((seat, index) => ({ seat, index }))
    .filter(({ seat }) => !seat.folded)
    .map(({ index }) => index)

  const allMatched = activeIndices.every((i) => table.seats[i].committed === table.currentBet)
  // The round closes once every active seat has acted since the last
  // aggressive action AND all committed chips are equal.
  const roundClosed = allMatched && table.actedSinceAggression >= activeIndices.length

  if (roundClosed) {
    startNextStreet(table)
    return
  }

  // Hand the turn to the next active seat.
  for (let step = 1; step <= table.seats.length; step += 1) {
    const candidate = (table.toActIndex + step) % table.seats.length
    if (!table.seats[candidate].folded) {
      table.toActIndex = candidate
      break
    }
  }
}

function firstActive(table: PokerTable): number {
  return table.seats.findIndex((seat) => !seat.folded)
}

function startNextStreet(table: PokerTable): void {
  // Reset per-street commitments.
  for (const seat of table.seats) seat.committed = 0
  table.currentBet = 0
  table.raisesThisStreet = 0
  table.actedSinceAggression = 0

  const order: Street[] = ['preflop', 'flop', 'turn', 'river', 'showdown']
  const currentPos = order.indexOf(table.street)
  const nextStreet = order[currentPos + 1]
  table.street = nextStreet

  if (nextStreet === 'flop') {
    table.deck.pop() // burn
    table.board.push(table.deck.pop() as Card, table.deck.pop() as Card, table.deck.pop() as Card)
  } else if (nextStreet === 'turn' || nextStreet === 'river') {
    table.deck.pop() // burn
    table.board.push(table.deck.pop() as Card)
  } else if (nextStreet === 'showdown') {
    table.winners = determineWinners(table)
    return
  }

  table.toActIndex = firstActive(table)
}

/**
 * Determine the winning seat id(s) at showdown by evaluating each active
 * seat's best 7-card hand. Ties split the pot (multiple winners returned).
 */
export function determineWinners(table: PokerTable): string[] {
  const active = table.seats.filter((seat) => !seat.folded)
  if (active.length === 0) return []
  if (active.length === 1) return [active[0].id]

  let best: HandValue | null = null
  let winners: string[] = []
  for (const seat of active) {
    const value = evaluateHand([...seat.hole, ...table.board])
    if (best === null) {
      best = value
      winners = [seat.id]
    } else {
      const cmp = compareHands(value, best)
      if (cmp > 0) {
        best = value
        winners = [seat.id]
      } else if (cmp === 0) {
        winners.push(seat.id)
      }
    }
  }
  return winners
}

/**
 * Play the whole hand out to showdown. Human decisions are supplied by
 * `humanDecide` (called only when it is a human seat's turn); bots use their
 * fair strategy with a seeded RNG. Returns the resolved table and full log.
 */
export function playHand(
  table: PokerTable,
  rng: RandomSource,
  humanDecide?: (observation: Observation) => PlayerAction,
): PokerTable {
  let current = table
  let guard = 0
  while (current.street !== 'showdown' && guard < 500) {
    guard += 1
    const index = current.toActIndex
    const legal = legalActions(current, index)
    if (legal.length === 0) {
      // Should not happen, but avoid infinite loops.
      break
    }
    const seat = current.seats[index]
    if (seat.isHuman && humanDecide) {
      const observation = observationFor(current, index)
      const action = humanDecide(observation)
      current = applyAction(current, action, 'Human decision.')
    } else {
      const observation = observationFor(current, index)
      const decision = botDecision(observation, seat.bot ?? 'standard', rng)
      // Guarantee legality even if strategy proposes something unavailable.
      const action = legal.includes(decision.action) ? decision.action : legal.includes('check') ? 'check' : 'fold'
      current = applyAction(current, action, decision.reasoning)
    }
  }
  if (current.winners === null) current.winners = determineWinners(current)
  return current
}

// ---------------------------------------------------------------------------
// Scripted scenario (visibly non-random teaching hand)
// ---------------------------------------------------------------------------

export interface ScriptedScenario {
  table: PokerTable
  note: string
}

/**
 * Build a fully visible scripted hand: the human is dealt pocket aces and the
 * board runs out to give a set, illustrating a memorable "big win" that is NOT
 * random. Used to contrast with free play.
 */
export function scriptedScenario(configs: readonly SeatConfig[]): ScriptedScenario {
  // Deterministic deck order so the outcome is reproducible and inspectable.
  const seats: Seat[] = configs.map((config, i) => {
    const hole: [Card, Card] = i === 0
      ? [{ rank: 14, suit: 's' }, { rank: 14, suit: 'h' }]
      : i === 1
        ? [{ rank: 13, suit: 'd' }, { rank: 13, suit: 'c' }]
        : [{ rank: 7, suit: 'd' }, { rank: 2, suit: 'c' }]
    return {
      id: config.id,
      name: config.name,
      isHuman: config.isHuman,
      bot: config.bot,
      hole,
      folded: false,
      committed: 0,
      totalCommitted: 0,
    }
  })

  const board: Card[] = [
    { rank: 14, suit: 'd' },
    { rank: 9, suit: 's' },
    { rank: 4, suit: 'h' },
    { rank: 6, suit: 'c' },
    { rank: 2, suit: 'd' },
  ]

  const table: PokerTable = {
    seats,
    board,
    deck: [],
    street: 'showdown',
    pot: 120,
    currentBet: 0,
    smallBet: DEFAULT_SMALL_BET,
    bigBet: DEFAULT_BIG_BET,
    raisesThisStreet: 0,
    maxRaises: MAX_RAISES_PER_STREET,
    toActIndex: 0,
    actedSinceAggression: 0,
    log: [],
    winners: null,
  }
  table.winners = determineWinners(table)
  return {
    table,
    note: 'Scripted teaching hand: pocket aces flop a set for a guaranteed win. This outcome is authored, not random – real hands do not cooperate on demand.',
  }
}
