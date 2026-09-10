import type { AppEvent, AppState, GameId } from './types'

export interface GameReport {
  game: GameId
  wagers: number
  rounds: number
  fictionalNet: number
}

export interface CounselorReportData {
  generatedAt: string
  period: { from: string; to: string }
  masteryPoints: number
  completedLessons: string[]
  fakePurchaseAttempts: number
  interventionsCompleted: number
  alternativesCompleted: number
  games: GameReport[]
  sharedReflections: { date: string; lessonId: string; text: string }[]
  privacyNotice: string
}

const games: GameId[] = ['roulette', 'color', 'blackjack', 'poker', 'tongits']

export function generateCounselorReport(state: AppState, from = 0, to = Date.now()): CounselorReportData {
  const inPeriod = (at: number) => at >= from && at <= to
  const events = state.events.filter((event) => inPeriod(event.at))
  const gameReport = (game: GameId): GameReport => {
    const related = events.filter((event) => event.game === game)
    const wagers = related.filter((event) => event.type === 'bet_placed').reduce((sum, event) => sum + (event.amount ?? 0), 0)
    const rounds = related.filter((event) => event.type === 'round_resolved')
    return { game, wagers, rounds: rounds.length, fictionalNet: rounds.reduce((sum, event) => sum + (event.amount ?? 0), 0) }
  }
  return {
    generatedAt: new Date(to).toISOString(),
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    masteryPoints: state.mastery.points,
    completedLessons: [...state.mastery.completedLessons],
    fakePurchaseAttempts: events.filter((event) => event.type === 'fake_purchase_started').length,
    interventionsCompleted: events.filter((event) => event.type === 'intervention_completed').length,
    alternativesCompleted: events.filter((event) => event.type === 'alternative_completed').length,
    games: games.map(gameReport),
    sharedReflections: state.reflections.filter((reflection) => reflection.shareInReport && inPeriod(reflection.at)).map(({ at, lessonId, text }) => ({ date: new Date(at).toISOString(), lessonId, text })),
    privacyNotice: 'Generated locally by G.A.M.E. No account, financial credentials, or cloud analytics are included.',
  }
}

export function reportAsText(report: CounselorReportData): string {
  const lines = [
    'G.A.M.E. — Counselor Conversation Report',
    `Generated: ${report.generatedAt}`,
    `Awareness mastery: ${report.masteryPoints}%`,
    `Lessons completed: ${report.completedLessons.length}`,
    `Simulated purchase interruptions: ${report.fakePurchaseAttempts}`,
    `Educational interventions completed: ${report.interventionsCompleted}`,
    `Alternative practices completed: ${report.alternativesCompleted}`,
    '', 'Game activity (fictional only):',
    ...report.games.map((game) => `${game.game}: ${game.rounds} rounds, ${game.wagers} wagered, net ${game.fictionalNet}`),
    '', 'User-approved reflections:',
    ...(report.sharedReflections.length ? report.sharedReflections.map((item) => `${item.date} — ${item.lessonId}: ${item.text}`) : ['None selected.']),
    '', report.privacyNotice,
    'Educational content is provisional and is not a diagnosis or treatment record.',
  ]
  return lines.join('\n')
}

export function eventsInPeriod(events: readonly AppEvent[], from: number, to: number): AppEvent[] {
  return events.filter((event) => event.at >= from && event.at <= to)
}
