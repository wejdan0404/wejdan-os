/**
 * QA area 5 (Me · inbox · notes · search · sources · settings) — UI-side fixes.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate, type Action, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { fieldDir } from '../../../src/ui/lib/textDir'
import { evidenceMatches } from '../../../src/ui/screens/me/EvidenceScreen'
import InboxScreen from '../../../src/ui/screens/me/InboxScreen'
import { WeekPriorities } from '../../../src/ui/screens/me/WeekPriorities'
import WeeklyReviewScreen from '../../../src/ui/screens/me/WeeklyReviewScreen'
import { LinkedNotes } from '../../../src/ui/screens/notes/LinkedNotes'
import { SearchButton } from '../../../src/ui/screens/notes/SearchSheet'
import ChangeLogScreen from '../../../src/ui/screens/sources/ChangeLogScreen'
import ImportReviewScreen from '../../../src/ui/screens/sources/ImportReviewScreen'
import SourcesScreen from '../../../src/ui/screens/sources/SourcesScreen'
import { ITEM } from '../../../src/ui/screens/sources/sourcesKit'
import HomeAdminScreen from '../../../src/ui/screens/me/HomeAdminScreen'
import { ImportReview } from '../../../src/ui/screens/me/ImportReview'
import { fmtIso } from '../../../src/ui/screens/me/meKit'
import { countLabel } from '../../../src/ui/lib/plural'

const NOW = mkDate(2026, 10, 14)
NOW.setHours(12)

async function makeStore(): Promise<LifeStore> {
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(NOW) })
}

function wrap(store: LifeStore, ui: ReactNode, path = '/me') {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}

/** Matches the element holding exactly this text even when <Bidi> splits Latin runs into <bdi>. */
const txt = (t: string) => (_: string, el: Element | null) =>
  el != null && el.textContent === t && !Array.from(el.children).some((c) => c.textContent === t)

describe('fieldDir (#2)', () => {
  it('keeps Arabic and empty fields right-to-left; only Latin-only text goes auto', () => {
    expect(fieldDir('')).toBe('rtl')
    expect(fieldDir('test')).toBe('auto')
    expect(fieldDir('اجتماع test')).toBe('rtl')
    expect(fieldDir('١٢ test')).toBe('rtl')
  })
})

describe('evidence search (#10)', () => {
  const a = { id: 'x', nameAr: 'المشي السريع', nameEn: 'Brisk walking' } as unknown as Action
  it('folds Arabic spelling and the article, and matches all words in any order', () => {
    expect(evidenceMatches(a, 'مشي')).toBe(true)
    expect(evidenceMatches(a, 'السريع المشي')).toBe(true)
    expect(evidenceMatches(a, 'walking')).toBe(true)
    expect(evidenceMatches(a, 'سباحة')).toBe(false)
    expect(evidenceMatches(a, '   ')).toBe(true)
  })
})

describe('Inbox gives every task a home (#9)', () => {
  it('lists tasks planned for other days and recently finished ones (with a way back)', async () => {
    const store = await makeStore()
    await store.addTask({ title: 'test بكرة', dueDate: '2026-10-20' })
    const done = await store.addTask({ title: 'test خلصت', dueDate: '2026-10-14' })
    await store.completeTask(done.id)
    wrap(store, <InboxScreen />, '/me/inbox')
    expect(screen.getByText('مخططة لأيام ثانية')).toBeInTheDocument()
    expect(screen.getByText(txt('test بكرة'))).toBeInTheDocument()
    expect(screen.getByText('خلصت مؤخرًا')).toBeInTheDocument()
    expect(screen.queryByText(txt('test خلصت'))).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /اعرضيها/ }))
    expect(screen.getByText(txt('test خلصت'))).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'رجّعيها' }))
    })
    await waitFor(() => expect(store.getSnapshot().tasks.find((t) => t.id === done.id)!.status).toBe('inbox'))
  })

  it('a search deep link opens the collapsed section that holds the item', async () => {
    const store = await makeStore()
    const done = await store.addTask({ title: 'test خلصت' })
    await store.completeTask(done.id)
    wrap(store, <InboxScreen />, `/me/inbox?focus=${done.id}`)
    expect(await screen.findByText(txt('test خلصت'))).toBeInTheDocument()
  })
})

describe('notes link back to their items (#7)', () => {
  it('shows «ملاحظاتك عنه» on the linked item and nothing when there are none', async () => {
    const store = await makeStore()
    const idea = await store.quickAdd('test', 'idea')
    const p = (await store.convertInbox(idea.id, 'project'))!
    wrap(store, <LinkedNotes kind="project" id={p.id} />)
    expect(screen.queryByText('ملاحظاتك عنه')).not.toBeInTheDocument()
    await act(async () => {
      await store.addNote({ title: 'test', links: [{ kind: 'project', id: p.id }] })
    })
    expect(await screen.findByText('ملاحظاتك عنه')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
  })
})

describe('weekly review priorities are used (#6)', () => {
  it('shows this week’s top 3 where she plans', async () => {
    const store = await makeStore()
    wrap(store, <WeekPriorities />, '/path')
    expect(screen.queryByText('أولوياتك هالأسبوع')).not.toBeInTheDocument()
    await act(async () => {
      await store.saveWeeklyReview({ chapterTitle: 'test', wins: [], blockers: [], top3: ['test أول', '', 'test ثالث'], experimentId: null, durationSec: null })
    })
    expect(await screen.findByText('أولوياتك هالأسبوع')).toBeInTheDocument()
    expect(screen.getByText(txt('test أول'))).toBeInTheDocument()
    expect(screen.getByText(txt('test ثالث'))).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('change log speaks Arabic (#4)', () => {
  it('shows task status changes as Arabic words, never raw codes', async () => {
    const store = await makeStore()
    const t = await store.addTask({ title: 'test', dueDate: '2026-10-14' })
    await store.completeTask(t.id)
    wrap(store, <ChangeLogScreen />, '/me/changelog')
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\bplanned\b|\bdone\b|\bstatus\b|\bdueDate\b/)
    expect(text).toMatch(/خلصت|مخططة/)
  })
})

describe('search sheet (#21)', () => {
  it('has one close control (the iOS-style «إلغاء» of the bare search sheet)', async () => {
    const store = await makeStore()
    wrap(store, <SearchButton />)
    fireEvent.click(screen.getByRole('button', { name: /بحث|ابحثي/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'سكّري' })).toBeNull()
    expect(within(dialog).getAllByRole('button', { name: 'إلغاء' })).toHaveLength(1)
  })
})


describe('Home admin (#8)', () => {
  it('a document can be deleted from the row menu and from its sheet, not only by swiping', async () => {
    const store = await makeStore()
    await store.upsertAdminDoc({ id: 'test', name: 'test', expiry: null, remindDaysBefore: 30, note: '' })
    wrap(store, <HomeAdminScreen />, '/me/home')
    fireEvent.click(screen.getByRole('button', { name: 'خيارات' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /احذفيها/ }))
    })
    await waitFor(() => expect(store.getSnapshot().adminDocs).toHaveLength(0))
  })
})

describe('timestamps are 24-hour (#13)', () => {
  it('fmtIso never shows ص / م', () => {
    const v = fmtIso('2026-10-24T00:51:00')
    expect(v).toContain('00:51')
    expect(v).not.toMatch(/[صم]\s*$|AM|PM/)
    expect(fmtIso('2026-10-24T13:05:00')).toContain('13:05')
  })
})

describe('Arabic plurals (#16)', () => {
  it('archived inbox count uses the right plural form', async () => {
    const store = await makeStore()
    for (let i = 0; i < 3; i++) {
      const it = await store.quickAdd('test')
      await store.archiveInbox(it.id)
    }
    wrap(store, <InboxScreen />, '/me/inbox')
    expect(screen.getByText(`${countLabel(3, ITEM)} بالأرشيف`)).toBeInTheDocument()
    expect(screen.queryByText(/3 عنصر/)).not.toBeInTheDocument()
  })
})

describe('Settings import preview (#12)', () => {
  it('lists the local items «استبدلي» would remove', async () => {
    const store = await makeStore()
    await store.addTask({ title: 'test' })
    const file = await store.exportAll()
    await store.addTask({ title: 'test 2' })
    const preview = await store.previewImport(file)
    if (!preview.ok) throw new Error('preview failed')
    const current = await store.exportAll()
    wrap(store, <ImportReview fileName="test.json" data={file} preview={preview} current={current} busy={false} onConfirm={() => {}} onCancel={() => {}} />)
    const note = screen.getAllByRole('note').find((n) => n.textContent?.includes('يشيلها'))!
    expect(note.textContent).toContain('test 2')
    expect(note.textContent).toContain('«استبدلي» يشيلها')
  })
})

describe('import review after adding (#15, #19)', () => {
  it('a committed batch says «ما انضافت» for undecided rows, never «تبي قرارك»', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.md', '- test 1\n- test 2\n')
    if (!res.ok) throw new Error('import failed')
    await store.reviewCandidate(res.batch.id, res.batch.candidates[0].id, 'approved')
    await store.commitImport(res.batch.id)
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)
    expect(screen.queryByText('تبي قرارك')).not.toBeInTheDocument()
    expect(screen.getAllByText('ما انضافت').length).toBeGreaterThan(0)
  })

  it('the commit toast names where things really went', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.csv', 'title,type,date\ntest,project,\ntest 2,task,\n')
    if (!res.ok) throw new Error('import failed')
    await store.decideAll(res.batch.id, 'approved', { includeFlagged: true })
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /أضيفي/ }))
    })
    const toast = await screen.findByText(/مو في يومك/)
    expect(toast.textContent).toContain('أفكار مساري')
    expect(toast.textContent).toContain('الوارد')
    expect(toast.textContent).not.toContain('الملاحظات')
  })
})

describe('weekly review decisions can be undone (#18)', () => {
  it('cancelling a deferred task shows what changed, with a toast and a way back', async () => {
    const store = await makeStore()
    const t = await store.addTask({ title: 'test' })
    await store.postponeTask(t.id, null)
    wrap(store, <WeeklyReviewScreen />, '/review')
    fireEvent.click(screen.getByRole('button', { name: 'يلا نبدأ' }))
    fireEvent.click(screen.getByRole('button', { name: 'التالي' })) // 1 → 2
    fireEvent.click(screen.getByRole('button', { name: 'التالي' })) // 2 → 3
    // steps cross-fade (AnimatePresence) — wait for question 3 to mount
    fireEvent.click(within(await screen.findByRole('radiogroup', { name: 'قرار: test' }, { timeout: 3000 })).getByRole('radio', { name: 'شيليه' }))
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'التالي' })) // 3 → 6
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'خلّصي المراجعة' }))
    })
    await waitFor(() => expect(store.getSnapshot().tasks.find((x) => x.id === t.id)!.status).toBe('cancelled'))
    expect(await screen.findByText('طبّقنا قرارك')).toBeInTheDocument()
    expect(await screen.findByText('اللي تغيّر:', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText(txt('«test» انشالت'))).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تراجعي عنها' }))
    })
    await waitFor(() => expect(store.getSnapshot().tasks.find((x) => x.id === t.id)!.status).toBe('postponed'))
  })
})

describe('sources (#20, #14)', () => {
  it('a failed file can be removed from the list (with undo)', async () => {
    const store = await makeStore()
    await store.startImport('test.png', 'xx')
    wrap(store, <SourcesScreen />, '/me/sources')
    fireEvent.click(screen.getAllByRole('button', { name: 'خيارات' })[0])
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /شيليها من القائمة/ }))
    })
    await waitFor(() => expect(store.getSnapshot().sources).toHaveLength(0))
    expect(await screen.findByRole('button', { name: 'تراجع' })).toBeInTheDocument()
  })

  it('the item edit sheet uses the app 24-hour time field, never a native AM/PM time input', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.md', '- test\n')
    if (!res.ok) throw new Error('import failed')
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)
    fireEvent.click(screen.getByText(txt('test')))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('input[type="time"]')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: /حدّدي وقت/ }))
    expect(within(dialog).getAllByRole('combobox').length).toBeGreaterThanOrEqual(2)
  })
})
