import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import {
  DexieLifeRepository, buildStarterProfile, kAllBoxes, kFlutterBoxes, kSeedOnlyBoxes,
} from '../../src/domain'
import { Vault, VaultError, canonical, databaseExists, isSealed, type KeyValue } from '../../src/domain/vault'
import { library, mon } from './helpers'

const mkKv = (): KeyValue & { m: Map<string, string> } => {
  const m = new Map<string, string>()
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
let n = 0
const plainName = () => `test_plain_${n++}`

/** A realistic plain DB: seeded neutral profile + a few user records, all named "test". */
async function plainDb(name: string) {
  const repo = new DexieLifeRepository(name)
  await repo.open()
  await repo.seed({ library, profile: buildStarterProfile(library, mon) })
  await repo.write('notes', 'n_test', { id: 'n_test', title: 'test', body: 'test-secret-body', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
  await repo.write('inbox', 'i_test', { id: 'i_test', text: 'test-secret-inbox' })
  await repo.write('later', 'l_test', { id: 'l_test', title: 'test' })
  return repo
}
const countsOf = async (r: DexieLifeRepository) => {
  const o: Record<string, number> = {}
  for (const b of kAllBoxes) o[b] = (await r.readEntries(b)).length
  return o
}

describe('turning the lock on migrates the existing DB without losing a record', () => {
  it('record counts per box and every record are identical before/after; a backup is taken first; the plain DB is kept as a rollback until a later unlock', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await countsOf(repo)
    const userBefore = Object.fromEntries(
      await Promise.all([...kFlutterBoxes, 'tasks', 'inbox', 'later', 'notes', 'meta'].filter((b) => !kSeedOnlyBoxes.includes(b as never)).map(async (b) => [b, await repo.readEntries(b as never)] as const)),
    )
    expect(before.notes).toBe(1)
    expect(before.actions).toBeGreaterThan(50)
    await repo.close()

    const kv = mkKv()
    const vault = new Vault(kv, 1000)
    const prep = await vault.prepare({ name: 'test', username: 'test.user', password: 'test password 1' })
    const { session, report } = await vault.enableWithExisting(prep, plain)

    // backup 'before-lock' exists; everything else identical (backups box has +1 record)
    const after = await countsOf(session.repo)
    for (const b of kAllBoxes) expect(after[b], `box ${b}`).toBe(b === 'backups' ? before[b] + 1 : before[b])
    expect(report.counts.backups).toBe(before.backups + 1)
    const backups = await session.repo.listBackups()
    expect(backups.map((x) => x.reason)).toContain('before-lock')
    for (const [box, entries] of Object.entries(userBefore)) {
      const now = new Map(await session.repo.readEntries(box as never))
      for (const [id, v] of entries) expect(canonical(now.get(id)), `${box}/${id}`).toBe(canonical(v))
    }
    // registry + plain DB gone
    expect(vault.enabled).toBe(true)
    expect(vault.profiles).toHaveLength(1)
    expect(await databaseExists(plain)).toBe(true) // never deleted in the same launch
    expect(vault.rollback?.dbName).toBe(plain)
    // the exported plain format still works from the migrated store (schemaVersion 1)
    const exp = await session.repo.exportAll()
    expect(exp.schemaVersion).toBe(1)
    expect((exp.boxes.notes as unknown[]).length).toBe(1)
    await session.repo.close()
  })

  it('at rest: record values are ciphertext; only box names, ids and counts are readable', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const vault = new Vault(mkKv(), 1000)
    const prep = await vault.prepare({ name: 'test', username: 'test.user', password: 'test password 1' })
    const { session } = await vault.enableWithExisting(prep, plain)
    await session.repo.close()
    const raw = new Dexie(prep.profile.dbName)
    await raw.open()
    const rows = (await raw.table('records').toArray()) as { box: string; id: string; value: unknown }[]
    expect(rows.length).toBeGreaterThan(100)
    for (const r of rows) expect(isSealed(r.value), `${r.box}/${r.id}`).toBe(true)
    const dump = JSON.stringify(rows.map((r) => r.value))
    for (const secret of ['test-secret-body', 'test-secret-inbox', 'displayName', 'onboardingDone']) expect(dump).not.toContain(secret)
    raw.close()
    // the registry holds no secrets either
    const regs = JSON.stringify([...(vault as unknown as { kv: KeyValue & { m: Map<string, string> } }).kv.m.values()])
    expect(regs).not.toContain('test password 1')
    expect(regs).not.toContain(prep.recoveryCode)
  })

  it('a failed copy leaves the plain DB untouched and registers nothing', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await countsOf(repo)
    await repo.close()
    const kv = mkKv()
    const vault = new Vault(kv, 1000)
    const prep = await vault.prepare({ name: 'test', username: 'test.user', password: 'test password 1' })
    // sabotage: a key that cannot encrypt (a decrypt-only key) makes the copy fail halfway
    const bad = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    await expect(vault.enableWithExisting({ ...prep, key: bad }, plain)).rejects.toBeInstanceOf(VaultError)
    expect(vault.enabled).toBe(false)
    expect(kv.m.size).toBe(0)
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    const again = new DexieLifeRepository(plain)
    await again.open()
    // the safety backup was taken before the copy failed (+1 backup); nothing else changed
    expect(await countsOf(again)).toEqual({ ...before, backups: before.backups + 1 })
    await again.close()
  })

  it('turning the lock off decrypts back with identical records', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kvOff = mkKv()
    const vault = new Vault(kvOff, 1000)
    const prep = await vault.prepare({ name: 'test', username: 'test.user', password: 'test password 1' })
    const { session } = await vault.enableWithExisting(prep, plain)
    const locked = await countsOf(session.repo)
    await vault.disableLock(session, plain)
    expect(vault.enabled).toBe(false)
    // the retired encrypted DB is kept for this launch (a killed browser may not have flushed the registry removal) …
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
    // … and removed by the next launch, once the registry is provably gone
    await new Vault(kvOff, 1000).recover()
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    const back = new DexieLifeRepository(plain)
    await back.open()
    expect(await countsOf(back)).toEqual(locked)
    expect((await back.read('notes', 'n_test'))?.['body']).toBe('test-secret-body')
    await back.close()
  })
})

describe('profiles are isolated and unlock is calm', () => {
  it('second profile has its own DB/password/data; wrong credentials never open; delay escalates; recovery works', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const vault = new Vault(kv, 1000)
    const p1 = await vault.prepare({ name: 'test', username: 'test.one', password: 'test password 1' })
    const s1 = (await vault.enableWithExisting(p1, plain)).session
    const p2 = await vault.prepare({ name: 'test two', username: 'test.two', password: 'test password 2' })
    const s2 = await vault.addProfile(p2)
    expect(p2.profile.dbName).not.toBe(p1.profile.dbName)
    await s2.repo.write('notes', 'only_in_two', { id: 'only_in_two', title: 'test' })
    expect(await s1.repo.read('notes', 'only_in_two')).toBeNull()
    expect((await s2.repo.readEntries('notes')).length).toBe(1)
    // duplicate username is refused (case-insensitive)
    await expect(vault.prepare({ name: 'x', username: 'TEST.one', password: 'test password 3' })).rejects.toMatchObject({ code: 'username-taken' })
    await s1.repo.close()
    await s2.repo.close()

    // profile 2's key cannot read profile 1's rows (cross-profile read fails closed)
    const cross = new DexieLifeRepository(p1.profile.dbName, (await import('../../src/domain/vault')).makeRowCipher(s2.key))
    await cross.open()
    // fails closed: nothing is returned, every row is reported as quarantined (never silently ignored)
    expect(await cross.readAll('notes')).toEqual([])
    expect(cross.quarantined().length).toBeGreaterThan(0)
    expect(cross.quarantined().every((q) => q.reason === 'tamper')).toBe(true)
    await cross.close()

    // wrong password / wrong username: same answer; 5th wrong triggers the delay; right password blocked during the wait
    const t0 = 10_000_000
    for (let i = 1; i <= 4; i++) {
      const r = await vault.unlock(p1.profile.id, 'test.one', 'bad password', t0)
      expect(r).toMatchObject({ ok: false, reason: 'wrong', retryAt: 0, failures: i })
    }
    const fifth = await vault.unlock(p1.profile.id, 'someone.else', 'test password 1', t0) // right pw, wrong username
    expect(fifth).toMatchObject({ ok: false, reason: 'wrong', failures: 5, retryAt: t0 + 30_000 })
    const blocked = await vault.unlock(p1.profile.id, 'test.one', 'test password 1', t0 + 5_000)
    expect(blocked).toMatchObject({ ok: false, reason: 'wait' })
    // the delay survives a reload of the registry
    const reloaded = new Vault(kv, 1000)
    expect(reloaded.waitSeconds(p1.profile.id, t0 + 10_000)).toBe(20)
    const ok = await reloaded.unlock(p1.profile.id, ' Test.One ', 'test password 1', t0 + 31_000)
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect((await ok.session.repo.read('notes', 'n_test'))?.['body']).toBe('test-secret-body')
      await ok.session.repo.close()
    }
    expect(reloaded.waitSeconds(p1.profile.id, t0 + 31_000)).toBe(0)

    // forgot password → recovery code → new password; data intact; old password & old code dead
    const reset = await reloaded.resetWithRecovery(p1.profile.id, p1.recoveryCode, 'test new password')
    expect(reset).not.toBeNull()
    expect((await reset!.session.repo.read('notes', 'n_test'))?.['body']).toBe('test-secret-body')
    await reset!.session.repo.close()
    expect(await reloaded.resetWithRecovery(p1.profile.id, p1.recoveryCode, 'test another one')).toBeNull()
    expect((await reloaded.unlock(p1.profile.id, 'test.one', 'test password 1')).ok).toBe(false)
    const again = await reloaded.unlock(p1.profile.id, 'test.one', 'test new password')
    expect(again.ok).toBe(true)
    if (again.ok) await again.session.repo.close()

    // delete profile 2: its DB is gone, profile 1 untouched; deleting the last one turns the lock off
    expect(await reloaded.deleteProfile(p2.profile.id)).toBe(false)
    // wiped now; the empty shell (header only) is removed by the next launch's recover()
    expect(await new DexieLifeRepository(p2.profile.dbName).readEntries('habits')).toEqual([])
    expect(await databaseExists(p1.profile.dbName)).toBe(true)
    expect(await reloaded.deleteProfile(p1.profile.id)).toBe(true)
    expect(reloaded.enabled).toBe(false)
    expect(kv.m.size).toBe(0)
  })

  it('changing the password and rotating the recovery code keep data readable', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const vault = new Vault(mkKv(), 1000)
    const p = await vault.prepare({ name: 'test', username: 'test.one', password: 'test password 1' })
    const s = (await vault.enableWithExisting(p, plain)).session
    await s.repo.close()
    expect(await vault.changePassword(p.profile.id, 'wrong one', 'test password 2')).toBe(false)
    expect(await vault.changePassword(p.profile.id, 'test password 1', 'test password 2')).toBe(true)
    expect((await vault.unlock(p.profile.id, 'test.one', 'test password 1')).ok).toBe(false)
    const rot = await vault.prepareNewRecovery(p.profile.id, 'test password 2')
    expect(rot).not.toBeNull()
    // not committed yet → the old code still works
    expect(await vault.checkRecovery(p.profile.id, p.recoveryCode)).toBe(true)
    await rot!.commit()
    expect(await vault.checkRecovery(p.profile.id, p.recoveryCode)).toBe(false)
    expect(await vault.checkRecovery(p.profile.id, rot!.recoveryCode)).toBe(true)
    const u = await vault.unlock(p.profile.id, 'test.one', 'test password 2')
    expect(u.ok).toBe(true)
    if (u.ok) {
      expect((await u.session.repo.read('notes', 'n_test'))?.['body']).toBe('test-secret-body')
      await u.session.repo.close()
    }
  })
})
