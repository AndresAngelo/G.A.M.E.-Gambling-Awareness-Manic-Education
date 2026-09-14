import { useMemo } from 'react'
import { generateCounselorReport, reportAsText } from '../domain/report'
import type { AppState } from '../domain/types'

export function CounselorReport({ state }: { state: AppState }) {
  const report = useMemo(() => generateCounselorReport(state), [state])
  const download = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'GAME-counselor-report.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  return <section className="report" aria-labelledby="report-title"><h1 id="report-title">Counselor conversation report</h1><div className="notice"><strong>Preview first:</strong> only aggregates and reflections you explicitly marked for sharing appear below. Nothing is uploaded.</div>
    <div className="report-actions"><button className="primary" onClick={() => window.print()}>Print or save as PDF</button><button className="secondary" onClick={download}>Download JSON</button></div>
    <pre>{reportAsText(report)}</pre>
  </section>
}
