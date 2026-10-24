/**
 * Pure rules for auto-lock timing and the soft delay after wrong passwords (no timers here — the
 * runtime feeds in `now`, so the state machine is trivially testable).
 */
export type AutoLock = 'immediate' | 'min1' | 'min5' | 'launch';
export const kAutoLockDefault: AutoLock = 'min1';
export const kAutoLockMs: Record<AutoLock, number> = { immediate: 0, min1: 60_000, min5: 300_000, launch: Infinity };
export const isAutoLock = (v: unknown): v is AutoLock => v === 'immediate' || v === 'min1' || v === 'min5' || v === 'launch';

/** «فورًا»: lock the moment the app is hidden. */
export const shouldLockOnHide = (t: AutoLock): boolean => t === 'immediate';

/**
 * Called when the page becomes visible again. [hiddenAt] = when it was hidden (null if unknown →
 * the safe answer is "lock"). «كل ما أفتحه» never locks a live page; only a cold start does.
 */
export function shouldLockOnReturn(t: AutoLock, hiddenAt: number | null, now: number): boolean {
  if (t === 'launch') return false;
  if (t === 'immediate') return true;
  if (hiddenAt == null) return true;
  return now - hiddenAt >= kAutoLockMs[t];
}

/** ms from hidden until a background timer should lock (null = no timer). */
export const hiddenLockDelay = (t: AutoLock): number | null => (t === 'min1' || t === 'min5' ? kAutoLockMs[t] : null);

// ---- wrong-password delay ---------------------------------------------------------------------
export interface AttemptState {
  failures: number;
  /** epoch ms; attempts are refused before it. */
  retryAt: number;
}
export const kNoAttempts: AttemptState = { failures: 0, retryAt: 0 };
export const kFreeAttempts = 4;
/** After the 5th wrong password: 30 s, then 60 s, 2 min, and 5 min from then on. */
export function delaySecondsAfter(failures: number): number {
  if (failures <= kFreeAttempts) return 0;
  return [30, 60, 120, 300][Math.min(failures - kFreeAttempts - 1, 3)];
}
export function recordFailure(s: AttemptState, now: number): AttemptState {
  const failures = s.failures + 1;
  const d = delaySecondsAfter(failures);
  return { failures, retryAt: d > 0 ? now + d * 1000 : 0 };
}
export const remainingSeconds = (s: AttemptState, now: number): number => Math.max(0, Math.ceil((s.retryAt - now) / 1000));
export const canAttempt = (s: AttemptState, now: number): boolean => remainingSeconds(s, now) === 0;
