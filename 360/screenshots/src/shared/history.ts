/**
 * Undo/redo over immutable editor snapshots. A snapshot is small (the base
 * image is a shared data-URL string, shapes are tens of objects), so copying
 * beats a command log for simplicity.
 * ponytail: unbounded stack — cap it if someone annotates thousands of strokes.
 */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] })

export function commit<T>(h: History<T>, next: T): History<T> {
  return { past: [...h.past, h.present], present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}
