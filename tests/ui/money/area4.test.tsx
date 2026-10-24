/**
 * QA area4 (joy + money) regression tests — one per fixed defect where it can be exercised in jsdom.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { InMemoryLifeRepository, createLifeStore, dayKey, makeJoyItem, mkDate, type Goal, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { ThemeProvider } from '../../../src/ui/shell/theme'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import MoneyScreen from '../../../src/ui/screens/me/MoneyScreen'
import RewardsScreen from '../../../src/ui/screens/joy/RewardsScreen'
import JoyScreen from '../../../src/ui/screens/joy/JoyScreen'
import { pendingRedeems, isLockedByMilestone } from '../../../src/ui/screens/joy/joyModel'
import { monthlyDueDates } from '../../../src/ui/screens/me/moneyModel'
import { parseAmount, parseWhole } from '../../../src/ui/lib/number'
import { countWords, NOUNS } from '../../../src/ui/lib/plural'
import { library } from '../../domain/helpers'

async function makeStore(at: Date, sparks = 0): Promise<{ store: LifeStore; setNow: (d: Date) => void }> {
  let now = at
  const repo = new InMemoryLifeRepository()
  await repo.open()
  if (sparks > 0) await repo.sparkTxns.put({ id: 'spk_seed', date: '2026-10-01', amount: sparks, reason: 'adjustment', refId: null, at: null })
  const store = await createLifeStore({ repo, now: () => new Date(now), library })
  return { store, setNow: (d) => (now = d) }
}

function wrap(store: LifeStore, ui: ReactNode) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <LifeStoreProvider store={store}>
          <MemoryRouter>{ui}</MemoryRouter>
        </LifeStoreProvider>
      </ToastProvider>
    </ThemeProvider>,
  )
}

afterEach(() => pendingRedeems.clear())

describe('helpers', () => {
  it('parseAmount reads Arabic-Indic digits and the Arabic decimal separator (#6)', () => {
    expect(parseAmount('١٢٫٥')).toBe(12.5)
    expect(parseAmount('١٬٢٠٠٫٥')).toBe(1200.5)
    expect(parseAmount('1,500')).toBe(1500)
    expect(parseAmount('۴۵')).toBe(45)
    expect(parseAmount('12.5.3')).toBe(12.53)
    expect(parseAmount('')).toBe(0)
    expect(parseWhole('٦٠')).toBe(60)
  })

  it('countWords never prints a digit beside a dual (#4, #5)', () => {
    expect(countWords(2, NOUNS.spark)).toBe('شرارتين')
    expect(countWords(1, NOUNS.spark)).toBe('شرارة وحدة')
    expect(countWords(5, NOUNS.spark)).toBe('5 شرارات')
    expect(countWords(22, NOUNS.day)).toBe('22 يوم')
    expect(countWords(2, NOUNS.day)).toBe('يومين')
  })

  it('monthlyDueDates clamps to short months (#8)', () => {
    expect(monthlyDueDates(mkDate(2027, 1, 31), 3)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  })
})

describe('Money', () => {
  it('payday countdown uses the right plural (#4) and the last day reads «آخر يوم» (#15)', async () => {
    const { store, setNow } = await makeStore(mkDate(2026, 10, 30, 12))
    await store.upsertEnvelope({ id: 'env_2026-10_spend', titleAr: 'مصروف', titleEn: 'spend', month: '2026-10', planned: 3000, spent: 100 })
    const v = wrap(store, <MoneyScreen />)
    expect(await screen.findByText('باقي يومين على الراتب')).toBeInTheDocument()
    expect(screen.getByText(/الشهر يبدأ يوم/).textContent).toContain('1')
    v.unmount()
    setNow(mkDate(2026, 10, 31, 12))
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/آخر يوم بالشهر/)).toBeInTheDocument()
    expect(screen.queryByText(/أيام على الراتب/)).not.toBeInTheDocument()
  })

  it('no plan: shows the next payday and a countdown, not a past date (#16)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 24, 12))
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/الراتب الجاي/)).toHaveTextContent('1 نوفمبر')
    expect(screen.getByText(/باقي 8 أيام على الراتب/)).toBeInTheDocument()
  })

  it('changing payday keeps this month’s plan and spend, with a visible note (#2)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 24, 12))
    await store.upsertEnvelope({ id: 'env_2026-10_spend', titleAr: 'مصروف', titleEn: 'spend', month: '2026-10', planned: 3000, spent: 1500 })
    await act(() => store.setPayday(25))
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/غيّرتي يوم الراتب/)).toBeInTheDocument()
    expect(screen.getByText('مصروف الشهر لين الحين')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('pausing a bill toasts with undo and keeps it under «موقّفة» (#3)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertBill({ id: 'bill_t', title: 'test', amount: 50, dueDay: 20, isSubscription: true, active: true })
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: /خيارات|المزيد|…/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'وقّفيها' }))
    await waitFor(() => expect(store.getSnapshot().bills[0]!.active).toBe(false))
    expect(await screen.findByText('موقّفة')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(store.getSnapshot().bills[0]!.active).toBe(true))
  })

  it('wish decisions can be undone (#7) and a wish can be added by hand (#8)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertWish({ id: 'wish_t', title: 'test', addedDate: '2026-10-01', price: 300, coolingOffDays: 3, decision: null })
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: /خيارات|المزيد|…/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'ما أبيها' }))
    await waitFor(() => expect(store.getSnapshot().wishItems[0]!.decision).toBe('dropped'))
    fireEvent.click(await screen.findByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(store.getSnapshot().wishItems[0]!.decision).toBeNull())

    const wishHeader = screen.getByText('قائمة الأمنيات').closest('section') ?? document.body
    fireEvent.click(within(wishHeader as HTMLElement).getAllByRole('button', { name: 'أضيفي' })[0]!)
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByPlaceholderText(/سمّاعة/), { target: { value: 'test 2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'أضيفيها' }))
    await waitFor(() => expect(store.getSnapshot().wishItems.some((w) => w.title === 'test 2' && w.decision == null)).toBe(true))
  })

  it('adds an instalment plan with monthly due dates (#8)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    wrap(store, <MoneyScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: 'أضيفي' })[0]!)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'قسط' }))
    fireEvent.change(within(dialog).getByPlaceholderText(/جوال جديد/), { target: { value: 'test' } })
    fireEvent.change(within(dialog).getAllByRole('textbox')[1]!, { target: { value: '٢٥٠' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'أضيفيها' }))
    await waitFor(() => expect(store.getSnapshot().bnplItems.length).toBe(1))
    const b = store.getSnapshot().bnplItems[0]!
    expect(b.instalmentAmount).toBe(250)
    expect(b.dueDates).toEqual(['2026-10-14', '2026-11-14', '2026-12-14', '2027-01-14'])
  })

  it('a spend typed «١٢٫٥» is saved as 12.5 (#6)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope({ id: 'env_2026-10_spend', titleAr: 'مصروف', titleEn: 'spend', month: '2026-10', planned: 3000, spent: 0 })
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'سجّلي مصروف' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: '١٢٫٥' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'سجّليه' }))
    await waitFor(() => expect(store.getSnapshot().moneyEnvelopes[0]!.spent).toBe(12.5))
  })

  it('«دفعتها» counts for the cycle of the due date shown (#10)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 24, 12))
    await store.upsertBill({ id: 'bill_t', title: 'test', amount: 100, dueDay: 5, isSubscription: false, active: true })
    wrap(store, <MoneyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: /خيارات|المزيد|…/ }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'دفعتها' }))
    await waitFor(() => expect(store.getSnapshot().bills[0]!.paidCycles).toEqual(['2026-11-05']))
    expect(await screen.findByText(/مدفوعة مقدّم/)).toBeInTheDocument()
  })

  it('over the plan: icon + text line, no gold warning fill (#11)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertEnvelope({ id: 'env_2026-10_spend', titleAr: 'مصروف', titleEn: 'spend', month: '2026-10', planned: 3000, spent: 3400 })
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/فوق خطة المصروف/)).toBeInTheDocument()
  })

  it('a paid bill stays paid after a payday change (#2)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 24, 12))
    await store.upsertBill({ id: 'bill_t', title: 'test', amount: 100, dueDay: 5, isSubscription: false, active: true, paidCycles: ['2026-11-05'] })
    await act(() => store.setPayday(25))
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/مدفوعة مقدّم/)).toBeInTheDocument()
  })

  it('legacy cycle-key payments still read as paid', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12))
    await store.upsertBill({ id: 'bill_t', title: 'test', amount: 100, dueDay: 20, isSubscription: false, active: true, paidCycles: ['2026-10'] })
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText(/دفعتيها هالشهر/)).toBeInTheDocument()
  })

  it('at 03:00 on payday Money already shows payday (calendar day, #17)', async () => {
    const { store } = await makeStore(mkDate(2026, 11, 1, 3))
    wrap(store, <MoneyScreen />)
    expect(await screen.findByText('نزل الراتب — خلّينا نرتّب الشهر')).toBeInTheDocument()
  })
})

describe('Joy & rewards', () => {
  const goal = (rewardJoyId: string, done: boolean): Goal => ({
    id: 'g_t', domain: 'career', titleAr: 'test', titleEn: 'test', targetNote: '',
    milestones: [{ id: 'm_t', titleAr: 'test m', titleEn: 'test m', quarter: 1, done, doneDate: done ? '2026-10-01' : null, rewardJoyId }],
    linkedHabitIds: [], linkedProjectIds: [], sortOrder: 0,
  })

  it('«باقي شرارتين» / «عندك شرارتين» — no digit beside a dual (#5)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12), 2)
    await store.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'test', titleEn: 'test', price: 4 }))
    wrap(store, <RewardsScreen />)
    expect(await screen.findByText(/باقي شرارتين/)).toBeInTheDocument()
    expect(screen.getByText(/عندك شرارتين/)).toBeInTheDocument()
    expect(screen.queryByText(/2 شرارتين/)).not.toBeInTheDocument()
  })

  it('tapping the «استلميها» pill opens the redeem sheet (#1)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12), 100)
    await store.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'test', titleEn: 'test', price: 60 }))
    wrap(store, <RewardsScreen />)
    const pill = await screen.findByText('استلميها')
    // the pill no longer intercepts pointer events: its row's tap target receives the tap
    const trailing = pill.parentElement as HTMLElement
    expect(getComputedStyle(trailing).pointerEvents === 'none' || trailing.className.includes('trailing')).toBe(true)
    fireEvent.click(screen.getByText('test'))
    expect(await screen.findByRole('dialog')).toHaveTextContent('تستلمينها الحين؟')
  })

  it('a reward tied to an open milestone is listed once and locked (#9)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12), 500)
    await store.upsertJoyItem(makeJoyItem({ id: 'r_ms', kind: 'earned', titleAr: 'test ms', titleEn: 'test', price: 60 }))
    await store.upsertGoal(goal('r_ms', false))
    expect(isLockedByMilestone(store.getSnapshot(), 'r_ms')).toBe(true)
    wrap(store, <RewardsScreen />)
    expect(await screen.findAllByText('test ms')).toHaveLength(1)
    expect(screen.queryByText('استلميها')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('test ms'))
    // opens the edit sheet, never the redeem confirm
    expect(await screen.findByRole('dialog')).not.toHaveTextContent('تستلمينها الحين؟')
  })

  it('once the milestone is done the tied reward can be redeemed', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12), 500)
    await store.upsertJoyItem(makeJoyItem({ id: 'r_ms', kind: 'earned', titleAr: 'test ms', titleEn: 'test', price: 60 }))
    await store.upsertGoal(goal('r_ms', true))
    expect(isLockedByMilestone(store.getSnapshot(), 'r_ms')).toBe(false)
    wrap(store, <RewardsScreen />)
    expect(await screen.findAllByText('test ms')).toHaveLength(1)
    fireEvent.click(screen.getByText('test ms'))
    expect(await screen.findByRole('dialog')).toHaveTextContent('تستلمينها الحين؟')
  })

  it('Joy: add actions are list rows, not header links (#20)', async () => {
    const { store } = await makeStore(mkDate(2026, 10, 14, 12), 10)
    await store.upsertJoyItem(makeJoyItem({ id: 'j1', kind: 'free', titleAr: 'test', titleEn: 'test' }))
    await store.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'test r', titleEn: 'test', price: 60 }))
    wrap(store, <JoyScreen />)
    const add = await screen.findByText('أضيفي متعة')
    expect(add.closest('li, [role="listitem"], [class*="row"]')).not.toBeNull()
    expect(screen.getByText('أضيفي مكافأة')).toBeInTheDocument()
    expect(dayKey(mkDate(2026, 10, 14))).toBe('2026-10-14')
  })
})
