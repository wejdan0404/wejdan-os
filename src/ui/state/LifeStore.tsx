/**
 * App-wide access to the local life store (src/domain facade).
 *
 *   <LifeStoreProvider> — opens IndexedDB once at boot (W splash while loading),
 *                         shows a quiet banner when saving isn't available.
 *   useLife()   → LifeSnapshot (re-renders on every change; useSyncExternalStore)
 *   useStore()  → LifeStore (all actions: completeItem, moveToLater, quickAdd, …)
 *   useToday()  → logical today (Date; the day flips at 04:30)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector'
import { createLifeStore, type LifeSnapshot, type LifeStore } from '../../domain'
import { TabGateContext } from './tabGate'
import { useInjectedLifeStore } from '../lock/injection'
import { WMark } from '../components/WMark'
import { LegacyMigrationSheet } from './LegacyMigrationSheet'
import styles from './LifeStore.module.css'

const StoreContext = createContext<LifeStore | null>(null)

export function LifeStoreProvider({ children, store: injectedProp }: { children: ReactNode; store?: LifeStore }) {
  // an unlocked profile hands its (encrypted-DB) store down; with the lock off this is null and the app opens its own
  const fromVault = useInjectedLifeStore()
  const injected = injectedProp ?? fromVault ?? undefined
  const [store, setStore] = useState<LifeStore | null>(injected ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (injected) return
    let alive = true
    createLifeStore()
      .then(async (s) => {
        await migrateLocalName(s)
        if (alive) setStore(s)
      })
      .catch((e: unknown) => alive && setError(String(e)))
    return () => {
      alive = false
    }
  }, [injected])

  if (error)
    return (
      <div className={styles.splash} role="alert">
        <WMark size={64} />
        <p className={styles.msg}>ما قدرنا نفتح بياناتك. حدّثي الصفحة وجربي مرة ثانية.</p>
      </div>
    )
  if (!store)
    return (
      <div className={styles.splash} aria-busy="true" aria-label="لحظة، نجهّز يومك">
        <WMark size={96} />
      </div>
    )
  return (
    <StoreContext.Provider value={store}>
      {!store.persistent && (
        <div className={styles.banner} role="status">
          هالمتصفح ما يحفظ — بياناتك تروح لو سكّرتي الصفحة
        </div>
      )}
      {children}
      {/* One-time offer to move data from the old (Flutter) version on this origin. */}
      {!injected && store.persistent && <LegacyMigrationSheet store={store} />}
    </StoreContext.Provider>
  )
}

export function useStore(): LifeStore {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore() outside <LifeStoreProvider>')
  return s
}

/**
 * Store source for hooks: live outside tabs; inside a hidden (kept-alive) tab it
 * stops notifying and keeps returning the last snapshot it showed, then catches
 * up in one render when the tab becomes active again.
 */
function useGatedSource(): { subscribe: (cb: () => void) => () => void; getSnapshot: () => LifeSnapshot } {
  const store = useStore()
  const gate = useContext(TabGateContext)
  const last = useRef<LifeSnapshot | null>(null)
  const subscribe = useCallback(
    (cb: () => void) => {
      const offStore = store.subscribe(() => {
        if (!gate || gate.isActive()) cb()
      })
      const offGate = gate?.subscribe(() => {
        if (gate.isActive()) cb()
      })
      return () => {
        offStore()
        offGate?.()
      }
    },
    [store, gate],
  )
  const getSnapshot = useCallback(() => {
    if (!gate || gate.isActive() || !last.current) last.current = store.getSnapshot()
    return last.current
  }, [store, gate])
  return { subscribe, getSnapshot }
}

/** Whole snapshot — re-renders on every change. Prefer useLifeSelector for narrow reads. */
export function useLife(): LifeSnapshot {
  const { subscribe, getSnapshot } = useGatedSource()
  return useSyncExternalStore(subscribe, getSnapshot)
}

/**
 * Re-renders only when the selected slice changes (Object.is by default; pass
 * `shallowEqual` for object/array results built in the selector).
 */
export function useLifeSelector<T>(select: (s: LifeSnapshot) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const { subscribe, getSnapshot } = useGatedSource()
  return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, select, isEqual)
}

/** Shallow equality for plain objects and arrays (one level). */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false
  }
  return true
}

/** Logical today; recomputed when the minute ticks over 04:30 (or the store's clock moves). */
export function useToday(): Date {
  const store = useStore()
  // re-evaluated on every store change, but only re-renders when the day key changes
  useLifeSelector(() => store.today().toDateString())
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const key = store.today().toDateString()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => store.today(), [key, tick])
}

/** One-time move of the name the early build kept in localStorage into settings (so it exports). */
async function migrateLocalName(store: LifeStore): Promise<void> {
  const KEY = 'wejdan.displayName'
  try {
    const legacy = window.localStorage.getItem(KEY)
    if (legacy == null) return
    if (!store.getSnapshot().settings.displayName && legacy.trim()) await store.setDisplayName(legacy)
    window.localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable — nothing to migrate */
  }
}
