/**
 * A running focus session survives a reload or iOS evicting the backgrounded PWA:
 * we keep the wall-clock start, the seconds already carried and the target length,
 * and derive the remaining time from them when the screen comes back.
 * Per-device convenience only (localStorage) — never part of her exported data.
 */
export type FocusPhase = 'ready' | 'running' | 'paused' | 'over' | 'done'

export interface FocusSession {
  /** item id, or 'free' */
  id: string
  totalSec: number
  phase: Exclude<FocusPhase, 'ready' | 'done'>
  /** epoch ms when the current running stretch started (null while paused/over) */
  startedAt: number | null
  /** seconds counted before the current running stretch */
  carried: number
  savedAt: number
}

export const kFocusKey = 'wejdan.focus.v1'
/** A session older than this is stale (she clearly left it) and is not restored. */
export const kFocusMaxAgeMs = 12 * 60 * 60 * 1000

export function saveFocusSession(s: Omit<FocusSession, 'savedAt'>, now = Date.now()): void {
  try {
    localStorage.setItem(kFocusKey, JSON.stringify({ ...s, savedAt: now }))
  } catch {
    /* storage blocked — the timer just won't survive a reload */
  }
}

export function clearFocusSession(): void {
  try {
    localStorage.removeItem(kFocusKey)
  } catch {
    /* ignore */
  }
}

export function loadFocusSession(id: string, now = Date.now()): FocusSession | null {
  try {
    const raw = localStorage.getItem(kFocusKey)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<FocusSession>
    if (s.id !== id || typeof s.totalSec !== 'number' || typeof s.carried !== 'number' || typeof s.savedAt !== 'number') return null
    if (s.phase !== 'running' && s.phase !== 'paused' && s.phase !== 'over') return null
    if (now - s.savedAt > kFocusMaxAgeMs) return null
    return s as FocusSession
  } catch {
    return null
  }
}

/** Elapsed seconds of a stored session at `now`, and the phase it should resume in. */
export function resumeFocusSession(s: FocusSession, now = Date.now()): { elapsed: number; phase: FocusSession['phase'] } {
  const elapsed = s.phase === 'running' && s.startedAt != null ? s.carried + Math.max(0, now - s.startedAt) / 1000 : s.carried
  if (s.phase === 'running' && elapsed >= s.totalSec) return { elapsed: s.totalSec, phase: 'over' }
  return { elapsed, phase: s.phase }
}
