/**
 * QA area 2 fixes (UI): routine player honesty, Studio errors/clamp/plurals/semantics,
 * the «صيانة» cap on new habits, long-press menu persistence, bidi-safe toast names,
 * Garden view switch, recovery trace.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createLifeStore, InMemoryLifeRepository, makeHabit, mkDate, productsBySlot, type LifeStore } from '../../../src/domain'
import { ContextMenu } from '../../../src/ui/components/ContextMenu'
import { ToastProvider } from '../../../src/ui/components/Toast'
import GardenScreen from '../../../src/ui/screens/habits/GardenScreen'
import HabitDetailScreen from '../../../src/ui/screens/habits/HabitDetailScreen'
import HabitStudioScreen from '../../../src/ui/screens/habits/HabitStudioScreen'
import RoutinePlayerScreen from '../../../src/ui/screens/habits/RoutinePlayerScreen'
import { quoted } from '../../../src/ui/screens/habits/shared'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { library } from '../../domain/helpers'

const NOW = mkDate(2026, 10, 5, 10)

async function makeStore(): Promise<LifeStore> {
  const repo = new InMemoryLifeRepository()
  await repo.open()
  return createLifeStore({ repo, now: () => NOW, library })
}
/** Exactly five «صيانة» domains and at least one resting one (the cap scenario from QA). */
async function fillMaintain(store: LifeStore) {
  const ok = (d: { enabled: boolean; sensitive: boolean }) => d.enabled && !d.sensitive
  for (;;) {
    const s = store.getSnapshot()
    const maintain = s.domains.filter((d) => ok(d) && d.state === 'maintain')
    const rest = s.domains.filter((d) => ok(d) && d.state === 'rest')
    if (maintain.length >= 5 || rest.length <= 1) break
    await store.setDomainState(rest[rest.length - 1]!.id, 'maintain', true)
  }
}
async function adoptAll(store: LifeStore) {
  for (const p of store.getSnapshot().products) if (p.placeholder) await store.upsertProduct({ ...p, placeholder: false, active: true })
}
function mount(store: LifeStore, ui: JSX.Element, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <LifeStoreProvider store={store}>{ui}</LifeStoreProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('routine player — the star only for real achievement (#2)', () => {
  it('skipping every step ends calmly, with no star and no «خلصتي»', async () => {
    const store = await makeStore()
    await adoptAll(store)
    const n = productsBySlot(store.getSnapshot()).pm.length
    mount(store, <RoutinePlayerScreen />, '/routine/pm/play')
    for (let i = 0; i < n; i++) {
      fireEvent.click(await screen.findByRole('button', { name: 'تخطّي هالخطوة' }))
      await waitFor(() => expect(store.getSnapshot().logs.filter((l) => l.level === 'skipped').length).toBe(i + 1))
    }
    expect(await screen.findByRole('heading', { name: 'تخطّيتي روتين المسا اليوم' })).toBeInTheDocument()
    expect(screen.getByText(/عادي — ما ينحسب عليك شي/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'انحسب' })).not.toBeInTheDocument()
    expect(screen.queryByText(/خلصتي/)).not.toBeInTheDocument()
  })

  it('one real step earns the star, with an honest «n من total»', async () => {
    const store = await makeStore()
    await adoptAll(store)
    const n = productsBySlot(store.getSnapshot()).pm.length
    mount(store, <RoutinePlayerScreen />, '/routine/pm/play')
    fireEvent.click(await screen.findByRole('button', { name: 'خلصت' }))
    for (let i = 1; i < n; i++) {
      await waitFor(() => expect(screen.getByRole('button', { name: 'تخطّي هالخطوة' })).not.toBeDisabled())
      fireEvent.click(screen.getByRole('button', { name: 'تخطّي هالخطوة' }))
    }
    expect(await screen.findByRole('img', { name: 'انحسب' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: `سوّيتي 1 من ${n}` })).toBeInTheDocument()
  })
})

describe('Studio (#5, #11, #12, #13)', () => {
  it('saving from the top bar with no name shows the error at the name field and focuses it', async () => {
    const store = await makeStore()
    mount(store, <HabitStudioScreen />, '/studio')
    fireEvent.click(await screen.findByRole('button', { name: 'احفظي' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('اكتبي اسم العادة')
    const input = screen.getByPlaceholderText('مثلًا: مشي هادي')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(document.activeElement).toBe(input)
  })

  it('one day reads «يوم واحد»; slot chips are radios', async () => {
    const store = await makeStore()
    mount(store, <HabitStudioScreen />, '/studio')
    // deselect six of the seven days
    const days = within(await screen.findByRole('group', { name: 'الأيام' })).getAllByRole('button')
    for (const chip of days.slice(0, 6)) fireEvent.click(chip)
    await waitFor(() => expect(screen.getByText(/يوم واحد/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('radio', { name: 'فترة' }))
    const group = await screen.findByRole('radiogroup', { name: 'الفترة' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.length).toBeGreaterThan(2)
    expect(radios.some((r) => r.getAttribute('aria-checked') === 'true')).toBe(true)
  })
})

describe('the «صيانة» cap on a new habit (#4)', () => {
  it('a habit in a resting domain never silently makes a 6th maintain domain', async () => {
    const store = await makeStore()
    await fillMaintain(store)
    const s0 = store.getSnapshot()
    const maintain0 = s0.domains.filter((d) => d.enabled && d.state === 'maintain').length
    const resting = s0.domains.find((d) => d.enabled && !d.sensitive && d.state === 'rest')!
    expect(maintain0).toBe(5)
    mount(store, <HabitStudioScreen />, '/studio')
    fireEvent.change(await screen.findByPlaceholderText('مثلًا: مشي هادي'), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(resting.nameAr) }))
    fireEvent.click(screen.getByRole('button', { name: 'احفظي العادة' }))
    expect(await screen.findByText('مجالاتك للصيانة مليانة')).toBeInTheDocument()
    expect(store.getSnapshot().domains.filter((d) => d.enabled && d.state === 'maintain').length).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: 'خلّي مجالها مرتاح' }))
    await waitFor(() => expect(store.getSnapshot().habits.some((h) => h.titleAr === 'test')).toBe(true))
    expect(store.getSnapshot().domains.find((d) => d.id === resting.id)!.state).toBe('rest')
    expect(store.getSnapshot().domains.filter((d) => d.enabled && d.state === 'maintain').length).toBe(5)
  })

  it('swapping rests another domain and wakes hers — still five', async () => {
    const store = await makeStore()
    await fillMaintain(store)
    const s0 = store.getSnapshot()
    const resting = s0.domains.find((d) => d.enabled && !d.sensitive && d.state === 'rest')!
    mount(store, <HabitStudioScreen />, '/studio')
    fireEvent.change(await screen.findByPlaceholderText('مثلًا: مشي هادي'), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(resting.nameAr) }))
    fireEvent.click(screen.getByRole('button', { name: 'احفظي العادة' }))
    const sheet = await screen.findByText('ريّحي واحد بداله')
    const list = sheet.closest('section') ?? document.body
    const first = within(list as HTMLElement).getAllByRole('button')[0]!
    fireEvent.click(first)
    await waitFor(() => expect(store.getSnapshot().domains.find((d) => d.id === resting.id)!.state).toBe('maintain'))
    expect(store.getSnapshot().domains.filter((d) => d.enabled && d.state === 'maintain').length).toBe(5)
  })
})

describe('long-press menu (#7)', () => {
  it('stays open when the finger lifts; the next press outside closes it', async () => {
    vi.useFakeTimers()
    try {
      render(
        <ContextMenu label="خيارات" items={[{ key: 'a', label: 'test', onSelect: () => {} }]}>
          <div>row</div>
        </ContextMenu>,
      )
      const target = screen.getByText('row')
      fireEvent.pointerDown(target, { pointerType: 'touch', clientX: 10, clientY: 10 })
      act(() => void vi.advanceTimersByTime(600))
      expect(screen.getByRole('menu')).toBeInTheDocument()
      // the lifting finger: pointerup on the row, then the click lands on the backdrop
      fireEvent.pointerUp(target, { pointerType: 'touch' })
      const backdrop = document.querySelector('[class*="backdrop"]') as HTMLElement
      fireEvent.click(backdrop)
      expect(screen.getByRole('menu')).toBeInTheDocument()
      // a new press outside closes it
      fireEvent.pointerDown(backdrop, { pointerType: 'touch' })
      act(() => void vi.advanceTimersByTime(400))
    } finally {
      vi.useRealTimers()
    }
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })
})

describe('long-press menu closes on route change', () => {
  it('a hash navigation while the menu is open closes it', async () => {
    vi.useFakeTimers()
    try {
      render(
        <ContextMenu label="خيارات" items={[{ key: 'a', label: 'test', onSelect: () => {} }]}>
          <div>row</div>
        </ContextMenu>,
      )
      fireEvent.pointerDown(screen.getByText('row'), { pointerType: 'touch', clientX: 10, clientY: 10 })
      act(() => void vi.advanceTimersByTime(600))
      expect(screen.getByRole('menu')).toBeInTheDocument()
      act(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      act(() => void vi.advanceTimersByTime(400))
    } finally {
      vi.useRealTimers()
    }
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })
})

describe('bidi-safe names in toasts (#3)', () => {
  it('isolates Latin/number runs so «SPF 30+» keeps its order', () => {
    const q = quoted('واقي شمس SPF 30+')
    expect(q).toBe('«واقي شمس ⁦SPF 30+⁩»')
  })
})

describe('Garden view switch (#9, #10)', () => {
  it('«حديقتي» shows the bed only; «قائمة» shows the list; rooted reads «متجذرة»', async () => {
    const store = await makeStore()
    await store.upsertHabit(makeHabit({ id: 'h1', domain: 'care', titleAr: 'test', titleEn: '' }), true)
    mount(store, <GardenScreen />, '/habits/garden')
    expect(await screen.findByRole('region', { name: 'حوض الورد' })).toBeInTheDocument()
    const listMark = /النجمة تطلع بس للعادة اللي صارت متجذرة/
    expect(screen.queryByText(listMark)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'قائمة' }))
    expect(await screen.findByText(listMark)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'حوض الورد' })).not.toBeInTheDocument()
  })
})

describe('recovery shrink is visible and reversible (#6)', () => {
  it('a shrunk habit says so on its detail and goes back to normal', async () => {
    const store = await makeStore()
    await store.upsertHabit(makeHabit({ id: 'h1', domain: 'care', titleAr: 'test', titleEn: '', shrunkToMinimum: true }), true)
    mount(store, <HabitDetailScreen />, '/habits/h1')
    expect(await screen.findByText('على النسخة الصغيرة فترة')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'رجّعيها للعادية' }))
    await waitFor(() => expect(store.getSnapshot().habits.find((h) => h.id === 'h1')!.shrunkToMinimum).toBe(false))
  })
})
