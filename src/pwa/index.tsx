/**
 * PWA bootstrap (imported once from main.tsx):
 *  - registers the service worker (offline after first load; update = prompt),
 *  - asks once for persistent storage,
 *  - mounts the update prompt in its own root (outside the app tree).
 * Settings can read status via `usePersistentStorage()` / `usePwaUpdate()`.
 */
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { UpdatePrompt } from './UpdatePrompt'
import { initPersistence, pwaInternals } from './state'
import { cleanupLegacyFlutter } from './legacyCleanup'

export { usePwaUpdate, usePersistentStorage, requestPersistence, applyUpdate } from './state'
export type { PersistState } from './state'

const HOURLY = 60 * 60 * 1000

function boot(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Old Flutter build lived here: drop its worker/caches BEFORE registering ours
  // (same scope = same registration, so the order matters).
  void cleanupLegacyFlutter()
    .catch(() => undefined)
    .then(registerWorker)

  void initPersistence()

  const host = document.createElement('div')
  host.id = 'pwa-root'
  // the update prompt stays tappable while a sheet is open (sheets make the rest of the page inert)
  host.setAttribute('data-inert-exempt', '')
  document.body.appendChild(host)
  createRoot(host).render(<UpdatePrompt />)
}

function registerWorker(): void {
  const updater = registerSW({
    immediate: true,
    onNeedRefresh() {
      pwaInternals.setNeedRefresh(true)
    },
    onOfflineReady() {
      pwaInternals.setOfflineReady(true)
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      // Check for a new version hourly and whenever the app comes back to the foreground.
      setInterval(() => void reg.update().catch(() => {}), HOURLY)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => {})
      })
    },
  })
  pwaInternals.setUpdater(updater)
}

boot()
