/**
 * Release-gate fixes (UI): N2 first-run restore, N3 payday prompt, N4 skipped routine, N5 payday notice.
 * Everything the tests create is named «test».
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLifeStore,
  InMemoryLifeRepository,
  makeHabit,
  makeProduct,
  mkDate,
  productStepId,
  type LifeStore,
} from '../../src/domain'
import { ToastProvider } from '../../src/ui/components/Toast'
import { ThemeProvider } from '../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../src/ui/state/LifeStore'
import MoneyScreen from '../../src/ui/screens/me/MoneyScreen'
import OnboardingScreen from '../../src/ui/screens/me/OnboardingScreen'
import RoutineScreen from '../../src/ui/screens/habits/RoutineScreen'
import TodayScreen from '../../src/ui/screens/today/TodayScreen'
import { library } from '../domain/helpers'

function mount(store: LifeStore, ui: JSX.Element, path: string) {
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
async function makeStore(at: Date): Promise<{ store: LifeStore; setNow: (d: Date) => void }> {
  let now = at
  const store = await createLifeStore({ repo: new InMemoryLifeRepository(), now: () => now, library })
  return { store, setNow: (d) => (now = d) }
}

// ---------------------------------------------------------------------------------------------
describe('N2: «عندي نسخة احتياطية» on the first-run welcome', () => {
  beforeEach(() => window.localStorage.clear())

  /** Her real setup, then «احذفي كل شي»: the app is back at first run with the backup on the device. */
  async function wipedStore() {
    const { store } = await makeStore(mkDate(2026, 10, 14, 10))
    await store.upsertHabit(makeHabit({ id: 'h_test', domain: 'care', titleAr: 'test', titleEn: 'test' }), true)
    await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true, displayName: 'test' })
    const before = store.getSnapshot().habits.map((h) => h.id).sort()
    await store.deleteAllAndReseed()
    expect(store.getSnapshot().settings.onboardingDone).toBe(false)
    expect(store.getSnapshot().habits.map((h) => h.id)).not.toContain('h_test')
    return { store, before }
  }

  it('restores the latest automatic backup, skips onboarding and writes no starter data', async () => {
    const { store, before } = await wipedStore()
    const starter = vi.spyOn(store, 'addStarterHabits')
    const product = vi.spyOn(store, 'upsertProduct')
    mount(store, <OnboardingScreen />, '/onboarding')

    fireEvent.click(await screen.findByRole('button', { name: 'عندي نسخة احتياطية' }))
    expect(await screen.findByRole('heading', { name: 'عندك نسخة احتياطية؟' })).toBeInTheDocument()
    expect(await screen.findByText('قبل الحذف الكامل')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'استرجعي' }))

    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    expect(store.getSnapshot().settings.displayName).toBe('test')
    expect(store.getSnapshot().habits.map((h) => h.id).sort()).toEqual(before)
    expect(starter).not.toHaveBeenCalled()
    expect(product).not.toHaveBeenCalled()
  })

  it('opening the sheet and walking away writes nothing', async () => {
    const { store } = await wipedStore()
    const habits = store.getSnapshot().habits.map((h) => h.id)
    mount(store, <OnboardingScreen />, '/onboarding')
    fireEvent.click(await screen.findByRole('button', { name: 'عندي نسخة احتياطية' }))
    await screen.findByRole('heading', { name: 'عندك نسخة احتياطية؟' })
    fireEvent.click(screen.getByRole('button', { name: 'لا، أبدأ من جديد' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'عندك نسخة احتياطية؟' })).not.toBeInTheDocument())
    expect(store.getSnapshot().settings.onboardingDone).toBe(false)
    expect(store.getSnapshot().habits.map((h) => h.id)).toEqual(habits)
    expect(screen.getByRole('button', { name: 'يلا نبدأ' })).toBeInTheDocument()
  })

  it('imports a backup file through the review, then skips onboarding', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 10))
    await store.upsertHabit(makeHabit({ id: 'h_test', domain: 'care', titleAr: 'test', titleEn: 'test' }), true)
    await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: true })
    const file = JSON.stringify(await store.exportAll())
    await store.deleteAllAndReseed()
    const starter = vi.spyOn(store, 'addStarterHabits')

    const { container } = mount(store, <OnboardingScreen />, '/onboarding')
    fireEvent.click(await screen.findByRole('button', { name: 'عندي نسخة احتياطية' }))
    await screen.findByRole('heading', { name: 'عندك نسخة احتياطية؟' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    const f = new File([file], 'test.json', { type: 'application/json' })
    Object.defineProperty(f, 'text', { value: () => Promise.resolve(file) })
    await act(async () => {
      fireEvent.change(input, { target: { files: [f] } })
    })
    fireEvent.click(await screen.findByRole('button', { name: 'اعتمدي اللي اخترتيه' }))
    await waitFor(() => expect(store.getSnapshot().settings.onboardingDone).toBe(true))
    expect(store.getSnapshot().habits.map((h) => h.id)).toContain('h_test')
    expect(starter).not.toHaveBeenCalled()
    expect(container).toBeTruthy()
  })

  it('a bad file says so and changes nothing', async () => {
    const { store } = await wipedStore()
    mount(store, <OnboardingScreen />, '/onboarding')
    fireEvent.click(await screen.findByRole('button', { name: 'عندي نسخة احتياطية' }))
    await screen.findByRole('heading', { name: 'عندك نسخة احتياطية؟' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const f = new File(['not json'], 'test.json', { type: 'application/json' })
    Object.defineProperty(f, 'text', { value: () => Promise.resolve('not json') })
    await act(async () => {
      fireEvent.change(input, { target: { files: [f] } })
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('ما قدرنا نقرا')
    expect(store.getSnapshot().settings.onboardingDone).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
describe('N3: «رتّبي الشهر» on payday', () => {
  it('Money and Today stop asking once the month has a plan', async () => {
    const { store } = await makeStore(mkDate(2026, 11, 1, 9))
    const money = mount(store, <MoneyScreen />, '/me/money')
    expect(await screen.findByRole('button', { name: 'رتّبي الشهر' })).toBeInTheDocument()
    expect(screen.getByText('نزل الراتب — خلّينا نرتّب الشهر')).toBeInTheDocument()

    await act(() => store.upsertEnvelope({ id: 'env_2026-11_spend', titleAr: 'test', titleEn: 'test', month: '2026-11', planned: 2000, spent: 0 }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'رتّبي الشهر' })).not.toBeInTheDocument())
    expect(screen.queryByText('نزل الراتب — خلّينا نرتّب الشهر')).not.toBeInTheDocument()
    expect(screen.queryByText('شهر جديد يبدأ اليوم')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'عدّلي الخطة' })).toBeInTheDocument()
    money.unmount()

    mount(store, <TodayScreen />, '/today')
    await screen.findByText(/صباح الخير|مساء الخير/)
    expect(screen.queryByText('شهر جديد يبدأ اليوم')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'رتّبي الشهر' })).not.toBeInTheDocument()
  })

  it('Today still offers it on payday while the month is unplanned', async () => {
    const { store } = await makeStore(mkDate(2026, 11, 1, 9))
    mount(store, <TodayScreen />, '/today')
    expect(await screen.findByText('شهر جديد يبدأ اليوم')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'رتّبي الشهر' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
describe('N5: payday changed and changed back', () => {
  it('shows the notice for a real change and not for a net-zero one', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 24, 10))
    await store.setPayday(27)
    mount(store, <MoneyScreen />, '/me/money')
    expect(await screen.findByText(/غيّرتي يوم الراتب/)).toBeInTheDocument()
    await act(() => store.setPayday(1))
    await waitFor(() => expect(screen.queryByText(/غيّرتي يوم الراتب/)).not.toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------------------------
describe('N4: a routine skipped in full', () => {
  async function withAmRoutine() {
    const ctx = await makeStore(mkDate(2026, 10, 14, 9))
    for (const [i, id] of ['prd_t1', 'prd_t2'].entries()) await ctx.store.upsertProduct(makeProduct({ id, name: 'test', category: 'other', slot: 'am', order: i + 1 }))
    return ctx
  }
  const skipAll = async (store: LifeStore) => {
    for (const id of ['prd_t1', 'prd_t2']) await store.skipItem({ itemId: productStepId(id), kind: 'routineStep' })
  }

  it('Today swaps the offer for a calm skipped line with a quiet way back', async () => {
    const { store } = await withAmRoutine()
    mount(store, <TodayScreen />, '/today')
    expect(await screen.findByText(/روتين الصبح — لو تبينه/)).toBeInTheDocument()

    await act(() => skipAll(store))
    await waitFor(() => expect(screen.queryByText(/لو تبينه/)).not.toBeInTheDocument())
    expect(screen.queryByText(/\+ أضيفيه/)).not.toBeInTheDocument()
    expect(screen.getByText('روتين الصبح — تخطّيتيه اليوم')).toBeInTheDocument()
    expect(screen.getByText('بكرة نرجع له')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /رجّعي روتين الصبح لليوم/ }))
    await waitFor(() => expect(store.getSnapshot().logs.filter((l) => l.level === 'skipped')).toHaveLength(0))
    expect(await screen.findByText(/روتين الصبح — لو تبينه/)).toBeInTheDocument()
  })

  it('the routine screen says it was skipped, not «يلا نبدأ», and can restart it', async () => {
    const { store } = await withAmRoutine()
    mount(store, <RoutineScreen />, '/routine/am')
    expect(await screen.findByText(/خطوتين — يلا نبدأ/)).toBeInTheDocument()

    await act(() => skipAll(store))
    expect(await screen.findByText('تخطّيتيه اليوم — بكرة نرجع له')).toBeInTheDocument()
    expect(screen.queryByText(/يلا نبدأ/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ابدئي الروتين' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'انحسب' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'رجّعيه لليوم' }))
    expect(await screen.findByText(/خطوتين — يلا نبدأ/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ابدئي الروتين' })).toBeInTheDocument()
  })
})
