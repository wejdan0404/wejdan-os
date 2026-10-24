import { describe, expect, it } from 'vitest'
import {
  BadSecretError, TamperError, changePasswordEnvelope, createEnvelope, decryptBackup, encryptBackup, formatRecoveryCode,
  isEncryptedBackup, kKdfIterations, kRecoveryAlphabet, newRecoveryCode, normalizeRecoveryCode, openValue,
  resetWithRecoveryEnvelope, rotateRecoveryEnvelope, sealValue, unlockWithPassword, unlockWithRecovery, type KeyEnvelope,
} from '../../src/domain/vault'

const IT = 1000 // fast for tests; the real default is asserted below
const PW = 'test password one'

describe('crypto envelope', () => {
  it('default KDF cost is at least 310k PBKDF2-SHA256 iterations and is recorded in the envelope', async () => {
    expect(kKdfIterations).toBeGreaterThanOrEqual(310_000)
    const { envelope } = await createEnvelope(PW)
    expect(envelope.iterations).toBe(kKdfIterations)
    expect(envelope.kdf).toBe('PBKDF2-SHA256')
  })

  it('the right password unlocks; a wrong one, an empty one and a near-miss do not', async () => {
    const { envelope, key } = await createEnvelope(PW, IT)
    expect(await unlockWithPassword(envelope, PW)).not.toBeNull()
    expect(await unlockWithPassword(envelope, 'wrong password')).toBeNull()
    expect(await unlockWithPassword(envelope, '')).toBeNull()
    expect(await unlockWithPassword(envelope, PW + ' ')).toBeNull()
    expect(key.extractable).toBe(false)
  })

  it('the unlocked data key is non-extractable (cannot be exported from memory)', async () => {
    const { envelope } = await createEnvelope(PW, IT)
    const k = (await unlockWithPassword(envelope, PW))!
    expect(k.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', k)).rejects.toBeTruthy()
  })

  it('the envelope holds no password, no recovery code and no raw key', async () => {
    const { envelope, recoveryCode } = await createEnvelope(PW, IT)
    const s = JSON.stringify(envelope)
    expect(s).not.toContain(PW)
    expect(s).not.toContain(recoveryCode)
    expect(s).not.toContain(formatRecoveryCode(recoveryCode))
  })

  it('the recovery code unlocks the SAME data key (data sealed with the password key opens)', async () => {
    const { envelope, key, recoveryCode } = await createEnvelope(PW, IT)
    const sealed = await sealValue(key, 'notes\u0000n1', { title: 'test' })
    const viaRecovery = (await unlockWithRecovery(envelope, formatRecoveryCode(recoveryCode).toLowerCase()))!
    expect(viaRecovery).not.toBeNull()
    expect(await openValue(viaRecovery, 'notes\u0000n1', sealed)).toEqual({ title: 'test' })
    expect(await unlockWithRecovery(envelope, 'AAAA AAAA AAAA AAAA')).toBeNull()
    expect(await unlockWithRecovery(envelope, 'short')).toBeNull()
  })

  it('changing the password keeps the data readable and retires the old password (no re-encryption)', async () => {
    const { envelope, key } = await createEnvelope(PW, IT)
    const sealed = await sealValue(key, 'notes\u0000n1', { title: 'test' })
    const env2 = (await changePasswordEnvelope(envelope, PW, 'test password two'))!
    expect(env2).not.toBeNull()
    expect(env2.rc).toEqual(envelope.rc) // recovery wrap untouched
    expect(await unlockWithPassword(env2, PW)).toBeNull()
    const k2 = (await unlockWithPassword(env2, 'test password two'))!
    expect(await openValue(k2, 'notes\u0000n1', sealed)).toEqual({ title: 'test' })
    expect(await changePasswordEnvelope(envelope, 'not the password', 'whatever one')).toBeNull()
  })

  it('a new recovery code retires the old one; the password and data are unchanged', async () => {
    const { envelope, key, recoveryCode } = await createEnvelope(PW, IT)
    const sealed = await sealValue(key, 'a\u0000b', { v: 1 })
    const r = (await rotateRecoveryEnvelope(envelope, PW))!
    expect(r.recoveryCode).not.toBe(recoveryCode)
    expect(await unlockWithRecovery(r.envelope, recoveryCode)).toBeNull()
    const k = (await unlockWithRecovery(r.envelope, r.recoveryCode))!
    expect(await openValue(k, 'a\u0000b', sealed)).toEqual({ v: 1 })
    expect(await unlockWithPassword(r.envelope, PW)).not.toBeNull()
    expect(await rotateRecoveryEnvelope(envelope, 'nope nope nope')).toBeNull()
  })

  it('forgot password: recovery code sets a new password + new code, data still opens', async () => {
    const { envelope, key, recoveryCode } = await createEnvelope(PW, IT)
    const sealed = await sealValue(key, 'a\u0000b', { v: 2 })
    const r = (await resetWithRecoveryEnvelope(envelope, recoveryCode, 'test brand new pw'))!
    expect(await unlockWithPassword(r.envelope, PW)).toBeNull()
    expect(await openValue(r.key, 'a\u0000b', sealed)).toEqual({ v: 2 })
    expect(await unlockWithRecovery(r.envelope, recoveryCode)).toBeNull()
    expect(await unlockWithRecovery(r.envelope, r.recoveryCode)).not.toBeNull()
    expect(await resetWithRecoveryEnvelope(envelope, 'AAAA AAAA AAAA AAAA', 'whatever one')).toBeNull()
  })

  it('detects tampering with the envelope (wrapped key, verifier, kdf cost)', async () => {
    const { envelope } = await createEnvelope(PW, IT)
    const flip = (b64: string) => (b64[0] === 'A' ? 'B' : 'A') + b64.slice(1)
    const e1: KeyEnvelope = { ...envelope, pw: { ...envelope.pw, wrapped: flip(envelope.pw.wrapped) } }
    const e2: KeyEnvelope = { ...envelope, verifier: { ...envelope.verifier, ct: flip(envelope.verifier.ct) } }
    const e3: KeyEnvelope = { ...envelope, iterations: envelope.iterations + 1 }
    const e4 = { ...envelope, v: 2 } as unknown as KeyEnvelope
    for (const e of [e1, e2, e3, e4]) expect(await unlockWithPassword(e, PW)).toBeNull()
  })

  it('a sealed record is bound to its row: tampering, or moving it to another row, fails', async () => {
    const { key } = await createEnvelope(PW, IT)
    const s = await sealValue(key, 'notes\u0000n1', { title: 'test' })
    expect(await openValue(key, 'notes\u0000n1', s)).toEqual({ title: 'test' })
    await expect(openValue(key, 'notes\u0000n2', s)).rejects.toBeInstanceOf(TamperError)
    await expect(openValue(key, 'notes\u0000n1', { ...s, ct: (s.ct[0] === 'A' ? 'B' : 'A') + s.ct.slice(1) })).rejects.toBeInstanceOf(TamperError)
    await expect(openValue(key, 'notes\u0000n1', { title: 'test' })).rejects.toBeInstanceOf(TamperError)
    const other = (await createEnvelope('another password', IT)).key
    await expect(openValue(other, 'notes\u0000n1', s)).rejects.toBeInstanceOf(TamperError)
    const s2 = await sealValue(key, 'notes\u0000n1', { title: 'test' })
    expect(s2.iv).not.toBe(s.iv) // fresh IV each time
    expect(JSON.stringify(s)).not.toContain('test')
  })
})

describe('recovery code', () => {
  it('is 16 symbols from the unambiguous alphabet (no 0/O/1/I), unique per call, and parses back', () => {
    expect(kRecoveryAlphabet).not.toMatch(/[01OI]/)
    expect(new Set(kRecoveryAlphabet).size).toBe(32)
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const c = newRecoveryCode()
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{16}$/)
      seen.add(c)
      expect(normalizeRecoveryCode(formatRecoveryCode(c).toLowerCase())).toBe(c)
      expect(normalizeRecoveryCode(formatRecoveryCode(c).replace(/ /g, '-'))).toBe(c)
    }
    expect(seen.size).toBe(200)
    expect(formatRecoveryCode('K7QM4WXD9PTR2HVC')).toBe('K7QM 4WXD 9PTR 2HVC')
    expect(normalizeRecoveryCode('K7QM 4WXD 9PTR 2HV0')).toBeNull()
  })
})

describe('encrypted export file', () => {
  it('round-trips with the right password; wrong password and any modification fail', async () => {
    const data = { schemaVersion: 1, boxes: { notes: [{ id: 'n', title: 'test' }] } }
    const f = await encryptBackup(data, 'test file password', IT)
    expect(isEncryptedBackup(f)).toBe(true)
    expect(isEncryptedBackup(data)).toBe(false)
    expect(JSON.stringify(f)).not.toContain('test')
    expect(await decryptBackup(f, 'test file password')).toEqual(data)
    await expect(decryptBackup(f, 'wrong password')).rejects.toBeInstanceOf(BadSecretError)
    await expect(decryptBackup({ ...f, ct: (f.ct[0] === 'A' ? 'B' : 'A') + f.ct.slice(1) }, 'test file password')).rejects.toBeInstanceOf(BadSecretError)
    await expect(decryptBackup({ ...f, iterations: 1001 }, 'test file password')).rejects.toBeInstanceOf(BadSecretError)
  })
})
