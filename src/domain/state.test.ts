import { describe, expect, it } from 'vitest'
import { appReducer, casinoMinutesForMastery, createInitialState } from './state'

describe('application state', () => {
  it('starts with safe defaults and fictional credits', () => {
    const state = createInitialState(100)
    expect(state.onboarded).toBe(false)
    expect(state.wallet).toBe(5000)
    expect(state.settings.motion).toBe('reduced')
    expect(state.settings.sound).toBe(false)
    expect(state.settings.theme).toBe('dark')
  })

  it('lets the user switch and persist the color theme without touching other settings', () => {
    const initial = createInitialState()
    const light = appReducer(initial, { type: 'set_setting', key: 'theme', value: 'light' })
    expect(light.settings.theme).toBe('light')
    // Unrelated safety-relevant settings are preserved.
    expect(light.settings.motion).toBe('reduced')
    expect(light.settings.highContrast).toBe(false)
    const backToDark = appReducer(light, { type: 'set_setting', key: 'theme', value: 'dark' })
    expect(backToDark.settings.theme).toBe('dark')
  })

  it('resets the theme back to the safe default', () => {
    const initial = createInitialState()
    const light = appReducer(initial, { type: 'set_setting', key: 'theme', value: 'light' })
    expect(appReducer(light, { type: 'reset' }).settings.theme).toBe('dark')
  })

  it('rejects wallet overdrafts and records valid changes', () => {
    const initial = createInitialState()
    expect(appReducer(initial, { type: 'wallet_delta', delta: -6000, label: 'invalid' })).toBe(initial)
    const state = appReducer(initial, { type: 'wallet_delta', delta: -100, label: 'Roulette lesson', game: 'roulette' })
    expect(state.wallet).toBe(4900)
    expect(state.ledger.at(-1)).toMatchObject({ delta: -100, balance: 4900, game: 'roulette' })
  })

  it('awards mastery once per lesson and never from game events', () => {
    const initial = createInitialState()
    const eventOnly = appReducer(initial, { type: 'log_event', event: { type: 'round_resolved', game: 'color', detail: 'win' } })
    expect(eventOnly.mastery.points).toBe(0)
    const learned = appReducer(eventOnly, { type: 'complete_lesson', lessonId: 'house-edge' })
    const repeated = appReducer(learned, { type: 'complete_lesson', lessonId: 'house-edge' })
    expect(learned.mastery.points).toBe(10)
    expect(repeated.mastery.points).toBe(10)
  })

  it('tapers only casino access as mastery grows', () => {
    expect(casinoMinutesForMastery(0)).toBe(20)
    expect(casinoMinutesForMastery(50)).toBe(10)
    expect(casinoMinutesForMastery(75)).toBe(5)
    expect(casinoMinutesForMastery(95)).toBe(0)
  })
})
