import { useEffect, useReducer } from 'react'
import { appReducer } from './domain/state'
import { loadState, saveState } from './domain/storage'

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return { state, dispatch }
}
