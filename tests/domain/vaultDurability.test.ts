import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { DexieLifeRepository, buildStarterProfile } from '../../src/domain'
import {
  SimulatedCrash, Vault, canonical, databaseExists, kPlainDbName, type KeyValue,
} from '../../src/domain/vault'
import { library, mon } from './helpers'

/**
 * Deterministic crash injection for the lock migrations. A "crash" = the fault hook throws SimulatedCrash at a named step;
 * from then on that Vault instance cannot touch storage (a dead process writes nothing). The next "launch" is a fresh Vault,
 * with the registry (localStorage) either surviving or LOST (the real failure: a browser kill before localStorage was flushed).
 * Invariant after every step: her data is reachable — through the untouched plain DB (lock still off) or by unlocking the vault
 * with the credentials she typed.
 */
const mkKv = (): KeyValue & { m: Map<string, string> } => {
  const m = new Map<string, string>()
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
let n = 0
const plainName = () => `dur_plain_${n++}`
const PW = 'test password 1'
// one origin = one IndexedDB: every test starts from an empty browser profile (recover() scans all profile databases)
beforeEach(async () => {
  for (const name of await Dexie.getDatabaseNames()) await Dexie.delete(name)
})
const USER_BOXES = ['habits', 'notes', 'inbox', 'later', 'tasks'] as const

async function plainDb(name: string) {
  const repo = new DexieLifeRepository(name)
  await repo.open()
  await repo.seed({ library, profile: buildStarterProfile(library, mon) })
  await repo.write('notes', 'n_test', { id: 'n_test', title: 'test', body: 'test-secret-body', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
  await repo.write('inbox', 'i_test', { id: 'i_test', text: 'test-secret-inbox' })
  return repo
}
type Snap = Record<string, [string, unknown][]>
const snapOf = async (r: DexieLifeRepository): Promise<Snap> => {
  const o: Snap = {}
  for (const b of USER_BOXES) o[b] = (await r.readEntries(b)).sort(([a], [c]) => (a < c ? -1 : 1))
  return o
}
const sameData = (a: Snap, b: Snap) => canonical(a) === canonical(b)

const crashAt = (step: string) => ({ step: (name: string) => { if (name === step) throw new SimulatedCrash(name) } })
const reachable = async (kv: KeyValue, plain: string, before: Snap, creds: { user: string; pw: string }[], profileId?: string) => {
  const v = new Vault(kv, 1000)
  await v.recover()
  if (!v.enabled) {
    expect(await databaseExists(plain), 'lock off => plain DB must still hold her data').toBe(true)
    const r = new DexieLifeRepository(plain)
    await r.open()
    expect(sameData(await snapOf(r), before)).toBe(true)
    await r.close()
    return { vault: v, via: 'plain' as const }
  }
  const id = profileId ?? v.profiles[0]!.id
  for (const c of creds) {
    const u = await v.unlock(id, c.user, c.pw)
    if (u.ok) {
      const ok = sameData(await snapOf(u.session.repo), before)
      await u.session.repo.close()
      expect(ok, 'vault opens but data differs').toBe(true)
      await v.settled()
      return { vault: v, via: 'vault' as const }
    }
  }
  throw new Error('data unreachable: neither the plain DB nor any credential opens the vault')
}

describe('D1 — enabling the lock never loses data, whatever step the process dies at', () => {
  const steps = ['enable:start', 'enable:afterBackup', 'enable:afterCopy', 'enable:afterHeader', 'enable:afterRegistry', 'enable:afterVerify']
  for (const step of steps) {
    for (const keep of [true, false]) {
      it(`crash at ${step}, registry ${keep ? 'survives' : 'LOST'}`, async () => {
        const plain = plainName()
        const repo = await plainDb(plain)
        const before = await snapOf(repo)
        await repo.close()
        const kv = mkKv()
        const v1 = new Vault(kv, 1000, { hooks: crashAt(step) })
        const prep = await v1.prepare({ name: 'test', username: 'test.user', password: PW })
        await expect(v1.enableWithExisting(prep, plain)).rejects.toBeInstanceOf(SimulatedCrash)
        const res = await reachable(keep ? kv : mkKv(), plain, before, [{ user: 'test.user', pw: PW }])
        // once the header is durable the vault must be recoverable even without the registry
        if (!['enable:start', 'enable:afterBackup', 'enable:afterCopy'].includes(step)) expect(res.via).toBe('vault')
        // and the plain database is never gone while the vault is unproven
        // (a later launch whose registry survived finalizes after a real unlock — by design)
        if (!keep || ['enable:start', 'enable:afterBackup', 'enable:afterCopy', 'enable:afterHeader'].includes(step)) expect(await databaseExists(plain)).toBe(true)
      })
    }
  }

  it('the plain DB is deleted only by a real unlock on a LATER launch — never in the launch that enabled the lock', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await snapOf(repo)
    await repo.close()
    const kv = mkKv()
    const v1 = new Vault(kv, 1000)
    const prep = await v1.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v1.enableWithExisting(prep, plain)
    await session.repo.close()
    // lock + unlock inside the same launch does not count
    const again = await v1.unlock(prep.profile.id, 'test.user', PW)
    expect(again.ok).toBe(true)
    if (again.ok) await again.session.repo.close()
    await v1.settled()
    expect(await databaseExists(plain)).toBe(true)
    // a wrong password on the next launch does not count either
    const v2 = new Vault(kv, 1000)
    expect((await v2.unlock(prep.profile.id, 'test.user', 'wrong password')).ok).toBe(false)
    await v2.settled()
    expect(await databaseExists(plain)).toBe(true)
    // the real unlock does
    const u = await v2.unlock(prep.profile.id, 'test.user', PW)
    expect(u.ok).toBe(true)
    await v2.settled()
    expect(await databaseExists(plain)).toBe(false)
    expect(v2.rollback).toBeNull()
    if (u.ok) {
      expect(sameData(await snapOf(u.session.repo), before)).toBe(true)
      await u.session.repo.close()
    }
    expect(new Vault(kv, 1000).rollback).toBeNull()
  })

  for (const step of ['finalize:beforeDelete', 'finalize:afterDelete']) {
    for (const keep of [true, false]) {
      it(`crash at ${step} while finalizing, registry ${keep ? 'survives' : 'LOST'}`, async () => {
        const plain = plainName()
        const repo = await plainDb(plain)
        const before = await snapOf(repo)
        await repo.close()
        const kv = mkKv()
        const v1 = new Vault(kv, 1000)
        const prep = await v1.prepare({ name: 'test', username: 'test.user', password: PW })
        await (await v1.enableWithExisting(prep, plain)).session.repo.close()
        const v2 = new Vault(kv, 1000, { hooks: crashAt(step) })
        const u = await v2.unlock(prep.profile.id, 'test.user', PW)
        if (u.ok) await u.session.repo.close()
        await v2.settled()
        const res = await reachable(keep ? kv : mkKv(), plain, before, [{ user: 'test.user', pw: PW }])
        expect(res.via).toBe('vault')
      })
    }
  }

  it('the registry is lost right after «حفظته» with the plain DB still there: the vault is rebuilt from its own header', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await snapOf(repo)
    await repo.close()
    const kv = mkKv()
    const v1 = new Vault(kv, 1000)
    const prep = await v1.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v1.enableWithExisting(prep, plain)
    await session.repo.write('inbox', 'i_after', { id: 'i_after', text: 'test' }) // work done after enabling
    await session.repo.close()
    const lost = new Vault(mkKv(), 1000)
    expect(lost.enabled).toBe(false)
    expect((await lost.recover()).rebuilt).toBe(1)
    expect(lost.enabled).toBe(true)
    expect(lost.profiles[0]).toMatchObject({ id: prep.profile.id, username: 'test.user', name: 'test' })
    expect(lost.rollback?.dbName).toBe(plain) // the rollback is remembered again, to be finalized after a real unlock
    const u = await lost.unlock(prep.profile.id, 'test.user', PW)
    expect(u.ok).toBe(true)
    if (u.ok) {
      expect((await u.session.repo.read('inbox', 'i_after'))?.['text']).toBe('test')
      const now = await snapOf(u.session.repo)
      expect(now.notes).toEqual(before.notes)
      await u.session.repo.close()
    }
  })

  it('a failed verification undoes only what was created and leaves the plain DB and registry untouched', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await snapOf(repo)
    await repo.close()
    const kv = mkKv()
    const v = new Vault(kv, 1000, { hooks: { step: (name) => { if (name === 'enable:afterRegistry') throw new Error('disk full') } } })
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await expect(v.enableWithExisting(prep, plain)).rejects.toMatchObject({ code: 'migration-failed' })
    expect(v.enabled).toBe(false)
    expect(kv.m.size).toBe(0)
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    const r = new DexieLifeRepository(plain)
    await r.open()
    expect(sameData(await snapOf(r), before)).toBe(true)
    await r.close()
  })
})

describe('D1 — change password / new recovery code / add profile are crash-safe too', () => {
  async function enabled() {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const v = new Vault(kv, 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v.enableWithExisting(prep, plain)
    const before = await snapOf(session.repo)
    await session.repo.close()
    // finalize on a later launch so the rollback is out of the picture here
    const boot = new Vault(kv, 1000)
    const u = await boot.unlock(prep.profile.id, 'test.user', PW)
    if (u.ok) await u.session.repo.close()
    await boot.settled()
    return { plain, kv, prep, before }
  }
  for (const step of ['password:afterHeader', 'password:afterRegistry']) {
    for (const keep of [true, false]) {
      it(`change password: crash at ${step}, registry ${keep ? 'survives' : 'LOST'} — the old or the new password opens it, data intact`, async () => {
        const { plain, kv, prep, before } = await enabled()
        const v = new Vault(kv, 1000, { hooks: crashAt(step) })
        await expect(v.changePassword(prep.profile.id, PW, 'test password 2')).rejects.toBeInstanceOf(SimulatedCrash)
        await reachable(keep ? kv : mkKv(), plain, before, [{ user: 'test.user', pw: 'test password 2' }, { user: 'test.user', pw: PW }])
      })
    }
  }
  for (const step of ['recovery:afterHeader', 'recovery:afterRegistry']) {
    it(`new recovery code: crash at ${step} — the password still opens it and data is intact`, async () => {
      const { plain, kv, prep, before } = await enabled()
      const v = new Vault(kv, 1000, { hooks: crashAt(step) })
      const r = await v.prepareNewRecovery(prep.profile.id, PW)
      await expect(r!.commit()).rejects.toBeInstanceOf(SimulatedCrash)
      await reachable(mkKv(), plain, before, [{ user: 'test.user', pw: PW }])
    })
  }
  for (const step of ['profile:afterHeader', 'profile:afterRegistry']) {
    for (const keep of [true, false]) {
      it(`add profile: crash at ${step}, registry ${keep ? 'survives' : 'LOST'} — both profiles open`, async () => {
        const { plain, kv, prep, before } = await enabled()
        const v = new Vault(kv, 1000, { hooks: crashAt(step) })
        const p2 = await v.prepare({ name: 'test two', username: 'test.two', password: 'test password 2' })
        await expect(v.addProfile(p2)).rejects.toBeInstanceOf(SimulatedCrash)
        const k2 = keep ? kv : mkKv()
        await reachable(k2, plain, before, [{ user: 'test.user', pw: PW }], prep.profile.id)
        const again = new Vault(k2, 1000)
        await again.recover()
        expect(again.profiles.map((p) => p.username).sort()).toEqual(['test.two', 'test.user'])
        const u2 = await again.unlock(p2.profile.id, 'test.two', 'test password 2')
        expect(u2.ok).toBe(true)
        if (u2.ok) await u2.session.repo.close()
      })
    }
  }
  it('a failed add-profile (storage error before the registry write) removes only the new empty database', async () => {
    const { kv, prep } = await enabled()
    const v = new Vault(kv, 1000, { hooks: { step: (n) => { if (n === 'profile:afterHeader') throw new Error('quota') } } })
    const p2 = await v.prepare({ name: 'test two', username: 'test.two', password: 'test password 2' })
    await expect(v.addProfile(p2)).rejects.toThrow('quota')
    expect(await databaseExists(p2.profile.dbName)).toBe(false)
    expect(v.profiles).toHaveLength(1)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
  })
  for (const step of ['off:afterCopy', 'off:afterMark', 'off:afterRegistry']) {
    for (const keep of [true, false]) {
      it(`turn off: crash at ${step}, registry ${keep ? 'survives' : 'LOST'} — data reachable, the lock does not come back from a header`, async () => {
        const { plain, kv, prep, before } = await enabled()
        const v = new Vault(kv, 1000, { hooks: crashAt(step) })
        const u = await v.unlock(prep.profile.id, 'test.user', PW)
        expect(u.ok).toBe(true)
        if (!u.ok) return
        await expect(v.disableLock(u.session, plain)).rejects.toBeInstanceOf(SimulatedCrash)
        await u.session.repo.close()
        const res = await reachable(keep ? kv : mkKv(), plain, before, [{ user: 'test.user', pw: PW }])
        if (step !== 'off:afterCopy') expect(res.via).toBe('plain') // retired header: the turn-off is completed, not undone
      })
    }
  }
  for (const step of ['delete:afterMark', 'delete:afterRegistry']) {
    it(`delete profile: crash at ${step} — the deletion is finished at the next launch, the other profile is untouched`, async () => {
      const { plain, kv, prep } = await enabled()
      const v0 = new Vault(kv, 1000)
      const p2 = await v0.prepare({ name: 'test two', username: 'test.two', password: 'test password 2' })
      await (await v0.addProfile(p2)).repo.close()
      const v = new Vault(kv, 1000, { hooks: crashAt(step) })
      await expect(v.deleteProfile(p2.profile.id)).rejects.toBeInstanceOf(SimulatedCrash)
      const next = new Vault(kv, 1000)
      await next.recover()
      expect(next.profiles.map((p) => p.id)).toEqual([prep.profile.id])
      // the emptied shell is removed one launch later (never in the launch that finished the registry)
      await new Vault(kv, 1000).recover()
      expect(await databaseExists(p2.profile.dbName)).toBe(false)
      expect(await databaseExists(prep.profile.dbName)).toBe(true)
      void plain
    })
  }
})

/**
 * Release-gate-4 N1/N2/N3. localStorage (the registry) is flushed lazily, so a SIGKILL can lose the LAST registry write while
 * every IndexedDB step before it survived. "registry LOST" below = the launch sees the registry exactly as it was BEFORE the
 * operation, with all of the operation's IndexedDB work done.
 */
describe('G4 — turn lock off: a lost registry removal never orphans or overwrites her data (N1)', () => {
  async function ready(plainDefault = false) {
    const plain = plainDefault ? kPlainDbName : plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const v = new Vault(kv, 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v.enableWithExisting(prep, plain)
    const before = await snapOf(session.repo)
    await session.repo.close()
    const boot = new Vault(kv, 1000)
    const u = await boot.unlock(prep.profile.id, 'test.user', PW)
    if (u.ok) await u.session.repo.close()
    await boot.settled()
    expect(await databaseExists(plain)).toBe(false) // finalized: the encrypted DB is the only copy now
    return { plain, kv, prep, before }
  }
  const steps = ['off:start', 'off:afterCopy', 'off:afterMark', 'off:afterRegistry', 'complete']
  for (const step of steps) {
    for (const lost of [false, true]) {
      it(`kill at ${step}, registry ${lost ? 'LOST (still says locked)' : 'removal survives'} — plain data opens, nothing is overwritten`, async () => {
        const { plain, kv, prep, before } = await ready()
        const lockedRegistry = new Map(kv.m)
        const v = new Vault(kv, 1000, step === 'complete' ? {} : { hooks: crashAt(step) })
        const u = await v.unlock(prep.profile.id, 'test.user', PW)
        expect(u.ok).toBe(true)
        if (!u.ok) return
        if (step === 'complete') await v.disableLock(u.session, plain)
        else await expect(v.disableLock(u.session, plain)).rejects.toBeInstanceOf(SimulatedCrash)
        await u.session.repo.close()
        const kv2 = mkKv()
        for (const [k, val] of lost ? lockedRegistry : kv.m) kv2.m.set(k, val)
        // launch 1 and launch 2 (both may be killed again: run them with the same registry copy each time)
        const done = ['off:afterMark', 'off:afterRegistry', 'complete'].includes(step)
        const l1 = new Vault(mkKv2(kv2), 1000)
        await l1.recover()
        if (done) {
          expect(l1.enabled, 'turn-off was durable: the lock must be off').toBe(false)
          const r = new DexieLifeRepository(plain)
          await r.open()
          expect(sameData(await snapOf(r), before)).toBe(true)
          await r.close()
        } else {
          // not durable yet: still locked, old password opens the SAME data
          const res = await reachable(kv2, plain, before, [{ user: 'test.user', pw: PW }])
          expect(res.via).toBe('vault')
        }
        // simulate: launch 1 is killed again before ITS registry change reaches disk (registry copy = the lost one)
        if (lost && done) {
          const kv3 = mkKv()
          for (const [k, val] of lockedRegistry) kv3.m.set(k, val)
          const l2 = new Vault(kv3, 1000)
          await l2.recover()
          const l3 = new Vault(kv3, 1000)
          await l3.recover()
          expect(l3.enabled).toBe(false)
          const r = new DexieLifeRepository(plain)
          await r.open()
          expect(sameData(await snapOf(r), before)).toBe(true)
          await r.close()
        }
      })
    }
  }
  it('the encrypted DB survives the launch that turned the lock off and is removed by a later one', async () => {
    const { plain, kv, prep, before } = await ready()
    const v = new Vault(kv, 1000)
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    if (!u.ok) throw new Error('unlock')
    await v.disableLock(u.session, plain)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
    const l1 = new Vault(kv, 1000)
    await l1.recover()
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    const r = new DexieLifeRepository(plain)
    await r.open()
    expect(sameData(await snapOf(r), before)).toBe(true)
    await r.close()
  })
  it('a retired encrypted DB is NOT finished or deleted when the plain copy is missing (the encrypted one is then the only copy)', async () => {
    const { plain, kv, prep } = await ready()
    const v = new Vault(kv, 1000)
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    if (!u.ok) throw new Error('unlock')
    await v.disableLock(u.session, plain)
    await Dexie.delete(plain)
    const l1 = new Vault(kv, 1000)
    await l1.recover()
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
  })
  it('state left by the old build (registry locked, profile DB gone, plain DB holds her data): recover drops the lock; unlock never opens an empty profile', async () => {
    const { plain, kv, prep, before } = await ready(true)
    const v = new Vault(kv, 1000)
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    if (!u.ok) throw new Error('unlock')
    const lockedRegistry = new Map(kv.m)
    await v.disableLock(u.session, plain)
    await Dexie.delete(prep.profile.dbName) // what the old build did before the kill
    const kv2 = mkKv()
    for (const [k, val] of lockedRegistry) kv2.m.set(k, val)
    // without recover(): the right password must NOT create/open a new empty profile
    const raw = new Vault(kv2, 1000)
    const res = await raw.unlock(prep.profile.id, 'test.user', PW)
    expect(res.ok).toBe(false)
    expect(!res.ok && res.reason).toBe('missing')
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    // with recover(): the lock is dropped and the plain data is what opens
    const l1 = new Vault(kv2, 1000)
    await l1.recover()
    expect(l1.enabled).toBe(false)
    const r = new DexieLifeRepository(plain)
    await r.open()
    expect(sameData(await snapOf(r), before)).toBe(true)
    await r.close()
  })
  it('a locked profile whose DB is missing and NO plain DB exists is left as it is (nothing invented), unlock reports it', async () => {
    const { plain, kv, prep } = await ready()
    await Dexie.delete(prep.profile.dbName)
    await Dexie.delete(plain)
    const v = new Vault(kv, 1000)
    await v.recover()
    expect(v.enabled).toBe(true)
    const res = await v.unlock(prep.profile.id, 'test.user', PW)
    expect(!res.ok && res.reason).toBe('missing')
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
  })
  it('turning the lock off never silently overwrites unexpected plain data: it is copied aside first', async () => {
    const { plain, kv, prep } = await ready()
    // an orphan plain DB with data (not this profile's rollback copy)
    const orphan = new DexieLifeRepository(plain)
    await orphan.open()
    await orphan.seed({ library, profile: buildStarterProfile(library, mon) })
    await orphan.write('notes', 'n_orphan', { id: 'n_orphan', title: 'test', body: 'test-orphan-body', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
    await orphan.close()
    const v = new Vault(kv, 1000)
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    if (!u.ok) throw new Error('unlock')
    await v.disableLock(u.session, plain)
    const bak = (await Dexie.getDatabaseNames()).filter((n) => n.startsWith(`${plain}_bak_`))
    expect(bak).toHaveLength(1)
    const b = new DexieLifeRepository(bak[0]!)
    await b.open()
    expect((await b.read('notes', 'n_orphan'))?.['body']).toBe('test-orphan-body')
    await b.close()
  })
  it('a turn-off whose retired mark cannot be proven aborts BEFORE the registry is touched', async () => {
    const { plain, kv, prep } = await ready()
    const v = new Vault(kv, 1000, { hooks: { step: (n) => { if (n === 'off:afterCopy') throw new Error('quota') } } })
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    if (!u.ok) throw new Error('unlock')
    await expect(v.disableLock(u.session, plain)).rejects.toThrow()
    expect(new Vault(kv, 1000).enabled).toBe(true)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
  })
})

function mkKv2(src: KeyValue & { m: Map<string, string> }): KeyValue {
  return src
}

describe('G4 — delete profile: a lost registry write never leaves a ghost (N2)', () => {
  async function two() {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const v = new Vault(kv, 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v.enableWithExisting(prep, plain)
    const before = await snapOf(session.repo)
    await session.repo.close()
    const boot = new Vault(kv, 1000)
    const u = await boot.unlock(prep.profile.id, 'test.user', PW)
    if (u.ok) await u.session.repo.close()
    await boot.settled()
    const p2 = await boot.prepare({ name: 'test two', username: 'test.two', password: 'test password 2' })
    const s2 = await boot.addProfile(p2)
    await s2.repo.write('notes', 'n_two', { id: 'n_two', title: 'test', body: 'test-two-body', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
    await s2.repo.close()
    return { plain, kv, prep, p2, before }
  }
  const steps = ['delete:afterMark', 'delete:afterRegistry', 'delete:afterLegacy', 'delete:afterWipe', 'complete']
  for (const step of steps) {
    for (const lost of [false, true]) {
      it(`kill at ${step}, registry ${lost ? 'LOST (still lists the deleted profile)' : 'survives'} — no ghost, the other profile intact`, async () => {
        const { kv, prep, p2, before } = await two()
        const withBoth = new Map(kv.m)
        const v = new Vault(kv, 1000, step === 'complete' ? {} : { hooks: crashAt(step) })
        if (step === 'complete') await v.deleteProfile(p2.profile.id)
        else await expect(v.deleteProfile(p2.profile.id)).rejects.toBeInstanceOf(SimulatedCrash)
        const kv2 = mkKv()
        for (const [k, val] of lost ? withBoth : kv.m) kv2.m.set(k, val)
        for (let launch = 1; launch <= 4; launch++) {
          const l = new Vault(kv2, 1000)
          await l.recover()
          expect(l.profiles.map((p) => p.id), `launch ${launch}`).toEqual([prep.profile.id])
          const ghost = await l.unlock(p2.profile.id, 'test.two', 'test password 2')
          expect(ghost.ok).toBe(false)
          // a ghost registry copy lost AGAIN before launch 2 (kill right after recover): still no empty profile appears
          if (lost && launch === 1) {
            kv2.m.clear()
            for (const [k, val] of withBoth) kv2.m.set(k, val)
          }
        }
        expect(await databaseExists(p2.profile.dbName), 'the shell is gone after the later launch').toBe(false)
        const l = new Vault(kv2, 1000)
        await l.recover()
        const u = await l.unlock(prep.profile.id, 'test.user', PW)
        expect(u.ok).toBe(true)
        if (u.ok) {
          expect(sameData(await snapOf(u.session.repo), before)).toBe(true)
          await u.session.repo.close()
        }
      })
    }
  }
  it('delete aborts (nothing removed) when the tombstone cannot be written', async () => {
    const { kv, prep, p2 } = await two()
    const v = new Vault(kv, 1000)
    const spy = (await import('../../src/domain/storage')).DexieLifeRepository.prototype
    const orig = spy.writeHeader
    spy.writeHeader = async () => { throw new Error('quota') }
    try {
      await expect(v.deleteProfile(p2.profile.id)).rejects.toThrow('quota')
    } finally {
      spy.writeHeader = orig
    }
    expect(v.profiles.map((p) => p.id).sort()).toEqual([prep.profile.id, p2.profile.id].sort())
    expect(await databaseExists(p2.profile.dbName)).toBe(true)
  })
  it('deleting the LAST profile with the registry removal lost: no ghost, the app starts as a fresh plain app', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const v = new Vault(kv, 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await (await v.enableWithExisting(prep, plain)).session.repo.close()
    const locked = new Map(kv.m)
    expect(await v.deleteProfile(prep.profile.id)).toBe(true)
    for (let i = 0; i < 2; i++) {
      const kv2 = mkKv()
      for (const [k, val] of locked) kv2.m.set(k, val)
      const l = new Vault(kv2, 1000)
      await l.recover()
      expect(l.enabled).toBe(false)
    }
    expect(await databaseExists(plain)).toBe(false)
  })
})

describe('G4 — an abandoned half-created vault is cleaned only when provably unreferenced and old (N3)', () => {
  it('kill right after the marker: kept while young (another tab may be copying), removed once stale; the plain data is never touched', async () => {
    const plain = plainName()
    const repo = await plainDb(plain)
    const before = await snapOf(repo)
    await repo.close()
    const kv = mkKv()
    const v = new Vault(kv, 1000, { hooks: crashAt('enable:afterCopy') })
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await expect(v.enableWithExisting(prep, plain)).rejects.toBeInstanceOf(SimulatedCrash)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
    const young = new Vault(mkKv(), 1000)
    await young.recover(Date.now() + 5 * 60_000)
    expect(await databaseExists(prep.profile.dbName), 'younger than the stale limit').toBe(true)
    expect(young.enabled).toBe(false)
    const old = new Vault(mkKv(), 1000)
    await old.recover(Date.now() + 11 * 60_000)
    expect(await databaseExists(prep.profile.dbName)).toBe(false)
    const r = new DexieLifeRepository(plain)
    await r.open()
    expect(sameData(await snapOf(r), before)).toBe(true)
    await r.close()
  })
  it('never removed when the registry references it, or when the plain source is gone', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const v = new Vault(mkKv(), 1000, { hooks: crashAt('enable:afterCopy') })
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await expect(v.enableWithExisting(prep, plain)).rejects.toBeInstanceOf(SimulatedCrash)
    await Dexie.delete(plain)
    await new Vault(mkKv(), 1000).recover(Date.now() + 60 * 60_000)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
  })
  it('a vault whose header already replaced the marker (kill after enable:afterHeader) is rebuilt, never deleted', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const v = new Vault(mkKv(), 1000, { hooks: crashAt('enable:afterHeader') })
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await expect(v.enableWithExisting(prep, plain)).rejects.toBeInstanceOf(SimulatedCrash)
    const l = new Vault(mkKv(), 1000)
    await l.recover(Date.now() + 60 * 60_000)
    expect(l.enabled).toBe(true)
    expect(await databaseExists(prep.profile.dbName)).toBe(true)
  })
})

describe('D1 — profiles created before headers existed get one at the next launch', () => {
  it('recover() writes the missing header and then survives a lost registry', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const v = new Vault(kv, 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    await (await v.enableWithExisting(prep, plain)).session.repo.close()
    // simulate an old install: wipe the header table
    const raw = new Dexie(prep.profile.dbName)
    await raw.open()
    await raw.table('vault').clear()
    raw.close()
    expect(await new Vault(mkKv(), 1000).recover()).toEqual({ rebuilt: 0 })
    await new Vault(kv, 1000).recover()
    const lost = new Vault(mkKv(), 1000)
    expect((await lost.recover()).rebuilt).toBe(1)
    expect(lost.profiles[0]?.username).toBe('test.user')
  })
})

describe('D3 — versioned registry: a stale tab cannot revert another tab', () => {
  it('tab B (stale) saving a setting keeps tab A\'s password change; the old password stays dead', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const tabA = new Vault(kv, 1000)
    const prep = await tabA.prepare({ name: 'test', username: 'test.user', password: PW })
    await (await tabA.enableWithExisting(prep, plain)).session.repo.close()
    const tabB = new Vault(kv, 1000) // loaded before A's change
    const revBefore = tabB.revision
    expect(await tabA.changePassword(prep.profile.id, PW, 'test password 2')).toBe(true)
    expect(tabA.revision).toBeGreaterThan(revBefore)
    tabB.setAutoLock('min5') // any registry write from the stale tab
    tabB.updateProfile(prep.profile.id, { name: 'test renamed' })
    const fresh = new Vault(kv, 1000)
    expect(fresh.autoLock).toBe('min5')
    expect(fresh.profiles[0]?.name).toBe('test renamed')
    expect((await fresh.unlock(prep.profile.id, 'test.user', PW)).ok).toBe(false)
    const ok = await fresh.unlock(prep.profile.id, 'test.user', 'test password 2')
    expect(ok.ok).toBe(true)
    if (ok.ok) await ok.session.repo.close()
  })
  it('a stale tab changing the password re-checks the current password against the newer state instead of overwriting it', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const kv = mkKv()
    const tabA = new Vault(kv, 1000)
    const prep = await tabA.prepare({ name: 'test', username: 'test.user', password: PW })
    await (await tabA.enableWithExisting(prep, plain)).session.repo.close()
    const tabB = new Vault(kv, 1000)
    expect(await tabA.changePassword(prep.profile.id, PW, 'test password 2')).toBe(true)
    // B still believes the password is PW: it must be refused, not silently revert A's change
    expect(await tabB.changePassword(prep.profile.id, PW, 'test password 3')).toBe(false)
    const fresh = new Vault(kv, 1000)
    expect((await fresh.unlock(prep.profile.id, 'test.user', 'test password 3')).ok).toBe(false)
    const ok = await fresh.unlock(prep.profile.id, 'test.user', 'test password 2')
    expect(ok.ok).toBe(true)
    if (ok.ok) await ok.session.repo.close()
  })
  it('refresh() adopts a newer registry (storage event / BroadcastChannel path) and revisions only go up', async () => {
    const kv = mkKv()
    const plain = plainName()
    await (await plainDb(plain)).close()
    const a = new Vault(kv, 1000)
    const prep = await a.prepare({ name: 'test', username: 'test.user', password: PW })
    await (await a.enableWithExisting(prep, plain)).session.repo.close()
    const b = new Vault(kv, 1000)
    const seen: number[] = []
    b.subscribe(() => seen.push(b.revision))
    a.setAutoLock('immediate')
    expect(b.autoLock).not.toBe('immediate')
    expect(b.refresh()).toBe(true)
    expect(b.autoLock).toBe('immediate')
    expect(b.refresh()).toBe(false)
    a.setAutoLock('min5')
    a.setAutoLock('launch')
    b.refresh()
    expect(seen).toEqual([...seen].sort((x, y) => x - y))
    expect(b.revision).toBe(a.revision)
  })
})

describe('D4 — a damaged record is quarantined and reported; the rest of the profile opens', () => {
  it('a tampered row and a swapped pair are skipped, listed, left on disk; everything else is readable', async () => {
    const plain = plainName()
    await (await plainDb(plain)).close()
    const v = new Vault(mkKv(), 1000)
    const prep = await v.prepare({ name: 'test', username: 'test.user', password: PW })
    const { session } = await v.enableWithExisting(prep, plain)
    await session.repo.write('notes', 'n_two', { id: 'n_two', title: 'test two', body: 'b', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
    const total = (await session.repo.readEntries('notes')).length
    await session.repo.close()
    const raw = new Dexie(prep.profile.dbName)
    await raw.open()
    const t = raw.table('records')
    const row = (await t.get(['notes', 'n_test'])) as { box: string; id: string; value: { ct: string; iv: string; e: number } }
    await t.put({ ...row, value: { ...row.value, ct: row.value.ct.slice(0, -6) + 'AAAAAA' } }) // damaged bytes
    const a = (await t.get(['inbox', 'i_test'])) as { value: unknown } | undefined
    const b = (await t.get(['notes', 'n_two'])) as { value: unknown }
    if (a) await t.put({ box: 'inbox', id: 'i_test', value: b.value }) // a row moved to another address (AAD mismatch)
    raw.close()
    const u = await v.unlock(prep.profile.id, 'test.user', PW)
    expect(u.ok).toBe(true)
    if (!u.ok) return
    const notes = await u.session.repo.readEntries('notes')
    expect(notes.map(([id]) => id)).toEqual(['n_two'])
    expect(notes.length).toBe(total - 1)
    expect(await u.session.repo.readEntries('inbox')).toEqual([])
    expect((await u.session.repo.readEntries('domains')).length).toBeGreaterThan(0)
    const bad = u.session.repo.quarantined()
    expect(bad.map((q) => `${q.box}/${q.id}`).sort()).toEqual(['inbox/i_test', 'notes/n_test'])
    expect(bad.every((q) => q.reason === 'tamper')).toBe(true)
    // still on disk, untouched
    const keep = new Dexie(prep.profile.dbName)
    await keep.open()
    expect(await keep.table('records').get(['notes', 'n_test'])).toBeTruthy()
    keep.close()
    await u.session.repo.close()
  })

  it('a record that decrypts but is malformed (codec throws) is quarantined too and the box still loads', async () => {
    const r = new DexieLifeRepository(`dur_codec_${n++}`)
    await r.open()
    await r.seed({ library, profile: buildStarterProfile(library, mon) })
    const good = (await r.habits.all()).length
    await r.write('habits', 'h_bad', { id: 'h_bad', cadence: { nope: 1 }, schedule: 'x', status: 7, createdAt: 3 } as never)
    const all = await r.habits.all()
    expect(all.length).toBeGreaterThanOrEqual(good)
    const q = r.quarantined().filter((x) => x.id === 'h_bad')
    expect(q.length + (all.length - good)).toBe(1) // either tolerated by the codec or reported — never fatal, never silent
    await r.close()
  })
})
