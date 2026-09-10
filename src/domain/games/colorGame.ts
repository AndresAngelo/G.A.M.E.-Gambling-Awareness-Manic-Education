import { randomInt, type RandomSource } from '../rng'

export const colorFaces = [
  { id: 'red', label: 'Red', symbol: '●' },
  { id: 'blue', label: 'Blue', symbol: '▲' },
  { id: 'yellow', label: 'Yellow', symbol: '◆' },
  { id: 'green', label: 'Green', symbol: '■' },
  { id: 'white', label: 'White', symbol: '★' },
  { id: 'pink', label: 'Pink', symbol: '✚' },
] as const

export type ColorId = typeof colorFaces[number]['id']
export interface ColorBet { color: ColorId; stake: number }
export interface ColorSettlement { color: ColorId; stake: number; matches: number; returned: number; profit: number }

export const colorProbabilities = { zero: 125 / 216, one: 75 / 216, two: 15 / 216, three: 1 / 216 }
export const colorHouseEdge = 17 / 216

export function rollColors(rng: RandomSource): [ColorId, ColorId, ColorId] {
  return [0, 1, 2].map(() => colorFaces[randomInt(rng, colorFaces.length)].id) as [ColorId, ColorId, ColorId]
}

export function settleColorBets(roll: readonly ColorId[], bets: readonly ColorBet[]): ColorSettlement[] {
  return bets.map((bet) => {
    const matches = roll.filter((face) => face === bet.color).length
    const validStake = Number.isFinite(bet.stake) && bet.stake > 0 ? bet.stake : 0
    const profit = validStake * matches
    return { color: bet.color, stake: validStake, matches, profit, returned: matches > 0 ? validStake + profit : 0 }
  })
}
