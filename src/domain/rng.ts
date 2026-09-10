export interface RandomSource {
  next(): number
}

export const systemRandom: RandomSource = {
  next: () => crypto.getRandomValues(new Uint32Array(1))[0] / 0x1_0000_0000,
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next: () => {
      state = (state * 1664525 + 1013904223) >>> 0
      return state / 0x1_0000_0000
    },
  }
}

export function randomInt(rng: RandomSource, maximum: number): number {
  if (!Number.isInteger(maximum) || maximum <= 0) throw new Error('maximum must be a positive integer')
  return Math.floor(rng.next() * maximum)
}

export function shuffle<T>(items: readonly T[], rng: RandomSource): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomInt(rng, index + 1)
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}
