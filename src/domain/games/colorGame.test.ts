import { describe, expect, it } from 'vitest'
import { colorFaces, colorHouseEdge, colorProbabilities, rollColors, settleColorBets } from './colorGame'
import { seededRandom } from '../rng'

describe('Filipino Color Game', () => {
  it('defines six uniquely labeled and symbolized faces', () => {
    expect(colorFaces).toHaveLength(6)
    expect(new Set(colorFaces.map((face) => face.id)).size).toBe(6)
    expect(new Set(colorFaces.map((face) => face.symbol)).size).toBe(6)
  })

  it('pays one, two, or three units of profit per matching die', () => {
    const settlements = settleColorBets(['red', 'red', 'blue'], [
      { color: 'red', stake: 10 },
      { color: 'blue', stake: 10 },
      { color: 'green', stake: 10 },
    ])
    expect(settlements).toEqual([
      { color: 'red', stake: 10, matches: 2, profit: 20, returned: 30 },
      { color: 'blue', stake: 10, matches: 1, profit: 10, returned: 20 },
      { color: 'green', stake: 10, matches: 0, profit: 0, returned: 0 },
    ])
  })

  it('has the documented exact distribution and 7.87% house edge', () => {
    expect(colorProbabilities.zero + colorProbabilities.one + colorProbabilities.two + colorProbabilities.three).toBeCloseTo(1)
    expect(colorHouseEdge).toBeCloseTo(0.0787037)
  })

  it('rolls only valid colors through a seeded source', () => {
    const valid = new Set(colorFaces.map((face) => face.id))
    const rolls = Array.from({ length: 100 }, () => rollColors(seededRandom(11))).flat()
    expect(rolls.every((color) => valid.has(color))).toBe(true)
  })
})
