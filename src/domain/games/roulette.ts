import { randomInt, type RandomSource } from '../rng'

export type RouletteBet =
  | { kind: 'straight'; number: number; stake: number }
  | { kind: 'red' | 'black' | 'even' | 'odd' | 'low' | 'high'; stake: number }
  | { kind: 'dozen'; dozen: 1 | 2 | 3; stake: number }

export const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export function spinRoulette(rng: RandomSource): number {
  return randomInt(rng, 37)
}

export function rouletteBetWins(number: number, bet: RouletteBet): boolean {
  if (!Number.isInteger(number) || number < 0 || number > 36 || number === 0) return false
  switch (bet.kind) {
    case 'straight': return number === bet.number
    case 'red': return redNumbers.has(number)
    case 'black': return !redNumbers.has(number)
    case 'even': return number % 2 === 0
    case 'odd': return number % 2 === 1
    case 'low': return number <= 18
    case 'high': return number >= 19
    case 'dozen': return number >= (bet.dozen - 1) * 12 + 1 && number <= bet.dozen * 12
  }
}

export function rouletteReturn(number: number, bet: RouletteBet): number {
  if (!Number.isFinite(bet.stake) || bet.stake <= 0 || !rouletteBetWins(number, bet)) return 0
  if (bet.kind === 'straight') return bet.stake * 36
  if (bet.kind === 'dozen') return bet.stake * 3
  return bet.stake * 2
}

export function rouletteColor(number: number): 'green' | 'red' | 'black' {
  if (number === 0) return 'green'
  return redNumbers.has(number) ? 'red' : 'black'
}
