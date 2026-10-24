import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  InMemoryLifeRepository, createLifeStore, makeJoyItem, mkDate, sparksBalance, type Goal, type LifeStore,
} from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import JoyScreen from '../../../src/ui/screens/joy/JoyScreen'
import RewardsScreen from '../../../src/ui/screens/joy/RewardsScreen'
import {
  pendingRedeems, relinkMilestone, rewardStatus, sortRewards, todaysFreeJoy,
} from '../../../src/ui/screens/joy/joyModel'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)

async function makeStore(sparks = 0): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  if (sparks > 0)
    await repo.sparkTxns.put({ id: 'spk_seed', date: '2026-10-04', amount: sparks, reason: 'adjustment', refId: null, at: null })
  return createLifeStore({ repo, now: () => NOW, library })
}

function mount(store: LifeStore, ui: JSX.Element) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

afterEach(() => pendingRedeems.clear())

describe('joyModel', () => {
  it('rewardStatus: remaining vs ready', () => {
    const r = makeJoyItem({ id: 'r', kind: 'earned', titleAr: 'كتاب', titleEn: 'Book', price: 120 })
    expect(rewardStatus(r, 38)).toEqual({ priced: true, ready: false, remaining: 82 })
    expect(rewardStatus(r, 120)).toEqual({ priced: true, ready: true, remaining: 0 })
    expect(rewardStatus({ ...r, price: null }, 500).priced).toBe(false)
  })

  it('sortRewards puts ready first, then the closest', () => {
    const a = makeJoyItem({ id: 'a', kind: 'earned', titleAr: 'أ', titleEn: 'a', price: 200 })
    const b = makeJoyItem({ id: 'b', kind: 'earned', titleAr: 'ب', titleEn: 'b', price: 50 })
    const c = makeJoyItem({ id: 'c', kind: 'earned', titleAr: 'ج', titleEn: 'c', price: 120 })
    expect(sortRewards([a, c, b], 60).map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('todaysFreeJoy rotates daily and honours her pick', async () => {
    const store = await makeStore()
    await store.upsertJoyItem(makeJoyItem({ id: 'j1', kind: 'free', titleAr: 'قهوة', titleEn: 'Coffee' }))
    await store.upsertJoyItem(makeJoyItem({ id: 'j2', kind: 'free', titleAr: 'مشي', titleEn: 'Walk' }))
    const s = store.getSnapshot()
    const d1 = todaysFreeJoy(s, mkDate(2026, 10, 5), null)!.id
    const d2 = todaysFreeJoy(s, mkDate(2026, 10, 6), null)!.id
    expect(d1).not.toEqual(d2)
    expect(todaysFreeJoy(s, mkDate(2026, 10, 5), d2)!.id).toBe(d2)
  })

  it('relinkMilestone moves the reward link to one milestone only', () => {
    const goal: Goal = {
      id: 'g', domain: 'career', titleAr: 'هدف', titleEn: 'Goal', targetNote: '', linkedHabitIds: [], linkedProjectIds: [], sortOrder: 0,
      milestones: [
        { id: 'm1', titleAr: 'معلم ١', titleEn: 'm1', quarter: 1, done: false, doneDate: null, rewardJoyId: 'r' },
        { id: 'm2', titleAr: 'معلم ٢', titleEn: 'm2', quarter: 2, done: false, doneDate: null, rewardJoyId: null },
      ],
    }
    const [g] = relinkMilestone([goal], 'r', 'g:m2')
    expect(g.milestones.map((m) => m.rewardJoyId)).toEqual([null, 'r'])
    expect(relinkMilestone([goal], 'r', 'g:m1')).toEqual([])
  })
})

describe('JoyScreen', () => {
  it('first run: ONE empty state invites her to add a joy and a reward (no zero sparks pill)', async () => {
    const store = await makeStore()
    mount(store, <JoyScreen />)
    expect(await screen.findByText('ما فيه متعة للحين')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'أضيفي أول متعة' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'حددي مكافأة' })).toBeInTheDocument()
    expect(screen.queryByText('ما حددتي مكافأة للحين')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /مكافآتك$/ })).not.toBeInTheDocument()
  })

  it('today’s joy: «سوّيتها» logs it (no sparks) and can be undone', async () => {
    const store = await makeStore()
    await store.upsertJoyItem(makeJoyItem({ id: 'j1', kind: 'free', titleAr: 'قهوة وكتاب', titleEn: 'Coffee & book' }))
    mount(store, <JoyScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'سوّيتها' }))
    expect(await screen.findByText('انحسبت لك')).toBeInTheDocument()
    expect(store.getSnapshot().logs.some((l) => l.itemId === 'j1' && l.kind === 'joy')).toBe(true)
    expect(sparksBalance(store.getSnapshot())).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(store.getSnapshot().logs.some((l) => l.itemId === 'j1')).toBe(false))
  })

  it('sparks pill shows the balance', async () => {
    const store = await makeStore(38)
    mount(store, <JoyScreen />)
    expect(await screen.findByRole('button', { name: '38 شرارة — مكافآتك' })).toBeInTheDocument()
  })
})

describe('RewardsScreen', () => {
  it('shows «باقي X شرارة» and «استحقيتيها»; redeem confirms, holds sparks, and undo cancels', async () => {
    const store = await makeStore(100)
    await store.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'حبوب قهوة', titleEn: 'Beans', price: 60 }))
    await store.upsertJoyItem(makeJoyItem({ id: 'r2', kind: 'earned', titleAr: 'كتاب جديد', titleEn: 'Book', price: 180 }))
    mount(store, <RewardsScreen />)

    expect(await screen.findByText('استحقيتيها — استمتعي')).toBeInTheDocument()
    expect(screen.getByText(/باقي 80 شرارة/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('حبوب قهوة'))
    const confirm = await screen.findByRole('dialog')
    fireEvent.click(within(confirm).getByRole('button', { name: 'استلميها' }))
    expect(await screen.findByText('استلمتيها — استمتعي')).toBeInTheDocument()
    expect(screen.getByText(/عندك/).textContent).toContain('40') // balance shown minus the held 60

    fireEvent.click(screen.getByRole('button', { name: 'تراجع' }))
    await waitFor(() => expect(pendingRedeems.has('r1')).toBe(false))
    expect(sparksBalance(store.getSnapshot())).toBe(100)
  })

  it('a confirmed redeem is written to the ledger right away (undo reverses it)', async () => {
    const store = await makeStore(100)
    await store.upsertJoyItem(makeJoyItem({ id: 'r1', kind: 'earned', titleAr: 'حبوب قهوة', titleEn: 'Beans', price: 60 }))
    mount(store, <RewardsScreen />)
    fireEvent.click(await screen.findByText('حبوب قهوة'))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'استلميها' }))
    await waitFor(() => expect(sparksBalance(store.getSnapshot())).toBe(40))
  })

  it('add reward: price required, saved as an earned item', async () => {
    const store = await makeStore()
    mount(store, <RewardsScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'أضيفي مكافأة' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('وش هي؟'), { target: { value: 'طلعة مع صديقتي' } })
    fireEvent.change(within(dialog).getByLabelText('كم شرارة؟'), { target: { value: '١٥٠' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'أضيفيها' }))
    await waitFor(() => {
      const r = store.getSnapshot().joyItems.find((j) => j.titleAr === 'طلعة مع صديقتي')
      expect(r).toMatchObject({ kind: 'earned', price: 150 })
    })
  })

  it('milestone rewards list what unlocks them', async () => {
    const store = await makeStore()
    await store.upsertJoyItem(makeJoyItem({ id: 'rm', kind: 'earned', titleAr: 'عشاء برا', titleEn: 'Dinner out' }))
    await store.upsertGoal({
      id: 'g', domain: 'career', titleAr: 'البورتفوليو', titleEn: 'Portfolio', targetNote: '', linkedHabitIds: [], linkedProjectIds: [], sortOrder: 0,
      milestones: [{ id: 'm1', titleAr: 'أول دراسة حالة', titleEn: 'First case study', quarter: 1, done: false, doneDate: null, rewardJoyId: 'rm' }],
    })
    mount(store, <RewardsScreen />)
    expect(await screen.findByText('مكافآت المعالم')).toBeInTheDocument()
    expect(screen.getByText('عشاء برا')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && /^لما تخلصين: أول دراسة حالة/.test(el.textContent ?? ''))).toBeInTheDocument()
  })
})

import { within } from '@testing-library/react'
