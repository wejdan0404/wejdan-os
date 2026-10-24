/**
 * Owns "which profile is open". Without a registry (lock never turned on) it renders the app exactly as
 * before. With one, the app tree is only mounted while a profile is unlocked; locking unmounts it (the
 * LifeStore, every screen state, the undo toast) and closes the encrypted database. The data key only
 * ever lives in the `Session` held here — never in storage, URLs or logs.
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createLifeStore, type LifeStore } from '../../domain'
import { Vault, hiddenLockDelay, shouldLockOnHide, shouldLockOnReturn, type Session } from '../../domain/vault'
import { ToastProvider } from '../components/Toast'
import { WMark } from '../components/WMark'
import { VaultContext, type VaultApi } from './context'
import { LockGate } from './LockGate'
import { PrivacyCover } from './PrivacyCover'
import { adoptReminderMemory, purgeDeviceConveniences, purgeReminderMemory } from './deviceKeys'
import { UnreadableProfile } from './UnreadableProfile'
import { BackupIOProvider } from './backupIO'
import { LifeStoreInjection } from './injection'
import s from './lock.module.css'

let singleton: Vault | null = null
export const getVault = (): Vault => (singleton ??= new Vault())

export function VaultProvider({ children }: { children: ReactNode }) {
  const vault = getVault()
  useSyncExternalStore(vault.subscribe, vault.getVersion)
  const [session, setSession] = useState<Session | null>(null)
  // the store is only ever shown together with the session it was built for (never a previous profile's)
  const [built, setBuilt] = useState<{ session: Session; store: LifeStore } | null>(null)
  const store = built && built.session === session ? built.store : null
  const [epoch, setEpoch] = useState(0)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const enabled = vault.enabled
  // Before the app opens ANY database, the registry (localStorage) is reconciled with the profile headers (IndexedDB):
  // a registry lost to a browser kill is rebuilt, a partial one completed. Skipping this could start a fresh empty app.
  const [ready, setReady] = useState(() => vault.enabled)
  useEffect(() => {
    let alive = true
    void vault.recoverOnce().finally(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [vault])

  // a plain-DB deletion that failed right after turning the lock on is retried at launch
  useEffect(() => void vault.cleanupLegacy(), [vault])

  useEffect(() => {
    if (!session) {
      setBuilt(null)
      return
    }
    let alive = true
    setFailed(false)
    createLifeStore({ repo: session.repo })
      .then((st) => alive && setBuilt({ session, store: st }))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [session, attempt])

  const drop = useCallback((sess: Session | null) => {
    void sess?.repo.close().catch(() => {})
  }, [])

  const lock = useCallback(() => {
    setSession((cur) => {
      drop(cur)
      return null
    })
    setEpoch((e) => e + 1)
  }, [drop])

  const adopt = useCallback((next: Session) => {
    setSession((cur) => {
      if (cur && cur !== next) drop(cur)
      return next
    })
    setEpoch((e) => e + 1)
  }, [drop])

  // ---- auto-lock: visibilitychange + a background timer (foreground-only timers; no service worker) ----
  const timing = vault.autoLock
  useEffect(() => {
    if (!enabled || !session) return
    let hiddenAt: number | null = null
    let timer: number | undefined
    const onHide = () => {
      if (hiddenAt == null) hiddenAt = Date.now()
      if (shouldLockOnHide(timing)) return lock()
      const d = hiddenLockDelay(timing)
      if (d != null && timer === undefined) timer = window.setTimeout(lock, d)
    }
    const onShow = () => {
      window.clearTimeout(timer)
      timer = undefined
      const since = hiddenAt
      hiddenAt = null
      if (since != null && shouldLockOnReturn(timing, since, Date.now())) lock()
    }
    const onVis = () => (document.visibilityState === 'hidden' ? onHide() : onShow())
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      window.clearTimeout(timer)
    }
  }, [enabled, session, timing, lock])

  const api = useMemo<VaultApi>(
    () => ({
      vault,
      enabled,
      profiles: vault.profiles,
      current: session ? (vault.profile(session.profile.id) ?? session.profile) : null,
      autoLock: vault.autoLock,
      async activate(prep) {
        const { session: next } = await vault.enableWithExisting(prep)
        adoptReminderMemory(next.profile.id)
        window.location.hash = '#/today'
        adopt(next)
      },
      async addAndEnter(prep) {
        const next = await vault.addProfile(prep)
        purgeDeviceConveniences()
        window.location.hash = '#/today'
        adopt(next)
      },
      lock() {
        purgeDeviceConveniences()
        lock()
      },
      async turnOff() {
        if (!session) return
        await vault.disableLock(session)
        purgeReminderMemory()
        setSession(null)
        setEpoch((e) => e + 1)
      },
      async removeProfile(id) {
        const wasCurrent = session?.profile.id === id
        if (wasCurrent) drop(session)
        await vault.deleteProfile(id)
        purgeDeviceConveniences()
        if (wasCurrent) {
          window.location.hash = '#/today'
          setSession(null)
          setEpoch((e) => e + 1)
        }
      },
      adopt,
      setAutoLock: (t) => vault.setAutoLock(t),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vault, enabled, session, vault.getVersion(), adopt, lock, drop],
  )

  const retry = useCallback(() => {
    setFailed(false)
    setBuilt(null)
    setAttempt((a) => a + 1)
  }, [])

  let body: ReactNode
  if (!ready) {
    body = (
      <div className={s.splash} aria-busy="true" aria-label="لحظة، نجهّز يومك">
        <WMark size={96} />
      </div>
    )
  } else if (!enabled) {
    // lock off: exactly the app as it was (its own store, its own plain database)
    body = (
      <ToastProvider key={epoch}>
        <BackupIOProvider>{children}</BackupIOProvider>
      </ToastProvider>
    )
  } else if (!session) {
    body = (
      <ToastProvider key={`gate-${epoch}`}>
        <LockGate api={api} />
      </ToastProvider>
    )
  } else if (failed) {
    body = (
      <ToastProvider key={`bad-${epoch}`}>
        <BackupIOProvider>
          <UnreadableProfile session={session} onRetry={retry} onBack={() => api.lock()} />
        </BackupIOProvider>
      </ToastProvider>
    )
  } else if (!store) {
    body = (
      <div className={s.splash} aria-busy="true" aria-label="لحظة، نجهّز يومك">
        <WMark size={96} />
      </div>
    )
  } else {
    body = (
      <ToastProvider key={`app-${epoch}`}>
        <LifeStoreInjection.Provider value={store}>
          <BackupIOProvider>{children}</BackupIOProvider>
        </LifeStoreInjection.Provider>
      </ToastProvider>
    )
  }

  return (
    <VaultContext.Provider value={api}>
      {body}
      {enabled && <PrivacyCover />}
    </VaultContext.Provider>
  )
}
