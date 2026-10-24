/**
 * First-run continuity (per device): a reload in the middle of onboarding resumes the same step
 * with what she typed, and a deep link opened before onboarding is where she lands after it.
 * Browser storage only — wrapped so a blocked storage never breaks onboarding.
 */
const kDraftKey = 'wejdan.onboarding.draft.v1'
const kIntendedKey = 'wejdan.onboarding.intended.v1'

export interface OnboardingDraft {
  step: number
  name: string
  wake: number
  sleep: number
  grow: string[]
  added: { name: string; slot: string }[]
  picked: string[]
}

function store(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  try {
    const raw = store()?.getItem(kDraftKey)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<OnboardingDraft>
    if (typeof d.step !== 'number' || typeof d.name !== 'string') return null
    return {
      step: d.step,
      name: d.name,
      wake: typeof d.wake === 'number' ? d.wake : 6 * 60,
      sleep: typeof d.sleep === 'number' ? d.sleep : 23 * 60,
      grow: Array.isArray(d.grow) ? d.grow.filter((x): x is string => typeof x === 'string') : [],
      added: Array.isArray(d.added) ? d.added.filter((x) => x && typeof x.name === 'string' && typeof x.slot === 'string') : [],
      picked: Array.isArray(d.picked) ? d.picked.filter((x): x is string => typeof x === 'string') : [],
    }
  } catch {
    return null
  }
}

export function saveOnboardingDraft(d: OnboardingDraft): void {
  try {
    store()?.setItem(kDraftKey, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

export function clearOnboardingDraft(): void {
  try {
    store()?.removeItem(kDraftKey)
  } catch {
    /* ignore */
  }
}

let suppressIntended = false
/**
 * «احذفي كل شي» sends her back through first run from inside Settings — she must land on Today afterwards,
 * not on Settings. Call before wiping; the next remembered route is skipped and takeIntendedRoute() clears it.
 */
export function suppressIntendedRoute(): void {
  suppressIntended = true
  try {
    store()?.removeItem(kIntendedKey)
  } catch {
    /* ignore */
  }
}

/** Remember the screen she opened before onboarding sent her to the first-run screens. */
export function rememberIntendedRoute(pathWithSearch: string): void {
  if (suppressIntended) return
  if (!pathWithSearch || pathWithSearch === '/' || pathWithSearch.startsWith('/onboarding') || pathWithSearch === '/today') return
  try {
    store()?.setItem(kIntendedKey, pathWithSearch)
  } catch {
    /* ignore */
  }
}

/** The remembered screen (once), or `/today`. */
export function takeIntendedRoute(): string {
  suppressIntended = false
  try {
    const s = store()
    const v = s?.getItem(kIntendedKey) ?? null
    s?.removeItem(kIntendedKey)
    return v && v.startsWith('/') && !v.startsWith('/onboarding') ? v : '/today'
  } catch {
    return '/today'
  }
}
