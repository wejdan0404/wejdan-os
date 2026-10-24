import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { FLOWER_AR } from '../../../src/ui/components/flowers/flowers'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { VaultContext, type VaultApi } from '../../../src/ui/lock/context'
import { AVATAR_FLOWERS } from '../../../src/ui/lock/ProfileAvatar'
import { ProfileCreateSheet } from '../../../src/ui/lock/ProfileSheets'
import { Vault, type KeyValue } from '../../../src/domain/vault'

const css = fs.readFileSync(path.resolve(__dirname, '../../../src/ui/lock/lock.module.css'), 'utf8')
const rule = (sel: string) => css.split('\n').filter((l) => l.startsWith(sel)).join('\n')

describe('release gate 3 D8: failure messages in the lock UI are calm, never red', () => {
  it('error text is Ink, the well gets a Violet underline, the icon is Violet', () => {
    const text = rule('.help[data-error]')
    expect(text).toContain('var(--text-primary)')
    expect(text).toContain('var(--brand-primary)')
    expect(text).not.toContain('--error')
    expect(rule('.well[data-error]')).toContain('var(--brand-primary)')
    expect(rule('.well[data-error]')).not.toContain('--error')
  })
  it('the wait card (soft delay) uses no error colour', () => {
    expect(rule('.waitCard')).not.toContain('--error')
    expect(rule('.waitIcon')).not.toContain('--error')
  })
})

describe('release gate 3 D6: avatar radios have Arabic accessible names', () => {
  it('every flower option is named from the flower registry, none is a raw id', () => {
    const mk: KeyValue = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    const vault = new Vault(mk, 1000)
    const api = { vault, enabled: false, profiles: [], current: null, autoLock: 'immediate', activate: vi.fn(), addAndEnter: vi.fn(), lock: vi.fn(), turnOff: vi.fn(), removeProfile: vi.fn(), adopt: vi.fn(), setAutoLock: vi.fn() } as unknown as VaultApi
    render(
      <VaultContext.Provider value={api}>
        <ToastProvider>
          <ProfileCreateSheet api={api} open onClose={() => {}} onPrepared={() => {}} />
        </ToastProvider>
      </VaultContext.Provider>,
    )
    const group = screen.getAllByRole('radiogroup')[0]
    const names = within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label') ?? '')
    for (const f of AVATAR_FLOWERS) expect(names).toContain(FLOWER_AR[f])
    for (const n of names) expect(n).toMatch(/[؀-ۿ]/)
    expect(names.join(' ')).not.toMatch(/taif-rose|iris|peony|jasmine/)
  })
})
