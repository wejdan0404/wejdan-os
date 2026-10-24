/** Feature B — grouped Today, «يومك جاهز», per-card levels, calm day. Data named "test". */
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayView } from '../../../src/domain'
import CalmDayScreen from '../../../src/ui/screens/today/CalmDayScreen'
import TodayScreen from '../../../src/ui/screens/today/TodayScreen'
import { makeStoreWithHabits, renderWith } from './harness'

const accepted = (store: Awaited<ReturnType<typeof makeStoreWithHabits>>) => todayView(store.getSnapshot(), store.today()).plan.items

describe('Today grouped by tier', () => {
  it('shows no summary on an empty day and never adds anything by itself', async () => {
    const store = await makeStoreWithHabits()
    renderWith(store, <TodayScreen />)
    await screen.findByText('يومك فاضي للحين').catch(() => null)
    expect(screen.queryByRole('region', { name: 'يومك جاهز' })).not.toBeInTheDocument()
    expect(accepted(store)).toHaveLength(0)
  })

  it('«يومك جاهز» counts her accepted day and the level chip persists her choice', async () => {
    const store = await makeStoreWithHabits()
    const sg = todayView(store.getSnapshot(), store.today()).suggestions.filter((x) => x.item.tier === 'core' || x.item.tier === 'maintain')
    expect(sg.length).toBeGreaterThan(1)
    await store.acceptSuggestion(sg[0]!.item.id)
    await store.acceptSuggestion(sg[1]!.item.id)
    renderWith(store, <TodayScreen />)
    const card = await screen.findByRole('region', { name: 'يومك جاهز' })
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    const chips = within(card).getAllByRole('listitem')
    expect(chips).toHaveLength(3)
    // pick a level on a non-hero row
    const level = (await screen.findAllByRole('button', { name: /حجم الخطوة/ }))[0]!
    await act(async () => fireEvent.click(level))
    const bonus = await screen.findByRole('radio', { name: 'زيادة' })
    await act(async () => fireEvent.click(bonus))
    await waitFor(() => expect(accepted(store).some((i) => i.suggestedLevel === 'bonus')).toBe(true))
  })
})

describe('Calm day', () => {
  it('lists suggestions to add but adds nothing, links to Help, and completes at minimum', async () => {
    const store = await makeStoreWithHabits()
    await store.setEnergy('red')
    renderWith(store, <CalmDayScreen />, '/today/calm')
    expect(await screen.findByText(/ثلاث أشياء صغيرة/)).toBeInTheDocument()
    expect(screen.getByText('إذا الأمور ثقيلة جدًا: المساعدة موجودة')).toBeInTheDocument()
    expect(accepted(store)).toHaveLength(0)
    const add = (await screen.findAllByRole('button', { name: /^أضيفي / }))[0]!
    await act(async () => fireEvent.click(add))
    await waitFor(() => expect(accepted(store)).toHaveLength(1))
    const check = await screen.findByRole('checkbox', { name: /^خلّصت:/ })
    await act(async () => fireEvent.click(check))
    await waitFor(() => expect(store.getSnapshot().logs.some((l) => l.level === 'minimum')).toBe(true))
  })
})
