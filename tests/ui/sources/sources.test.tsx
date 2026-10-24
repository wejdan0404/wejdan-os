import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, mkDate, todayView, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import SourcesScreen from '../../../src/ui/screens/sources/SourcesScreen'
import ImportReviewScreen from '../../../src/ui/screens/sources/ImportReviewScreen'
import ChangeLogScreen from '../../../src/ui/screens/sources/ChangeLogScreen'

const NOW = mkDate(2026, 10, 14)
NOW.setHours(12)

async function makeStore(): Promise<LifeStore> {
  return createLifeStore({ repo: new InMemoryLifeRepository(), now: () => new Date(NOW) })
}

function wrap(store: LifeStore, ui: ReactNode, path = '/me/sources') {
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

const MD = '# قائمة test\n- test 1\n- test 2\n- test 3\n'

describe('Sources', () => {
  it('shows a calm empty state and reads a picked file into a review batch (nothing added yet)', async () => {
    const store = await makeStore()
    const tasksBefore = store.getSnapshot().tasks.length
    wrap(store, <SourcesScreen />)
    expect(screen.getByText('ما استوردتي شي للحين')).toBeInTheDocument()

    const input = screen.getByTestId('source-file-input') as HTMLInputElement
    const file = new File([MD], 'test.md', { type: 'text/markdown' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })
    await waitFor(() => expect(store.getSnapshot().importBatches).toHaveLength(1))
    const s = store.getSnapshot()
    expect(s.sources[0].fileName).toBe('test.md')
    expect(s.sources[0].status).toBe('review')
    expect(s.tasks.length).toBe(tasksBefore)
  })

  it('lists an unreadable file with its name and the reason', async () => {
    const store = await makeStore()
    await store.startImport('test.xls', 'PK\u0003\u0004 binary')
    wrap(store, <SourcesScreen />)
    expect(screen.getByText('test.xls')).toBeInTheDocument()
    expect(screen.getByText(/ما نقدر نقراه هنا/)).toBeInTheDocument()
  })

  it('shows the needs-review hero with the no-auto-today promise', async () => {
    const store = await makeStore()
    await store.startImport('test.md', MD)
    wrap(store, <SourcesScreen />)
    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument()
    expect(screen.getAllByText(/ولا شي يروح ليومك إلا بموافقتك/).length).toBeGreaterThan(0)
  })
})

describe('Import review', () => {
  it('approves the clear items, adds them with their source, and never touches today', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.md', MD)
    if (!res.ok) throw new Error('import failed')
    const planBefore = todayView(store.getSnapshot(), store.today()).plan.items.length
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)

    expect(screen.getByText(/اللي تعتمدينه يروح مكانه، مو ليومك/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /اعتمدي الواضحة/ }))
    })
    await waitFor(() => expect(store.getSnapshot().importBatches[0].candidates.every((c) => c.decision === 'approved')).toBe(true))

    const add = await screen.findByRole('button', { name: /أضيفي/ })
    await act(async () => {
      fireEvent.click(add)
    })
    await waitFor(() => expect(store.getSnapshot().importBatches[0].committedAt).not.toBeNull())
    const s = store.getSnapshot()
    expect(s.provenance.length).toBe(res.batch.candidates.length)
    expect(todayView(s, store.today()).plan.items.length).toBe(planBefore)
    expect(await screen.findByText(/مو في يومك/)).toBeInTheDocument()
  })

  it('warns before adding when some items still need her decision', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.md', MD)
    if (!res.ok) throw new Error('import failed')
    await store.reviewCandidate(res.batch.id, res.batch.candidates[0].id, 'approved')
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)
    fireEvent.click(screen.getByRole('button', { name: /أضيفي/ }))
    expect(screen.getByText(/لسا تبي قرارك/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'أكمّل المراجعة' }))
    expect(store.getSnapshot().importBatches[0].committedAt).toBeNull()
  })

  it('edits an item in the sheet and approves it', async () => {
    const store = await makeStore()
    const res = await store.startImport('test.md', MD)
    if (!res.ok) throw new Error('import failed')
    const c = res.batch.candidates[0]
    wrap(store, <ImportReviewScreen />, `/me/sources/review/${res.batch.id}`)
    fireEvent.click(screen.getAllByText(c.title)[0])
    const title = await screen.findByLabelText('العنوان')
    fireEvent.change(title, { target: { value: 'test edited' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'احفظي واعتمديها' }))
    })
    await waitFor(() => {
      const cc = store.getSnapshot().importBatches[0].candidates.find((x) => x.id === c.id)!
      expect(cc.title).toBe('test edited')
      expect(cc.decision).toBe('approved')
    })
  })
})

describe('Change log', () => {
  it('is calm when empty', async () => {
    const store = await makeStore()
    wrap(store, <ChangeLogScreen />, '/me/changelog')
    expect(screen.getByText('السجل فاضي للحين')).toBeInTheDocument()
  })

  it('lists a deleted task and brings it back', async () => {
    const store = await makeStore()
    const t = await store.addTask({ title: 'test' })
    await store.deleteTask(t.id)
    expect(store.getSnapshot().tasks.some((x) => x.id === t.id)).toBe(false)
    wrap(store, <ChangeLogScreen />, '/me/changelog')
    expect(screen.getByText(/حذفتي مهمة/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /رجّعيها: مهمة «test»/ }))
    })
    await waitFor(() => expect(store.getSnapshot().tasks.some((x) => x.id === t.id)).toBe(true))
  })
})
