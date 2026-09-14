import { createContext, useContext, type ReactNode } from 'react'
import type { MotionLevel } from '../domain/types'
import { useMotionPreference, type MotionPreference } from './useMotionPreference'

/**
 * Module-private context. Not exported — consumers must go through `useMotionPref`,
 * which enforces that a `MotionPreferenceProvider` is present in the tree.
 */
const MotionPreferenceContext = createContext<MotionPreference | undefined>(undefined)

export interface MotionPreferenceProviderProps {
  settingsMotion: MotionLevel
  children: ReactNode
}

/**
 * The single mounting point for `useMotionPreference` (Requirement 3.4): this is the
 * only place in the tree that invokes it. All other consumers read the resolved value
 * via `useMotionPref`.
 */
export function MotionPreferenceProvider({ settingsMotion, children }: MotionPreferenceProviderProps) {
  const pref = useMotionPreference(settingsMotion)

  return <MotionPreferenceContext.Provider value={pref}>{children}</MotionPreferenceContext.Provider>
}

/**
 * Reads the resolved `MotionPreference` from context. Throws if called outside a
 * `MotionPreferenceProvider` rather than silently returning a default/partial value
 * (Requirement 3.8).
 */
export function useMotionPref(): MotionPreference {
  const pref = useContext(MotionPreferenceContext)

  if (pref === undefined) {
    throw new Error('useMotionPref must be used within a MotionPreferenceProvider')
  }

  return pref
}
