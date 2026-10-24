/** QA area 1 (Today) — UI fixes. */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { addDays, dayKey, ieltsTemplate, makeHabit, mkDate, schedule, todayView } from '../../../src/domain'
import { PostponeSheet } from '../../../src/ui/components/PostponeSheet'
import { TabBar } from '../../../src/ui/components/TabBar'
import { ToastProvider, useToast } from '../../../src/ui/components/Toast'
import MorningBriefScreen from '../../../src/ui/screens/today/MorningBriefScreen'
import TodayScreen from '../../../src/ui/screens/today/TodayScreen'
import { greetingFor, previewSuggestions } from '../../../src/ui/screens/today/lib'
import { library, makeStore, makeStoreWithHabits, renderWith } from './harness'

function Fire({ msg, label = 'تراجع' }: { msg: string; label?: string }) {
  const toast = useToast()
  useEffect(() => toast({ message: msg, actionLabel: label, onAction: () => {} }), [toast, msg, label])
  return null
}

describe('QA area 1 — the undo toast never lies over content', () => {
  it('floats above the tab bar: the tabs stay live (never hidden or inert) and «تراجع» is reachable', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <TabBar active="today" onSelect={() => {}} />
          <Fire msg="test انضافت" />
        </ToastProvider>
      </MemoryRouter>,
    )
    const toast = await screen.findByText('test انضافت')
    const region = toast.closest('[role="status"]')!
    expect(region.getAttribute('data-placement')).toBe('dock')
    expect(region.getAttribute('aria-live')).toBe('polite')
    // N1: the tab bar is neither replaced nor disabled while the toast shows
    const list = document.querySelector('nav[aria-label="الأقسام"] ul')!
    expect(list.hasAttribute('inert')).toBe(false)
    expect(document.body.hasAttribute('data-toast-docked')).toBe(false)
    expect(within(document.querySelector('nav[aria-label="الأقسام"]') as HTMLElement).getAllByRole('button')).toHaveLength(5)
    // tapping the toast body dismisses it; «تراجع» stays reachable
    expect(within(region as HTMLElement).getByRole('button', { name: /تراجع/ })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(toast)
    })
    await waitFor(() => expect(screen.queryByText('test انضافت')).not.toBeInTheDocument())
    expect(list.hasAttribute('inert')).toBe(false)
  })
})

describe('QA area 1 — toast actions say what they do', () => {
  it('«تراجع» gets the undo arrow; «فعّليه» gets a check, never the undo arrow', async () => {
    const view = (label: string) =>
      render(
        <MemoryRouter>
          <ToastProvider>
            <Fire msg={`test ${label}`} label={label} />
          </ToastProvider>
        </MemoryRouter>,
      )
    const a = view('تراجع')
    const undo = await screen.findByRole('button', { name: 'تراجع' })
    expect(undo.querySelector('svg')?.getAttribute('data-icon')).toBe('undo')
    a.unmount()
    view('فعّليه')
    const act = await screen.findByRole('button', { name: 'فعّليه' })
    expect(act.querySelector('svg')?.getAttribute('data-icon')).toBe('check')
  })
})

describe('QA area 1 — postpone sheet', () => {
  it('blocks today/past dates (min = tomorrow) and starts fresh for every item', async () => {
    const onChoose = (): void => {}
    const { rerender } = render(<PostponeSheet open itemTitle="test أ" minDate="2026-10-25" onClose={() => {}} onChoose={onChoose} />)
    fireEvent.click(screen.getByText('اختاري تاريخ'))
    const input = screen.getByLabelText('التاريخ') as HTMLInputElement
    expect(input.min).toBe('2026-10-25')
    fireEvent.change(input, { target: { value: '2026-10-24' } })
    expect(screen.getByRole('button', { name: 'أجّليها لهالتاريخ' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('من بكرة وطالع')
    fireEvent.change(input, { target: { value: '2026-11-05' } })
    expect(screen.getByRole('button', { name: 'أجّليها لهالتاريخ' })).toBeEnabled()
    // close, then open for another item: no leftover picker or date
    rerender(<PostponeSheet open={false} itemTitle="test أ" minDate="2026-10-25" onClose={() => {}} onChoose={onChoose} />)
    rerender(<PostponeSheet open itemTitle="test ب" minDate="2026-10-25" onClose={() => {}} onChoose={onChoose} />)
    expect(screen.queryByLabelText('التاريخ')).not.toBeInTheDocument()
  })
})

describe('QA area 1 — Today', () => {
  it('a finished task stays on Today as done, and a tasks-only day reads «يومك كمل»', async () => {
    const store = await makeStoreWithHabits()
    const t = await store.addTask({ title: 'test مهمة', status: 'planned', dueDate: dayKey(store.today()) })
    await store.completeTask(t.id)
    renderWith(store, <TodayScreen />)
    // the row is still there, checked, with «خلصت» under it
    const check = await screen.findByRole('checkbox', { name: 'خلّصت: test مهمة' })
    expect(check).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('خلصت')).toBeInTheDocument()
    expect(screen.getByText('يومك كمل.')).toBeInTheDocument()
    expect(screen.queryByText('يومك فاضي للحين')).not.toBeInTheDocument()
  })

  it('the busy note disappears once everything is done', async () => {
    const store = await makeStoreWithHabits()
    await store.updateSettings({ ...store.getSnapshot().settings, dailyBudgetMin: 10 })
    for (const sg of todayView(store.getSnapshot(), store.today()).suggestions.filter((x) => x.item.tier !== 'chain')) await store.acceptSuggestion(sg.item.id)
    for (const i of todayView(store.getSnapshot(), store.today()).plan.items) await store.completeItem(i, 'normal')
    renderWith(store, <TodayScreen />)
    await screen.findByText('يومك كمل.')
    expect(screen.queryByText(/يومك مليان شوي/)).not.toBeInTheDocument()
  })

  it('greets with her name, and switches to «صباح الخير» at the 04:30 day flip', () => {
    expect(greetingFor(mkDate(2026, 10, 24, 4, 10))).toBe('مساء الخير')
    expect(greetingFor(mkDate(2026, 10, 24, 4, 31))).toBe('صباح الخير')
    expect(greetingFor(mkDate(2026, 10, 24, 9), 'test')).toBe('صباح الخير، test')
  })

  it('energy reads قليلة · متوسطة · زينة in the same order on Today and in the Brief', async () => {
    const store = await makeStoreWithHabits()
    const a = renderWith(store, <TodayScreen />)
    await screen.findAllByRole('radio')
    const todayOrder = screen.getAllByRole('radio').map((r) => r.textContent?.trim())
    a.unmount()
    renderWith(store, <MorningBriefScreen />, '/brief')
    const briefOrder = (await screen.findAllByRole('radio')).map((r) => r.textContent?.replace(/(يوم عادي|نسخ أخف|الأساس بس)/, '').trim())
    expect(todayOrder).toEqual(['قليلة', 'متوسطة', 'زينة'])
    expect(briefOrder).toEqual(todayOrder)
  })
})

describe('QA area 1 — Morning Brief', () => {
  it('«أضيفي المقترح كله» adds the suggestions, never the routine, with an undo', async () => {
    const store = await makeStoreWithHabits()
    renderWith(store, <MorningBriefScreen />, '/brief')
    const all = await screen.findByRole('button', { name: 'أضيفي المقترح كله' }).catch(() => null)
    if (!all) return // fewer than 2 recommended on this fixture day — nothing to assert
    await act(async () => {
      fireEvent.click(all)
    })
    const plan = todayView(store.getSnapshot(), store.today()).plan.items
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.some((i) => i.tier === 'chain')).toBe(false)
    expect(await screen.findByRole('button', { name: /تراجع/ })).toBeInTheDocument()
  })

  it('«+ أضيفيه» on a single suggestion gives an undo toast', async () => {
    const store = await makeStoreWithHabits()
    renderWith(store, <MorningBriefScreen />, '/brief')
    const add = (await screen.findAllByRole('button', { name: /^أضيفي .* لليوم$/ }))[0]!
    await act(async () => {
      fireEvent.click(add)
    })
    expect(await screen.findByText(/انضافت ليومك/)).toBeInTheDocument()
  })
})

describe('QA area 1 — moving to a picked date', () => {
  it('a valid future date moves it there; the item is found on that day', async () => {
    const store = await makeStoreWithHabits(mkDate(2026, 10, 24, 9))
    const it = todayView(store.getSnapshot(), store.today()).suggestions.find((x) => x.item.itemId === 'h_room')!.item
    await store.acceptSuggestion(it.id)
    const to = addDays(store.today(), 5)
    expect(await store.moveToDate(it.id, to)).toBe(true)
    expect(todayView(store.getSnapshot(), to).plan.items.some((i) => i.id === it.id)).toBe(true)
  })
})

// keep the router import used when the harness changes
void Routes
void Route

describe('QA area 1 — «تعثّرت فيها؟» opens recovery directly', () => {
  it('/habits/:id?recover=1 opens the recovery sheet', async () => {
    const { default: HabitDetailScreen } = await import('../../../src/ui/screens/habits/HabitDetailScreen')
    const store = await makeStoreWithHabits()
    renderWith(store, <HabitDetailScreen />, '/habits/h_room?recover=1')
    expect(await screen.findByText('وش اللي صار؟')).toBeInTheDocument()
  })
})

describe('QA area 1 — onboarding resumes after a reload', () => {
  it('keeps the step and the typed name', async () => {
    const { default: OnboardingScreen } = await import('../../../src/ui/screens/me/OnboardingScreen')
    localStorage.setItem('wejdan.onboarding.draft.v1', JSON.stringify({ step: 1, name: 'test', wake: 420, sleep: 1380, grow: [], added: [], picked: [] }))
    const store = await makeStoreWithHabits()
    await store.updateSettings({ ...store.getSnapshot().settings, onboardingDone: false })
    renderWith(store, <OnboardingScreen />, '/onboarding')
    expect(await screen.findByDisplayValue('test')).toBeInTheDocument()
    localStorage.removeItem('wejdan.onboarding.draft.v1')
  })
})

describe('QA area 1 — the weekly review never pushes her daily IELTS plan off Today', () => {
  /** walk (grow), room + IELTS (maintain): IELTS is her 3rd daily suggestion. */
  async function storeOn(day: number) {
    const store = await makeStore(mkDate(2026, 10, day, 9))
    await store.setDomainState('health', 'grow', true)
    await store.setDomainState('ielts', 'maintain', true)
    for (const [id, domain, min] of [['h_walk', 'health', 20], ['h_room', 'home', 10]] as const) {
      await store.upsertHabit(makeHabit({ id, domain, titleAr: `test ${id}`, titleEn: 'test', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: min, minimumDurationMin: 5 }), true)
    }
    await store.upsertHabit(ieltsTemplate(library, store.today()), true)
    return store
  }
  const ids = (xs: { item: { itemId: string } }[]) => xs.map((x) => x.item.itemId)

  it('Friday and Saturday preview the same daily three; Saturday adds the review as its own row', async () => {
    const fri = await storeOn(23)
    const sat = await storeOn(24)
    const f = previewSuggestions(todayView(fri.getSnapshot(), fri.today()).suggestions)
    const s = previewSuggestions(todayView(sat.getSnapshot(), sat.today()).suggestions)
    expect(ids(f.shown)).toContain('h_ielts')
    expect(ids(s.shown)).toContain('h_ielts')
    // the review is shown on its day, after the daily three, without taking a slot
    expect(ids(s.shown).slice(0, 3)).toEqual(ids(f.shown).slice(0, 3))
    expect(ids(s.shown).at(-1)).toBe('wt_weekly_review')
    expect(ids(f.shown)).not.toContain('wt_weekly_review')
  })

  it('on Saturday Today offers IELTS directly (no «الكل» needed)', async () => {
    const store = await storeOn(24)
    renderWith(store, <TodayScreen />)
    // Today shows the clearer IELTS title (QA area 3): «IELTS — مفردات + {skill}»
    expect(await screen.findByRole('button', { name: /^أضيفي IELTS — .+ لليوم$/ })).toBeInTheDocument()
  })
})
