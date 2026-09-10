import { describe, expect, it } from 'vitest'
import { createInitialState } from './state'
import { exportState, loadState, saveState, STORAGE_KEY } from './storage'

describe('local persistence', () => {
  it('round-trips a valid state', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const state = createInitialState(5)
    saveState(state, storage)
    expect(loadState(storage)).toEqual(state)
    expect(values.has(STORAGE_KEY)).toBe(true)
  })

  it('recovers from corrupt or unknown data', () => {
    expect(loadState({ getItem: () => '{bad' }).wallet).toBe(5000)
    expect(loadState({ getItem: () => JSON.stringify({ version: 99 }) }).version).toBe(1)
  })

  it('exports locally without introducing financial credential fields', () => {
    const exported = exportState(createInitialState())
    expect(exported).toContain('exportedAt')
    expect(exported).not.toMatch(/cardNumber|bankAccount|cvv|password/i)
  })
})
