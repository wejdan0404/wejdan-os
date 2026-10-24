/**
 * Weekly review in progress survives a reload / iOS evicting the app: the step she reached and
 * her answers are kept per week on this device until she finishes (then cleared).
 * v2 (feat/a): steps are ids, not numbers, and the new steps' answers are kept too.
 */
import { MISS_REASONS, type LifeStore, type DomainId, type DomainState, type MissReason } from '../../../domain'
import { STEP_IDS, type StepId } from './review/reviewCopy'

/** Placement (localStorage while the lock is off, the encrypted database while it is on) is the store's job. */
type DraftStore = Pick<LifeStore, 'getReviewDraftRaw' | 'setReviewDraftRaw' | 'clearReviewDraftRaw'>

export interface ReviewDraft {
  step: StepId
  wins: string[]
  important: string[]
  fates: Record<string, 'keep' | 'inbox' | 'drop'>
  pause: string[]
  top3: string[]
  fit: 'light' | 'right' | 'heavy'
  title: string
  blockers: MissReason[]
  strengthHabit: string
  ratings: Record<string, number[]>
  seasonStates: Partial<Record<DomainId, DomainState>>
  /** undefined = not touched (the blocker's experiment is pre-picked); null = «بدون تجربة». */
  expPick?: string | null
}

export function loadReviewDraft(store: DraftStore, weekKey: string): ReviewDraft | null {
  try {
    const raw = store.getReviewDraftRaw(weekKey)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<ReviewDraft>
    if (typeof d.step !== 'string' || !(STEP_IDS as readonly string[]).includes(d.step)) return null
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    const ratings: Record<string, number[]> = {}
    if (d.ratings && typeof d.ratings === 'object') {
      for (const [k, v] of Object.entries(d.ratings)) {
        if (Array.isArray(v)) ratings[k] = v.map((n) => (typeof n === 'number' && n >= 1 && n <= 5 ? n : 0)).slice(0, 4)
      }
    }
    const seasonStates: ReviewDraft['seasonStates'] = {}
    if (d.seasonStates && typeof d.seasonStates === 'object') {
      for (const [k, v] of Object.entries(d.seasonStates)) {
        if (v === 'grow' || v === 'maintain' || v === 'rest') seasonStates[k as DomainId] = v
      }
    }
    return {
      step: d.step as StepId,
      wins: strs(d.wins),
      important: strs(d.important),
      fates: d.fates && typeof d.fates === 'object' ? (d.fates as ReviewDraft['fates']) : {},
      pause: strs(d.pause),
      top3: strs(d.top3),
      fit: d.fit === 'light' || d.fit === 'heavy' ? d.fit : 'right',
      title: typeof d.title === 'string' ? d.title : '',
      blockers: strs(d.blockers).filter((x): x is MissReason => (MISS_REASONS as readonly string[]).includes(x)),
      strengthHabit: typeof d.strengthHabit === 'string' ? d.strengthHabit : '',
      ratings,
      seasonStates,
      expPick: typeof d.expPick === 'string' ? d.expPick : d.expPick === null ? null : undefined,
    }
  } catch {
    return null
  }
}

export function saveReviewDraft(store: DraftStore, weekKey: string, d: ReviewDraft): void {
  try {
    store.setReviewDraftRaw(weekKey, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

export function clearReviewDraft(store: DraftStore, weekKey: string): void {
  try {
    store.clearReviewDraftRaw(weekKey)
  } catch {
    /* ignore */
  }
}
