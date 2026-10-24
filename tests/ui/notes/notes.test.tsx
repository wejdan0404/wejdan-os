import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import NotesScreen from '../../../src/ui/screens/notes/NotesScreen'
import NoteEditorScreen from '../../../src/ui/screens/notes/NoteEditorScreen'
import { SearchButton } from '../../../src/ui/screens/notes/SearchSheet'
import { matchRanges } from '../../../src/ui/screens/notes/notesKit'

const NOW = mkDate(2026, 10, 14)
NOW.setHours(12)

async function makeStore(): Promise<LifeStore> {
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(NOW) })
}

function wrap(store: LifeStore, ui: ReactNode, path = '/me/notes') {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/me/notes" element={ui} />
              <Route path="/me/notes/:id" element={ui} />
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}

describe('Notes list', () => {
  it('shows a calm empty state on first use', async () => {
    const store = await makeStore()
    wrap(store, <NotesScreen />)
    expect(screen.getByText('ما فيه ملاحظات للحين')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'اكتبي ملاحظة' })).toBeInTheDocument()
  })

  it('groups pinned, decisions (with the star) and the rest', async () => {
    const store = await makeStore()
    await store.addNote({ title: 'test pinned', pinned: true })
    await store.addNote({ title: 'test decision', isDecision: true })
    await store.addNote({ title: 'test plain', body: 'test body' })
    wrap(store, <NotesScreen />)
    expect(screen.getByText('مثبّتة')).toBeInTheDocument()
    expect(screen.getByText('الباقي')).toBeInTheDocument()
    expect(screen.getByText('test decision')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'قرار متّخذ' }).length).toBeGreaterThan(0)
    // the decisions view filters
    fireEvent.click(screen.getByRole('radio', { name: 'القرارات' }))
    expect(screen.queryByText('test plain')).not.toBeInTheDocument()
    expect(screen.getByText('test decision')).toBeInTheDocument()
  })
})

describe('Note editor', () => {
  it('saves a new note with a decision flag and a link', async () => {
    const store = await makeStore()
    wrap(store, <NoteEditorScreen />, '/me/notes/new')
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'test' } })
    fireEvent.change(screen.getByLabelText('التفاصيل'), { target: { value: 'test body' } })
    fireEvent.click(screen.getByRole('switch', { name: 'هذا قرار' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'احفظي' }))
    })
    await waitFor(() => expect(store.getSnapshot().notes).toHaveLength(1))
    const n = store.getSnapshot().notes[0]
    expect(n.title).toBe('test')
    expect(n.body).toBe('test body')
    expect(n.isDecision).toBe(true)
  })

  it('refuses to save an empty note', async () => {
    const store = await makeStore()
    wrap(store, <NoteEditorScreen />, '/me/notes/new')
    expect(screen.getByRole('button', { name: 'احفظي' })).toBeDisabled()
  })

  it('deletes an existing note with two taps and offers undo', async () => {
    const store = await makeStore()
    const n = await store.addNote({ title: 'test' })
    wrap(store, <NoteEditorScreen />, `/me/notes/${n!.id}`)
    expect(screen.getByDisplayValue('test')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'احذفي الملاحظة' }))
    expect(screen.getByRole('button', { name: 'اضغطي مرة ثانية عشان تنحذف' })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'اضغطي مرة ثانية عشان تنحذف' }))
    })
    await waitFor(() => expect(store.getSnapshot().notes).toHaveLength(0))
    expect(await screen.findByRole('button', { name: 'تراجع' })).toBeInTheDocument()
  })

  it('shows a friendly message for a stale link', async () => {
    const store = await makeStore()
    wrap(store, <NoteEditorScreen />, '/me/notes/nope')
    expect(screen.getByText('الملاحظة ما عادت موجودة')).toBeInTheDocument()
  })
})

describe('Global search', () => {
  it('finds notes Arabic-aware and offers next steps when nothing matches', async () => {
    const store = await makeStore()
    await store.addNote({ title: 'أفكار لترتيب المكتب' })
    wrap(store, <SearchButton />, '/today')
    fireEvent.click(screen.getByRole('button', { name: 'ابحثي في كل شي' }))
    const input = await screen.findByLabelText('ابحثي في كل شي', { selector: 'input' })
    // hamza-less spelling still matches «أفكار»
    fireEvent.change(input, { target: { value: 'افكار' } })
    await waitFor(() => expect(screen.getByText('الملاحظات والقرارات')).toBeInTheDocument())
    expect(document.querySelector('mark')?.textContent).toBe('أفكار')
    fireEvent.change(input, { target: { value: 'test nothing' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'حطيها بالوارد' })).toBeInTheDocument())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'حطيها بالوارد' }))
    })
    await waitFor(() => expect(store.getSnapshot().inbox.some((i) => i.title === 'test nothing')).toBe(true))
  })

  it('maps highlight ranges back to the original text (tashkeel, alef forms)', () => {
    expect(matchRanges('مُراجَعة الأسبوع', 'مراجعه')).toEqual([[0, 8]])
    expect(matchRanges('إجازة', 'اجازه')).toEqual([[0, 5]])
    expect(matchRanges('IELTS writing', 'ielts')).toEqual([[0, 5]])
    expect(matchRanges('شي', '')).toEqual([])
  })
})
