import type { DomainId, LifeSnapshot, LifeStore } from '../../domain'

/**
 * Habits in a «راحة» (rest) domain never reach today's suggestions. When she deliberately adds a
 * habit (starter pick, Studio, IELTS plan), its domain wakes up to «حفاظ» so the promise in the
 * toast («تطلع لك باقتراحات اليوم») is true (QA #1). Returns the domains it changed.
 */
export async function ensureDomainsVisible(store: LifeStore, s: LifeSnapshot, ids: readonly (DomainId | null | undefined)[]): Promise<DomainId[]> {
  const changed: DomainId[] = []
  for (const id of new Set(ids.filter((x): x is DomainId => !!x))) {
    const d = s.domains.find((e) => e.id === id)
    if (!d || d.sensitive) continue
    if (!d.enabled) await store.setDomainEnabled(id, true)
    if (d.state === 'rest') {
      await store.setDomainState(id, 'maintain', true)
      changed.push(id)
    }
  }
  return changed
}

/**
 * Like [ensureDomainsVisible] but never breaks the «حفاظ» cap (5) silently (QA area 2 #4):
 * resting domains that fit are woken to «حفاظ»; the ones that would exceed the cap are returned
 * as `blocked` so the screen can ask her (swap with another domain, keep it resting, or park).
 */
export async function wakeDomainsRespectingCap(
  store: LifeStore,
  s: LifeSnapshot,
  ids: readonly (DomainId | null | undefined)[],
): Promise<{ woke: DomainId[]; blocked: DomainId[] }> {
  const woke: DomainId[] = []
  const blocked: DomainId[] = []
  for (const id of new Set(ids.filter((x): x is DomainId => !!x))) {
    const d = s.domains.find((e) => e.id === id)
    if (!d || d.sensitive) continue
    if (!d.enabled) await store.setDomainEnabled(id, true)
    if (d.state !== 'rest') continue
    const v = await store.setDomainState(id, 'maintain')
    if (v.length > 0) blocked.push(id)
    else woke.push(id)
  }
  return { woke, blocked }
}
