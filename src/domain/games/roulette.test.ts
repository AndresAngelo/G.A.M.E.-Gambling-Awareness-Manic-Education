import { describe, expect, it } from 'vitest'
import { rouletteBetWins, rouletteColor, rouletteReturn, spinRoulette } from './roulette'
import { seededRandom } from '../rng'

describe('European roulette', () => {
  it('produces only 0 through 36', () => {
    const rng = seededRandom(42)
    const values = Array.from({ length: 500 }, () => spinRoulette(rng))
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...values)).toBeLessThanOrEqual(36)
  })

  it('classifies colors and makes zero lose even-money bets', () => {
    expect(rouletteColor(0)).toBe('green')
    expect(rouletteColor(7)).toBe('red')
    expect(rouletteColor(8)).toBe('black')
    expect(rouletteBetWins(0, { kind: 'even', stake: 10 })).toBe(false)
  })

  it('returns stake plus correct profit', () => {
    expect(rouletteReturn(7, { kind: 'straight', number: 7, stake: 10 })).toBe(360)
    expect(rouletteReturn(7, { kind: 'red', stake: 10 })).toBe(20)
    expect(rouletteReturn(14, { kind: 'dozen', dozen: 2, stake: 10 })).toBe(30)
    expect(rouletteReturn(8, { kind: 'red', stake: 10 })).toBe(0)
  })
})
