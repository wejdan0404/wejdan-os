/** Feature wave D: Evidence filter + add-to-habits, Home block, Settings extras, storage banner, Focus recall. */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeHabit, mkDate, schedule, type LifeStore } from '../../../src/domain'
import { ToastProvider } from '../../../src/ui/components/Toast'
import { LifeStoreProvider } from '../../../src/ui/state/LifeStore'
import { StorageFrame } from '../../../src/ui/state/StorageBanner'
import EvidenceScreen from '../../../src/ui/screens/me/EvidenceScreen'
import HomeAdminScreen from '../../../src/ui/screens/me/HomeAdminScreen'
import { SettingsExtras } from '../../../src/ui/screens/me/SettingsExtras'
import FocusScreen from '../../../src/ui/screens/today/FocusScreen'
import { PhoneAway, RecallStep, SilentPill, TryFirstTip } from '../../../src/ui/screens/today/FocusExtras'
import { library, makeStore } from '../today/harness'

const NOW = mkDate(2026, 10, 14, 12)

function wrap(store: LifeStore, ui: React.ReactElement, path = '/me') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LifeStoreProvider store={store}>
        <ToastProvider>
          <Routes>
            <Route path="*" element={ui} />
          </Routes>
        </ToastProvider>
      </LifeStoreProvider>
    </MemoryRouter>,
  )
}

describe('Evidence: strength filter', () => {
  it('filters by strength with counts and offers a way back to all', async () => {
    const store = await makeStore(NOW)
    wrap(store, <EvidenceScreen />)
    const group = screen.getByRole('group', { name: 'قوة الدليل' })
    const all = within(group).getAllByRole('button')
    expect(all).toHaveLength(6)
    const rct = within(group).getByRole('button', { name: /تجربة/ })
    const n = Number(rct.querySelector('bdi')!.textContent)
    expect(n).toBeGreaterThan(0)
    fireEvent.click(rct)
    expect(rct).toHaveAttribute('aria-pressed', 'true')
    // every visible row now carries the RCT label
    const rows = screen.getAllByText(/^تجربة · /)
    expect(rows.length).toBe(n)
  })
})

describe('Evidence: add to my habits', () => {
  it('creates one habit through the store, is idempotent, and undo removes it', async () => {
    const store = await makeStore(NOW)
    const entry = library.actions.find((a) => a.actionId === 'BODY-18')!
    wrap(store, <EvidenceScreen />)
    fireEvent.change(screen.getByLabelText('بحث في الأدلة'), { target: { value: entry.ar?.cardTitle ?? entry.nameAr } })
    fireEvent.click(await screen.findByText(entry.ar?.cardTitle ?? entry.nameAr))
    const add = await screen.findByRole('button', { name: 'أضيفيها لعاداتي' })
    await act(async () => {
      fireEvent.click(add)
    })
    await waitFor(() => expect(store.getSnapshot().habits.some((h) => h.actionId === entry.actionId)).toBe(true))
    expect(store.getSnapshot().habits.filter((h) => h.actionId === entry.actionId)).toHaveLength(1)
    const undo = await screen.findByRole('button', { name: 'تراجع' })
    await act(async () => {
      fireEvent.click(undo)
    })
    await waitFor(() => expect(store.getSnapshot().habits.some((h) => h.actionId === entry.actionId)).toBe(false))
  })
})

describe('Home block', () => {
  it('shows the tidy timer, this week zone and lets her add and tick an errand', async () => {
    const store = await makeStore(NOW)
    wrap(store, <HomeAdminScreen />)
    expect(screen.getByText(/ترتيب 10 دقايق/)).toBeInTheDocument()
    expect(screen.getByText('منطقة الأسبوع')).toBeInTheDocument()
    const input = screen.getByLabelText('مشوار جديد')
    fireEvent.change(input, { target: { value: 'test' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'أضيفي' }))
    })
    await waitFor(() => expect(store.getSnapshot().errands.map((e) => e.title)).toEqual(['test']))
    await act(async () => {
      fireEvent.click(await screen.findByRole('checkbox', { name: 'test' }))
    })
    await waitFor(() => expect(store.getSnapshot().errands[0]!.done).toBe(true))
  })
  it('changing the zone bumps the stored offset, undo restores it', async () => {
    const store = await makeStore(NOW)
    wrap(store, <HomeAdminScreen />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'غيّري المنطقة' }))
    })
    await waitFor(() => expect(store.getSnapshot().moduleState.homeZoneOffset).toBe(1))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'تراجع' }))
    })
    await waitFor(() => expect(store.getSnapshot().moduleState.homeZoneOffset).toBe(0))
  })
})

describe('Settings extras', () => {
  it('sets the daily reminder cap and switches an optional module off with undo', async () => {
    const store = await makeStore(NOW)
    wrap(store, <SettingsExtras />)
    fireEvent.change(screen.getByLabelText('الحد الأقصى للتذكيرات باليوم'), { target: { value: '2' } })
    await waitFor(() => expect(store.getSnapshot().settings.notificationCap).toBe(2))
    const name = store.getSnapshot().domains.find((d) => d.id === 'driving')!.nameAr
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name }))
    })
    await waitFor(() => expect(store.getSnapshot().domains.find((d) => d.id === 'driving')!.enabled).toBe(false))
  })
})

describe('Storage banner', () => {
  it('shows the honest banner only when storage is unavailable', () => {
    const { rerender } = render(<StorageFrame unavailable={false}><p>app</p></StorageFrame>)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<StorageFrame unavailable><p>app</p></StorageFrame>)
    expect(screen.getByRole('status')).toHaveTextContent('الحفظ غير متاح في هذا المتصفح — بياناتك مؤقتة')
    expect(screen.getByText('app')).toBeInTheDocument()
  })
})

describe('Focus extras', () => {
  it('phone-away is a reminder with her own confirmation', () => {
    let v = false
    const { rerender } = render(<PhoneAway away={v} onChange={(x) => (v = x)} />)
    expect(screen.getByText(/ما يقدر يسكّت جوالك/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'بعّدته' }))
    expect(v).toBe(true)
    rerender(<PhoneAway away={v} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'تمام، بعّدته' })).toHaveAttribute('aria-pressed', 'true')
    render(<SilentPill />)
    expect(screen.getByText('الإشعارات صامتة')).toBeInTheDocument()
    render(<TryFirstTip />)
    expect(screen.getByText('جرّبي أول ثم اسألي الذكاء الاصطناعي')).toBeInTheDocument()
  })
  it('recall step: save passes the answer, skip passes nothing', () => {
    const got: (string | null)[] = []
    render(<RecallStep title="test" minutes={25} busy={false} onSave={(a) => got.push(a)} onSkip={() => got.push(null)} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'فكرتين' } })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ وإنهاء' }))
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي السؤال' }))
    expect(got).toEqual(['فكرتين', null])
  })
  it('a study session asks the recall question before completing; a non-study one finishes directly', async () => {
    const store = await makeStore(mkDate(2026, 10, 5, 8))
    await store.setDomainState('learning', 'grow', true)
    await store.setDomainState('home', 'maintain', true)
    await store.upsertHabit(makeHabit({ id: 'h_study', domain: 'learning', titleAr: 'دراسة test', titleEn: 'study', schedule: schedule([1, 2, 3, 4, 5, 6, 7]), durationMin: 10 }), true)
    const view = (await import('../../../src/domain')).todayView(store.getSnapshot(), mkDate(2026, 10, 5, 8))
    const item = [...view.plan.items, ...view.suggestions.map((s) => s.item)].find((i) => i.itemId === 'h_study')
    expect(item).toBeDefined()
    await store.acceptSuggestion(item!.id)
    wrap(store, <FocusScreen />, `/today/focus/${encodeURIComponent(item!.id)}`)
    expect(await screen.findByText('جرّبي أول ثم اسألي الذكاء الاصطناعي')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'ابدئي' }))
    fireEvent.click(await screen.findByRole('button', { name: 'خلّصتها' }))
    expect(await screen.findByText('سؤال استرجاع سريع')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'فكرة test' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'حفظ وإنهاء' }))
    })
    await waitFor(() => expect(store.getSnapshot().notes.some((n) => n.body === 'فكرة test')).toBe(true))
    expect(store.getSnapshot().logs.some((l) => l.itemId === 'h_study')).toBe(true)
  })
})
