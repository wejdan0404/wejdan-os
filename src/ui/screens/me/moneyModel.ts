import { dayKey, mkDate } from '../../../domain'

/** Monthly due dates from [first] (same day of month, clamped to short months). */
export function monthlyDueDates(first: Date, count: number): string[] {
  const day = first.getDate()
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const y = first.getFullYear()
    const m = first.getMonth() + 1 + i
    const last = mkDate(y, m + 1, 0).getDate()
    out.push(dayKey(mkDate(y, m, Math.min(day, last))))
  }
  return out
}
