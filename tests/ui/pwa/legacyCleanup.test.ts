import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupLegacyFlutter, isLegacyCache, isOwnWorker } from '../../../src/pwa/legacyCleanup'

type FakeWorker = { scriptURL: string } | null
type FakeReg = { active: FakeWorker; waiting: FakeWorker; installing: FakeWorker; unregister: ReturnType<typeof vi.fn> }

const BASE = 'http://localhost/wejdan-os/'
const reg = (active: string | null, installing: string | null = null): FakeReg => ({
  active: active ? { scriptURL: BASE + active } : null,
  waiting: null,
  installing: installing ? { scriptURL: BASE + installing } : null,
  unregister: vi.fn(async () => true),
})

function install(regs: FakeReg[], cacheNames: string[]) {
  const deleted: string[] = []
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations: vi.fn(async () => regs) },
  })
  ;(globalThis as unknown as { caches: unknown }).caches = {
    keys: vi.fn(async () => cacheNames),
    delete: vi.fn(async (k: string) => {
      deleted.push(k)
      return true
    }),
  }
  return deleted
}

describe('legacy Flutter cleanup', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    delete (globalThis as unknown as { caches?: unknown }).caches
  })

  it('recognises our workbox worker and Flutter caches only', () => {
    expect(isOwnWorker(BASE + 'sw.js')).toBe(true)
    expect(isOwnWorker(BASE + 'flutter_service_worker.js?v=1')).toBe(false)
    expect(isOwnWorker(null)).toBe(false)
    expect(isLegacyCache('flutter-app-cache')).toBe(true)
    expect(isLegacyCache('flutter-temp-cache')).toBe(true)
    expect(isLegacyCache('workbox-precache-v2-' + BASE)).toBe(false)
    expect(isLegacyCache('wejdan-action-library')).toBe(false)
  })

  it('unregisters the Flutter worker and drops only Flutter caches', async () => {
    const flutter = reg('flutter_service_worker.js')
    const deleted = install([flutter], ['flutter-app-cache', 'workbox-precache-v2-x', 'wejdan-action-library'])
    const res = await cleanupLegacyFlutter()
    expect(flutter.unregister).toHaveBeenCalledOnce()
    expect(deleted).toEqual(['flutter-app-cache'])
    expect(res).toEqual({ unregistered: 1, cachesDeleted: 1 })
  })

  it('never unregisters a registration that holds our worker (same scope)', async () => {
    const own = reg('sw.js')
    const swapping = reg('flutter_service_worker.js', 'sw.js')
    install([own, swapping], [])
    await cleanupLegacyFlutter()
    expect(own.unregister).not.toHaveBeenCalled()
    expect(swapping.unregister).not.toHaveBeenCalled()
  })

  it('never touches IndexedDB and runs only once', async () => {
    const del = vi.spyOn(indexedDB, 'deleteDatabase')
    const flutter = reg('flutter_service_worker.js')
    install([flutter], ['flutter-app-cache'])
    await cleanupLegacyFlutter()
    await cleanupLegacyFlutter()
    expect(del).not.toHaveBeenCalled()
    expect(flutter.unregister).toHaveBeenCalledOnce()
  })

  it('strips the shim cache-busting query', async () => {
    window.history.replaceState(null, '', '/wejdan-os/?r=123#/today')
    sessionStorage.setItem('wejdan.legacyShimHops', '1')
    install([], [])
    await cleanupLegacyFlutter()
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#/today')
    expect(sessionStorage.getItem('wejdan.legacyShimHops')).toBeNull()
  })
})
