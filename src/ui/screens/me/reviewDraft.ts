/**
 * Weekly review in progress survives a reload / iOS evicting the app: the step she reached and
 * her answers are kept per week on this device until she finishes (then cleared).
 */
const key = (weekKey: string) => `wejdan.reviewDraft.v1.${weekKey}`

export interface ReviewDraft {
  step: number
  wins: string[]
  important: string[]
  fates: Record<string, 'keep' | 'inbox' | 'drop'>
  pause: string[]
  top3: string[]
  fit: 'light' | 'right' | 'heavy'
  title: string
}

export function loadReviewDraft(weekKey: string): ReviewDraft | null {
  try {
    const raw = window.localStorage.getItem(key(weekKey))
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<ReviewDraft>
    if (typeof d.step !== 'number' || d.step < 1 || d.step > 6) return null
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    return {
      step: d.step,
      wins: strs(d.wins),
      important: strs(d.important),
      fates: d.fates && typeof d.fates === 'object' ? (d.fates as ReviewDraft['fates']) : {},
      pause: strs(d.pause),
      top3: strs(d.top3),
      fit: d.fit === 'light' || d.fit === 'heavy' ? d.fit : 'right',
      title: typeof d.title === 'string' ? d.title : '',
    }
  } catch {
    return null
  }
}

export function saveReviewDraft(weekKey: string, d: ReviewDraft): void {
  try {
    window.localStorage.setItem(key(weekKey), JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

export function clearReviewDraft(weekKey: string): void {
  try {
    window.localStorage.removeItem(key(weekKey))
  } catch {
    /* ignore */
  }
}
