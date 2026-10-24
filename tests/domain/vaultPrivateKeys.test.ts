import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { DexieLifeRepository, InMemoryLifeRepository, createLifeStore, kPersonalLibraryStorageKey, mkDate, type Json } from '../../src/domain'
import { Vault, makeRowCipher, type KeyValue } from '../../src/domain/vault'
import { adoptReminderMemory, purgeDeviceConveniences, purgeReminderMemory, remindersKey } from '../../src/ui/lock/deviceKeys'
import { library } from './helpers'

const mkKv = (): KeyValue => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
let n = 0
beforeEach(async () => {
  localStorage.clear()
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name)
})

const shippedEn = async () => (await import('../../src/domain/data/actions.json')).default as unknown as Record<string, unknown>[]
const shippedAr = async () => (await import('../../src/domain/data/actions_ar.json')).default as unknown as Record<string, Record<string, unknown>>
async function personalFile() {
  const base = (await shippedEn())[0]!
  const baseAr = (await shippedAr())[String(base['action_id'])] ?? {}
  return {
    kind: 'wejdan-action-library', version: 1,
    actions: [{ ...base, action_id: 'TEST-77' }],
    actions_ar: { 'TEST-77': { ...baseAr, card_title_ar: 'test-private-title' } },
  }
}
async function encryptedRepo() {
  const v = new Vault(mkKv(), 1000)
  const prep = await v.prepare({ name: 'test', username: 'test.user', password: 'test password 1' })
  const repo = new DexieLifeRepository(`pk_${n++}`, makeRowCipher(prep.key))
  await repo.open()
  return repo
}

describe('personal action library: plaintext localStorage only while the lock is off', () => {
  it('lock on: a leftover localStorage copy is moved INTO the encrypted database, verified, then removed; import/remove never touch localStorage', async () => {
    const file = await personalFile()
    localStorage.setItem(kPersonalLibraryStorageKey, JSON.stringify(file))
    const repo = await encryptedRepo()
    const store = await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 9) })
    expect(localStorage.getItem(kPersonalLibraryStorageKey)).toBeNull()
    expect(store.hasPersonalLibrary()).toBe(true)
    expect(store.getSnapshot().actions.some((a) => a.actionId === 'TEST-77')).toBe(true)
    // at rest: the row is ciphertext
    const raw = new Dexie((repo as unknown as { db: { name: string } }).db.name)
    await raw.open()
    const row = (await raw.table('records').get(['meta', 'personalLibrary'])) as { value: Json }
    expect(JSON.stringify(row.value)).not.toContain('test-private-title')
    expect(JSON.stringify(row.value)).not.toContain('TEST-77')
    raw.close()
    // remove, then import again while locked: still no plaintext copy
    await store.removePersonalLibrary()
    expect(store.hasPersonalLibrary()).toBe(false)
    expect(store.getSnapshot().actions.some((a) => a.actionId === 'TEST-77')).toBe(false)
    await store.importPersonalLibrary(file)
    expect(localStorage.getItem(kPersonalLibraryStorageKey)).toBeNull()
    expect(store.getSnapshot().actions.some((a) => a.actionId === 'TEST-77')).toBe(true)
    // a reopened store (next unlock) still has it
    const again = await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 9) })
    expect(again.getSnapshot().actions.some((a) => a.actionId === 'TEST-77')).toBe(true)
    // and it is not part of exports / backups
    expect(JSON.stringify(await repo.exportAll())).not.toContain('TEST-77')
  })

  it('lock off again: the copy that travelled with the data goes back to localStorage (plain mode keeps working as before)', async () => {
    const file = await personalFile()
    const plain = new DexieLifeRepository(`pk_${n++}`)
    await plain.open()
    await plain.write('meta', 'personalLibrary', { v: file as unknown as Json })
    const store = await createLifeStore({ repo: plain, now: () => mkDate(2026, 10, 5, 9) })
    expect(localStorage.getItem(kPersonalLibraryStorageKey)).not.toBeNull()
    expect(await plain.read('meta', 'personalLibrary')).toBeNull()
    expect(store.hasPersonalLibrary()).toBe(true)
  })

  it('unchanged for a plain in-memory store', async () => {
    localStorage.clear()
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => mkDate(2026, 10, 5, 9), library })
    await store.importPersonalLibrary(await personalFile(), localStorage)
    expect(localStorage.getItem(kPersonalLibraryStorageKey)).not.toBeNull()
  })
})

describe('device conveniences: reminders are per profile; the library key is purged on lock', () => {
  it('namespaces reminder memory per profile and purges both it and a stray library copy on manual lock / switch / delete', () => {
    localStorage.setItem(remindersKey('p_a'), '{"day":"2026-10-05","dismissed":[1],"snoozed":{}}')
    localStorage.setItem(remindersKey('p_b'), '{"day":"2026-10-05","dismissed":[2],"snoozed":{}}')
    localStorage.setItem('wos.reminders.v1', '{}')
    localStorage.setItem(kPersonalLibraryStorageKey, '{"kind":"x"}')
    localStorage.setItem('wejdan.theme', 'dark')
    expect(remindersKey('p_a')).not.toBe(remindersKey('p_b'))
    expect(remindersKey(null)).toBe('wos.reminders.v1')
    purgeDeviceConveniences()
    expect(localStorage.getItem(remindersKey('p_a'))).toBeNull()
    expect(localStorage.getItem(remindersKey('p_b'))).toBeNull()
    expect(localStorage.getItem('wos.reminders.v1')).toBeNull()
    expect(localStorage.getItem(kPersonalLibraryStorageKey)).toBeNull()
    expect(localStorage.getItem('wejdan.theme')).toBe('dark') // theme is kept
  })
  it('turning the lock on hands the plain reminder memory to the first profile; turning it off clears them all', () => {
    localStorage.setItem('wos.reminders.v1', 'MEM')
    adoptReminderMemory('p_a')
    expect(localStorage.getItem('wos.reminders.v1')).toBeNull()
    expect(localStorage.getItem(remindersKey('p_a'))).toBe('MEM')
    purgeReminderMemory()
    expect(localStorage.getItem(remindersKey('p_a'))).toBeNull()
  })
})
