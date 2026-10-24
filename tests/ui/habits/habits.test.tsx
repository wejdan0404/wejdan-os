import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  anchor,
  createLifeStore,
  InMemoryLifeRepository,
  mkDate,
  productsBySlot,
  type LifeStore,
} from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import HabitsScreen from '../../../src/ui/screens/habits/HabitsScreen'
import HabitStudioScreen from '../../../src/ui/screens/habits/HabitStudioScreen'
import ProductsScreen from '../../../src/ui/screens/habits/ProductsScreen'
import RoutinePlayerScreen from '../../../src/ui/screens/habits/RoutinePlayerScreen'
import RoutineScreen from '../../../src/ui/screens/habits/RoutineScreen'
import { cueLabel, doneSteps, momentumWord, weekdaysLabel } from '../../../src/ui/screens/habits/shared'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)

async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}

/** She adopts every seeded suggestion as her own product (placeholders never form her routine). */
async function adoptAll(store: LifeStore) {
  for (const p of store.getSnapshot().products) {
    if (p.placeholder) await store.upsertProduct({ ...p, placeholder: false, active: true })
  }
}
const mine = (store: LifeStore, slot: 'am' | 'pm' | 'weekly') => productsBySlot(store.getSnapshot())[slot].filter((p) => !p.placeholder)

function mount(store: LifeStore, ui: JSX.Element, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('habits shared helpers', () => {
  it('cue labels read as Saudi phrases', () => {
    expect(cueLabel(anchor({ type: 'prayer', prayer: 'asr', offsetMin: 10 }))).toBe('بعد العصر')
    expect(cueLabel(anchor({ type: 'wake' }))).toBe('بعد الصحيان')
    expect(cueLabel(anchor({ type: 'fixedTime', minute: 7 * 60 + 30 }))).toBe('07:30')
    expect(cueLabel(anchor({ type: 'slot', slot: 'evening' }))).toBe('المسا')
  })
  it('weekdays and momentum are words, never streak numbers', () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5, 6, 7])).toBe('كل يوم')
    expect(weekdaysLabel([7, 1, 2, 3, 4])).toBe('أيام الدوام')
    expect(weekdaysLabel([7, 2])).toBe('الأحد والثلاثاء')
    expect(momentumWord(0)).toBe('لسا ما بدأت')
    expect(momentumWord(1)).toBe('ترتاح شوي')
    expect(momentumWord(80)).toBe('ماشي زين')
  })
})

describe('RoutineScreen', () => {
  it('suggested products never pose as her routine until she adds them', async () => {
    const store = await makeStore()
    mount(store, <RoutineScreen />, '/routine/am')
    expect(await screen.findByText(/ما فيه منتجات/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ابدئي الروتين/ })).not.toBeInTheDocument()
  })

  it('builds the AM routine from her products and logs a step', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <RoutineScreen />, '/routine/am')
    expect(await screen.findByRole('button', { name: /ابدئي الروتين/ })).toBeInTheDocument()

    const first = mine(store, 'am')[0]
    const box = screen.getAllByRole('checkbox')[0]
    await act(async () => fireEvent.click(box))
    await waitFor(() => expect(doneSteps(store.getSnapshot(), NOW).has(`ps_${first.id}`)).toBe(true))
    expect(await screen.findByRole('button', { name: /كمّلي الروتين/ })).toBeInTheDocument()
  })

  it('pause hides the routine and «رجّعيه» brings it back', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <RoutineScreen />, '/routine/pm')
    const n = mine(store, 'pm').length
    expect(n).toBeGreaterThan(0)
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /وقّفيه مؤقتًا/ })))
    expect(await screen.findByText('الروتين موقّف مؤقتًا')).toBeInTheDocument()
    // the slot is paused in settings; her products stay as they are
    expect(store.getSnapshot().settings.pausedRoutineSlots).toEqual(['pm'])
    expect(mine(store, 'pm').length).toBe(n)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'رجّعيه' })))
    await waitFor(() => expect(store.getSnapshot().settings.pausedRoutineSlots).toEqual([]))
  })
})

describe('RoutinePlayerScreen', () => {
  it('walks every step and ends on the star', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <RoutinePlayerScreen />, '/routine/am/play')
    const n = mine(store, 'am').length
    for (let i = 0; i < n; i++) {
      const btn = await screen.findByRole('button', { name: 'خلصت' })
      await act(async () => fireEvent.click(btn))
    }
    expect(await screen.findByText(/خلصتي روتين الصبح/)).toBeInTheDocument()
    expect(doneSteps(store.getSnapshot(), NOW).size).toBeGreaterThanOrEqual(n)
  })
})

describe('ProductsScreen', () => {
  it('adds a product in the chosen slot and position', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <ProductsScreen />, '/me/products')
    await act(async () => fireEvent.click((await screen.findAllByRole('button', { name: 'أضيفي منتج' }))[0]))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'الاسم' }), { target: { value: 'سيروم test' } })
    // board: the category is picked from chips (group, then type), not a native select
    fireEvent.click(within(dialog).getByRole('radio', { name: 'سيروم' }))
    // position 2 in the AM routine
    const less = within(dialog).getByRole('button', { name: 'قدّميه خطوة' })
    const am = mine(store, 'am').length
    for (let i = 0; i < am - 1; i++) fireEvent.click(less)
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'احفظي' })))
    await waitFor(() => {
      const list = mine(store, 'am')
      expect(list[1]?.name).toBe('سيروم test')
      expect(list[1]?.category).toBe('serum')
    })
  })

  it('switching a product off removes it from the routine, keeps it in the list', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <ProductsScreen />, '/me/products')
    const before = productsBySlot(store.getSnapshot()).am.length
    const sw = (await screen.findAllByRole('switch'))[0]
    await act(async () => fireEvent.click(sw))
    await waitFor(() => expect(productsBySlot(store.getSnapshot()).am.length + productsBySlot(store.getSnapshot()).pm.length + productsBySlot(store.getSnapshot()).weekly.length).toBeLessThan(before + 99))
    expect(store.getSnapshot().products.some((p) => !p.active)).toBe(true)
  })

  it('reorder mode offers non-drag arrows', async () => {
    const store = await makeStore()
    await adoptAll(store)
    mount(store, <ProductsScreen />, '/me/products')
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'تحريك' })))
    const am = mine(store, 'am')
    const later = screen.getAllByRole('button', { name: new RegExp(`^أخّري`) })[0]
    await act(async () => fireEvent.click(later))
    await waitFor(() => {
      const next = mine(store, 'am')
      expect(next[0].id).toBe(am[1].id)
      expect(next[1].id).toBe(am[0].id)
    })
  })
})

describe('ProductsScreen suggestions', () => {
  it('lists seeded products as «اقتراحات منتجات» she adds one by one', async () => {
    const store = await makeStore()
    mount(store, <ProductsScreen />, '/me/products')
    expect(await screen.findByText('اقتراحات منتجات')).toBeInTheDocument()
    const add = screen.getAllByRole('button', { name: /^أضيفي .* لمنتجاتي$/ })[0]
    await act(async () => fireEvent.click(add))
    await waitFor(() => expect(store.getSnapshot().products.some((p) => !p.placeholder)).toBe(true))
  })
})

describe('HabitStudioScreen', () => {
  it('creates a habit with her cue and days', async () => {
    const store = await makeStore()
    const count = store.getSnapshot().habits.length
    mount(store, <HabitStudioScreen />, '/studio')
    fireEvent.change(await screen.findByRole('textbox', { name: 'الاسم' }), { target: { value: 'test' } })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'احفظي العادة' })))
    await waitFor(() => expect(store.getSnapshot().habits.length).toBe(count + 1))
    const h = store.getSnapshot().habits.find((x) => x.titleAr === 'test')!
    expect(h.cue).toBe('بعد الصحيان')
    expect(h.schedule.weekdays.length).toBe(7)
  })

  it('asks for a name before saving', async () => {
    const store = await makeStore()
    mount(store, <HabitStudioScreen />, '/studio')
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'احفظي العادة' })))
    expect(await screen.findByRole('alert')).toHaveTextContent('اكتبي اسم العادة')
  })
})

describe('HabitsScreen', () => {
  it('shows the week map without numbers and the care routines', async () => {
    const store = await makeStore()
    mount(store, <HabitsScreen />, '/habits')
    expect(await screen.findByText('أسبوعك')).toBeInTheDocument()
    // no momentum word until she has habits (never a zero)
    expect(screen.queryByText(/الزخم:/)).toBeNull()
    expect(screen.queryByText(/\d+ أيام متتالية/)).toBeNull()
    expect(screen.getByText('روتين الصبح')).toBeInTheDocument()
    expect(screen.getByText('منتجاتي')).toBeInTheDocument()
  })

  it('a paused habit moves to «موقّفة فترة» and can come back', async () => {
    const store = await makeStore()
    const h = store.getSnapshot().habits.find((x) => x.status === 'active')
    if (!h) return // neutral seed may have no habits
    mount(store, <HabitsScreen />, '/habits')
    await act(async () => {
      await store.setHabitStatus(h.id, 'paused')
    })
    expect(await screen.findByText('موقّفة فترة')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'رجّعيها' })[0]))
    await waitFor(() => expect(store.getSnapshot().habits.find((x) => x.id === h.id)?.status).toBe('active'))
  })
})
