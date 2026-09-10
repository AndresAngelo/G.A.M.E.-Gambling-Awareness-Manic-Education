export type GameId = 'roulette' | 'color' | 'blackjack' | 'poker' | 'tongits'
export type MotionLevel = 'full' | 'reduced'
export type IntensityLevel = 'authentic' | 'calm'
export type ThemeMode = 'dark' | 'light'
export type EventType =
  | 'session_started'
  | 'bet_placed'
  | 'round_resolved'
  | 'fake_purchase_started'
  | 'intervention_started'
  | 'intervention_completed'
  | 'alternative_completed'
  | 'lesson_completed'

export interface AppEvent {
  id: string
  type: EventType
  at: number
  game?: GameId
  amount?: number
  detail?: string
}

export interface LedgerEntry {
  id: string
  at: number
  label: string
  delta: number
  balance: number
  game?: GameId
}

export interface Reflection {
  id: string
  at: number
  lessonId: string
  text: string
  shareInReport: boolean
}

export interface Settings {
  sound: boolean
  motion: MotionLevel
  intensity: IntensityLevel
  highContrast: boolean
  theme: ThemeMode
}

export interface MasteryState {
  points: number
  completedLessons: string[]
  startedAt: number
  pilotMode: boolean
}

export interface AppState {
  version: 1
  onboarded: boolean
  settings: Settings
  wallet: number
  ledger: LedgerEntry[]
  events: AppEvent[]
  reflections: Reflection[]
  mastery: MasteryState
}

export type AppAction =
  | { type: 'complete_onboarding' }
  | { type: 'set_setting'; key: keyof Settings; value: Settings[keyof Settings] }
  | { type: 'wallet_delta'; delta: number; label: string; game?: GameId }
  | { type: 'log_event'; event: Omit<AppEvent, 'id' | 'at'>; at?: number }
  | { type: 'complete_lesson'; lessonId: string; points?: number }
  | { type: 'add_reflection'; lessonId: string; text: string; shareInReport: boolean }
  | { type: 'set_pilot_mode'; value: boolean }
  | { type: 'reset' }
