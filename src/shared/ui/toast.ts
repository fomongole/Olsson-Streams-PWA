/**
 * Minimal external store for transient status messages, mirroring the
 * Android Toast the access screen shows on success. Modelled on
 * shared/api/presentation.ts: plain module state + subscribe, read through
 * useSyncExternalStore so React 19 owns the render.
 */

export interface ToastMessage {
  /** Increments per toast so re-showing an identical string still animates. */
  id: number
  message: string
}

let current: ToastMessage | null = null
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function showToast(message: string): void {
  current = { id: nextId++, message }
  emit()
}

export function dismissToast(): void {
  if (current === null) return
  current = null
  emit()
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToast(): ToastMessage | null {
  return current
}
