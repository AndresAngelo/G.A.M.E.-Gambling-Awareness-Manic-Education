import { describe, expect, it } from 'vitest'
import { generateCounselorReport, reportAsText } from './report'
import { createInitialState } from './state'
import type { AppState } from './types'

describe('counselor report', () => {
  it('aggregates fictional activity without unapproved reflections', () => {
    const state: AppState = {
      ...createInitialState(0),
      events: [
        { id: '1', type: 'bet_placed', at: 10, game: 'roulette', amount: 50 },
        { id: '2', type: 'round_resolved', at: 11, game: 'roulette', amount: -50, detail: 'loss' },
        { id: '3', type: 'fake_purchase_started', at: 12 },
        { id: '4', type: 'intervention_completed', at: 13 },
      ],
      reflections: [
        { id: 'r1', at: 14, lessonId: 'loss', text: 'private', shareInReport: false },
        { id: 'r2', at: 15, lessonId: 'speed', text: 'share this', shareInReport: true },
      ],
    }
    const report = generateCounselorReport(state, 0, 20)
    expect(report.games[0]).toMatchObject({ game: 'roulette', wagers: 50, rounds: 1, fictionalNet: -50 })
    expect(report.fakePurchaseAttempts).toBe(1)
    expect(report.sharedReflections).toHaveLength(1)
    expect(JSON.stringify(report)).not.toContain('private')
  })

  it('filters out-of-period events and emits a readable local report', () => {
    const state = createInitialState(0)
    state.events = [{ id: 'old', type: 'alternative_completed', at: 5, detail: 'grounding' }]
    expect(generateCounselorReport(state, 10, 20).alternativesCompleted).toBe(0)
    expect(reportAsText(generateCounselorReport(state, 0, 20))).toContain('No account, financial credentials, or cloud analytics')
  })
})
