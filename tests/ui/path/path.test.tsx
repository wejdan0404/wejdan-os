import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  InMemoryLifeRepository,
  createLifeStore,
  dayKey,
  makeProject,
  makeProjectStep,
  mkDate,
  type LifeStore,
} from '../../../src/domain'
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

const project = (id = 'prj_test', status: 'active' | 'idea' = 'active') =>
  makeProject({
    id,
    domain: 'career',
    titleAr: 'test',
    titleEn: 'test',
    status,
    steps: [
      makeProjectStep({ id: 'st1', titleAr: 'test step 1', titleEn: 'x' }),
      makeProjectStep({ id: 'st2', titleAr: 'test step 2', titleEn: 'y' }),
    ],
  })

describe('PathScreen', () => {
  it('shows the season and ONE empty state on a fresh store', async () => {
    const store = await makeStore()
    mount(store, <PathScreen />)
    expect(screen.getByText('موسمي الأول')).toBeInTheDocument()
    expect(screen.getByText('مسارك يبدأ بفكرة وحدة')).toBeInTheDocument()
    expect(screen.queryByText(/ما عندك مشروع نشط/)).not.toBeInTheDocument()
    expect(screen.queryByText('ما فيه أفكار محفوظة')).not.toBeInTheDocument()
  })

  it('«مجالاتك» changes a domain state any time', async () => {
    const store = await makeStore()
    mount(store, <PathScreen />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'مجالاتك' })))
    const dialog = await screen.findByRole('dialog')
    const before = store.getSnapshot().domains.filter((d) => d.state === 'maintain').length
    const group = within(dialog)
      .getAllByRole('radiogroup')
      .find((g) => within(g).getByRole('radio', { name: 'صيانة' }).getAttribute('aria-checked') === 'false')!
    await act(async () => fireEvent.click(within(group).getByRole('radio', { name: 'صيانة' })))
    await waitFor(() => expect(store.getSnapshot().domains.filter((d) => d.state === 'maintain').length).toBe(before + 1))
  })

  it('«حطيها لليوم» is idempotent', async () => {
    const store = await makeStore()
    await store.upsertProject(makeProject({ id: 'p1', titleAr: 'test', titleEn: 'test', domain: 'career', status: 'active', steps: [makeProjectStep({ id: 's1', titleAr: 'test step', titleEn: 'test step' })] }))
    mount(store, <PathScreen />)
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'حطيها لليوم' })))
    expect(await screen.findByRole('button', { name: /الخطوة على يومك/ })).toBeInTheDocument()
    expect(store.getSnapshot().tasks.filter((t) => t.title === 'test step').length).toBe(1)
  })

  it('expands the first active project and puts its next step on today', async () => {
    const store = await makeStore()
    await store.upsertProject(project(), true)
    mount(store, <PathScreen />)
    const card = screen.getByRole('button', { name: /test/, expanded: true })
    expect(card).toBeInTheDocument()
    expect(screen.getByText('test step 1')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'حطيها لليوم' }))
    })
    await waitFor(() => {
      const t = store.getSnapshot().tasks.find((x) => x.title === 'test step 1')
      expect(t?.status).toBe('planned')
      expect(t?.dueDate).toBe(dayKey(NOW))
      expect(t?.projectId).toBe('prj_test')
    })
  })

  it('lists inbox ideas under الأفكار', async () => {
    const store = await makeStore()
    await store.quickAdd('test', 'idea')
    mount(store, <PathScreen />)
    const ideas = screen.getByRole('heading', { name: 'الأفكار' }).closest('section')!
    expect(within(ideas).getByText('test')).toBeInTheDocument()
  })
})

describe('ProjectDetailScreen', () => {
  it('completes, adds and deletes (with undo) steps and the project', async () => {
    const store = await makeStore()
    await store.upsertProject(project(), true)
    mount(store, <ProjectDetailScreen />, '/path/project/prj_test')

    await act(async () => {
      fireEvent.click(screen.getAllByRole('checkbox', { name: 'خطوة: test step 1' })[0]!)
    })
    await waitFor(() => expect(store.getSnapshot().projects[0]!.steps[0]!.done).toBe(true))

    fireEvent.change(screen.getByLabelText('خطوة جديدة'), { target: { value: 'test step 3' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'أضيفي' }))
    })
    await waitFor(() => expect(store.getSnapshot().projects[0]!.steps.map((x) => x.titleAr)).toContain('test step 3'))

    // reorder: move step 2 up
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'طلّعي «test step 2» فوق' }))
    })
    await waitFor(() => expect(store.getSnapshot().projects[0]!.steps[0]!.titleAr).toBe('test step 2'))

    // two-step delete
    fireEvent.click(screen.getByRole('button', { name: 'احذفي المشروع' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /متأكدة/ }))
    })
    await waitFor(() => expect(store.getSnapshot().projects).toHaveLength(0))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /تراجع/ }))
    })
    await waitFor(() => expect(store.getSnapshot().projects).toHaveLength(1))
  })

  it('shows a calm not-found state', async () => {
    const store = await makeStore()
    mount(store, <ProjectDetailScreen />, '/path/project/nope')
    expect(screen.getByText('ما لقينا المشروع')).toBeInTheDocument()
  })
})

describe('IeltsScreen', () => {
  it('shows today’s skill, enables the plan, and reviews a due card', async () => {
    const store = await makeStore()
    await store.addVocabCard('test', 'test meaning')
    mount(store, <IeltsScreen />, '/path/ielts')
    expect(screen.getByText('مهارة اليوم')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'فعّلي الخطة اليومية' }))
    })
    await waitFor(() => expect(store.getSnapshot().habits.some((h) => h.domain === 'ielts')).toBe(true))

    const card = screen.getByRole('button', { name: /test — اضغطي/ })
    fireEvent.click(card)
    expect(await screen.findByText('test meaning')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'سهلة' }))
    })
    await waitFor(() => expect(store.getSnapshot().vocabCards[0]!.repetitions).toBe(1))
    expect(await screen.findByText('خلّصتي مراجعة اليوم')).toBeInTheDocument()
  })
})

describe('DrivingScreen', () => {
  it('enables the weekly plan, logs a video, and shows the owner-confirmed road', async () => {
    const store = await makeStore()
    mount(store, <DrivingScreen />, '/path/driving')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'فعّلي الخطة الأسبوعية' }))
    })
    await waitFor(() => expect(store.getSnapshot().weeklyTasks.filter((w) => w.domain === 'driving' && w.active)).toHaveLength(2))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'شفت فيديو' }))
    })
    await waitFor(() => expect(store.getSnapshot().drivingSessions).toHaveLength(1))
    expect(screen.getByRole('img', { name: 'الفيديوهات: 1 من 3 هالأسبوع' })).toBeInTheDocument()

    // Area F: the road starts with «confirm the official path» — no invented 7-step licence list.
    expect(screen.getByText('تأكيد المسار الرسمي')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'حطيها مشروع في مساري' })).not.toBeInTheDocument()
  })
})
