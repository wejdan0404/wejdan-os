/** Release gate 6 polish: DayReady counts match the headers, the overload line is said once, routine progress is honest. Data named "test". */
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DayReady } from '../../../src/ui/screens/today/DayReady'
import { ReviewDots } from '../../../src/ui/screens/me/review/ReviewDots'
import type { DaySummary, WeeklyMomentum } from '../../../src/domain'

const summary = (over: boolean): DaySummary => ({
  core: { count: 3, done: 3 }, maintain: { count: 2, done: 2 }, joy: { count: 0, done: 0 },
  total: 5, done: 5, progress: 1, caps: { core: 3, maintain: 2 }, overCap: { core: over, maintain: false },
})
const momentum: WeeklyMomentum = { value: 50, hasHabits: true, resting: false }

describe('DayReady (gate 6 D4/D6)', () => {
  it('D4: the card footnote is dropped when the page already shows the busy banner', () => {
    const { rerender } = render(<DayReady summary={summary(true)} momentum={momentum} energy="green" />)
    expect(screen.getByText(/يومك أكثر من المعتاد/)).toBeInTheDocument()
    rerender(<DayReady summary={summary(true)} momentum={momentum} energy="green" busyShown />)
    expect(screen.queryByText(/يومك أكثر من المعتاد/)).not.toBeInTheDocument()
  })
  it('D6: 5 من 5 never stands alone while a routine still has open steps', () => {
    const { rerender } = render(<DayReady summary={summary(false)} momentum={momentum} energy="green" />)
    expect(screen.queryByText(/الروتين له خطه/)).not.toBeInTheDocument()
    rerender(<DayReady summary={summary(false)} momentum={momentum} energy="green" routineLeft="روتين الصبح: باقي خطوة" />)
    const card = screen.getByRole('region', { name: 'يومك جاهز' })
    expect(within(card).getByText(/روتين الصبح: باقي خطوة/)).toBeInTheDocument()
  })
})

describe('ReviewDots (gate 6 D1)', () => {
  it('draws dots only — no star svg — and labels the step', () => {
    const { container } = render(<ReviewDots total={6} done={3} label="السؤال 4 من 6" />)
    expect(screen.getByRole('img', { name: 'السؤال 4 من 6' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg')).toHaveLength(0)
    expect(container.querySelectorAll('[data-done]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-next]')).toHaveLength(1)
  })
})

import { todayView } from '../../../src/domain'
import TodayScreen from '../../../src/ui/screens/today/TodayScreen'
import { makeStoreWithHabits, renderWith } from './harness'

describe('Today (gate 6 D5)', () => {
  it('section header counts include the hero card, so they match the chips', async () => {
    const store = await makeStoreWithHabits()
    const sg = todayView(store.getSnapshot(), store.today()).suggestions.filter((x) => x.item.tier === 'core' || x.item.tier === 'maintain')
    expect(sg.length).toBeGreaterThan(1)
    for (const x of sg.slice(0, 3)) await store.acceptSuggestion(x.item.id)
    renderWith(store, <TodayScreen />)
    const card = await screen.findByRole('region', { name: 'يومك جاهز' })
    const [coreChip] = within(card).getAllByRole('listitem')
    const num = (el: HTMLElement) => Number(el.textContent!.replace(/\D/g, ''))
    if (num(coreChip!) > 0) expect(await screen.findByText(new RegExp(`^الأساسيات · ${num(coreChip!)}$`))).toBeInTheDocument()
  })
})
