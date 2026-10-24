import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, todayView } from '../../../src/domain'
import TodayScreen from '../../../src/ui/screens/today/TodayScreen'
import { makeStore, makeStoreWithHabits, renderWith } from './harness'

describe('Today — QA F1', () => {
  it('a fresh day shows no «0 ✦» pill and no energy pre-selected', async () => {
    const store = await makeStore()
    renderWith(store, <TodayScreen />)
    await screen.findByText('يومك فاضي للحين')
    expect(screen.queryByRole('button', { name: /شراراتك/ })).not.toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(0)
    expect(screen.getByText('كيف طاقتك اليوم؟')).toBeInTheDocument()
  })

  it('choosing energy records it and selects that segment', async () => {
    const store = await makeStore()
    renderWith(store, <TodayScreen />)
    await screen.findByText('يومك فاضي للحين')
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: 'متوسطة' }))
    })
    await waitFor(() => expect(screen.getByRole('radio', { name: 'متوسطة' })).toHaveAttribute('aria-checked', 'true'))
    expect(store.getSnapshot().energyChecks.some((c) => c.mode === 'yellow')).toBe(true)
  })

  it('«بكرة» from the postpone sheet moves the item off today with an undo toast', async () => {
    const store = await makeStoreWithHabits()
    const today = store.today()
    const it0 = todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'h_room')!.item
    await store.acceptSuggestion(it0.id)
    await store.acceptSuggestion(todayView(store.getSnapshot(), today).suggestions.find((x) => x.item.itemId === 'h_money')!.item.id)
    renderWith(store, <TodayScreen />)
    // long-press menu → «بعدين…» → «بكرة»
    const row = (await screen.findAllByText('ترتيب الغرفة'))[0]
    await act(async () => {
      fireEvent.contextMenu(row)
    })
    const later = await screen.findByRole('menuitem', { name: /بعدين/ }).catch(() => null)
    expect(later).not.toBeNull()
    if (!later) return
    await act(async () => {
      fireEvent.click(later)
    })
    await act(async () => {
      fireEvent.click(await screen.findByText('بكرة'))
    })
    await waitFor(() => expect(todayView(store.getSnapshot(), today).plan.items.some((i) => i.id === it0.id)).toBe(false))
    expect(todayView(store.getSnapshot(), today).suggestions.some((x) => x.item.id === it0.id)).toBe(false)
    expect(todayView(store.getSnapshot(), addDays(today, 1)).plan.items.some((i) => i.id === it0.id)).toBe(true)
    expect(await screen.findByText(/انتقلت لبكرة/)).toBeInTheDocument()
  })
})
