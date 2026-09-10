import type { AppAction, AppState } from './types'

const id = () => crypto.randomUUID()

export function createInitialState(now = Date.now()): AppState {
  return {
    version: 1,
    onboarded: false,
    settings: { sound: false, motion: 'reduced', intensity: 'calm', highContrast: false, theme: 'dark' },
    wallet: 5000,
    ledger: [{ id: id(), at: now, label: 'Fictional learning balance', delta: 5000, balance: 5000 }],
    events: [],
    reflections: [],
    mastery: { points: 0, completedLessons: [], startedAt: now, pilotMode: false },
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'complete_onboarding':
      return { ...state, onboarded: true }
    case 'set_setting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    case 'wallet_delta': {
      const balance = state.wallet + action.delta
      if (!Number.isFinite(action.delta) || balance < 0) return state
      return {
        ...state,
        wallet: balance,
        ledger: [
          ...state.ledger,
          { id: id(), at: Date.now(), label: action.label, delta: action.delta, balance, game: action.game },
        ].slice(-200),
      }
    }
    case 'log_event':
      return {
        ...state,
        events: [...state.events, { ...action.event, id: id(), at: action.at ?? Date.now() }].slice(-500),
      }
    case 'complete_lesson':
      if (state.mastery.completedLessons.includes(action.lessonId)) return state
      return {
        ...state,
        mastery: {
          ...state.mastery,
          points: Math.min(100, state.mastery.points + (action.points ?? 10)),
          completedLessons: [...state.mastery.completedLessons, action.lessonId],
        },
      }
    case 'add_reflection':
      return {
        ...state,
        reflections: [
          ...state.reflections,
          { id: id(), at: Date.now(), lessonId: action.lessonId, text: action.text.slice(0, 500), shareInReport: action.shareInReport },
        ],
      }
    case 'set_pilot_mode':
      return { ...state, mastery: { ...state.mastery, pilotMode: action.value } }
    case 'reset':
      return createInitialState()
  }
}

export function casinoMinutesForMastery(points: number): number {
  if (points >= 90) return 0
  if (points >= 70) return 5
  if (points >= 45) return 10
  if (points >= 20) return 15
  return 20
}
