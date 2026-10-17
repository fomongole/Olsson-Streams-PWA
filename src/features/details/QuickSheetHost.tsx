import { useSyncExternalStore } from 'react'
import { QuickSheet } from './QuickSheet'
import { closeQuickSheet, getQuickSheet, subscribeQuickSheet } from './quickSheetStore'

/**
 * Mounts at the app root (App.tsx) rather than inside a route, so the sheet
 * survives the navigation it triggers and can be opened from any screen.
 */
export function QuickSheetHost() {
  const movie = useSyncExternalStore(subscribeQuickSheet, getQuickSheet)
  if (movie === null) return null
  return <QuickSheet movie={movie} onClose={closeQuickSheet} />
}
