/**
 * Authored SVG icon set for the coin-op panel visual world — one consistent
 * stroke (2px, round caps/joins, 24x24 viewbox), replacing the unicode
 * glyphs (◈ ◎ ▤ ← etc.) the prior passes used as icon stand-ins.
 */

type IconProps = { className?: string }

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function BackIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M15 5 8 12l7 7" /></svg>
}

export function BrandIcon({ className }: IconProps) {
  return <svg {...base} className={className}><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.4" fill="currentColor" stroke="none" /><path d="M9 15h.01M15 9h.01" /></svg>
}

export function CreditIcon({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10a2.5 2.5 0 0 1 2.5-1.5c1.4 0 2.5.7 2.5 1.8s-1.1 1.5-2.5 1.7c-1.4.2-2.5.7-2.5 1.7s1.1 1.8 2.5 1.8a2.5 2.5 0 0 0 2.5-1.5" /></svg>
}

export function ExitIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3M14 8l4 4-4 4M18 12H9" /></svg>
}

export function HomeIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" /></svg>
}

export function CalmIcon({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>
}

export function ProgressIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
}

export function ReportIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5M9 12h6M9 16h6M9 8h2" /></svg>
}

export function SettingsIcon({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 17.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 6.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 2.6a1.7 1.7 0 0 0 1.04-1.56V1a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.04 2.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 7a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 13Z" /></svg>
}

export function WalletIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9" /><circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" stroke="none" /></svg>
}

export function RouletteIcon({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.6" /><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" /></svg>
}

export function DiceIcon({ className }: IconProps) {
  return <svg {...base} className={className}><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /></svg>
}

export function CardsIcon({ className }: IconProps) {
  return <svg {...base} className={className}><rect x="3" y="6" width="12" height="15" rx="2" transform="rotate(-8 9 13.5)" /><rect x="8" y="4" width="12" height="15" rx="2" /></svg>
}

export function CheckIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M5 12.5 9.5 17 19 7" /></svg>
}

export function BreathIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M12 3c3 2 5 5 5 8a5 5 0 0 1-10 0c0-1.5.7-2.8 2-4" /><path d="M12 21v-3" /></svg>
}

export function GroundingIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M4 20c2-4 4-13 8-13s6 9 8 13" /><path d="M4 20h16" /></svg>
}

export function PatternIcon({ className }: IconProps) {
  return <svg {...base} className={className}><circle cx="7" cy="7" r="2.4" /><rect x="14.6" y="4.6" width="4.8" height="4.8" rx="1" /><circle cx="7" cy="17" r="2.4" /><rect x="14.6" y="14.6" width="4.8" height="4.8" rx="1" /></svg>
}

export function WaveIcon({ className }: IconProps) {
  return <svg {...base} className={className}><path d="M3 15c2-3 4 3 6 0s4 3 6 0 4 3 6 0" /><path d="M3 9c2-3 4 3 6 0s4 3 6 0 4 3 6 0" /></svg>
}
