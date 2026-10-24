/**
 * One-time cleanup after replacing the old Flutter web build at the same origin/path.
 *  - Unregisters any service worker that is not this app's workbox worker (sw.js).
 *  - Deletes Flutter's Cache Storage entries.
 *  - Removes the `r` cache-busting query added by the legacy shims.
 * It NEVER touches IndexedDB: her old Flutter data stays for the in-app migration.
 */
const DONE_KEY = 'wejdan.legacyCleanupDone'

export function isLegacyCache(name: string): boolean {
  return /^flutter/i.test(name)
}

export function isOwnWorker(scriptURL: string | undefined | null): boolean {
  if (!scriptURL) return false
  try {
    return /\/sw\.js$/.test(new URL(scriptURL).pathname)
  } catch {
    return false
  }
}

function stripShimQuery(): void {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('r')) return
    url.searchParams.delete('r')
    window.history.replaceState(window.history.state, '', url.toString())
    sessionStorage.removeItem('wejdan.legacyShimHops')
  } catch {
    /* ignore */
  }
}

export async function cleanupLegacyFlutter(): Promise<{ unregistered: number; cachesDeleted: number }> {
  stripShimQuery()
  let unregistered = 0
  let cachesDeleted = 0
  try {
    if (localStorage.getItem(DONE_KEY) === '1') return { unregistered, cachesDeleted }
  } catch {
    /* storage blocked: run anyway, it is idempotent */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) {
        const workers = [reg.active, reg.waiting, reg.installing].filter(Boolean)
        if (!workers.some((w) => isOwnWorker(w?.scriptURL))) {
          if (await reg.unregister()) unregistered++
        }
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      for (const k of keys) {
        if (isLegacyCache(k) && (await caches.delete(k))) cachesDeleted++
      }
    }
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    /* ignore */
  }
  return { unregistered, cachesDeleted }
}
