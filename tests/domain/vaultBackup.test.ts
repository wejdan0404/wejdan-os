import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DexieLifeRepository, InMemoryLifeRepository, buildStarterProfile, kExportSchemaVersion } from '../../src/domain'
import { BadSecretError, canonical, decryptBackup, encryptBackup, isEncryptedBackup } from '../../src/domain/vault'
import { library, mon } from './helpers'

describe('encrypted export keeps the schemaVersion-1 format', () => {
  it('export → encrypt → decrypt is the same plain JSON; the existing import path accepts it; plain exports are untouched', async () => {
    const src = new InMemoryLifeRepository()
    await src.open()
    await src.seed({ library, profile: buildStarterProfile(library, mon) })
    await src.write('notes', 'n_test', { id: 'n_test', title: 'test', body: 'test', tag: 'note', createdAt: '2026-10-05T10:00:00', updatedAt: '2026-10-05T10:00:00', pinned: false })
    const exp = await src.exportAll()
    expect(exp.schemaVersion).toBe(kExportSchemaVersion)
    expect(isEncryptedBackup(exp)).toBe(false) // a plain export is not mistaken for an encrypted one

    const file = await encryptBackup(exp, 'test file password', 1000)
    expect(isEncryptedBackup(file)).toBe(true)
    const back = (await decryptBackup(file, 'test file password')) as typeof exp
    expect(canonical(back)).toBe(canonical(exp))

    const dst = new DexieLifeRepository('vault_backup_test') // plain destination, as before the lock existed
    await dst.open()
    const preview = await dst.previewImport(back)
    expect(preview.ok).toBe(true)
    expect(preview.counts.notes).toBe(1)
    await dst.importAll(back, { confirm: true })
    expect((await dst.read('notes', 'n_test'))?.['title']).toBe('test')
    await expect(decryptBackup(file, 'wrong')).rejects.toBeInstanceOf(BadSecretError)
    await dst.close()
  })
})
