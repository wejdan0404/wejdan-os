import { useCallback, useEffect, useMemo, useState } from 'react'
import { dayKey, dueRemindersFor, type DueReminder } from '../../../domain'
import { useLife, useStore, useToday } from '../../state/LifeStore'
import { useVault } from '../../lock/context'
import { remindersKey } from '../../lock/deviceKeys'

const SNOOZE_MIN = 10

interface Memory {
  /** The logical day these belong to — older days are forgotten. */
  day: string
  dismissed: number[]
  /** reminder id → epoch ms until which it stays quiet */
  snoozed: Record<string, number>
}

const read = (key: string, day: string): Memory => {
  try {
    const m = JSON.parse(localStorage.getItem(key) ?? 'null') as Memory | null
    if (m && m.day === day) return { day, dismissed: m.dismissed ?? [], snoozed: m.snoozed ?? {} }
  } catch {
    /* private mode / blocked storage: the banner still works, it just forgets on reload */
  }
  return { day, dismissed: [], snoozed: {} }
}
const write = (key: string, m: Memory) => {
  try {
    localStorage.setItem(key, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

/**
 * The reminders to show right now, re-evaluated when the app comes back (visibilitychange / focus) and
 * on a 60 s tick while it is visible. «×» and «ابدئي» dismiss for the day; «بعد 10 دقايق» snoozes.
 * Newest time first — one banner at a time, the rest wait their turn. Per-device UI memory only.
 */
export function useDueReminders(): { current: DueReminder | null; queued: number; dismiss: (r: DueReminder) => void; snooze: (r: DueReminder) => void } {
  const s = useLife()
  const store = useStore()
  const today = useToday()
  const day = dayKey(today)
  // per-profile memory (plain key while the lock is off)
  const key = remindersKey(useVault()?.current?.id)
  const [tick, setTick] = useState(0)
  const [mem, setMem] = useState<Memory>(() => read(key, day))

  useEffect(() => {
    const bump = () => document.visibilityState !== 'hidden' && setTick((t) => t + 1)
    const id = window.setInterval(bump, 60_000)
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('focus', bump)
    }
  }, [])
  useEffect(() => setMem(read(key, day)), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setMem((m) => (m.day === day ? m : read(key, day))), [day, key])

  const due = useMemo(() => {
    const now = store.now()
    const all = dueRemindersFor(s, now, today)
    return all
      .filter((r) => !mem.dismissed.includes(r.id) && (mem.snoozed[String(r.id)] ?? 0) <= now.getTime())
      .sort((a, b) => b.minute - a.minute || b.id - a.id)
    // `tick` is the re-evaluation trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, store, today, mem, tick])

  const update = useCallback((fn: (m: Memory) => Memory) => {
    setMem((m) => {
      const n = fn(m)
      write(key, n)
      return n
    })
  }, [key])
  const dismiss = useCallback((r: DueReminder) => update((m) => ({ ...m, dismissed: [...m.dismissed, r.id] })), [update])
  const snooze = useCallback((r: DueReminder) => update((m) => ({ ...m, snoozed: { ...m.snoozed, [String(r.id)]: store.now().getTime() + SNOOZE_MIN * 60_000 } })), [update, store])

  return { current: due[0] ?? null, queued: Math.max(0, due.length - 1), dismiss, snooze }
}
