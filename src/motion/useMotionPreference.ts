import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'
import type { MotionLevel } from '../domain/types'

/** The single combined signal every consumer reads (see design's Architecture section). */
export interface MotionPreference {
  reduced: boolean
}

/**
 * OR-combines the app's persisted `settings.motion` toggle with the OS-level
 * `prefers-reduced-motion` signal into one MotionPreference.
 *
 * Preconditions: none beyond `settingsMotion` being a valid MotionLevel.
 * Postconditions: `reduced === true` iff `settingsMotion === 'reduced'` OR the OS reports
 * reduced motion. The returned object is referentially stable across renders where neither
 * input changed.
 */
export function useMotionPreference(settingsMotion: MotionLevel): MotionPreference {
  const prefersReducedOS = useReducedMotion()

  return useMemo<MotionPreference>(
    () => ({ reduced: settingsMotion === 'reduced' || prefersReducedOS === true }),
    [settingsMotion, prefersReducedOS],
  )
}
