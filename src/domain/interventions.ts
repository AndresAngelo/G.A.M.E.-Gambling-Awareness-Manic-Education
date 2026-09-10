import type { AppEvent } from './types'

export type InterventionPhase = 'zoomout' | 'explanation' | 'reflection' | 'alternative' | 'quiz' | 'complete'
export interface InterventionSession { lessonId: string; phase: InterventionPhase }

const phases: InterventionPhase[] = ['zoomout', 'explanation', 'reflection', 'alternative', 'quiz', 'complete']

export function nextInterventionPhase(session: InterventionSession): InterventionSession {
  const index = phases.indexOf(session.phase)
  return { ...session, phase: phases[Math.min(index + 1, phases.length - 1)] }
}

export function detectIntervention(events: readonly AppEvent[]): string | null {
  const recent = events.slice(-8)
  const last = recent.at(-1)
  if (!last) return null
  if (last.type === 'fake_purchase_started') return 'payment-barrier'
  if (last.type === 'round_resolved' && last.detail === 'large-win') return 'large-win'

  const bets = recent.filter((event) => event.type === 'bet_placed')
  if (bets.length >= 3 && bets.at(-1)!.at - bets.at(-3)!.at <= 30_000) return 'rapid-play'

  const lastLossIndex = recent.findLastIndex((event) => event.type === 'round_resolved' && event.detail === 'loss')
  if (last.type === 'bet_placed' && lastLossIndex >= 0) {
    const previousBet = recent.slice(0, lastLossIndex).findLast((event) => event.type === 'bet_placed')
    if (previousBet?.amount && last.amount && last.amount > previousBet.amount) return 'chasing-loss'
  }
  return null
}
