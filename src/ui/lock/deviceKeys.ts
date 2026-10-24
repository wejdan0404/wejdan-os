/**
 * Per-device conveniences kept in localStorage by the app (recent searches, unsent review draft, today's
 * pick, focus block, onboarding draft, reminder memory). They are NOT encrypted, so they are wiped
 * whenever the lock is used on purpose (manual lock, switching or deleting a profile) — not on auto-lock, which
 * would reset them on every app switch. Reminder memory is also namespaced per profile.
 * Theme, the lock registry and PWA flags are kept.
 */
const PREFIXES = [
  'wejdan.recentSearches', 'wejdan.reviewRest', 'wejdan.reviewDraft.v', 'wejdan.joy.pick.', 'wejdan.focus.v',
  'wejdan.onboarding.', 'wejdan.displayName',
  // per-profile reminder memory (dismissed / snoozed) — see remindersKey
  'wos.reminders.v1',
  // a stray plaintext copy of her personal action library. With the lock on it lives inside the encrypted profile
  // database (LifeStore moves any leftover in); this only removes what should not be there.
  'wejdan.personalActionLibrary',
]

/** Reminder memory is per profile: `wos.reminders.v1.<profileId>` with the lock on, the plain key with it off. */
export const kRemindersBase = 'wos.reminders.v1'
export const remindersKey = (profileId?: string | null): string => (profileId ? `${kRemindersBase}.${profileId}` : kRemindersBase)

/** Lock turned on: the plain reminder memory becomes the first profile's (nothing resurfaces), then the plain key goes. */
export function adoptReminderMemory(profileId: string): void {
  try {
    const ls = window.localStorage
    const plain = ls.getItem(kRemindersBase)
    if (plain != null && ls.getItem(remindersKey(profileId)) == null) ls.setItem(remindersKey(profileId), plain)
    ls.removeItem(kRemindersBase)
  } catch {
    /* storage blocked */
  }
}
/** Every reminder-memory key (plain and per-profile) — used when the lock is turned off. */
export function purgeReminderMemory(): void {
  try {
    const ls = window.localStorage
    const doomed: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k && k.startsWith(kRemindersBase)) doomed.push(k)
    }
    for (const k of doomed) ls.removeItem(k)
  } catch {
    /* storage blocked */
  }
}
export function purgeDeviceConveniences(): void {
  try {
    const ls = window.localStorage
    const doomed: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i)
      if (k && PREFIXES.some((p) => k.startsWith(p))) doomed.push(k)
    }
    for (const k of doomed) ls.removeItem(k)
  } catch {
    /* storage blocked — nothing to purge */
  }
}
