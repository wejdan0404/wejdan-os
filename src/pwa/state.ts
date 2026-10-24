/**
 * PWA runtime state: service-worker update flow + persistent-storage request.
 * Exposed to the app through hooks (Settings can show «التخزين محمي»).
 *
 *   usePwaUpdate()          → { needRefresh, offlineReady, applyUpdate(), dismiss() }
 *   usePersistentStorage()  → { supported, persisted, request() }
 */
import { useSyncExternalStore } from 'react'

export interface PersistState {
  /** navigator.storage.persist exists in this browser. */
  supported: boolean
  /** null = not known yet. */
  persisted: boolean | null
}

interface PwaState {
  needRefresh: boolean
  offlineReady: boolean
  persist: PersistState
}

let state: PwaState = {
  needRefresh: false,
  offlineReady: false,
  persist: { supported: false, persisted: null },
}
const listeners = new Set<() => void>()
let updateSW: ((reload?: boolean) => Promise<void>) | null = null

function set(patch: Partial<PwaState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

export const pwaInternals = {
  setNeedRefresh: (v: boolean) => set({ needRefresh: v }),
  setOfflineReady: (v: boolean) => set({ offlineReady: v }),
  setPersist: (p: PersistState) => set({ persist: p }),
  setUpdater: (fn: (reload?: boolean) => Promise<void>) => {
    updateSW = fn
  },
}

export function applyUpdate(): void {
  if (updateSW) void updateSW(true)
  else window.location.reload()
}

export function dismissUpdate(): void {
  set({ needRefresh: false })
}

const PERSIST_FLAG = 'wejdan.persistRequested'

function storage(): StorageManager | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined
}

/** Ask the browser to keep IndexedDB data (no eviction). Safe to call repeatedly. */
export async function requestPersistence(): Promise<boolean | null> {
  const s = storage()
  if (!s || typeof s.persist !== 'function') {
    set({ persist: { supported: false, persisted: null } })
    return null
  }
  try {
    const already = typeof s.persisted === 'function' ? await s.persisted() : false
    const granted = already || (await s.persist())
    set({ persist: { supported: true, persisted: granted } })
    return granted
  } catch {
    set({ persist: { supported: true, persisted: null } })
    return null
  }
}

/** Request once per device (first launch); afterwards only read the status. */
export async function initPersistence(): Promise<void> {
  const s = storage()
  if (!s || typeof s.persist !== 'function') {
    set({ persist: { supported: false, persisted: null } })
    return
  }
  let asked = false
  try {
    asked = localStorage.getItem(PERSIST_FLAG) === '1'
  } catch {
    /* private mode */
  }
  if (!asked) {
    try {
      localStorage.setItem(PERSIST_FLAG, '1')
    } catch {
      /* ignore */
    }
    await requestPersistence()
    return
  }
  try {
    const p = typeof s.persisted === 'function' ? await s.persisted() : null
    set({ persist: { supported: true, persisted: p } })
  } catch {
    set({ persist: { supported: true, persisted: null } })
  }
}

export function usePwaUpdate() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    needRefresh: s.needRefresh,
    offlineReady: s.offlineReady,
    applyUpdate,
    dismiss: dismissUpdate,
  }
}

export function usePersistentStorage() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...s.persist, request: requestPersistence }
}
