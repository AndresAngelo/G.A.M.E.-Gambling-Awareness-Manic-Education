import { describe, expect, it } from 'vitest'
import { detectIntervention, nextInterventionPhase, type InterventionSession } from './interventions'
import type { AppEvent } from './types'

const event = (type: AppEvent['type'], at: number, extras: Partial<AppEvent> = {}): AppEvent => ({
  id: `${type}-${at}`,
  type,
  at,
  ...extras,
})

describe('intervention policy', () => {
  it('always detects a fake purchase attempt', () => {
    expect(detectIntervention([event('fake_purchase_started', 1)])).toBe('payment-barrier')
  })

  it('detects large wins and rapid betting', () => {
    expect(detectIntervention([event('round_resolved', 1, { detail: 'large-win' })])).toBe('large-win')
    expect(detectIntervention([
      event('bet_placed', 0, { amount: 10 }),
      event('bet_placed', 10_000, { amount: 10 }),
      event('bet_placed', 20_000, { amount: 10 }),
    ])).toBe('rapid-play')
  })

  it('detects stake escalation after a loss', () => {
    expect(detectIntervention([
      event('bet_placed', 1, { amount: 10 }),
      event('round_resolved', 2, { detail: 'loss' }),
      event('bet_placed', 3, { amount: 20 }),
    ])).toBe('chasing-loss')
  })

  it('moves through the complete perspective-shift sequence', () => {
    let session: InterventionSession = { lessonId: 'payment-barrier', phase: 'zoomout' }
    for (let index = 0; index < 5; index += 1) session = nextInterventionPhase(session)
    expect(session.phase).toBe('complete')
  })
})
