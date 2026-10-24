/**
 * Final QA area 3 — UI checks: «حطيها لليوم» under a fast double tap, goals create, inline capacity
 * warning, notes autosave, driving plan consent, IELTS weakest-skill confirmation, mock feedback +
 * delete/undo, plan pause.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, makeProject, makeProjectStep, mkDate, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import DrivingScreen from '../../../src/ui/screens/path/DrivingScreen'
import IeltsScreen from '../../../src/ui/screens/path/IeltsScreen'
import PathScreen from '../../../src/ui/screens/path/PathScreen'
import ProjectDetailScreen from '../../../src/ui/screens/path/ProjectDetailScreen'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)

async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}

function mount(store: LifeStore, ui: JSX.Element, path = '/path') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

const withProject = (store: LifeStore) =>
  store.upsertProject(
    makeProject({
      id: 'p1',
      titleAr: 'test',
      titleEn: 'test',
      domain: 'career',
      status: 'active',
      steps: [makeProjectStep({ id: 's1', titleAr: 'test step', titleEn: 'test step' }), makeProjectStep({ id: 's2', titleAr: 'test step 2', titleEn: 'test step 2' })],
    }),
    true,
  )

describe('Path (area 3)', () => {
  it('«حطيها لليوم» double-tapped fast creates one task, linked to the step', async () => {
    const store = await makeStore()
    await withProject(store)
    mount(store, <PathScreen />)
    const btn = await screen.findByRole('button', { name: 'حطيها لليوم' })
    await act(async () => {
      fireEvent.click(btn)
      fireEvent.click(btn)
    })
    await waitFor(() => expect(store.getSnapshot().tasks.filter((t) => t.projectStepId === 's1')).toHaveLength(1))
    expect(store.getSnapshot().tasks).toHaveLength(1)
  })

  it('creates a goal from «هدف جديد»', async () => {
    const store = await makeStore()
    mount(store, <PathScreen />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'هدف جديد' })))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('وش الهدف؟'), { target: { value: 'test' } })
    fireEvent.change(within(dialog).getByLabelText('معلم جديد'), { target: { value: 'test milestone' } })
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'أضيفي' })))
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'احفظي' })))
    await waitFor(() => expect(store.getSnapshot().goals.some((g) => g.titleAr === 'test' && g.milestones.length === 1)).toBe(true))
  })

  it('shows the capacity question inside the row she tapped', async () => {
    const store = await makeStore()
    for (const d of store.getSnapshot().domains.filter((x) => x.enabled && !x.sensitive).slice(0, 3)) await store.setDomainState(d.id, 'grow', true)
    mount(store, <PathScreen />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'مجالاتك' })))
    const dialog = await screen.findByRole('dialog')
    const group = within(dialog)
      .getAllByRole('radiogroup')
      .find((g) => within(g).getByRole('radio', { name: 'نمو' }).getAttribute('aria-checked') === 'false')!
    await act(async () => fireEvent.click(within(group).getByRole('radio', { name: 'نمو' })))
    const alert = await within(dialog).findByRole('alert')
    expect(alert.closest('li')).toBe(group.closest('li'))
  })
})

describe('Project detail (area 3)', () => {
  it('autosaves notes while typing', async () => {
    const store = await makeStore()
    await withProject(store)
    render(
      <MemoryRouter initialEntries={['/path/project/p1']}>
        <ToastProvider>
          <LifeStoreProvider store={store}>
            <Routes>
              <Route path="/path/project/:id" element={<ProjectDetailScreen />} />
            </Routes>
          </LifeStoreProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    fireEvent.change(await screen.findByLabelText('ملاحظات'), { target: { value: 'test note' } })
    await waitFor(() => expect(store.getSnapshot().projects.find((p) => p.id === 'p1')!.notes).toBe('test note'), { timeout: 2000 })
  })
})

describe('Driving (area 3)', () => {
  it('turning the plan on wakes the resting domain and says so; undo puts it back', async () => {
    const store = await makeStore()
    expect(store.getSnapshot().domains.find((d) => d.id === 'driving')!.state).toBe('rest')
    mount(store, <DrivingScreen />, '/path/driving')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'فعّلي الخطة الأسبوعية' })))
    expect(await screen.findByText(/مجال القيادة صار «صيانة»/)).toBeInTheDocument()
    expect(store.getSnapshot().domains.find((d) => d.id === 'driving')!.state).toBe('maintain')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'تراجع' })))
    await waitFor(() => expect(store.getSnapshot().domains.find((d) => d.id === 'driving')!.state).toBe('rest'))
    await waitFor(() => expect(store.getSnapshot().weeklyTasks.filter((t) => t.id.startsWith('wt_driving')).every((t) => !t.active)).toBe(true))
  })
})

describe('IELTS (area 3)', () => {
  it('the extra-day skill changes only when she picks it', async () => {
    const store = await makeStore()
    await store.addMockTest({ id: 'm1', date: '2026-10-04', reading: 7, listening: 7, writing: 7, speaking: 5, note: '' })
    mount(store, <IeltsScreen />, '/path/ielts')
    expect(store.getSnapshot().settings.ieltsWeakestSkill).toBe('writing')
    expect(screen.getByText(/آخر اختبار تجريبي يقول أضعف مهارة: «المحادثة»/)).toBeInTheDocument()
    await act(async () => fireEvent.change(screen.getByLabelText('المهارة اللي تاخذ يوم زيادة بالأسبوع'), { target: { value: 'speaking' } }))
    await waitFor(() => expect(store.getSnapshot().settings.ieltsWeakestSkill).toBe('speaking'))
  })

  it('mock entry explains out-of-range and rounding; a result can be deleted with undo', async () => {
    const store = await makeStore()
    mount(store, <IeltsScreen />, '/path/ielts')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'سجّلي نتيجة' })))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('درجة قراءة'), { target: { value: '10' } })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('الدرجة من 0 لين 9')
    expect(within(dialog).getByRole('button', { name: 'احفظي' })).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText('درجة قراءة'), { target: { value: '٦٫٣' } })
    expect(within(dialog).getByText(/نقرّبها لأقرب نص درجة/)).toBeInTheDocument()
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'احفظي' })))
    await waitFor(() => expect(store.getSnapshot().mockTests).toHaveLength(1))
    expect(store.getSnapshot().mockTests[0]!.reading).toBe(6.5)
    const tok = await store.deleteMockTest(store.getSnapshot().mockTests[0]!.id)
    expect(store.getSnapshot().mockTests).toHaveLength(0)
    await store.undoDelete(tok!.token)
    expect(store.getSnapshot().mockTests).toHaveLength(1)
  })

  it('the plan can be paused and resumed from its screen', async () => {
    const store = await makeStore()
    mount(store, <IeltsScreen />, '/path/ielts')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'فعّلي الخطة اليومية' })))
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'وقّفي الخطة مؤقتًا' })))
    await waitFor(() => expect(store.getSnapshot().habits.find((h) => h.id === 'h_ielts')!.status).toBe('paused'))
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'رجّعي الخطة' })))
    await waitFor(() => expect(store.getSnapshot().habits.find((h) => h.id === 'h_ielts')!.status).toBe('active'))
  })
})
