import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate } from '../../../src/domain'
import { Vault, type KeyValue, type Session } from '../../../src/domain/vault'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { VaultContext, type VaultApi } from '../../../src/ui/lock/context'
import { LockSetup } from '../../../src/ui/lock/LockSetup'
import { ProtectionSection } from '../../../src/ui/lock/ProtectionSection'
import { UnreadableProfile } from '../../../src/ui/lock/UnreadableProfile'
import { library } from '../../domain/helpers'

const mkKv = (): KeyValue => {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}
const apiFor = (vault: Vault): VaultApi => ({
  vault, enabled: vault.enabled, profiles: vault.profiles, current: null, autoLock: vault.autoLock,
  activate: vi.fn(async () => {}), addAndEnter: vi.fn(async () => {}), lock: vi.fn(), turnOff: vi.fn(async () => {}),
  removeProfile: vi.fn(async () => {}), adopt: vi.fn(), setAutoLock: vi.fn(),
})

describe('D7 — the lock setup overlay is a real modal dialog', () => {
  it('role=dialog aria-modal, background inert, Tab cycles inside, Escape closes, focus returns to the opener', async () => {
    const onClose = vi.fn()
    const Page = ({ open }: { open: boolean }) => (
      <VaultContext.Provider value={apiFor(new Vault(mkKv(), 1000))}>
        <ToastProvider>
          <div id="app-root">
            <button id="opener">فتح</button>
            <button id="behind">خلف</button>
          </div>
          {open && <LockSetup name="test" onClose={onClose} />}
        </ToastProvider>
      </VaultContext.Provider>
    )
    const { rerender, container } = render(<Page open={false} />)
    const opener = container.querySelector<HTMLElement>('#opener')!
    opener.focus()
    rerender(<Page open />)
    const dialog = await screen.findByRole('dialog', { name: /.+/ })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // everything else under <body> is inert (the app root container)
    expect(container.closest('[inert]') ?? container.parentElement?.closest('[inert]') ?? (container.hasAttribute('inert') ? container : null)).not.toBeNull()
    // focus starts inside
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    // Tab from the last focusable wraps to the first; Shift+Tab from the first wraps to the last
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
    // focus that somehow ended up outside is pulled back in
    ;(document.body as HTMLElement).focus()
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    // Escape (nothing on top, not busy) asks to close
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    // closing un-inerts the background and returns focus to the opener
    rerender(<Page open={false} />)
    await waitFor(() => expect(document.querySelector('[data-lockpage-inert]')).toBeNull())
    expect(container.closest('[inert]')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(container.querySelector('#opener')))
  })
})

/** jsdom's File has no .text(): give the test file one. */
const textFile = (content: string, name: string): File => {
  const f = new File([content], name, { type: 'application/json' })
  Object.defineProperty(f, 'text', { value: async () => content })
  return f
}
const fakeSession = (repo: unknown): Session => ({ profile: { id: 'p_x' } as never, repo: repo as never, key: {} as CryptoKey })
const wrapUi = (ui: ReactNode) => (
  <ThemeProvider>
    <ToastProvider>{ui}</ToastProvider>
  </ThemeProvider>
)

describe('D4 — the error screen is never a dead end', () => {
  it('offers «جرّبي مرة ثانية», «افتحي نسخة احتياطية / استوردي ملف» and «رجوع», and each one works', async () => {
    const onRetry = vi.fn()
    const onBack = vi.fn()
    const importAll = vi.fn(async () => ({}))
    const repo = { previewImport: vi.fn(async () => ({ ok: true })), importAll }
    const { container } = render(wrapUi(<UnreadableProfile session={fakeSession(repo)} onRetry={onRetry} onBack={onBack} />))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'جرّبي مرة ثانية' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'افتحي نسخة احتياطية / استوردي ملف' })).toBeEnabled()
    // choose a file → confirmation (current data is backed up by importAll first) → import → retry
    const input = container.querySelector<HTMLInputElement>('input[type=file]')!
    const file = textFile(JSON.stringify({ schemaVersion: 1, boxes: {}, meta: {} }), 'backup.json')
    fireEvent.change(input, { target: { files: [file] } })
    const go = await screen.findByRole('button', { name: 'أيوه، افتحيه' })
    expect(importAll).not.toHaveBeenCalled() // nothing happens before she confirms
    fireEvent.click(go)
    await waitFor(() => expect(importAll).toHaveBeenCalledWith(expect.anything(), { confirm: true, reason: 'before-import' }))
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(2))
  })
  it('a file that is not a backup is refused calmly and nothing is imported', async () => {
    const repo = { previewImport: vi.fn(async () => ({ ok: false })), importAll: vi.fn() }
    const { container } = render(wrapUi(<UnreadableProfile session={fakeSession(repo)} onRetry={() => {}} onBack={() => {}} />))
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [textFile('{"a":1}', 'x.json')] } })
    await waitFor(() => expect(repo.previewImport).toHaveBeenCalled())
    expect(repo.importAll).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'أيوه، افتحيه' })).toBeNull()
  })
})

describe('D4 — Settings tells her about quarantined records (calm, with a count)', () => {
  it('shows nothing when everything opens, and a count (plus the tamper note) when records were skipped', async () => {
    const repo = new InMemoryLifeRepository()
    const store = await createLifeStore({ repo, now: () => mkDate(2026, 10, 5, 9), library })
    const vault = new Vault(mkKv(), 1000)
    const ui = () => (
      <ThemeProvider>
        <ToastProvider>
          <VaultContext.Provider value={apiFor(vault)}>
            <LifeStoreProvider store={store}>
              <MemoryRouter>
                <ProtectionSection />
              </MemoryRouter>
            </LifeStoreProvider>
          </VaultContext.Provider>
        </ToastProvider>
      </ThemeProvider>
    )
    const { rerender } = render(ui())
    expect(screen.queryByTestId('quarantine-notice')).toBeNull()
    repo.noteQuarantine({ box: 'notes', id: 'n1', reason: 'tamper' })
    repo.noteQuarantine({ box: 'inbox', id: 'i1', reason: 'unreadable' })
    rerender(ui())
    const notice = screen.getByTestId('quarantine-notice')
    expect(notice).toHaveTextContent('سجلات ما قدرنا نفتحها')
    expect(notice).toHaveTextContent('2')
    expect(notice).toHaveTextContent('تغيّر')
    expect(notice).toHaveAttribute('role', 'status')
  })
})
