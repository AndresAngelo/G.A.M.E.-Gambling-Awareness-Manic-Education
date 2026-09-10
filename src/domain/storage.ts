import { createInitialState } from './state'
import type { AppState } from './types'

export const STORAGE_KEY = 'game-awareness-state-v1'

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<AppState>
  return state.version === 1 && typeof state.wallet === 'number' && Array.isArray(state.events) && Array.isArray(state.ledger)
}

export function loadState(storage: Pick<Storage, 'getItem'> = localStorage): AppState {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed: unknown = JSON.parse(raw)
    if (!isAppState(parsed)) return createInitialState()
    // Merge default settings so states persisted before newer settings fields
    // (e.g. `theme`) were added still resolve those fields to their defaults.
    const defaults = createInitialState()
    return { ...parsed, settings: { ...defaults.settings, ...parsed.settings } }
  } catch {
    return createInitialState()
  }
}

export function saveState(state: AppState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportState(state: AppState): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), state }, null, 2)
}
