/**
 * QA area 6 (cross-cutting) regressions: nothing she was doing is lost on reload / iOS eviction,
 * the old version's data can always be moved, a failed chunk can be retried, and the update
 * prompt stays tappable over sheets.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate, type LifeStore } from '../../../src/domain'
import { ErrorBoundary, ErrorFallback } from '../../../src/ui/components/ErrorBoundary'
import { InsetGroupedList } from '../../../src/ui/components/InsetGroupedList'
import { Sheet } from '../../../src/ui/components/Sheet'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { isChunkLoadError, lazyWithRetry, retryUrlFor } from '../../../src/ui/lib/lazyRetry'
import { ImportReview } from '../../../src/ui/screens/me/ImportReview'
import { clearReviewDraft, loadReviewDraft, saveReviewDraft } from '../../../src/ui/screens/me/reviewDraft'
import NoteEditorScreen from '../../../src/ui/screens/notes/NoteEditorScreen'
import { kFocusKey, loadFocusSession, resumeFocusSession, saveFocusSession } from '../../../src/ui/screens/today/focusSession'
import { StackContext } from '../../../src/ui/shell/stack'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import {
  clearOnboardingDraft, loadOnboardingDraft, rememberIntendedRoute, saveOnboardingDraft, takeIntendedRoute,
} from '../../../src/ui/state/onboardingResume'

const NOW = mkDate(2026, 10, 14)
NOW.setHours(12)
const makeStore = (): Promise<LifeStore> => createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(NOW) })

function wrap(store: LifeStore, ui: ReactNode, path: string) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('D2 — a typed note survives a reload / app kill', () => {
  it('autosaves a new note while typing (one note, then updates it)', async () => {
    const store = await makeStore()
    wrap(store, <NoteEditorScreen />, '/me/notes/new')
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'test' } })
    await waitFor(() => expect(store.getSnapshot().notes).toHaveLength(1), { timeout: 3000 })
    fireEvent.change(screen.getByLabelText('التفاصيل'), { target: { value: 'test body' } })
    await waitFor(() => expect(store.getSnapshot().notes[0].body).toBe('test body'), { timeout: 3000 })
    expect(store.getSnapshot().notes).toHaveLength(1)
    // rapid autosaves are one change-log entry, not one per pause
    const noteChanges = store.getSnapshot().changeLog.filter((c) => c.entity === 'note')
    expect(noteChanges).toHaveLength(1)
  })

  it('flushes immediately when the app is backgrounded (no waiting for the debounce)', async () => {
    const store = await makeStore()
    wrap(store, <NoteEditorScreen />, '/me/notes/new')
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'test flush' } })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    await waitFor(() => expect(store.getSnapshot().notes.map((n) => n.title)).toEqual(['test flush']))
  })
})

describe('D6 — a running focus session survives a reload', () => {
  it('keeps the wall-clock start and resumes with the right remaining time', () => {
    const t0 = Date.now()
    saveFocusSession({ id: 'x', totalSec: 25 * 60, phase: 'running', startedAt: t0 - 4 * 1000, carried: 0 }, t0)
    const s = loadFocusSession('x', t0 + 60_000)
    expect(s).not.toBeNull()
    const r = resumeFocusSession(s!, t0 + 60_000)
    expect(r.phase).toBe('running')
    expect(Math.round(r.elapsed)).toBe(64)
    // past the end → over, not negative
    expect(resumeFocusSession(s!, t0 + 26 * 60_000).phase).toBe('over')
    // another item's screen doesn't pick it up; stale sessions are dropped
    expect(loadFocusSession('y', t0)).toBeNull()
    expect(loadFocusSession('x', t0 + 13 * 3600_000)).toBeNull()
    expect(localStorage.getItem(kFocusKey)).not.toBeNull()
  })

  it('a paused session keeps exactly the carried time', () => {
    saveFocusSession({ id: 'x', totalSec: 600, phase: 'paused', startedAt: null, carried: 123 })
    const r = resumeFocusSession(loadFocusSession('x')!)
    expect(r).toEqual({ elapsed: 123, phase: 'paused' })
  })
})

describe('D7/D8 — weekly review and onboarding resume after a reload', () => {
  it('review draft per week, cleared when finished', async () => {
    const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => mkDate(2026, 10, 11, 9) })
    saveReviewDraft(store, '2026-10-11', { step: 'deferred', wins: ['test'], important: ['p:1'], fates: { 't:1': 'inbox' }, pause: [], top3: ['test'], fit: 'heavy', title: 'test', blockers: ['tooBig'], strengthHabit: '', ratings: { h: [1, 2, 3, 4] }, seasonStates: { health: 'grow' }, expPick: null })
    expect(loadReviewDraft(store, '2026-10-11')).toMatchObject({ step: 'deferred', blockers: ['tooBig'], ratings: { h: [1, 2, 3, 4] }, seasonStates: { health: 'grow' } })
    expect(loadReviewDraft(store, '2026-10-18')).toBeNull()
    clearReviewDraft(store, '2026-10-11')
    expect(loadReviewDraft(store, '2026-10-11')).toBeNull()
  })

  it('onboarding draft and the deep link she opened before first run', () => {
    saveOnboardingDraft({ step: 3, name: 'test', wake: 400, sleep: 1380, grow: ['health'], added: [{ name: 'test', slot: 'am' }], picked: [] })
    expect(loadOnboardingDraft()).toMatchObject({ step: 3, name: 'test' })
    clearOnboardingDraft()
    expect(loadOnboardingDraft()).toBeNull()

    rememberIntendedRoute('/me/notes/new')
    expect(takeIntendedRoute()).toBe('/me/notes/new')
    expect(takeIntendedRoute()).toBe('/today') // once
    rememberIntendedRoute('/onboarding')
    expect(takeIntendedRoute()).toBe('/today')
  })
})

describe('D3 — a failed screen chunk can be retried without a reload', () => {
  it('retries with backoff, then a fresh attempt after the error boundary resets', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let fail = true
    let calls = 0
    const factory = () => {
      calls++
      return fail
        ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: /x.js'))
        : Promise.resolve({ default: () => <p>test screen</p> })
    }
    const Lazy = lazyWithRetry(factory, { retries: 1, baseMs: 1 })
    function Harness() {
      const [k, setK] = useState(0)
      return (
        <>
          <button type="button" onClick={() => setK((x) => x + 1)}>
            reset
          </button>
          <ErrorBoundary resetKey={k}>
            <Lazy />
          </ErrorBoundary>
        </>
      )
    }
    const { Suspense } = await import('react')
    render(
      <Suspense fallback={<p>loading</p>}>
        <Harness />
      </Suspense>,
    )
    await screen.findByText('ما قدرنا نفتح هالشاشة — بياناتك بأمان')
    expect(calls).toBe(2) // first try + one retry
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'جرّبي مرة ثانية' }))
    await screen.findByText('test screen')
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('boom'))).toBe(false)
  })

  it('re-imports the failed chunk with a fresh query (browsers remember a failed module fetch)', () => {
    const e = new TypeError('Failed to fetch dynamically imported module: https://x.test/wejdan-os/assets/SettingsScreen-abc.js')
    expect(retryUrlFor(e, 7)).toBe('https://x.test/wejdan-os/assets/SettingsScreen-abc.js?retry=7')
    expect(retryUrlFor(new TypeError('Failed to fetch dynamically imported module: https://x.test/a.js?retry=7'), 8)).toBe('https://x.test/a.js?retry=8')
    expect(retryUrlFor(new TypeError('Importing a module script failed.'))).toBeNull()
  })
})

describe('D13 — a crashed pushed screen still has a way back', () => {
  it('shows a back button labelled with the tab underneath', () => {
    const goBack = vi.fn()
    render(
      <StackContext.Provider value={{ progress: { get: () => 0 } as never, goBack, depth: 1, underLabel: 'أنا' }}>
        <ErrorFallback scope="screen" onRetry={() => {}} />
      </StackContext.Provider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'أنا' }))
    expect(goBack).toHaveBeenCalled()
  })
})

describe('D4 — the update prompt stays tappable while a sheet is open', () => {
  it('a data-inert-exempt host is not made inert by the sheet', async () => {
    const host = document.createElement('div')
    host.id = 'pwa-root'
    host.setAttribute('data-inert-exempt', '')
    document.body.appendChild(host)
    const other = document.createElement('div')
    document.body.appendChild(other)
    render(
      <Sheet open onClose={() => {}} title="test">
        <p>test</p>
      </Sheet>,
    )
    await waitFor(() => expect(other.hasAttribute('inert')).toBe(true))
    expect(host.hasAttribute('inert')).toBe(false)
    host.remove()
    other.remove()
  })
})

describe('D10 — groups of fields are not announced as lists', () => {
  it('asList={false} drops list semantics', () => {
    const { container } = render(
      <InsetGroupedList header="test" asList={false}>
        <label>
          test <input />
        </label>
      </InsetGroupedList>,
    )
    expect(container.querySelector('[role="list"]')).toBeNull()
  })
})

describe('D1 — reviewed merge of the old data keeps hers', () => {
  it('«ادمجي» adds only new ids and keeps her settings by default', () => {
    const file = {
      schemaVersion: 1,
      meta: { settings: { displayName: 'old' } },
      boxes: { habits: [{ id: 'h1', titleAr: 'test old' }, { id: 'h2', titleAr: 'test new' }] },
    }
    const current = { schemaVersion: 1, meta: { settings: { displayName: 'mine' } }, boxes: { habits: [{ id: 'h1', titleAr: 'test mine' }] } }
    let built: unknown = null
    render(
      <ImportReview
        fileName="النسخة القديمة"
        data={file}
        preview={{ ok: true, counts: { habits: 2 }, current: { habits: 1 }, skipped: 0 } as never}
        busy={false}
        allowMerge
        preferMerge
        onCancel={() => {}}
        onConfirm={(build) => {
          built = build(current as never)
        }}
      />,
    )
    expect(screen.getAllByRole('radio', { name: 'ادمجي' }).length + screen.queryAllByText('ادمجي').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'اعتمدي اللي اخترتيه' }))
    const out = built as { boxes: { habits: { id: string; titleAr: string }[] }; meta: { settings: { displayName: string } } }
    expect(out.boxes.habits.map((h) => h.titleAr)).toEqual(['test mine', 'test new'])
    expect(out.meta.settings.displayName).toBe('mine')
  })
})
